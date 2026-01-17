<!-- pages/admin/states.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '#imports'
import { StateStatus, GovernmentForm } from '~/types/state.types'
import type { IState } from '~/types/state.types'

definePageMeta({ layout: 'admin' })

/* ───── Auth & router ───── */
const { data: session } = useAuth()
const userUuid = computed(() => session.value?.uuid)
const router = useRouter()

/* ───── Reactive state ───── */
// Assuming IBaseEntity provides created_at and updated_at as numbers (timestamps)
interface IEnrichedState extends IState {
  rulerNickname?: string
  creatorNickname?: string
}

// Data containers for each tab
const activeStates = ref<IEnrichedState[]>([])
const pendingStates = ref<IEnrichedState[]>([])
const denouncedStates = ref<IEnrichedState[]>([])

// UI State
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'active' | 'pending' | 'denounced'>('active')
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

const govFormMap: Record<GovernmentForm, string> = {
  [GovernmentForm.MONARCHY]: 'Монархия',
  [GovernmentForm.REPUBLIC]: 'Республика',
  [GovernmentForm.FEDERATION]: 'Федерация',
  [GovernmentForm.OLIGARCHY]: 'Олигархия',
  [GovernmentForm.TRIBAL]: 'Племя',
  [GovernmentForm.OTHER]: 'Другое',
}

const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return '—'
  // Assuming the timestamp is in milliseconds. If it's in seconds, multiply by 1000.
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/* ───── API & Data Fetching ───── */

/**
 * Fetches ruler and creator nicknames for a list of states to enrich the data.
 * @param statesArray - The array of states to process.
 */
async function enrichStates (statesArray: IState[]): Promise<IEnrichedState[]> {
  const nicknameCache = new Map<string, string>()

  const getNickname = async (uuid: string): Promise<string> => {
    if (!uuid) return '—'
    if (nicknameCache.has(uuid)) {
      return nicknameCache.get(uuid)!
    }
    try {
      const { nickname } = await $fetch<{ nickname: string }>(`/distant-api/user/${uuid}`)
      nicknameCache.set(uuid, nickname)
      return nickname
    } catch {
      nicknameCache.set(uuid, 'Не найден') // Cache "not found" as well
      return 'Не найден'
    }
  }

  return Promise.all(
      statesArray.map(async s => {
        const enrichedState: IEnrichedState = { ...s }
        enrichedState.rulerNickname = await getNickname(s.ruler_uuid)
        enrichedState.creatorNickname = await getNickname(s.creator_uuid)
        return enrichedState
      })
  )
}


/**
 * Fetches states based on the current active tab and search query.
 */
async function fetchCurrentTabData () {
  loading.value = true
  error.value = null

  const currentList = {
    active: activeStates,
    pending: pendingStates,
    denounced: denouncedStates,
  }[activeTab.value]

  try {
    const statusMap: Record<typeof activeTab.value, StateStatus> = {
      active: StateStatus.ACTIVE,
      pending: StateStatus.PENDING,
      denounced: StateStatus.DISSOLVED,
    }
    const status = statusMap[activeTab.value]

    const params: Record<string, string> = { status }
    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    const rawStates = await $fetch<IState[]>('/distant-api/state/search', { params })
    currentList.value = await enrichStates(rawStates)

  } catch (e: any) {
    const message = e.data?.message || e.message || 'Не удалось загрузить список'
    console.error(`Error fetching states for tab "${activeTab.value}":`, e)
    error.value = message
    currentList.value = [] // Clear list on error
  } finally {
    loading.value = false
  }
}

