<!-- pages/admin/warrants.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAuth } from '#imports'
import { StateStatus } from '~/types/state.types'
import type { IStateWarrant, IState } from '~/types/state.types'

definePageMeta({ layout: 'admin' })

/* ───── Auth ───── */
const { data: session } = useAuth()
const userUuid = computed(() => session.value?.uuid)

/* ───── Reactive state ───── */
interface IEnrichedWarrant extends IStateWarrant {
  affectedPlayerNickname?: string
  issuerPlayerNickname?: string
  affectedPlayerHead?: string
  issuerPlayerHead?: string
}

// Data containers
const warrants = ref<IEnrichedWarrant[]>([])
const selectedState = ref<{ uuid: string, name: string } | null>(null)
const stateSearchQuery = ref('')
const stateSearchResults = ref<IState[]>([])

// UI State
const loadingWarrants = ref(false)
const loadingStates = ref(false)
const error = ref<string | null>(null)
const processingUuid = ref<string | null>(null)

// Modal States
const confirmModal = ref({ show: false, title: '', message: '', resolve: (value: boolean) => {} })
const alertModal = ref({ show: false, title: '', message: '' })
const updateModal = ref({
  show: false,
  warrant: null as IEnrichedWarrant | null,
  actions_taken_by_admins: false,
  actions_by_admins_details: '',
})


/* ───── Helpers ───── */
const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

/* ───── API & Data Fetching ───── */

/**
 * Fetches player nicknames and skin heads for a list of warrants to enrich the data.
 * @param warrantsArray The array of warrants to process.
 */
async function enrichWarrants(warrantsArray: IStateWarrant[]): Promise<IEnrichedWarrant[]> {
  const userCache = new Map<string, { nickname: string; head: string }>()

  const getUserInfo = async (uuid: string): Promise<{ nickname: string; head: string }> => {
    if (!uuid) return { nickname: '—', head: '' }
    if (userCache.has(uuid)) {
      return userCache.get(uuid)!
    }
    try {
      // Assuming a user object with a nickname is returned.
      const user = await $fetch<{ nickname: string }>(`/distant-api/user/${uuid}`)
      const userInfo = { nickname: user.nickname, head: `/distant-api/user/${uuid}/skin/head.png` }
      userCache.set(uuid, userInfo)
      return userInfo
    } catch {
      const notFoundInfo = { nickname: 'Не найден', head: '' }
      userCache.set(uuid, notFoundInfo)
      return notFoundInfo
    }
  }

  return Promise.all(
      warrantsArray.map(async warrant => {
        const [affectedPlayer, issuerPlayer] = await Promise.all([
          getUserInfo(warrant.affected_player_uuid),
          getUserInfo(warrant.issued_by_player_uuid),
        ])
        return {
          ...warrant,
          affectedPlayerNickname: affectedPlayer.nickname,
          issuerPlayerNickname: issuerPlayer.nickname,
          affectedPlayerHead: affectedPlayer.head,
          issuerPlayerHead: issuerPlayer.head,
        }
      })
  )
}

/**
 * Fetches warrants for a given state UUID.
 * @param stateUuid The UUID of the state for which to fetch warrants.
 */
async function fetchWarrantsForState(stateUuid: string) {
  if (!stateUuid) {
    warrants.value = []
    return
  }
  loadingWarrants.value = true
  error.value = null
  warrants.value = []

  try {
    const rawWarrants = await $fetch<IStateWarrant[]>('/distant-api/warrant/list', {
      params: { stateUuid: stateUuid },
    })
    warrants.value = await enrichWarrants(rawWarrants)

  } catch (e: any) {
    const message = e.data?.statusMessage || e.message || 'Не удалось загрузить ордеры'
    console.error(`Error fetching warrants for state UUID "${stateUuid}":`, e)
    error.value = message
  } finally {
    loadingWarrants.value = false
  }
}

/**
 * Searches for states by name based on user input.
 */
async function searchStates() {
  if (!stateSearchQuery.value || stateSearchQuery.value.length < 2) {
    stateSearchResults.value = []
    return
  }
  loadingStates.value = true
  try {
    const results = await $fetch<IState[]>('/distant-api/state/search', {
      params: {
        search: stateSearchQuery.value,
        status: StateStatus.ACTIVE // Only search for active states
      }
    })
    stateSearchResults.value = results
  } catch(e) {
    console.error('Ошибка поиска государств:', e)
    stateSearchResults.value = [] // clear on error
  } finally {
    loadingStates.value = false
  }
}

// Debounce the search function to avoid excessive API calls
let searchTimeout: number | undefined;
watch(stateSearchQuery, () => {
  clearTimeout(searchTimeout)
  if (stateSearchQuery.value) {
    searchTimeout = window.setTimeout(searchStates, 300)
  } else {
    stateSearchResults.value = []
  }
})

