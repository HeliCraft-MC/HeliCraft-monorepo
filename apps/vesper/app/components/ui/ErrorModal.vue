<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

// Определяем props
const { isOpen, title, message } = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: 'Ошибка',
  },
  message: {
    type: String,
    required: true,
  },
})

// Событие закрытия
const emit = defineEmits(['close'])
</script>

<template>
  <Transition name="fade">
    <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
        @click.self="$emit('close')"
    >
      <div class="bg-gray-900/80 backdrop-blur-lg rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-700">
        <!-- Шапка -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-red-500">{{ title }}</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-white transition-colors duration-200">
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Сообщение -->
        <p class="text-gray-300">
          {{ message }}
        </p>

        <!-- Футер с одной кнопкой -->
        <div class="flex justify-end pt-4">
          <button
              @click="$emit('close')"
              class="bg-red-500 hover:bg-red-600 transition-colors duration-200 py-2 px-6 rounded-md font-bold text-black"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
