<!-- components/alliances/AllianceApplicationModal.vue -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center" @click.self="closeModal">
    <div class="relative bg-gray-900 rounded-lg p-8 space-y-6 w-full max-w-lg">
      <button @click="closeModal" class="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>

      <h2 class="text-2xl font-bold text-center text-white">
        Подача заявки в альянс
        <span class="text-blue-400 block mt-1">"{{ allianceName }}"</span>
      </h2>

      <div v-if="states.length === 0" class="text-center text-gray-400 p-4 bg-gray-800 rounded-md">
        <p>У вас нет государств, которые могут подать заявку в этот альянс.</p>
        <p class="text-sm mt-1">(Возможно, вы не являетесь правителем или уже состоите в альянсе)</p>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="stateSelect" class="block text-sm font-medium text-gray-300 mb-2">
            Выберите государство для подачи заявки:
          </label>
          <select
              id="stateSelect"
              v-model="selectedStateUuid"
              required
              class="w-full bg-gray-800/70 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 text-white"
          >
            <option disabled value="">-- Выбрать государство --</option>
            <option v-for="state in states" :key="state.uuid" :value="state.uuid">
              {{ state.name }}
            </option>
          </select>
        </div>

        <p class="text-sm text-gray-400">
          После подачи заявки основатель альянса должен будет её рассмотреть. Вы получите уведомление о решении.
        </p>

        <div class="flex justify-end gap-4 pt-4">
          <button type="button" @click="closeModal" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition">
            Отмена
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition">
            Подать заявку
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { IState } from '~/types/state.types';

const props = defineProps<{
  isOpen: boolean;
  states: IState[];
  allianceName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', stateUuid: string): void;
}>();

const selectedStateUuid = ref('');

function closeModal() {
  emit('close');
}

function handleSubmit() {
  if (!selectedStateUuid.value) {
    alert('Пожалуйста, выберите государство.');
    return;
  }
  emit('apply', selectedStateUuid.value);
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // Предварительно выбираем первое государство в списке, если оно есть
    selectedStateUuid.value = props.states.length > 0 ? props.states[0].uuid : '';
  }
});
</script>
