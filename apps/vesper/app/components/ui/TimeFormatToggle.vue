<!-- components/ui/TimeFormatToggle.vue -->
<script setup lang="ts">
import { useTimeFormat } from '~/composables/useTimeFormat'

const { isRelative } = useTimeFormat()
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm text-gray-400">Формат времени:</span>
    <button
        @click="isRelative = !isRelative"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        :class="isRelative ? 'bg-red-500' : 'bg-gray-600'"
        role="switch"
        :aria-checked="isRelative"
    >
      <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="isRelative ? 'translate-x-6' : 'translate-x-1'"
      />
    </button>
    <span class="text-sm font-medium text-white">
      {{ isRelative ? 'Относительное' : 'Абсолютное' }}
    </span>
  </div>
</template>

