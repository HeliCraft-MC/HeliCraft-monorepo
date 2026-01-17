<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold" :style="{ color: accentColor }">
      Управление Указами и Ордерами
    </h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Панель Указов -->
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
        <DecreesPanel :state-uuid="state?.uuid" :accent-color="accentColor" />
      </div>

      <!-- Панель Ордеров -->
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
        <WarrantsPanel :state-uuid="state?.uuid" :accent-color="accentColor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import type { IState } from '~/types/state.types';
import DecreesPanel from '~/components/states/DecreesPanel.vue';
import WarrantsPanel from '~/components/states/WarrantsPanel.vue';

definePageMeta({
  layout: 'panel',
});

// --- Внедрение данных из Layout ---
const accentColor = inject<globalThis.Ref<string>>('accentColor', ref('#ffffff'));
const state = inject<globalThis.Ref<IState | null>>('state', ref(null));
</script>
