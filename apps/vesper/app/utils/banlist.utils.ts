/**
 * Утилиты для работы с банами
 */

import type { IBan } from '~/types/banlist.types'

export interface BanStatus {
  /** Статус бана: 'active' | 'removed' | 'permanent' | 'expired' */
  status: 'active' | 'removed' | 'permanent' | 'expired'
  /** Текстовое описание статуса */
  text: string
  /** CSS класс цвета для отображения */
  color: string
  /** Активен ли бан в данный момент */
  isActive: boolean
  /** Причина неактивности (если применимо) */
  reason?: string
}

/**
 * Определяет статус бана
 * @param ban - объект бана
 * @returns объект с информацией о статусе
 */
export function getBanStatus(ban: IBan): BanStatus {
  const activeValue = readBanField(ban.active);
  const now = Date.now()

  // Бан снят вручную (есть removed_by_uuid или removed_by_name не #expired)
  if (activeValue === 0 && ban.removed_by_uuid) {
    // Проверяем, был ли бан снят автоматически (#expired) или вручную
    if (ban.removed_by_name === '#expired') {
      return {
        status: 'expired',
        text: 'Истёк',
        color: 'text-gray-400',
        isActive: false,
        reason: 'Автоматически истёк'
      }
    }

    let reason = 'Снят администратором'
    if (
      ban.removed_by_name === '[Console]' ||
      ban.removed_by_name === 'Console' ||
      ban.removed_by_name === 'CONSOLE'
    ) {
      reason = 'Снят консолью'
    }

    return {
      status: 'removed',
      text: 'Снят',
      color: 'text-blue-400',
      isActive: false,
      reason
    }
  }

  // Перманентный бан (until = 0 или until = -1) и активен
  if ((ban.until === 0 || ban.until === -1) && activeValue === 1) {
    return {
      status: 'permanent',
      text: 'Перманентный',
      color: 'text-red-500',
      isActive: true
    }
  }

  // Активный бан (until > now и active = 1)
  if (ban.until > now && activeValue === 1) {
    return {
      status: 'active',
      text: 'Активный',
      color: 'text-yellow-500',
      isActive: true
    }
  }

  // Истёкший бан по времени (until <= now, но не снят вручную)
  if (ban.until > 0 && ban.until <= now) {
    return {
      status: 'expired',
      text: 'Истёк',
      color: 'text-gray-400',
      isActive: false
    }
  }

  // Если ничего не подошло, считаем что бан неактивен
  return {
    status: 'expired',
    text: 'Неактивен',
    color: 'text-gray-500',
    isActive: false
  }
}

/**
 * Форматирует длительность бана
 * @param ban - объект бана
 * @returns строка с длительностью (например "30 дн. 12 ч." или "Перманентно")
 */
export function getBanDuration(ban: IBan): string {
  // Перманентный бан
  if (ban.until === 0 || ban.until === -1) {
    return 'Перманентно'
  }

  const duration = ban.until - ban.time
  const ms = Math.max(0, duration)

  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days} дн. ${hours} ч.`
  if (hours > 0) return `${hours} ч. ${minutes} мин.`
  return `${minutes} мин.`
}

/**
 * Форматирует дату окончания бана с учётом типа (перманентный, истёкший и т.д.)
 * @param ban - объект бана
 * @returns строка для отображения
 */
export function getBanUntilText(ban: IBan, formatTime: (ms: number) => string): string {
  if (ban.until === 0 || ban.until === -1) {
    return 'Никогда'
  }

  return formatTime(ban.until)
}

/**
 * Определяет, может ли пользователь снять этот бан
 * @param ban - объект бана
 * @returns true если бан активен
 */
export function canRemoveBan(ban: IBan): boolean {
  return readBanField(ban.active) === 1
}

/**
 * Определяет, является ли бан IP-баном
 * @param ban - объект бана
 * @returns true если это IP-бан
 */
export function isBanIp(ban: IBan): boolean {
  return readBanField(ban.ipban) === 1
}

/**
 * Определяет, является ли бан скрытым
 * @param ban - объект бана
 * @returns true если бан скрытый
 */
export function isBanSilent(ban: IBan): boolean {
  return readBanField(ban.silent) === 1
}

/**
 * Безопасно читает значение поля, которое может быть number или Buffer
 * @param value - значение которое может быть number или Buffer
 * @returns число (0 или 1)
 */
export function readBanField(value: number | { type: string; data: number[] } | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object' && 'data' in value && Array.isArray(value.data)) {
    return value.data[0] ?? 0;
  }
  return 0;
}