/**
 * Handles selecting a state from the search results.
 * @param state The state object selected by the user.
 */
function selectState(state: IState) {
  selectedState.value = { uuid: state.uuid, name: state.name }
  stateSearchQuery.value = ''
  stateSearchResults.value = []
  fetchWarrantsForState(state.uuid)
}


/* ───── Modals ───── */

function confirmAction(title: string, message: string): Promise<boolean> {
  confirmModal.value = { show: true, title, message, resolve: () => {} }
  return new Promise(resolve => {
    confirmModal.value.resolve = resolve
  })
}

function showAlert(title: string, message: string) {
  alertModal.value = { show: true, title, message }
}

function openUpdateModal(warrant: IEnrichedWarrant) {
  updateModal.value = {
    show: true,
    warrant: warrant,
    actions_taken_by_admins: warrant.actions_taken_by_admins,
    actions_by_admins_details: warrant.actions_by_admins_details || '',
  }
}

/* ───── Actions ───── */

async function handleDelete(warrant: IEnrichedWarrant) {
  const confirmed = await confirmAction('Удалить ордер?', `Вы уверены, что хотите удалить ордер на игрока "${warrant.affectedPlayerNickname}"?`)
  if (!confirmed) return

  processingUuid.value = warrant.uuid
  try {
    await $fetch(`/distant-api/warrant/${warrant.uuid}/delete`, {
      method: 'POST',
      body: { requesterUuid: userUuid.value },
    })
    // Refresh list to ensure consistency
    if (selectedState.value) {
      await fetchWarrantsForState(selectedState.value.uuid)
    }
  } catch (err: any) {
    console.error('Ошибка при удалении ордера:', err)
    showAlert('Ошибка', err.data?.statusMessage || err.message || 'Произошла неизвестная ошибка')
  } finally {
    processingUuid.value = null
  }
}

