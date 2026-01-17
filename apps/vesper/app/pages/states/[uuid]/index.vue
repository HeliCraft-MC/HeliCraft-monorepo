<!-- pages/states/[uuid].vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '#imports'

// Import components
import ConfirmationModal from '~/components/ui/ConfirmationModal.vue'
import DiplomaticActionModal from '~/components/states/DiplomaticActionModal.vue'
import StateOrderCard from '~/components/states/StateOrderCard.vue'
import StateWarrantCard from '~/components/states/StateWarrantCard.vue'
import HistoryEventCard from '~/components/history/HistoryEventCard.vue'

// Import types
import { RolesInState, StateStatus, GovernmentForm } from '~/types/state.types'
import type { IState, IStateOrder, IStateWarrant } from '~/types/state.types'
import type { IHistoryEvent } from '~/types/history.types'

definePageMeta({ auth: false })

const route = useRoute()
const router = useRouter()
const uuid = route.params.uuid as string

/* --- Reactive Data --- */
const state = ref<IState | null>(null)
const ruler = ref('')

// Raw data arrays for infinite scroll
const orders = ref<IStateOrder[]>([])
const warrants = ref<IStateWarrant[]>([])
const events = ref<IHistoryEvent[]>([])
const enrichedDataCache = new Map<string, { nickname: string, head: string }>()

// UI State
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const activeOrdersTab = ref<'active' | 'archive'>('active')
const activeWarrantsTab = ref<'active' | 'archive'>('active')

// User specific data
const { data: session } = useAuth()
const userUuid = computed(() => session.value?.uuid)
const userRole = ref<RolesInState | 'none'>('none')
const isAdmin = ref(false)
const isDiplomatForOtherState = ref(false)
const diplomaticStates = ref<string[]>([])

// Modal states
const showConfirmationModal = ref(false)
const confirmationDetails = ref({ title: '', message: '', onConfirm: () => {} })
const showDiplomacyModal = ref(false)

/* --- Computed Properties for Filtering and Sorting --- */
const importanceOrder: Record<IStateOrder['importance'], number> = { pinned: 0, high: 1, medium: 2, low: 3 }

const sortedOrders = computed(() => {
  return [...orders.value].sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
})

const activeOrders = computed(() => {
  return sortedOrders.value.filter(o => !(o.expires_at && new Date(o.expires_at) < new Date()))
})
const archivedOrders = computed(() => {
  return sortedOrders.value.filter(o => o.expires_at && new Date(o.expires_at) < new Date())
})

const activeWarrants = computed(() => {
  return warrants.value.filter(w => !w.actions_taken_by_admins && !w.actions_taken_by_state)
})
const archivedWarrants = computed(() => {
  return warrants.value.filter(w => w.actions_taken_by_admins || w.actions_taken_by_state)
})

/* --- Computed Properties for UI Logic --- */
const isRuler = computed(() => userRole.value === RolesInState.RULER)
const isHighRank = computed(() => [RolesInState.RULER, RolesInState.VICE_RULER, RolesInState.MINISTER].includes(userRole.value as RolesInState))
const isCitizen = computed(() => userRole.value === RolesInState.CITIZEN)
const canTakeAction = computed(() => state.value?.status === StateStatus.ACTIVE)
const canManageRelations = computed(() => isDiplomatForOtherState.value && canTakeAction.value)

/* --- Accent & Color Helpers --- */
const accentRaw = computed(() => state.value?.color_hex || '#ff5555')
const isTooDark = (hex: string) => {
  if (!hex) return false
  const n = parseInt(hex.slice(1), 16)
  const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  return l < 0.25
}
const lighten = (hex: string, amt = 0.5) => {
  if (!hex) return '#ffffff'
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, (n >> 16) + 255 * amt)
  const g = Math.min(255, ((n >> 8) & 255) + 255 * amt)
  const b = Math.min(255, (n & 255) + 255 * amt)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b | 0).toString(16).slice(1)
}
const accent = computed(() => isTooDark(accentRaw.value) ? lighten(accentRaw.value) : accentRaw.value)
const accentBg = computed(() => accentRaw.value)

