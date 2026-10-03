// composables/useTimeFormat.ts

/**
 * Форматирует timestamp в локальное время
 * @param ms - timestamp в миллисекундах
 * @returns строка формата "DD.MM.YYYY, HH:MM:SS"
 */
export function formatAbsoluteTime(ms: number): string {
  if (ms === -1) return 'Никогда';
  if (ms <= 0) return '—';

  return new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Форматирует timestamp в относительное время
 * @param ms - timestamp в миллисекундах
 * @returns строка формата "3 дня назад" или "через 2 часа"
 */
export function formatRelativeTime(ms: number): string {
  if (ms === -1) return 'Никогда';
  if (ms <= 0) return '—';

  const now = Date.now();
  const diff = ms - now;
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let result: string;

  if (years > 0) {
    result = `${years} ${pluralize(years, 'год', 'года', 'лет')}`;
  } else if (months > 0) {
    result = `${months} ${pluralize(months, 'месяц', 'месяца', 'месяцев')}`;
  } else if (days > 0) {
    result = `${days} ${pluralize(days, 'день', 'дня', 'дней')}`;
  } else if (hours > 0) {
    result = `${hours} ${pluralize(hours, 'час', 'часа', 'часов')}`;
  } else if (minutes > 0) {
    result = `${minutes} ${pluralize(minutes, 'минуту', 'минуты', 'минут')}`;
  } else {
    result = `${seconds} ${pluralize(seconds, 'секунду', 'секунды', 'секунд')}`;
  }

  return isPast ? `${result} назад` : `через ${result}`;
}

/**
 * Вспомогательная функция для правильного склонения русских слов
 */
function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/**
 * Композабл для форматирования времени с переключателем режима
 */
export function useTimeFormat() {
  const isRelative = useState<boolean>('timeFormatRelative', () => {
    // Попытка загрузить из localStorage
    if (process.client) {
      const stored = localStorage.getItem('timeFormatRelative');
      return stored === 'true';
    }
    return false;
  });

  // Сохранение в localStorage при изменении
  watch(isRelative, (value) => {
    if (process.client) {
      localStorage.setItem('timeFormatRelative', String(value));
    }
  });

  const formatTime = computed(() => {
    return (ms: number) => isRelative.value ? formatRelativeTime(ms) : formatAbsoluteTime(ms);
  });

  return {
    isRelative,
    formatTime,
    formatAbsoluteTime
  };
}

