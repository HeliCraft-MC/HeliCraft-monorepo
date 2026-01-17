<!-- components/states/StateCard.vue -->
<template>
  <!-- Обертка в NuxtLink для навигации. Эффекты применяются через класс 'group' -->
  <NuxtLink
      :to="`/states/${state.uuid}`"
      class="group block h-full w-full transition-all duration-300 ease-in-out hover:scale-[1.02] focus:scale-[1.02]"
      aria-label="Подробнее о государстве"
  >
    <!-- Основной контейнер карточки. h-full заставляет ее занимать всю высоту ячейки грида. -->
    <div
        class="flex h-full flex-col overflow-hidden rounded-xl bg-slate-800/70 shadow-lg backdrop-blur-sm transition-shadow duration-300 group-hover:shadow-2xl md:flex-row"
        :style="{ borderTop: `4px solid ${state.color_hex || '#475569'}` }"
    >
      <!-- Секция с флагом -->
      <div class="relative w-full flex-shrink-0 md:w-44 lg:w-48">
        <img
            :src="state.flag_link"
            :alt="`Флаг ${state.name}`"
            class="h-48 w-full object-cover md:h-full"
            loading="lazy"
        />
        <!-- Градиент для лучшей читаемости текста, если он будет наложен -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      <!-- Основной контент -->
      <div class="flex flex-1 flex-col p-4 sm:p-5">
        <!-- Заголовок и форма правления -->
        <header>
          <!-- Используем v-html с универсальной функцией для переноса любых длинных слов -->
          <h3 class="break-words text-lg font-bold text-white md:text-xl lg:text-2xl" v-html="hyphenatedName"></h3>
          <p class="text-sm font-medium" :style="{ color: state.color_hex || '#94a3b8' }">
            {{ govFormTranslations[props.state.gov_form] || props.state.gov_form }}
          </p>
        </header>

        <!-- Описание (обрезается до 2 строк для экономии места) -->
        <p v-if="state.description" class="mt-2 text-sm text-slate-300 line-clamp-2">
          {{ state.description }}
        </p>

        <!-- === ВИЗУАЛЬНЫЙ РАЗДЕЛИТЕЛЬ И БЛОК ХАРАКТЕРИСТИК === -->
        <div class="my-4 flex-grow border-t border-b border-slate-700/60 py-4">
          <div class="grid grid-cols-1 gap-x-6 gap-y-4 text-sm text-slate-200 sm:grid-cols-2">
            <!-- Каждая характеристика теперь в 2 строки для читаемости -->
            <div class="flex items-start gap-2">
              <Icon name="solar:crown-minimalistic-bold-duotone" class="h-5 w-5 flex-shrink-0 text-slate-400 mt-0.5" />
              <div><span class="text-slate-400">Правитель:</span><br>{{ ruler }}</div>
            </div>
            <div class="flex items-start gap-2">
              <Icon name="solar:users-group-two-rounded-bold-duotone" class="h-5 w-5 flex-shrink-0 text-slate-400 mt-0.5" />
              <div><span class="text-slate-400">Участники:</span><br>{{ props.members }}</div>
            </div>
            <div class="flex items-start gap-2">
              <Icon name="solar:revote-bold-duotone" class="h-5 w-5 flex-shrink-0 text-slate-400 mt-0.5" />
              <div><span class="text-slate-400">Выборы:</span><br>{{ state.has_elections ? 'Проводятся' : 'Отсутствуют' }}</div>
            </div>
            <div class="flex items-start gap-2">
              <Icon name="solar:user-id-bold-duotone" class="h-5 w-5 flex-shrink-0 text-slate-400 mt-0.5" />
              <div><span class="text-slate-400">Двойное гражданство:</span><br>{{ state.allow_dual_citizenship ? 'Разрешено' : 'Запрещено' }}</div>
            </div>
            <div class="flex items-start gap-2">
              <Icon name="solar:info-circle-bold-duotone" class="h-5 w-5 flex-shrink-0 text-slate-400 mt-0.5" />
              <div><span class="text-slate-400">Свободный вход:</span><br>{{ state.free_entry ? 'Разрешен' : 'Ограничен' }}</div>
            </div>
          </div>
        </div>

        <!-- Футер с мета-информацией и ссылками -->
        <footer class="flex items-end justify-between pt-1">
          <!-- Статус и дата создания -->
          <div class="text-xs text-slate-400">
            <div class="flex items-center gap-1.5">
              <Icon :name="statusInfo[state.status]?.icon || 'material-symbols:question-mark'" :class="statusInfo[state.status]?.color || 'text-slate-400'" class="h-4 w-4" />
              <span>{{ stateStatusTranslations[state.status] || state.status }}</span>
            </div>
            <div class="mt-1 flex items-center gap-1.5">
              <Icon name="solar:calendar-bold-duotone" class="h-4 w-4" />
              <span>Основано: {{ new Date(props.state.created).toLocaleDateString() }}</span>
            </div>
          </div>

          <!-- Ссылки на внешние ресурсы -->
          <div class="flex items-center gap-3">
            <a
                v-if="state.map_link"
                :href="state.map_link"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
                class="text-slate-400 transition-colors hover:text-white"
                aria-label="Карта государства"
            >
              <Icon name="solar:map-bold-duotone" class="h-6 w-6" />
            </a>
            <a
                v-if="state.telegram_link"
                :href="state.telegram_link"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
                class="text-slate-400 transition-colors hover:text-white"
                aria-label="Чат в Telegram"
            >
              <Icon name="solar:plain-bold-duotone" class="h-5 w-5" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IState, GovernmentForm, StateStatus } from '~/types/state.types'; // Предполагается, что типы лежат здесь

