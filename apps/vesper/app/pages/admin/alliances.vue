<!-- pages/admin/alliances.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAuth } from '#imports'
import { AllianceStatus, AlliencePurpose } from '~/types/diplomacy.types'
import type { IAlliance, IAllianceMember } from '~/types/diplomacy.types'
import type { IState } from '~/types/state.types'

definePageMeta({ layout: 'admin' })

/* ───── Auth ───── */
const { data: session } = useAuth()
const userUuid = computed(() => session.value?.uuid)

/* ───── Reactive state ───── */
interface IEnrichedAlliance extends IAlliance {
  creatorStateName?: string
  memberCount?: number
}

// Data containers
const activeAlliances = ref<IEnrichedAlliance[]>([])
const dissolvedAlliances = ref<IEnrichedAlliance[]>([])

// UI State
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'active' | 'dissolved'>('active')
const processingUuid = ref<string | null>(null)
const searchQuery = ref('')

// Modal State
const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  resolve: (value: boolean) => {},
})

const alertModal = ref({
  show: false,
  title: '',
  message: '',
})

/* ───── Helpers ───── */
const purposeMap: Record<AlliencePurpose, string> = {
  [AlliencePurpose.ECONOMIC]: 'Экономика',
  [AlliencePurpose.MILITARY]: 'Военное дело',
  [AlliencePurpose.DIPLOMATIC]: 'Дипломатия',
  [AlliencePurpose.GENERAL]: 'Общая',
  [AlliencePurpose.OTHER]: 'Другое',
}

const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/* ───── API & Data Fetching ───── */

/**
 * Enriches alliances with creator state name and member count.
 * @param alliancesArray - The array of alliances to process.
 */
async function enrichAlliances (alliancesArray: IAlliance[]): Promise<IEnrichedAlliance[]> {
  const stateCache = new Map<string, string>()

  const getStateName = async (uuid: string): Promise<string> => {
    if (!uuid) return 'Неизвестно'
    if (stateCache.has(uuid)) {
      return stateCache.get(uuid)!
    }
    try {
      const state = await $fetch<IState>(`/distant-api/state/${uuid}`)
      stateCache.set(uuid, state.name)
      return state.name
    } catch {
      stateCache.set(uuid, 'Не найдено')
      return 'Не найдено'
    }
  }

  const getMemberCount = async (allianceUuid: string): Promise<number> => {
    try {
      const members = await $fetch<IAllianceMember[]>(`/distant-api/alliances/${allianceUuid}/members`)
      return members.filter(m => !m.is_pending).length
    } catch {
      return 0
    }
  }

  return Promise.all(
      alliancesArray.map(async alliance => {
        const [creatorStateName, memberCount] = await Promise.all([
          getStateName(alliance.creator_state_uuid),
          getMemberCount(alliance.uuid)
        ])
        return { ...alliance, creatorStateName, memberCount }
      })
  )
}

/**
 * Fetches alliances based on the current active tab and search query.
 */