/* --- Dictionaries for Translations --- */
const govFormTranslations: Record<GovernmentForm, string> = {
  [GovernmentForm.MONARCHY]: 'Монархия',
  [GovernmentForm.REPUBLIC]: 'Республика',
  [GovernmentForm.FEDERATION]: 'Федерация',
  [GovernmentForm.OLIGARCHY]: 'Олигархия / совет',
  [GovernmentForm.TRIBAL]: 'Племенное устройство',
  [GovernmentForm.OTHER]: 'Иное / смешанное'
}
const stateStatusTranslations: Record<StateStatus, string> = {
  [StateStatus.PENDING]: 'Ожидает одобрения',
  [StateStatus.ACTIVE]: 'Активно',
  [StateStatus.REJECTED]: 'Отклонено',
  [StateStatus.MERGED]: 'Объединено',
  [StateStatus.DISSOLVED]: 'Распущено'
}

/* --- API Action Handlers --- */
const handleApiAction = async (action: () => Promise<any>, successMessage: string) => {
  try {
    await action()
    // TODO: Implement a user-friendly toast notification for success
    await loadAll() // Reload data to reflect changes
  } catch (err) {
    console.error(`Ошибка при выполнении действия:`, err)
    // TODO: Implement a user-friendly toast notification for errors
  }
}

const confirmAndExecute = (title: string, message: string, onConfirm: () => Promise<void>) => {
  confirmationDetails.value = { title, message, onConfirm: async () => {
      await onConfirm()
      showConfirmationModal.value = false
    }}
  showConfirmationModal.value = true
}

const approveState = () => confirmAndExecute('Одобрить государство?', 'Вы уверены?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/approve`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Государство одобрено'))
const rejectState = () => confirmAndExecute('Отклонить государство?', 'Вы уверены?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/reject`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Заявка отклонена'))
const denonceState = () => confirmAndExecute('Денонсировать государство?', 'Это приведет к роспуску государства.', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/denonce`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Государство денонсировано'))
const reanonceState = () => confirmAndExecute('Восстановить государство?', 'Государство снова станет активным.', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/reanonce`, { method: 'POST', body: { adminUuid: userUuid.value } }), 'Государство восстановлено'))
const deleteState = () => confirmAndExecute('УДАЛИТЬ ГОСУДАРСТВО?', 'Это действие НЕОБРАТИМО. Все данные будут удалены.', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}`, { method: 'DELETE', body: { adminUuid: userUuid.value } }), 'Государство удалено'))
const leaveState = () => confirmAndExecute('Покинуть государство?', 'Вы уверены?', () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/leave`, { method: 'POST', body: { playerUuid: userUuid.value } }), 'Вы покинули государство'))
const applyToState = () => handleApiAction(() => $fetch(`/distant-api/state/${uuid}/apply`, { method: 'POST', body: { playerUuid: userUuid.value } }), 'Заявка отправлена')


/* --- Data Loading --- */
let ordersOffset = 0, warrantsOffset = 0, eventsOffset = 0
const batch = 10;
const isLoadingMore = ref(false)
let noMoreOrders = false, noMoreWarrants = false, noMoreEvents = false;

const getUserData = async (uuid: string) => {
  if(!uuid) return { nickname: 'N/A', head: '' };
  if (enrichedDataCache.has(uuid)) return enrichedDataCache.get(uuid)!;
  try {
    const user = await $fetch<{nickname: string}>(`/distant-api/user/${uuid}`);
    const data = { nickname: user.nickname, head: `/distant-api/user/${uuid}/skin/head.png` };
    enrichedDataCache.set(uuid, data);
    return data;
  } catch {
    const data = { nickname: 'Не найден', head: '' };
    enrichedDataCache.set(uuid, data);
    return data;
  }
}

async function loadAll() {
  loading.value = true
  errorMessage.value = null
  try {
    const stateData = await $fetch<IState>(`/distant-api/state/${uuid}`)
    state.value = stateData

    // Reset data for reload
    orders.value = []; warrants.value = []; events.value = []
    ordersOffset = 0; warrantsOffset = 0; eventsOffset = 0
    noMoreOrders = false; noMoreWarrants = false; noMoreEvents = false

    const promises = [
      fetchContent(), // Initial content fetch
      getUserData(stateData.ruler_uuid).then(data => { ruler.value = data.nickname }),
    ]
    if (userUuid.value) promises.push(fetchUserPermissions())

    await Promise.all(promises)

  } catch (error: any) {
    errorMessage.value = error.response?.status === 404 ? 'Государство не найдено.' : 'Ошибка загрузки данных.'
    console.error("Ошибка загрузки:", error)
  } finally {
    loading.value = false
    nextTick(watchDom)
  }
}