async function submitUpdate() {
  const warrant = updateModal.value.warrant
  if (!warrant || !userUuid.value) return

  processingUuid.value = warrant.uuid
  updateModal.value.show = false

  try {
    const payload = {
      actions_taken_by_admins: updateModal.value.actions_taken_by_admins,
      actions_by_admins_details: updateModal.value.actions_by_admins_details,
      updaterUuid: userUuid.value,
    }
    await $fetch(`/distant-api/warrant/${warrant.uuid}/update`, {
      method: 'POST',
      body: payload,
    })

    // Refresh the entire list to get fresh data
    if (selectedState.value) {
      await fetchWarrantsForState(selectedState.value.uuid)
    }

  } catch (err: any) {
    console.error('Ошибка при обновлении ордера:', err)
    showAlert('Ошибка', err.data?.statusMessage || err.message || 'Произошла неизвестная ошибка')
  } finally {
    processingUuid.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Управление ордерами</h1>

    <!-- State Search Component -->
    <div class="bg-gray-800/50 border border-gray-700 p-4 rounded-lg">
      <label for="state-search-input" class="block mb-2 text-sm font-medium text-gray-300">
        Найдите государство по названию
      </label>
      <div class="relative">
        <input
            id="state-search-input"
            v-model="stateSearchQuery"
            type="text"
            placeholder="Начните вводить название..."
            class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autocomplete="off"
        />
        <!-- Search Results Dropdown -->
        <div v-if="stateSearchQuery" class="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div v-if="loadingStates" class="p-3 text-center text-gray-400">Поиск...</div>
          <ul v-else-if="stateSearchResults.length > 0">
            <li v-for="state in stateSearchResults" :key="state.uuid" @click="selectState(state)" class="px-4 py-3 cursor-pointer hover:bg-blue-600/20 text-white">
              {{ state.name }}
            </li>
          </ul>
          <div v-else-if="!loadingStates && stateSearchQuery.length > 1" class="px-4 py-3 text-gray-500">
            Ничего не найдено.
          </div>
        </div>
      </div>
    </div>

    <!-- Loading / Error State -->
    <div v-if="loadingWarrants" class="flex justify-center py-24">
      <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-gray-500"></div>
    </div>
    <div v-else-if="error" class="text-center text-red-400 py-10 bg-red-900/20 rounded-lg">
      <h3 class="font-bold text-lg">Произошла ошибка</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Warrants Table -->
    <div v-else-if="selectedState">
      <h2 class="text-2xl font-semibold mb-4">Ордеры государства: <span class="text-blue-400">{{ selectedState.name }}</span></h2>
      <div v-if="warrants.length > 0" class="relative overflow-x-auto rounded-lg border border-gray-800">
        <table class="min-w-full w-full text-sm text-left align-top">
          <thead class="bg-gray-800 text-gray-400 uppercase">
          <tr>
            <th class="px-4 py-3">Игрок</th>
            <th class="px-4 py-3">Выдан кем</th>
            <th class="px-4 py-3">Причина</th>
            <th class="px-4 py-3">Админ. действия</th>
            <th class="px-4 py-3">Дата выдачи</th>
            <th class="px-4 py-3 text-center">Действия</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="w in warrants" :key="w.uuid" class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2 font-medium">
                <img v-if="w.affectedPlayerHead" :src="w.affectedPlayerHead" :alt="w.affectedPlayerNickname" class="w-8 h-8 rounded flex-shrink-0" />
                <span>{{ w.affectedPlayerNickname }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2 text-gray-400">
                <img v-if="w.issuerPlayerHead" :src="w.issuerPlayerHead" :alt="w.issuerPlayerNickname" class="w-8 h-8 rounded flex-shrink-0" />
                <span>{{ w.issuerPlayerNickname }}</span>
              </div>
            </td>
            <td class="px-4 py-3 max-w-xs text-gray-300">{{ w.reason }}</td>
            <td class="px-4 py-3 text-gray-300 max-w-xs">
              <div class="flex items-start gap-2">
                <span v-if="w.actions_taken_by_admins" class="text-green-400 mt-1">✓</span>
                <span v-else class="text-red-400 mt-1">✗</span>
                <p class="whitespace-pre-wrap">{{ w.actions_by_admins_details || 'Нет деталей' }}</p>
              </div>
            </td>
            <td class="px-4 py-3 text-gray-400">{{ formatDate(w.created) }}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex flex-col gap-2 items-center">
                <button @click="openUpdateModal(w)" class="btn-secondary w-full" :disabled="processingUuid === w.uuid">Обновить</button>
                <button @click="handleDelete(w)" class="btn-danger w-full" :disabled="processingUuid === w.uuid">Удалить</button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center py-10 text-gray-500 bg-gray-800/50 rounded-lg">
        Для государства "{{selectedState.name}}" нет выданных ордеров.
      </div>
    </div>
    <!-- Initial empty state message -->
    <div v-else-if="!selectedState && !loadingWarrants" class="text-center py-20 text-gray-500 bg-gray-800/50 rounded-lg">
      <p>Выберите государство, чтобы просмотреть его ордеры.</p>
    </div>
  </div>

  <!-- Modals -->
  <div v-if="updateModal.show" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" @click.self="updateModal.show = false">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-lg shadow-xl m-4">
      <h3 class="text-lg font-bold text-white">Обновить ордер на {{ updateModal.warrant?.affectedPlayerNickname }}</h3>
      <div class="mt-4 space-y-4">
        <div class="flex items-center gap-3">
          <input id="actions-checkbox" type="checkbox" v-model="updateModal.actions_taken_by_admins" class="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500">
          <label for="actions-checkbox" class="text-gray-300">Действия администрацией предприняты</label>
        </div>
        <div>
          <label for="actions-details" class="block text-sm font-medium text-gray-300 mb-1">Детали действий администрации</label>
          <textarea id="actions-details" v-model="updateModal.actions_by_admins_details" rows="4" class="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-blue-500"></textarea>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-4">
        <button @click="updateModal.show = false" class="btn-secondary">Отмена</button>
        <button @click="submitUpdate" class="btn-success" :disabled="processingUuid === updateModal.warrant?.uuid">Сохранить</button>
      </div>
    </div>
  </div>

  <div v-if="confirmModal.show" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" @click.self="confirmModal.show = false; confirmModal.resolve(false)">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-sm shadow-xl m-4">
      <h3 class="text-lg font-bold text-white">{{ confirmModal.title }}</h3>
      <p class="mt-2 text-gray-300">{{ confirmModal.message }}</p>
      <div class="mt-6 flex justify-end gap-4">
        <button @click="confirmModal.show = false; confirmModal.resolve(false)" class="btn-secondary">Отмена</button>
        <button @click="confirmModal.show = false; confirmModal.resolve(true)" class="btn-danger">Подтвердить</button>
      </div>
    </div>
  </div>

  <div v-if="alertModal.show" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" @click.self="alertModal.show = false">
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
.btn {
  @apply px-4 py-2 rounded-md text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-primary { @apply btn bg-blue-600 hover:bg-blue-500 text-white; }
.btn-secondary { @apply btn bg-gray-600 hover:bg-gray-500 text-white; }
.btn-success { @apply btn bg-green-600 hover:bg-green-500 text-white; }
.btn-danger { @apply btn bg-red-600 hover:bg-red-500 text-white; }
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style>
