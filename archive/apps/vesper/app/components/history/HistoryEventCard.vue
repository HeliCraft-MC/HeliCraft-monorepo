<!-- components/history/HistoryEventCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { IHistoryEvent } from '~/types/history.types'

const props = defineProps<{
  event: IHistoryEvent,
  color?: string
}>()

const eventDate = computed(() => {
  return new Date(props.event.created).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
})

const defaultColor = '#94a3b8' // slate-400 as a neutral fallback
</script>

<template>
  <article class="history-card flex items-start gap-4">
    <!-- Timeline Icon -->
    <div class="icon-container flex-shrink-0 flex flex-col items-center">
      <div
          class="flex items-center justify-center w-10 h-10 rounded-full border-2 bg-gray-800"
          :style="{ borderColor: (color || defaultColor) + '4D' }"
      >
        <Icon
            name="solar:notebook-bookmark-line-duotone"
            class="w-5 h-5"
            :style="{ color: color || defaultColor }"
        />
      </div>
    </div>

    <!-- Event Content -->
    <div class="content-container flex-1 pt-1.5 pb-4 border-b border-gray-800">
      <header class="mb-1">
        <h3 class="font-semibold text-white">
          {{ event.title }}
        </h3>
      </header>
      <p class="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
        {{ event.description }}
      </p>
      <footer class="mt-2">
        <p class="text-xs text-gray-500">
          {{ eventDate }}
        </p>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.history-card {
  position: relative;
}

.icon-container {
  position: relative;
  z-index: 1;
}

.history-card:not(:last-child) .icon-container::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: calc(100% - 10px); /* Adjust to control the line length */
  background-color: #374151; /* gray-700 */
}

/* Remove border on the last card's content for a cleaner look */
.history-card:last-child .content-container {
  border-bottom: none;
  padding-bottom: 0;
}
</style>