// Определяем пропсы компонента.
const props = defineProps<{
  state: IState;
  members: number;
}>();

// --- УНИВЕРСАЛЬНОЕ ВЫЧИСЛЯЕМОЕ СВОЙСТВО ДЛЯ ПЕРЕНОСА СЛОВ ---
const hyphenatedName = computed(() => {
  if (!props.state.name) return '';

  const MAX_WORD_LENGTH = 12; // Максимальная длина слова до вставки переноса
  const CHUNK_SIZE = 10;       // Размер части слова, после которой вставляется перенос

  // Разбиваем название на слова
  return props.state.name.split(' ').map(word => {
    // Если слово длиннее порога, обрабатываем его
    if (word.length > MAX_WORD_LENGTH) {
      const regex = new RegExp(`.{1,${CHUNK_SIZE}}`, 'g');
      const parts = word.match(regex);
      // Соединяем части слова с помощью "мягкого" переноса
      return parts ? parts.join('&shy;') : word;
    }
    // Если слово короткое, возвращаем как есть
    return word;
  }).join(' '); // Соединяем слова обратно в строку
});

// --- Получение данных о правителе ---
const ruler = ref('Загрузка...');

onMounted(async () => {
  if (!props.state.ruler_uuid) {
    ruler.value = 'Не назначен';
    return;
  }
  try {
    const userData = await $fetch<{ nickname?: string; uuid: string }>(`/distant-api/user/${props.state.ruler_uuid}`);
    ruler.value = userData?.nickname || 'Неизвестный правитель';
  } catch (error) {
    console.error('Ошибка при загрузке данных правителя:', error);
    ruler.value = 'Ошибка загрузки';
  }
});

// --- Словари для переводов ---

const govFormTranslations: Record<GovernmentForm, string> = {
  'monarchy': 'Монархия',
  'republic': 'Республика',
  'federation': 'Федерация',
  'oligarchy': 'Олигархия / совет',
  'tribal': 'Племенное устройство',
  'other': 'Иное / смешанное',
};

const stateStatusTranslations: Record<StateStatus, string> = {
  'pending': 'Ожидает одобрения',
  'active': 'Функционирует',
  'rejected': 'Отклонено',
  'merged': 'Объединено',
  'dissolved': 'Распущено',
};

const statusInfo: Record<StateStatus, { icon: string; color: string }> = {
  'pending': { icon: 'solar:sort-by-time-bold-duotone', color: 'text-yellow-400' },
  'active': { icon: 'solar:check-circle-bold-duotone', color: 'text-green-400' },
  'rejected': { icon: 'solar:bill-cross-bold-duotone', color: 'text-red-500' },
  'merged': { icon: 'solar:circle-bottom-up-bold-duotone', color: 'text-blue-400' },
  'dissolved': { icon: 'solar:archive-down-minimlistic-bold-duotone', color: 'text-slate-500' },
}
</script>
