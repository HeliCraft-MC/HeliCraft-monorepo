<!-- components/panel/WarrantsPanel.vue -->
<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import type { IStateWarrant } from '~/types/state.types';
import StateWarrantCard from '~/components/states/StateWarrantCard.vue';

type WarrantWithDetails = IStateWarrant & { issuerNickname?: string, affectedNickname?: string };
type UserSearchResult = { uuid: string; nickname: string; };
type ApiUserResponse = { UUID: string; NICKNAME: string; };

const props = defineProps<{ stateUuid: string, accentColor?: string }>();

const warrants = ref<WarrantWithDetails[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isCreateModalOpen = ref(false);
const isSubmitting = ref(false);
const activeTab = ref<'active' | 'archive'>('active');
const { data: session } = useAuth();
const currentUserUuid = computed(() => session.value?.uuid);

const newWarrant = reactive({ affectedPlayerNickname: '', affectedPlayerUuid: null as string | null, reason: '' });
const searchResults = ref<UserSearchResult[]>([]);
const isSearching = ref(false);
let debounceTimer: ReturnType<typeof setTimeout>;

const activeWarrants = computed(() => warrants.value.filter(w => !w.actions_taken_by_admins && !w.actions_taken_by_state));
const archivedWarrants = computed(() => warrants.value.filter(w => w.actions_taken_by_admins || w.actions_taken_by_state));

async function fetchWarrants() {
  if (!props.stateUuid) return;
  loading.value = true;
  error.value = null;
  try {
    const warrantList = await $fetch<IStateWarrant[]>(`/distant-api/warrant/list`, { query: { stateUuid: props.stateUuid, limit: 1000 } });
    warrants.value = await Promise.all(warrantList.map(async (warrant) => {
      try {
        const issuer = await $fetch<{ nickname: string }>(`/distant-api/user/${warrant.issued_by_player_uuid}`);
        const affected = await $fetch<{ nickname: string }>(`/distant-api/user/${warrant.affected_player_uuid}`);
        return { ...warrant, issuerNickname: issuer.nickname, affectedNickname: affected.nickname };
      } catch { return { ...warrant, issuerNickname: 'Неизвестно', affectedNickname: 'Неизвестно' }; }
    }));
    warrants.value.sort((a, b) => b.created - a.created);
  } catch (err: any) { error.value = err.message; } finally { loading.value = false; }
}

async function handleCreate() {
  if (!props.stateUuid || !currentUserUuid.value || !newWarrant.affectedPlayerUuid) return;
  isSubmitting.value = true;
  try {
    await $fetch('/distant-api/warrant/create', { method: 'POST', body: { ...newWarrant, stateUuid: props.stateUuid, issuedByPlayerUuid: currentUserUuid.value } });
    closeModal();
    await fetchWarrants();
  } catch (err: any) { console.error(`Ошибка выдачи ордера: ${err.data?.statusMessage || err.message}`); }
  finally { isSubmitting.value = false; }
}

async function handleDelete(warrantUuid: string) {
  if (!currentUserUuid.value || !confirm('Вы уверены, что хотите отозвать этот ордер?')) return;
  try {
    await $fetch(`/distant-api/warrant/${warrantUuid}/delete`, { method: 'POST', body: { requesterUuid: currentUserUuid.value } });
    await fetchWarrants();
  } catch (err: any) { console.error(`Ошибка удаления ордера: ${err.data?.statusMessage || err.message}`); }
}

const debouncedSearch = () => {
  newWarrant.affectedPlayerUuid = null;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(searchUsers, 300);
};

async function searchUsers() {
  if (newWarrant.affectedPlayerNickname.trim().length < 2) { searchResults.value = []; return; }
  isSearching.value = true;
  try {
    const usersFromApi = await $fetch<ApiUserResponse[]>(`/distant-api/user/search`, { query: { nickname: newWarrant.affectedPlayerNickname, limit: 5 } });
    searchResults.value = usersFromApi.map(user => ({ uuid: user.UUID, nickname: user.NICKNAME }));
  } catch (err: any) { if (err.statusCode !== 404) console.error("Search error:", err); searchResults.value = []; }
  finally { isSearching.value = false; }
}

function selectUser(user: UserSearchResult) {
  newWarrant.affectedPlayerNickname = user.nickname;
  newWarrant.affectedPlayerUuid = user.uuid;
  searchResults.value = [];
}

function resetForm() { Object.assign(newWarrant, { affectedPlayerNickname: '', affectedPlayerUuid: null, reason: '' }); searchResults.value = []; isSearching.value = false; clearTimeout(debounceTimer); }
function closeModal() { isCreateModalOpen.value = false; resetForm(); }

onMounted(() => { if (props.stateUuid) fetchWarrants(); });
watch(() => props.stateUuid, (newUuid) => { if (newUuid) fetchWarrants(); });
</script>

<template>
  <div class="space-y-4">
    <div class="panel-header-container">
      <h2 class="panel-header"><Icon name="solar:user-hand-up-bold-duotone" />Управление Ордерами</h2>
      <button @click="isCreateModalOpen = true" class="action-button-danger"><Icon name="solar:add-circle-bold" /><span>Выдать ордер</span></button>
    </div>

    <div class="tab-container">
      <button @click="activeTab = 'active'" :class="{'tab-active': activeTab === 'active'}">Активные ({{ activeWarrants.length }})</button>
      <button @click="activeTab = 'archive'" :class="{'tab-active': activeTab === 'archive'}">Архив ({{ archivedWarrants.length }})</button>
    </div>

    <div v-if="loading" class="loading-spinner"><div class="spinner"></div></div>
    <div v-else-if="error" class="feed-empty-state">Не удалось загрузить ордеры.</div>

    <div v-else>
      <div v-show="activeTab === 'active'" class="space-y-4">
        <div v-if="!activeWarrants.length" class="feed-empty-state">Нет активных ордеров.</div>
        <StateWarrantCard v-for="warrant in activeWarrants" :key="warrant.uuid" :warrant="warrant" :color="accentColor" :affectedPlayerNickname="warrant.affectedNickname!" :issuerPlayerNickname="warrant.issuerNickname!" :canManage="true" @delete="handleDelete"/>
      </div>
      <div v-show="activeTab === 'archive'" class="space-y-4">
        <div v-if="!archivedWarrants.length" class="feed-empty-state">Архив ордеров пуст.</div>
        <StateWarrantCard v-for="warrant in archivedWarrants" :key="warrant.uuid" :warrant="warrant" :color="accentColor" :affectedPlayerNickname="warrant.affectedNickname!" :issuerPlayerNickname="warrant.issuerNickname!" :canManage="true" @delete="handleDelete"/>
      </div>
    </div>

    <div v-if="isCreateModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <h3 class="modal-title">Выдать ордер</h3>
        <form @submit.prevent="handleCreate" class="space-y-4">
          <div class="relative">
            <input v-model="newWarrant.affectedPlayerNickname" @input="debouncedSearch" type="text" placeholder="Никнейм игрока" class="form-input" required autocomplete="off">
            <div v-if="newWarrant.affectedPlayerNickname.length > 1" class="search-results">
              <div v-if="isSearching" class="search-item-info">Поиск...</div>
              <ul v-else-if="searchResults.length > 0">
                <li v-for="user in searchResults" :key="user.uuid" @click="selectUser(user)" class="search-item">
                  <img :src="`/distant-api/user/${user.uuid}/skin/head.png`" alt="head" class="w-6 h-6 rounded-sm">
                  <span>{{ user.nickname }}</span>
                </li>
              </ul>
              <div v-else class="search-item-info">Игроки не найдены.</div>
            </div>
          </div>
          <textarea v-model="newWarrant.reason" placeholder="Причина..." class="form-input" rows="4" required></textarea>
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="form-button-secondary">Отмена</button>
            <button type="submit" class="form-button-primary bg-red-600 hover:bg-red-500 focus:ring-red-400" :disabled="isSubmitting || !newWarrant.affectedPlayerUuid">
              <span v-if="!isSubmitting">Выдать</span><span v-else>Отправка...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles for both panels */
.panel-header-container { @apply flex justify-between items-center pb-4 border-b border-gray-700/50; }
.panel-header { @apply text-2xl font-bold flex items-center gap-3 text-white; }
.action-button-danger { @apply inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 bg-red-600/10 text-red-300 hover:bg-red-600/20; }
.modal-backdrop { @apply fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4; }
.modal-content { @apply bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg shadow-2xl; }
.modal-title { @apply text-xl font-bold mb-4 text-white; }
.modal-actions { @apply flex justify-end gap-3 pt-4; }
.form-input { @apply w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900; }
.form-input:focus { --tw-ring-color: v-bind(accentColor); }
.form-button-primary { @apply px-4 py-2 rounded-md font-semibold text-white transition-colors; }
.form-button-primary:disabled { @apply opacity-50 cursor-not-allowed; }
.form-button-secondary { @apply px-4 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors; }
.feed-empty-state { @apply text-gray-500 text-center py-10 bg-gray-800/20 rounded-lg border border-dashed border-gray-700; }
.tab-container { @apply flex items-center gap-2 p-1 bg-gray-800/50 rounded-lg w-full mb-2; }
.tab-container button { @apply flex-1 text-center text-sm font-semibold text-gray-400 px-3 py-1.5 rounded-md transition-colors; }
.tab-container button.tab-active { @apply bg-gray-700 text-white; }
.loading-spinner { @apply flex justify-center items-center py-10; }
.spinner { @apply w-8 h-8 border-4 border-dashed rounded-full animate-spin border-neutral-500; }
.search-results { @apply absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto; }
.search-item { @apply px-4 py-2 text-white hover:bg-blue-600/20 cursor-pointer flex items-center gap-3; }
.search-item-info { @apply px-4 py-2 text-gray-400; }
</style>