async function fetchUserPermissions() {
  if (!userUuid.value) return
  try {
    const [roleData, adminData, diplomatData] = await Promise.all([
      $fetch<{ role: RolesInState }>(`/distant-api/state/${uuid}/member/${userUuid.value}`).catch(() => ({ role: 'none' })),
      $fetch<boolean>(`/distant-api/user/${userUuid.value}/isAdmin`).catch(() => false),
      $fetch<{ stateUuid: string, isDiplomaticActionsAllowed: boolean }[]>(`/distant-api/user/${userUuid.value}/isDiplomaticActionsAllowedForPlayer`).catch(() => [])
    ])
    userRole.value = roleData.role
    isAdmin.value = adminData
    const allowedStatesUuids = diplomatData.filter(d => d.isDiplomaticActionsAllowed).map(d => d.stateUuid)
    diplomaticStates.value = allowedStatesUuids
    isDiplomatForOtherState.value = allowedStatesUuids.length > 0 && !allowedStatesUuids.includes(uuid)
  } catch (error) {
    console.error("Ошибка получения прав:", error)
    userRole.value = 'none'; isAdmin.value = false; isDiplomatForOtherState.value = false
  }
}

/* --- Infinite Scroll --- */
let io: IntersectionObserver | null = null
onMounted(() => {
  io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !isLoadingMore.value) loadMore()
  }, { threshold: 0.5, rootMargin: '0px 0px 300px 0px' })
  loadAll()
})
onBeforeUnmount(() => { if (io) io.disconnect() })

function watchDom() {
  if (!io) return
  io.disconnect()
  const sentinel = document.getElementById('bottom-sentinel')
  if (sentinel) io.observe(sentinel)
}

async function fetchContent() {
  const promises = []
  if (!noMoreOrders) promises.push(fetchOrders())
  if (!noMoreWarrants) promises.push(fetchWarrants())
  if (!noMoreEvents) promises.push(fetchEvents())
  await Promise.allSettled(promises)
}

async function fetchOrders() {
  const newOrders = await $fetch<IStateOrder[]>('/distant-api/order/list',{ query:{stateUuid:uuid,startAt:ordersOffset,limit:batch}}).catch(()=>[])
  if(newOrders.length < batch) noMoreOrders = true;
  if(newOrders.length > 0) {
    const userUuidsToFetch = new Set(newOrders.map(o => o.issued_by_player_uuid).filter(Boolean));
    const userFetchPromises = Array.from(userUuidsToFetch)
        .filter(id => !enrichedDataCache.has(id))
        .map(id => getUserData(id));
    await Promise.all(userFetchPromises);
    orders.value.push(...newOrders);
    ordersOffset += batch;
  }
}

async function fetchWarrants() {
  const newWarrants = await $fetch<IStateWarrant[]>('/distant-api/warrant/list',{ query:{stateUuid:uuid,startAt:warrantsOffset,limit:batch}}).catch(()=>[])
  if(newWarrants.length < batch) noMoreWarrants = true;
  if(newWarrants.length > 0) {
    const userUuidsToFetch = new Set<string>();
    newWarrants.forEach(w => {
      if (w.affected_player_uuid) userUuidsToFetch.add(w.affected_player_uuid);
      if (w.issued_by_player_uuid) userUuidsToFetch.add(w.issued_by_player_uuid);
    });

    const userFetchPromises = Array.from(userUuidsToFetch)
        .filter(id => !enrichedDataCache.has(id))
        .map(id => getUserData(id));
    await Promise.all(userFetchPromises);
    warrants.value.push(...newWarrants);
    warrantsOffset += batch;
  }
}

async function fetchEvents() {
  const newEvents = await $fetch<IHistoryEvent[]>('/distant-api/history/list', { query: { stateUuid: uuid, startAt: eventsOffset, limit: batch } }).catch(() => []);
  if(newEvents.length < batch) noMoreEvents = true;
  if(newEvents.length > 0) { events.value.push(...newEvents); eventsOffset += batch; }
}

async function loadMore() {
  if (isLoadingMore.value || (noMoreOrders && noMoreWarrants && noMoreEvents)) return
  isLoadingMore.value = true
  await fetchContent()
  isLoadingMore.value = false
}

