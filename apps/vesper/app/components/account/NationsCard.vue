<!-- components/account/NationsStates.vue -->
<script setup lang="ts">
import type { IState }         from '~/types/state.types'

import StateCard from "~/components/states/StateCard.vue";

const { data } = useAuth()
const states = ref<IState[]>([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const { uuid } = data.value ?? {}
    if (!uuid) return
    const r = await $fetch(`/distant-api/state/search`, {
      query:{ rulerUuid: uuid }
    })
    states.value = r as IState[]
  } finally { loading.value = false }
})
</script>

<template>
  <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-8">
    <h2 class="pr2p text-2xl text-red-500 mb-6 flex items-center gap-2">
      <Icon name="mdi:flag-variant" class="w-6 h-6"/> Мои государства
    </h2>
    <p v-if="loading" class="text-gray-400">Загружаем…</p>
    <p v-else-if="!states.length" class="text-gray-400">
      У вас пока нет гражданства.
    </p>
    <div v-else class="space-y-4">
      <StateCard v-for="s in states" :key="s.uuid" :state="s"/>
    </div>
  </div>
</template>
<style>

</style>