// Debounce the fetch function to avoid excessive API calls while typing
let debounceTimeout: number | undefined
const debouncedFetch = () => {
  clearTimeout(debounceTimeout)
  debounceTimeout = window.setTimeout(() => {
    fetchCurrentTabData()
  }, 300)
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

type ActionType = 'approve' | 'reject' | 'denounce' | 'reanonce' | 'delete'
interface ActionPayload {
  type: ActionType
  item: IState
}

async function handleAction (payload: ActionPayload) {
  if (!userUuid.value) return
  const { item, type } = payload
  processingUuid.value = item.uuid

  const post = (url: string) => $fetch(url, { method: 'POST', body: { adminUuid: userUuid.value } })

  try {
    const actions: Record<ActionType, () => Promise<any>> = {
      approve: () => post(`/distant-api/state/${item.uuid}/approve`),
      reject: () => post(`/distant-api/state/${item.uuid}/reject`),
      denounce: () => post(`/distant-api/state/${item.uuid}/denonce`),
      reanonce: () => post(`/distant-api/state/${item.uuid}/reanonce`),
      delete: async () => {
        const confirmed = await confirmAction('Удалить государство?', `Вы уверены, что хотите безвозвратно удалить "${item.name}"? Это действие нельзя отменить.`)
        if (!confirmed) {
          processingUuid.value = null
          return Promise.resolve()
        }
        return $fetch(`/distant-api/state/${item.uuid}`, { method: 'DELETE', body: { adminUuid: userUuid.value } })
      }
    }

    await actions[type]()

    await fetchCurrentTabData()
  } catch (err: any) {
    if (processingUuid.value !== null) { // only show alert if action wasn't cancelled
      console.error(`Ошибка при действии ${type}:`, err)
      showAlert('Ошибка', err.data?.statusMessage || err.message || 'Произошла неизвестная ошибка')
    }
  } finally {
    processingUuid.value = null
  }
}

/* ───── Lifecycle & Watchers ───── */
onMounted(fetchCurrentTabData)

watch(activeTab, (newTab, oldTab) => {
  if (newTab !== oldTab) {
    searchQuery.value = ''
    fetchCurrentTabData() // This will now always refetch data for the new tab
    window?.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

watch(searchQuery, debouncedFetch)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Управление государствами</h1>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <div class="flex items-center">
        <button @click="activeTab = 'active'" :class="['tab-btn', activeTab === 'active' && 'tab-active']">Активные</button>
        <button @click="activeTab = 'pending'" :class="['tab-btn', activeTab === 'pending' && 'tab-active']">Заявки</button>
        <button @click="activeTab = 'denounced'" :class="['tab-btn', activeTab === 'denounced' && 'tab-active']">Денонсированные</button>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по названию..."
          class="w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
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
      <!-- Active states -->
      <div v-show="activeTab === 'active'" class="relative overflow-x-auto rounded-lg border border-gray-800">
        <table class="min-w-full w-full text-sm text-left align-middle">
          <thead class="bg-gray-800 text-gray-400 uppercase">
          <tr>
            <th class="px-4 py-3">Название</th>
            <th class="px-4 py-3">Правитель</th>
            <th class="px-4 py-3">Форма правления</th>
            <th class="px-4 py-3">Дата создания</th>
            <th class="px-4 py-3 text-center">Действия</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="s in activeStates" :key="s.uuid" class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="px-4 py-3 font-medium">
              <div class="flex items-center gap-3">
                <span class="h-3 w-3 rounded-full flex-shrink-0" :style="{ backgroundColor: s.color_hex }"></span>
                <NuxtLink :to="`/states/${s.uuid}`" class="text-blue-400 hover:underline">{{ s.name }}</NuxtLink>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <img v-if="s.ruler_uuid" class="w-8 h-8 rounded flex-shrink-0" :src="`/distant-api/user/${s.ruler_uuid}/skin/head.png`" :alt="s.rulerNickname" />
                <span>{{ s.rulerNickname ?? '—' }}</span>
              </div>
            </td>
            <td class="px-4 py-3">{{ govFormMap[s.gov_form] ?? s.gov_form }}</td>
            <td class="px-4 py-3">{{ formatDate(s.created) }}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex flex-wrap gap-2 justify-center">
                <button @click="handleAction({ type: 'denounce', item: s })" class="btn-warning" :disabled="processingUuid === s.uuid">Денонсировать</button>
                <button @click="handleAction({ type: 'delete', item: s })" class="btn-danger" :disabled="processingUuid === s.uuid">Удалить</button>
              </div>
            </td>
          </tr>
          <tr v-if="activeStates.length === 0">
            <td colspan="5" class="text-center py-10 text-gray-500">Нет активных государств.</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Pending states -->
      <div v-show="activeTab === 'pending'" class="relative overflow-x-auto rounded-lg border border-gray-800">
        <table class="min-w-full w-full text-sm text-left align-middle">
          <thead class="bg-gray-800 text-gray-400 uppercase">
          <tr>
            <th class="px-4 py-3">Название</th>
            <th class="px-4 py-3">Описание</th>
            <th class="px-4 py-3">Основатель</th>
            <th class="px-4 py-3">Дата подачи</th>
            <th class="px-4 py-3 text-center">Действия</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="s in pendingStates" :key="s.uuid" class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="px-4 py-3 font-semibold">{{ s.name }}</td>
            <td class="px-4 py-3 text-gray-400 line-clamp-2 max-w-xs">{{ s.description }}</td>
            <td class="px-4 py-3">{{ s.creatorNickname ?? '—' }}</td>
            <td class="px-4 py-3">{{ formatDate(s.created) }}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex flex-wrap gap-2 justify-center">
                <button @click="handleAction({ type: 'approve', item: s })" class="btn-success" :disabled="processingUuid === s.uuid">Одобрить</button>
                <button @click="handleAction({ type: 'reject', item: s })" class="btn-danger" :disabled="processingUuid === s.uuid">Отклонить</button>
              </div>
            </td>
          </tr>
          <tr v-if="pendingStates.length === 0">
            <td colspan="5" class="text-center py-10 text-gray-500">Нет заявок на рассмотрении.</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Denounced states -->
      <div v-show="activeTab === 'denounced'" class="relative overflow-x-auto rounded-lg border border-gray-800">
        <table class="min-w-full w-full text-sm text-left align-middle">
          <thead class="bg-gray-800 text-gray-400 uppercase">
          <tr>
            <th class="px-4 py-3">Название</th>
            <th class="px-4 py-3">Правитель</th>
            <th class="px-4 py-3">Статус</th>
            <th class="px-4 py-3">Дата денонсации</th>
            <th class="px-4 py-3 text-center">Действия</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="s in denouncedStates" :key="s.uuid" class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="px-4 py-3 font-medium text-gray-400">{{ s.name }}</td>
            <td class="px-4 py-3 text-gray-400">
              <div class="flex items-center gap-2">
                <img v-if="s.ruler_uuid" class="w-8 h-8 rounded flex-shrink-0" :src="`/user/${s.ruler_uuid}/skin/head.png`" :alt="s.rulerNickname" />
                <span>{{ s.rulerNickname ?? '—' }}</span>
              </div>
            </td>
            <td class="px-4 py-3 capitalize text-yellow-400">{{ s.status }}</td>
            <td class="px-4 py-3">{{ formatDate(s.updated) }}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex flex-wrap gap-2 justify-center">
                <button @click="handleAction({ type: 'reanonce', item: s })" class="btn-success" :disabled="processingUuid === s.uuid">Восстановить</button>
                <button @click="handleAction({ type: 'delete', item: s })" class="btn-danger" :disabled="processingUuid === s.uuid">Удалить</button>
              </div>
            </td>
          </tr>
          <tr v-if="denouncedStates.length === 0">
            <td colspan="5" class="text-center py-10 text-gray-500">Нет денонсированных государств.</td>
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
