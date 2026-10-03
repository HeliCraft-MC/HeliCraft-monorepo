<!-- components/banlist/BanlistTable.vue -->
<script setup lang="ts">
import type { IBan } from '~/types/banlist.types'
import { useTimeFormat } from '~/composables/useTimeFormat'
import { getBanStatus } from '~/utils/banlist.utils'

const props = defineProps<{
  bans: IBan[]
  loading?: boolean
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  removeBan: [banId: number, banNickname: string]
}>()

const { formatTime } = useTimeFormat()

/* ───── Вспомогательные функции ───── */
function getPlayerNickname(ban: IBan): string {
  return ban.uuid_nickname || ban.uuid.slice(0, 8)
}

function formatSpecialName(name: string | null): string {
  if (!name) return '—'
  if (name === '#expired') return 'Автоистечение'
  if (name === '[Console]' || name === 'Console' || name === 'CONSOLE') return 'Консоль'
  if (name?.startsWith('[')) return name.slice(1, -1)
  return name
}

function formatRemovedDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU')
}


</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-gray-800">
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Никнейм</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Причина</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Администратор</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Дата бана</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Истекает</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Снят кем</th>
          <th class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Статус</th>
          <th v-if="isAdmin" class="px-4 py-3 text-left text-sm font-semibold text-gray-400">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="border-b border-gray-800/60">
          <td :colspan="isAdmin ? 8 : 7" class="px-4 py-8 text-center text-gray-400">
            <div class="flex justify-center items-center gap-3">
              <div class="w-6 h-6 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
              <span>Загрузка...</span>
            </div>
          </td>
        </tr>
        <tr v-else-if="!bans.length" class="border-b border-gray-800/60">
          <td :colspan="isAdmin ? 8 : 7" class="px-4 py-8 text-center text-gray-400">
            Банов не найдено
          </td>
        </tr>
        <tr
            v-else
            v-for="ban in bans"
            :key="ban.id"
            class="border-b border-gray-800/60 hover:bg-gray-900/50 transition-colors"
        >
          <!-- Никнейм игрока -->
          <td class="px-4 py-3">
            <NuxtLink
                :to="`/player/${ban.uuid}`"
                class="text-red-400 hover:text-red-300 transition font-semibold"
                :title="`UUID: ${ban.uuid}`"
            >
              {{ getPlayerNickname(ban) }}
            </NuxtLink>
          </td>

          <!-- Причина -->
          <td class="px-4 py-3 max-w-xs">
            <div class="text-gray-300 text-sm truncate" :title="ban.reason">
              {{ ban.reason }}
            </div>
          </td>

          <!-- Администратор, выдавший бан -->
          <td class="px-4 py-3">
            <div class="text-gray-400 text-sm">
              {{ ban.banned_by_name }}
            </div>
          </td>

          <!-- Дата бана -->
          <td class="px-4 py-3">
            <div class="text-gray-400 text-sm">
              {{ formatTime(ban.time) }}
            </div>
          </td>

          <!-- Истекает -->
          <td class="px-4 py-3">
            <div class="text-gray-400 text-sm">
              {{ formatTime(ban.until) }}
            </div>
          </td>

          <!-- Снят кем и когда -->
          <td class="px-4 py-3">
            <div v-if="ban.removed_by_name" class="text-gray-400 text-sm">
              <div>{{ formatSpecialName(ban.removed_by_name) }}</div>
              <div class="text-xs text-gray-500 mt-1">
                {{ formatRemovedDate(ban.removed_by_date) }}
              </div>
            </div>
            <div v-else class="text-gray-500 text-sm">—</div>
          </td>

          <!-- Статус -->
          <td class="px-4 py-3">
            <div
                class="inline-flex items-center gap-1 text-sm font-medium transition"
                :class="getBanStatus(ban).color"
            >
              <span>{{ getBanStatus(ban).text }}</span>
            </div>
          </td>

          <!-- Действия (только для админов) -->
          <td v-if="isAdmin" class="px-4 py-3">
            <button
                v-if="getBanStatus(ban).isActive"
                @click="emit('removeBan', ban.id, getPlayerNickname(ban))"
                class="px-3 py-1 bg-red-600 hover:bg-red-700 transition rounded text-white text-sm font-medium flex items-center gap-1"
                title="Снять бан"
            >
              <Icon name="solar:trash-bin-2-linear" class="w-4 h-4" />
              <span class="hidden sm:inline">Снять</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

