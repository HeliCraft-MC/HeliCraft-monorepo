<template>
  <transition name="fade">
    <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-gray-900 w-full max-w-lg rounded-lg shadow-lg p-6 relative">
        <button
            class="absolute top-3 right-3 text-gray-400 hover:text-white"
            @click="$emit('close')"
        >
          <Icon name="material-symbols:close-rounded" size="24" />
        </button>

        <h2 class="text-2xl font-bold mb-4" :style="{ color: accentColor }">
          {{ city ? 'Редактирование города' : 'Создать город' }}
        </h2>

        <!-- Form -->
        <form @submit.prevent="save">
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Название</label>
              <input
                  v-model.trim="form.name"
                  type="text"
                  required
                  class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-1">Координаты или URL</label>
              <input
                  v-model.trim="form.coordinates"
                  type="text"
                  required
                  class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="inline-flex items-center gap-2 text-sm text-gray-300">
                <input
                    v-model="form.is_capital"
                    type="checkbox"
                    class="rounded focus:ring-0"
                />
                Сделать столицей
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <button
                type="button"
                class="btn-sm bg-gray-600 hover:bg-gray-500 text-white"
                @click="$emit('close')"
            >
              Отмена
            </button>
            <button
                type="submit"
                :disabled="saving"
                class="btn-sm bg-green-600 hover:bg-green-500 text-white flex items-center gap-2"
            >
              <span v-if="saving" class="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-white"></span>
              <span v-else>{{ city ? 'Сохранить' : 'Создать' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { ICity } from '~/types/city.types';

const props = defineProps<{
  isOpen: boolean;
  city: ICity | null;
  stateUuid: string | null;
  accentColor: string;
}>();

const emit = defineEmits(['close', 'saved']);

/* Local form model */
const form = ref({
  name: '',
  coordinates: '',
  is_capital: false,
});

/* Saving flag */
const saving = ref(false);

/* Watch props.city to fill form */
watch(
    () => props.city,
    (newCity) => {
      if (newCity) {
        form.value = {
          name: newCity.name,
          coordinates: newCity.coordinates,
          is_capital: newCity.is_capital,
        };
      } else {
        form.value = {
          name: '',
          coordinates: '',
          is_capital: false,
        };
      }
    },
    { immediate: true }
);

/* Save handler */
async function save() {
  if (!props.stateUuid) {
    alert('Неизвестно, к какому государству привязать город.');
    return;
  }
  saving.value = true;
  try {
    if (props.city) {
      await $fetch(`/distant-api/cities/${props.city.uuid}`, {
        method: 'PUT',
        body: {
          name: form.value.name,
          coordinates: form.value.coordinates,
          isCapital: form.value.is_capital,
        },
      });
    } else {
      await $fetch('/distant-api/cities/create', {
        method: 'POST',
        body: {
          name: form.value.name,
          coordinates: form.value.coordinates,
          stateUuid: props.stateUuid,
          isCapital: form.value.is_capital,
        },
      });
    }
    emit('saved');
  } catch (e: any) {
    alert(`Ошибка: ${e.data?.statusMessageRu || e.message}`);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.btn-sm {
  @apply px-3 py-1 text-xs font-bold rounded-md transition-colors;
}
</style>