</script>


<template>
  <div class="bg-black text-white min-h-screen" :style="{ '--accent': accent, '--accent-bg': accentBg }">
    <ConfirmationModal :is-open="showConfirmationModal" :title="confirmationDetails.title" :message="confirmationDetails.message" @close="showConfirmationModal = false" @confirm="confirmationDetails.onConfirm"/>
    <DiplomaticActionModal v-if="state" :is-open="showDiplomacyModal" :state-uuid="uuid" :state-name="state.name" :managing-states="diplomaticStates" :accent-color="accent" @close="showDiplomacyModal = false"/>

    <div v-if="loading" class="fixed inset-0 flex flex-col items-center justify-center bg-black/80 z-50">
      <div class="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-neutral-600"></div>
      <p class="mt-4 text-lg text-gray-400">Загружаем данные государства...</p>
    </div>

    <div v-else-if="errorMessage" class="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <Icon name="solar:danger-triangle-bold-duotone" class="w-20 h-20 text-red-500 mb-4"/>
      <h2 class="text-3xl font-bold text-red-400">Произошла ошибка</h2>
      <p class="mt-2 text-lg text-gray-400 max-w-md">{{ errorMessage }}</p>
      <button @click="router.push('/')" class="mt-8 btn-action-primary">Вернуться на главную</button>
    </div>

    <main v-else-if="state" class="fade-in max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      <header class="pt-24 pb-12 md:pt-28 md:pb-16">
        <div class="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
          <img :src="state.flag_link" alt="Флаг государства" class="w-40 h-auto object-cover rounded-lg shadow-lg shadow-black/50 border-2 border-gray-700 flex-shrink-0"/>
          <div class="flex-1 space-y-4 text-center md:text-left">
            <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight" :style="{ color: 'var(--accent)' }">{{ state.name }}</h1>
            <p class="text-gray-300 whitespace-pre-line text-base leading-relaxed max-w-4xl">{{ state.description }}</p>
            <div class="flex items-center justify-center md:justify-start gap-4 pt-2">
              <a v-if="state.map_link" :href="state.map_link" target="_blank" rel="noopener noreferrer" class="external-link"><Icon name="solar:map-bold-duotone" class="w-5 h-5"/><span>Карта</span></a>
              <a v-if="state.telegram_link" :href="state.telegram_link" target="_blank" rel="noopener noreferrer" class="external-link"><Icon name="solar:plain-bold-duotone" class="w-5 h-5"/><span>Telegram</span></a>
            </div>
          </div>
        </div>
      </header>

      <div class="space-y-10 md:space-y-12 pb-16">
        <section>
          <div class="border-t border-gray-800 pt-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div class="info-item"><Icon name="solar:branching-paths-up-bold-duotone" class="info-icon"/><div><span class="info-label">Форма правления</span><p class="info-value">{{ govFormTranslations[state.gov_form] || state.gov_form }}</p></div></div>
              <div class="info-item"><Icon name="solar:check-circle-bold-duotone" class="info-icon"/><div><span class="info-label">Статус</span><p class="info-value">{{ stateStatusTranslations[state.status] || state.status }}</p></div></div>
              <div class="info-item"><Icon name="solar:crown-minimalistic-bold-duotone" class="info-icon"/><div><span class="info-label">Правитель</span><p class="info-value">{{ ruler }}</p></div></div>
              <div class="info-item"><Icon name="solar:archive-check-bold-duotone" class="info-icon"/><div><span class="info-label">Выборы</span><p class="info-value">{{ state.has_elections ? 'Проводятся' : 'Отсутствуют' }}</p></div></div>
              <div class="info-item"><Icon name="solar:users-group-two-rounded-bold-duotone" class="info-icon"/><div><span class="info-label">Двойное гражданство</span><p class="info-value">{{ state.allow_dual_citizenship ? 'Разрешено' : 'Запрещено' }}</p></div></div>
              <div class="info-item"><Icon name="solar:exit-bold-duotone" class="info-icon"/><div><span class="info-label">Вход на территорию</span><p class="info-value">{{ state.free_entry ? 'Свободный' : 'Ограниченный' }}</p></div></div>
              <div v-if="!state.free_entry && state.free_entry_description" class="sm:col-span-2 lg:col-span-3 bg-gray-800/50 p-4 rounded-lg mt-2">
                <h4 class="font-semibold mb-2" :style="{ color: 'var(--accent)' }">Порядок входа на территорию:</h4>
                <p class="text-gray-400 text-sm whitespace-pre-line">{{ state.free_entry_description }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ACTION PANELS -->
        <section v-if="userUuid" class="space-y-6">
          <div v-if="isAdmin" class="admin-panel">
            <h3 class="panel-header"><Icon name="solar:shield-user-bold-duotone" />Панель администратора</h3>
            <div class="flex flex-wrap gap-4 items-center">
              <template v-if="state.status === 'pending'"><button @click="approveState" class="btn-admin-success">Одобрить</button><button @click="rejectState" class="btn-admin-warning">Отклонить</button></template>
              <button v-if="state.status === 'active'" @click="denonceState" class="btn-admin-warning">Денонсировать</button>
              <button v-if="state.status === 'dissolved'" @click="reanonceState" class="btn-admin-success">Восстановить</button>
              <button v-if="state.status !== 'merged'" @click="deleteState" class="btn-admin-danger md:ml-auto">Удалить</button>
            </div>
          </div>
          <div v-if="state.status !== StateStatus.PENDING" class="user-panel">
            <h3 class="panel-header"><Icon name="solar:settings-bold-duotone" />Панель управления</h3>
            <div class="flex flex-wrap gap-3 items-center">
              <NuxtLink v-if="isHighRank && canTakeAction" :to="uuid + '/panel'" class="btn-action-primary"><Icon name="solar:widget-5-bold-duotone" /><span>Панель управления</span></NuxtLink>
              <button v-if="isRuler && canTakeAction" @click="denonceState" class="btn-action-danger"><Icon name="solar:gavel-bold-duotone"/><span>Распустить</span></button>
              <button v-if="isCitizen && canTakeAction" @click="leaveState" class="btn-action-danger"><Icon name="solar:logout-3-bold-duotone"/><span>Выйти</span></button>
              <div v-if="userRole === 'applicant' && canTakeAction" class="status-banner info"><Icon name="solar:clock-circle-bold-duotone"/><span>Ваша заявка на вступление отправлена.</span></div>
              <button v-else-if="userRole === 'none' && canTakeAction" @click="applyToState" class="btn-action-success"><Icon name="solar:user-plus-rounded-bold-duotone"/><span>Подать заявку</span></button>
              <button v-if="canManageRelations" @click="showDiplomacyModal = true" class="btn-action-secondary"><Icon name="solar:hand-shake-bold-duotone"/><span>Дипломатия</span></button>
            </div>
          </div>
        </section>

        <!-- 3-COLUMN FEED -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="space-y-4">
            <h2 class="feed-header">Указы</h2>
            <div class="tab-container"><button @click="activeOrdersTab = 'active'" :class="{'tab-active': activeOrdersTab === 'active'}">Активные</button><button @click="activeOrdersTab = 'archive'" :class="{'tab-active': activeOrdersTab === 'archive'}">Архив</button></div>
            <div v-if="activeOrdersTab === 'active'">
              <div v-if="!activeOrders.length" class="feed-empty-state">Активных указов нет</div>
              <StateOrderCard v-for="o in activeOrders" :key="o.uuid" :order="o" :color="accent" :issuerPlayerNickname="enrichedDataCache.get(o.issued_by_player_uuid)?.nickname || '...'" :issuerPlayerHead="enrichedDataCache.get(o.issued_by_player_uuid)?.head || ''"/>
            </div>
            <div v-if="activeOrdersTab === 'archive'">
              <div v-if="!archivedOrders.length" class="feed-empty-state">Архивных указов нет</div>
              <StateOrderCard v-for="o in archivedOrders" :key="o.uuid" :order="o" :color="accent" :issuerPlayerNickname="enrichedDataCache.get(o.issued_by_player_uuid)?.nickname || '...'" :issuerPlayerHead="enrichedDataCache.get(o.issued_by_player_uuid)?.head || ''"/>
            </div>
          </div>
          <div class="space-y-4">
            <h2 class="feed-header">Ордеры</h2>
            <div class="tab-container"><button @click="activeWarrantsTab = 'active'" :class="{'tab-active': activeWarrantsTab === 'active'}">Активные</button><button @click="activeWarrantsTab = 'archive'" :class="{'tab-active': activeWarrantsTab === 'archive'}">Архив</button></div>
            <div v-if="activeWarrantsTab === 'active'">
              <div v-if="!activeWarrants.length" class="feed-empty-state">Активных ордеров нет</div>
              <StateWarrantCard v-for="w in activeWarrants" :key="w.uuid" :warrant="w" :color="accent" :affectedPlayerNickname="enrichedDataCache.get(w.affected_player_uuid)?.nickname || '...'" :issuerPlayerNickname="enrichedDataCache.get(w.issued_by_player_uuid)?.nickname || '...'"/>
            </div>
            <div v-if="activeWarrantsTab === 'archive'">
              <div v-if="!archivedWarrants.length" class="feed-empty-state">Архивных ордеров нет</div>
              <StateWarrantCard v-for="w in archivedWarrants" :key="w.uuid" :warrant="w" :color="accent" :affectedPlayerNickname="enrichedDataCache.get(w.affected_player_uuid)?.nickname || '...'" :issuerPlayerNickname="enrichedDataCache.get(w.issued_by_player_uuid)?.nickname || '...'"/>
            </div>
          </div>
          <div class="space-y-4">
            <h2 class="feed-header">История</h2>
            <div v-if="!events.length" class="feed-empty-state">Событий нет</div>
            <HistoryEventCard v-for="e in events" :key="e.uuid" :event="e" :color="accent"/>
          </div>
        </section>
      </div>

      <div id="bottom-sentinel" class="w-full h-10"></div>
      <div v-if="isLoadingMore" class="flex justify-center py-8"><div class="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-neutral-600"></div></div>
    </main>
  </div>
</template>


<style scoped>
:root {
  --accent: #ff5555;
  --accent-bg: #ff5555;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.5s ease-out forwards; }

.external-link { @apply inline-flex items-center gap-2 text-sm bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 font-semibold rounded-lg px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-md; }

.info-item { @apply flex items-center gap-4 bg-gray-800/30 p-3 rounded-lg transition hover:bg-gray-800/60; }
.info-icon { @apply w-10 h-10 p-2 rounded-lg shrink-0 text-[color:var(--accent)]; }
.info-label { @apply text-xs text-gray-500; }
.info-value { @apply font-semibold text-gray-200; }

.panel-header { @apply text-lg font-bold text-gray-200 mb-4 flex items-center gap-2; }
.admin-panel { @apply bg-purple-900/30 border border-purple-500/50 rounded-lg p-4; }
.user-panel { @apply bg-gray-800/70 border border-gray-700/80 rounded-lg p-4; }
.status-banner { @apply w-full flex items-center gap-3 text-sm font-semibold p-3 rounded-lg; }
.status-banner.info { @apply bg-blue-900/50 text-blue-300; }

.feed-header { @apply font-bold text-2xl pb-3 border-b-2 border-gray-800; }
.feed-empty-state { @apply text-gray-500 text-center py-10 bg-gray-800/20 rounded-lg border border-dashed border-gray-700; }

.tab-container { @apply flex items-center gap-2 p-1 bg-gray-800/50 rounded-lg w-full mb-2; }
.tab-container button { @apply flex-1 text-center text-sm font-semibold text-gray-400 px-3 py-1.5 rounded-md transition-colors; }
.tab-container button.tab-active { @apply bg-gray-700 text-white; }

.btn-base { @apply inline-flex items-center justify-center gap-2.5 font-semibold rounded-lg px-5 py-2.5 transition-all duration-200 transform focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed; }
.btn-action-primary { @apply btn-base bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400 shadow-md hover:shadow-lg; }
.btn-action-secondary { @apply btn-base bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-400 shadow-md hover:shadow-lg; }
.btn-action-danger { @apply btn-base bg-red-700 hover:bg-red-600 text-white focus:ring-red-500 shadow-md hover:shadow-lg; }
.btn-action-success { @apply btn-base bg-green-600 hover:bg-green-500 text-white focus:ring-green-400 shadow-md hover:shadow-lg; }

.btn-admin-success { @apply btn-base bg-green-500 hover:bg-green-400 text-white focus:ring-green-300; }
.btn-admin-warning { @apply btn-base bg-yellow-500 hover:bg-yellow-400 text-black font-bold focus:ring-yellow-300; }
.btn-admin-danger { @apply btn-base bg-red-700 hover:bg-red-600 text-white focus:ring-red-500; }
</style>