async function fetchCurrentTabData () {
  loading.value = true
  error.value = null

  const currentList = activeTab.value === 'active' ? activeAlliances : dissolvedAlliances

  try {
    const status = activeTab.value === 'active' ? AllianceStatus.ACTIVE : AllianceStatus.DISSOLVED

    // Note: The /alliances/list endpoint doesn't support search according to the spec.
    // We will fetch all and filter client-side.
    // TODO If a search endpoint like /alliances/search becomes available, this can be optimized.
    const rawAlliances = await $fetch<IAlliance[]>('/distant-api/alliances/list')

    let filteredAlliances = rawAlliances.filter(a => a.status === status);

    if (searchQuery.value) {
      filteredAlliances = filteredAlliances.filter(a =>
          a.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    }

    currentList.value = await enrichAlliances(filteredAlliances)
  } catch (e: any) {
    const message = e.data?.message || e.message || 'Не удалось загрузить список альянсов'
    console.error(`Error fetching alliances for tab "${activeTab.value}":`, e)
    error.value = message
    currentList.value = []
  } finally {
    loading.value = false
  }
}

let debounceTimeout: number | undefined
const debouncedFetch = () => {
  clearTimeout(debounceTimeout)
  debounceTimeout = window.setTimeout(fetchCurrentTabData, 300)
}

/* ───── Modals ───── */

function confirmAction (title: string, message: string): Promise<boolean> {
  confirmModal.value = { show: true, title, message, resolve: () => {} }
  return new Promise(resolve => {
    confirmModal.value.resolve = resolve
  })
}

function showAlert (title: string, message: string) {
  alertModal.value = { show: true, title, message }
}

/* ───── Actions ───── */

type ActionType = 'dissolve'
interface ActionPayload {
  type: ActionType
  item: IAlliance
}

async function handleAction (payload: ActionPayload) {
  if (!userUuid.value) return
  const { item, type } = payload

  if (type === 'dissolve') {
    const confirmed = await confirmAction('Распустить альянс?', `Вы уверены, что хотите распустить альянс "${item.name}"? Это действие нельзя отменить.`)
    if (!confirmed) return
  }

  processingUuid.value = item.uuid
  try {
    await $fetch(`/distant-api/alliances/${item.uuid}/dissolve`, {
      method: 'POST',
      body: { byPlayerUuid: userUuid.value } // Assuming admin player UUID is needed
    })
    await fetchCurrentTabData()
  } catch (err: any) {
    console.error(`Ошибка при действии ${type}:`, err)
    showAlert('Ошибка', err.data?.statusMessage || err.message || 'Произошла неизвестная ошибка')
  } finally {
    processingUuid.value = null
  }
}

/* ───── Lifecycle & Watchers ───── */
onMounted(fetchCurrentTabData)

watch(activeTab, (newTab, oldTab) => {
  if (newTab !== oldTab) {
    searchQuery.value = ''
    fetchCurrentTabData()
    window?.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

watch(searchQuery, debouncedFetch)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Управление альянсами</h1>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <div class="flex items-center">
        <button @click="activeTab = 'active'" :class="['tab-btn', activeTab === 'active' && 'tab-active']">Активные</button>
        <button @click="activeTab = 'dissolved'" :class="['tab-btn', activeTab === 'dissolved' && 'tab-active']">Распущенные</button>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input v-model="searchQuery" type="text" placeholder="Поиск по названию..." class="w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>

    <!-- Loading / Error State -->
    <div v-if="loading" class="flex justify-center py-24">
      <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-gray-500"></div>
    </div>
    <div v-else-if="error" class="text-center text-red-400 py-24 bg-red-900/20 rounded-lg">
      <h3 class="font-bold text-lg">Произошла ошибка</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Tables -->
    <div v-else>
      <!-- Active Alliances -->
      <div v-show="activeTab === 'active'" class="relative overflow-x-auto rounded-lg border border-gray-800">
        <table class="min-w-full w-full text-sm text-left align-middle">
          <thead class="bg-gray-800 text-gray-400 uppercase">
          <tr>
            <th class="px-4 py-3">Название</th>
            <th class="px-4 py-3">Цель</th>
            <th class="px-4 py-3">Основатель</th>
            <th class="px-4 py-3">Участников</th>
            <th class="px-4 py-3">Дата создания</th>
            <th class="px-4 py-3 text-center">Действия</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="a in activeAlliances" :key="a.uuid" class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="px-4 py-3 font-medium">
              <div class="flex items-center gap-3">
                <span class="h-3 w-3 rounded-full flex-shrink-0" :style="{ backgroundColor: a.color_hex }"></span>
                <span class="text-white">{{ a.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3">{{ purposeMap[a.purpose as AlliencePurpose] ?? a.purpose }}</td>
            <td class="px-4 py-3">{{ a.creatorStateName }}</td>
            <td class="px-4 py-3 text-center">{{ a.memberCount }}</td>
            <td class="px-4 py-3">{{ formatDate(a.created) }}</td>
            <td class="px-4 py-3 text-center">
              <button @click="handleAction({ type: 'dissolve', item: a })" class="btn-danger" :disabled="processingUuid === a.uuid">Распустить</button>
            </td>
          </tr>
          <tr v-if="activeAlliances.length === 0">
            <td colspan="6" class="text-center py-10 text-gray-500">Нет активных альянсов.</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Dissolved Alliances -->
      <div v-show="activeTab === 'dissolved'" class="relative overflow-x-auto rounded-lg border border-gray-800">
        <table class="min-w-full w-full text-sm text-left align-middle">
          <thead class="bg-gray-800 text-gray-400 uppercase">
          <tr>
            <th class="px-4 py-3">Название</th>
            <th class="px-4 py-3">Основатель</th>
            <th class="px-4 py-3">Статус</th>
            <th class="px-4 py-3">Дата роспуска</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="a in dissolvedAlliances" :key="a.uuid" class="border-b border-gray-800 hover:bg-gray-800/50 text-gray-500">
            <td class="px-4 py-3 font-medium">
              <div class="flex items-center gap-3">
                <span class="h-3 w-3 rounded-full flex-shrink-0" :style="{ backgroundColor: a.color_hex }"></span>
                <span>{{ a.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3">{{ a.creatorStateName }}</td>
            <td class="px-4 py-3 capitalize text-yellow-400">{{ a.status }}</td>
            <td class="px-4 py-3">{{ formatDate(a.updated) }}</td>
          </tr>
          <tr v-if="dissolvedAlliances.length === 0">
            <td colspan="4" class="text-center py-10 text-gray-500">Нет распущенных альянсов.</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity" @click.self="confirmModal.show = false; confirmModal.resolve(false)">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-sm shadow-xl m-4">
      <h3 class="text-lg font-bold text-white">{{ confirmModal.title }}</h3>
      <p class="mt-2 text-gray-300">{{ confirmModal.message }}</p>
      <div class="mt-6 flex justify-end gap-4">
        <button @click="confirmModal.show = false; confirmModal.resolve(false)" class="btn-secondary">Отмена</button>
        <button @click="confirmModal.show = false; confirmModal.resolve(true)" class="btn-danger">Подтвердить</button>
      </div>
    </div>
  </div>

  <!-- Alert Modal -->
  <div v-if="alertModal.show" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity" @click.self="alertModal.show = false">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-sm shadow-xl m-4">
      <h3 class="text-lg font-bold text-red-500">{{ alertModal.title }}</h3>
      <p class="mt-2 text-gray-300">{{ alertModal.message }}</p>
      <div class="mt-6 flex justify-end">
        <button @click="alertModal.show = false" class="btn-primary">OK</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  @apply px-4 py-3 text-base font-semibold text-gray-400 border-b-2 border-transparent -mb-px transition-colors duration-200;
}
.tab-btn:hover {
  @apply text-white;
}
.tab-active {
  @apply border-blue-500 text-blue-500;
}

.btn {
  @apply px-3 py-1.5 rounded-md text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-primary {
  @apply btn bg-blue-600 hover:bg-blue-500 text-white;
}

.btn-secondary {
  @apply btn bg-gray-600 hover:bg-gray-500 text-white;
}

.btn-success {
  @apply btn bg-green-600 hover:bg-green-500 text-white;
}
.btn-warning {
  @apply btn bg-yellow-500 hover:bg-yellow-400 text-black;
}
.btn-danger {
  @apply btn bg-red-600 hover:bg-red-500 text-white;
}

.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
