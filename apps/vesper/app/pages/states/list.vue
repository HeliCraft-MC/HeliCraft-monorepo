<!-- pages/states/list/.vue -->
<script setup lang="ts">
import StateCard from '@/components/states/StateCard.vue'
import type { IState } from '~/types/state.types'

definePageMeta({ auth: false })

const q = ref('')
const filters = ref({
  govForm:'', status:'', freeEntry:false, hasElections:false
})
const loading = ref(true)
const rows = ref<IState[]>([])

async function load () {
  loading.value = true
  const query:any = { search:q.value }
  for (const [k,v] of Object.entries(filters.value))
    if (v) query[k]=v
  const states: IState[] = await $fetch('/distant-api/state/search', { query })
  // Получаем количество членов для каждого государства
  const statesWithMembers = await Promise.all(states.map(async (s) => {
    const members: number = await $fetch(`/distant-api/state/${s.uuid}/members-count`)
    return { ...s, members }
  }))
  rows.value = statesWithMembers
  loading.value = false
}
watch([q,filters], load, { deep:true })
load()
</script>

<template>
  <main class="min-h-screen bg-black text-white flex pt-24 md:pt-28">
    <!-- фильтры -->
    <aside class="w-64 shrink-0 border-r border-gray-800/60 p-6 space-y-6
                   hidden lg:block">
      <div>
        <h3 class="font-semibold mb-2">Форма правления</h3>
        <select v-model="filters.govForm" class="w-full bg-gray-800 px-3 py-2 rounded">
          <option value="">Любая</option>
          <option value="monarchy">Монархия</option>
          <option value="republic">Республика</option>
          <option value="federation">Федерация</option>
          <option value="oligarchy">Олигархия</option>
          <option value="tribal">Племя</option>
          <option value="other">Другая</option>
        </select>
      </div>
      <div>
        <h3 class="font-semibold mb-2">Статус</h3>
        <select v-model="filters.status" class="w-full bg-gray-800 px-3 py-2 rounded">
          <option value="">Любой</option>
          <option value="active">Активно</option>
          <option value="pending">Ожидает</option>
          <option value="rejected">Отклонено</option>
          <option value="dissolved">Распущено</option>
          <option value="merged">Объединено</option>
        </select>
      </div>
      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="filters.freeEntry"/>
        Свободный вход
      </label>
      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="filters.hasElections"/>
        Есть выборы
      </label>
      <button @click="filters={govForm:'',status:'',freeEntry:false,hasElections:false}"
              class="text-sm text-gray-400 hover:text-red-400">Сбросить</button>
    </aside>

    <!-- правая часть: поиск + таблица -->
    <section class="flex-1 p-6 space-y-6">
      <input v-model="q" placeholder="Поиск государства..."
             class="w-full bg-gray-800/70 px-4 py-3 rounded outline-none"/>

      <p v-if="loading" class="text-gray-400">Загружаем…</p>

      <div v-else-if="!rows.length" class="text-gray-400">
        Ничего не найдено.
      </div>

      <div v-else class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <StateCard v-for="s in rows" :key="s.uuid" :state="s" :members="s.members"/>
      </div>
    </section>
  </main>
</template>
