<!-- components/ui/ConfirmationModal.vue -->
<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

// Определяем props, которые компонент принимает
const { isOpen, title, message } = defineProps({
  // Флаг, отвечающий за отображение модального окна
  isOpen: {
    type: Boolean,
    required: true,
  },
  // Заголовок модального окна
  title: {
    type: String,
    required: true,
  },
  // Основное сообщение или вопрос для подтверждения
  message: {
    type: String,
    required: true,
  },
})

// Определяем события, которые компонент может отправлять родителю
const emit = defineEmits(['close', 'confirm'])

// Обработчик для кнопки подтверждения
function handleConfirm() {
  emit('confirm')
  // После подтверждения также закрываем окно
  emit('close')
}
</script>

<template>
  <!--
    Используем встроенный компонент <Transition> для плавной анимации
    появления и исчезновения модального окна.
  -->
  <Transition name="fade">
    <!--
      Основной контейнер-оверлей.
      Он отображается только если `isOpen` равно true.
      - `fixed inset-0`: Растягивает на весь экран.
      - `z-50`: Устанавливает высокий z-index, чтобы быть поверх всего контента.
      - `flex items-center justify-center`: Центрирует дочерний элемент (само окно).
      - `bg-black bg-opacity-70 backdrop-blur-sm`: Создаёт эффект затемнения и размытия фона.
      - `@click.self`: Позволяет закрыть окно при клике на оверлей, но не на само модальное окно.
    -->
    <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
        @click.self="$emit('close')"
    >
      <!--
        Контейнер самого модального окна.
        - `bg-gray-900/80 backdrop-blur-lg`: Стиль "стекла" как в вашем примере.
        - `rounded-lg shadow-xl`: Скруглённые углы и тень для объёма.
        - `max-w-sm w-full`: Ограничивает максимальную ширину и делает его адаптивным.
        - `p-6`: Внутренние отступы.
        - `border border-gray-700`: Тонкая рамка для выделения.
      -->
      <div class="bg-gray-900/80 backdrop-blur-lg rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-700">
        <!-- Шапка окна -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-red-500">{{ title }}</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-white transition-colors duration-200">
            <!-- Используем Nuxt Icon для иконки крестика -->
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Основной текст -->
        <p class="text-gray-300">
          {{ message }}
        </p>

        <!-- Футер с кнопками -->
        <div class="flex justify-end gap-4 pt-4">
          <!-- Кнопка отмены, стилизована под второстепенную кнопку -->
          <button
              @click="$emit('close')"
              class="bg-gray-700 hover:bg-gray-600 transition-colors duration-200 py-2 px-6 rounded-md font-bold text-white"
          >
            Отмена
          </button>
          <!-- Кнопка подтверждения, стилизована как основная (акцентная) кнопка -->
          <button
              @click="handleConfirm"
              class="bg-red-500 hover:bg-red-600 transition-colors duration-200 py-2 px-6 rounded-md font-bold text-black"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Стили для анимации плавного появления и исчезновения */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Дополнительная анимация для "вылета" самого окна.
  Можно раскомментировать для более интересного эффекта.
*/
/*
.fade-enter-active .bg-gray-900\/80,
.fade-leave-active .bg-gray-900\/80 {
  transition: all 0.3s ease;
}
.fade-enter-from .bg-gray-900\/80,
.fade-leave-to .bg-gray-900\/80 {
  transform: scale(0.95);
  opacity: 0;
}
*/
</style>
