<!-- pages/states/[uuid]/panel/relations.vue -->
<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold" :style="{ color: accentColor }">
      Внешняя политика
    </h1>

    <!-- Modal for Diplomatic Actions -->
    <DiplomaticActionModal
        v-if="selectedRelationTarget"
        :is-open="showDiplomacyModal"
        :state-uuid="selectedRelationTarget.uuid"
        :state-name="selectedRelationTarget.name"
        :managing-states="diplomaticStates"
        :accent-color="accentColor"
        @close="showDiplomacyModal = false"
    />

    <!-- Confirmation for leaving alliance -->
    <ConfirmationModal
        :is-open="showLeaveConfirmation"
        title="Покинуть альянс?"
        :message="`Вы уверены, что хотите, чтобы государство ${state?.name} вышло из альянса '${allianceToLeave?.name}'?`"
        @close="showLeaveConfirmation = false"
        @confirm="handleLeaveAlliance"
    />

    <!-- Modal for creating alliance -->
    <CreateAllianceModal
        :is-open="isCreateModalOpen"
        :managed-states="userCreatableStates"
        @close="isCreateModalOpen = false"
        @created="handleAllianceCreated"
    />

    <!-- Tabs -->
    <div class="flex border-b border-gray-700">
      <button
          @click="activeTab = 'relations'"
          class="tab-button"
          :class="{ 'tab-button-active': activeTab === 'relations' }"
      >
        <Icon name="material-symbols:handshake" class="w-5 h-5" />
        <span>Отношения</span>
      </button>
      <button
          @click="activeTab = 'alliances'"
          class="tab-button"
          :class="{ 'tab-button-active': activeTab === 'alliances' }"
      >
        <Icon name="material-symbols:security" class="w-5 h-5" />
        <span>Альянсы</span>
      </button>
    </div>

    <!-- Content -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
    </div>
    <div v-else-if="error" class="text-center py-16 text-red-400">
      <p>Не удалось загрузить данные.</p>
      <p class="text-sm text-gray-500">{{ error }}</p>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Bilateral Relations Tab -->
      <div v-show="activeTab === 'relations'">
        <div class="space-y-8">
          <!-- Requests -->
          <div>
            <h2 class="text-2xl font-semibold text-gray-200 mb-4">
              Запросы на изменение отношений
            </h2>
            <div v-if="!relationRequests.length" class="text-gray-500">
              Новых запросов нет.
            </div>
            <div v-else class="space-y-3">
              <div
                  v-for="req in relationRequests"
                  :key="req.uuid"
                  class="bg-gray-800/70 p-4 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p class="text-gray-300">
                    Отношения с государством
                    <NuxtLink
                        :to="`/states/${getOtherState(req).uuid}`"
                        class="font-bold hover:underline"
                        :style="{ color: accentColor }"
                    >{{ getOtherState(req).name }}</NuxtLink>
                    : предлагается установить статус
                    <span
                        class="font-semibold"
                        :class="relationClass(req.requested_kind)"
                    >{{ relationText(req.requested_kind) }}</span>.
                  </p>
                  <p class="text-xs text-gray-500">
                    Инициатор:
                    {{
                      req.proposer_state_uuid === state?.uuid
                          ? 'Вы'
                          : getProposerStateName(req)
                    }}
                  </p>
                </div>
                <div v-if="req.proposer_state_uuid !== state?.uuid" class="flex gap-3">
                  <button @click="handleReview(req.uuid, true)" class="btn-sm btn-success">
                    Принять
                  </button>
                  <button @click="handleReview(req.uuid, false)" class="btn-sm btn-danger">
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Established Relations -->
          <div>
            <h2 class="text-2xl font-semibold text-gray-200 mb-4">
              Установленные отношения
            </h2>
            <div v-if="!establishedRelations.length" class="text-gray-500">
              Отношения с другими государствами не установлены.
            </div>
            <div v-else class="space-y-3">
              <div
                  v-for="rel in establishedRelations"
                  :key="rel.uuid"
                  class="bg-gray-800/70 p-4 rounded-lg flex items-center justify-between"
              >
                <p class="text-gray-300">
                  <NuxtLink
                      :to="`/states/${getOtherState(rel).uuid}`"
                      class="font-bold hover:underline"
                      :style="{ color: accentColor }"
                  >{{ getOtherState(rel).name }}</NuxtLink>
                  <span> — </span>
                  <span class="font-semibold" :class="relationClass(rel.kind)">
                    {{ relationText(rel.kind) }}
                  </span>
                </p>
                <button
                    v-if="diplomaticStates.length"
                    @click="openDiplomacyModal(getOtherState(rel))"
                    class="btn-sm btn-secondary"
                >
                  Управлять
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Alliances Tab -->
      <div v-show="activeTab === 'alliances'">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-semibold text-gray-200">Членство в альянсах</h2>
          <div class="flex items-center gap-2">
            <button
                @click="isCreateModalOpen = true"
                class="btn-sm btn-success flex items-center gap-1"
            >
              <Icon name="material-symbols:add" class="w-4 h-4" />
              <span>Создать</span>
            </button>
            <NuxtLink to="/states/alliances" class="btn-sm btn-secondary flex items-center gap-1">
              <Icon name="material-symbols:list-alt-outline-rounded" class="w-4 h-4" />
              <span>Все альянсы</span>
            </NuxtLink>
          </div>
        </div>

        <div v-if="!alliances.length" class="text-gray-500">
          Это государство не состоит в альянсах.
        </div>
        <div v-else class="space-y-3">
          <div
              v-for="alliance in alliances"
              :key="alliance.uuid"
              class="bg-gray-800/70 p-4 rounded-lg flex items-center justify-between"
          >
            <NuxtLink :to="`/states/alliances/${alliance.uuid}`" class="flex items-center gap-4 group">
              <img
                  :src="alliance.flag_link"
                  :alt="`Флаг ${alliance.name}`"
                  class="w-12 h-12 object-cover rounded-md flex-shrink-0"
                  :style="{ border: `2px solid ${alliance.color_hex}` }"
              />
              <div>
                <h3 class="font-bold text-lg group-hover:underline" :style="{ color: alliance.color_hex }">
                  {{ alliance.name }}
                </h3>
                <p class="text-sm text-gray-400">{{ purposeText(alliance.purpose) }}</p>
              </div>
            </NuxtLink>
            <button @click="confirmLeaveAlliance(alliance)" class="btn-sm btn-danger">Покинуть</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* -------------------------------------------------------------------------- */
/* Импорты                                                                     */
/* -------------------------------------------------------------------------- */
import { ref, computed, onMounted, watch, inject, type Ref } from 'vue';
import { useAuth } from '#imports';
import type { IState } from '~/types/state.types';
import {
  type IStateRelation,
  type IStateRelationRequest,
  type IAlliance,
  RelationKind,
  AlliencePurpose,
} from '~/types/diplomacy.types';
import DiplomaticActionModal  from '~/components/states/DiplomaticActionModal.vue';
import ConfirmationModal      from '~/components/ui/ConfirmationModal.vue';
import CreateAllianceModal    from '~/components/alliances/CreateAllianceModal.vue';

/* -------------------------------------------------------------------------- */
/* Page meta                                                                  */
/* -------------------------------------------------------------------------- */
definePageMeta({ layout: 'panel' });

/* -------------------------------------------------------------------------- */
/* Auth & user                                                                */
/* -------------------------------------------------------------------------- */
const { data: session } = useAuth();
const currentUserUuid = computed(() => session.value?.uuid);

/* -------------------------------------------------------------------------- */
/* Injected props from parent panel layout                                    */
/* -------------------------------------------------------------------------- */
const accentColor = inject<Ref<string>>('accentColor', ref('#ffffff'));
const state       = inject<Ref<IState | null>>('state', ref(null));

/* -------------------------------------------------------------------------- */
/* Reactive state                                                             */
/* -------------------------------------------------------------------------- */
const loading  = ref(true);
const error    = ref<string | null>(null);
const activeTab = ref<'relations' | 'alliances'>('relations');

const alliances            = ref<IAlliance[]>([]);
const relationRequests     = ref<(IStateRelationRequest & { otherState: Partial<IState> })[]>([]);
const establishedRelations = ref<(IStateRelation & { otherState: Partial<IState> })[]>([]);
const stateDetailsCache    = ref(new Map<string, Partial<IState>>());

/* UI & Modals */
const showDiplomacyModal    = ref(false);
const selectedRelationTarget = ref<{ uuid: string; name: string } | null>(null);
const showLeaveConfirmation = ref(false);
const allianceToLeave       = ref<IAlliance | null>(null);
const isCreateModalOpen     = ref(false);

/* Permissions */
const userCreatableStates = ref<IState[]>([]);
const diplomaticStates    = ref<string[]>([]);  // без учёта ролей — всегда текущее государство

/* -------------------------------------------------------------------------- */
/* Fetch helpers                                                              */
/* -------------------------------------------------------------------------- */
async function fetchData() {
  if (!state.value?.uuid) return;
  loading.value = true;
  error.value   = null;

  diplomaticStates.value = [state.value.uuid];

  try {
    const [alliancesData, requestsData, relationsData] = await Promise.all([
      $fetch<IAlliance[]>(`/distant-api/state/${state.value.uuid}/alliances`).catch(() => []),
      $fetch<IStateRelationRequest[]>(`/distant-api/state/${state.value.uuid}/relation-requests`).catch(() => []),
      $fetch<IStateRelation[]>(`/distant-api/state/${state.value.uuid}/relations`).catch(() => []),
    ]);

    alliances.value = alliancesData;

    /* --- Подтягиваем недостающие данные о государствах ------------------- */
    const uuids = new Set<string>();
    [...requestsData, ...relationsData].forEach(r => {
      uuids.add(r.state_a_uuid); uuids.add(r.state_b_uuid);
    });

    const promises = [...uuids]
        .filter(u => !stateDetailsCache.value.has(u))
        .map(u => $fetch<IState>(`/distant-api/state/${u}`)
            .then(d => stateDetailsCache.value.set(u, d))
            .catch(() => null));

    await Promise.all(promises);

    /* --- Маппинг в структуры для отображения ----------------------------- */
    relationRequests.value = requestsData.map(req => {
      const otherUuid = req.state_a_uuid === state.value!.uuid ? req.state_b_uuid : req.state_a_uuid;
      return { ...req, otherState: stateDetailsCache.value.get(otherUuid) ?? { uuid: otherUuid, name: 'Неизвестно' } };
    });

    establishedRelations.value = relationsData.map(rel => {
      const otherUuid = rel.state_a_uuid === state.value!.uuid ? rel.state_b_uuid : rel.state_a_uuid;
      return { ...rel, otherState: stateDetailsCache.value.get(otherUuid) ?? { uuid: otherUuid, name: 'Неизвестно' } };
    });

  } catch (e: any) {
    console.error('fetchData error:', e);
    error.value = e.message ?? 'Неизвестная ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

/**
 * Получаем список государств, которыми пользователь реально может управлять
 * (правитель, вице-правитель и т.д.) через endpoint `/privileged-states`,
 * а также гарантированно добавляем текущее государство панели.
 */
async function fetchUserCreatableStates() {
  if (!currentUserUuid.value) return;
  try {
    // 1. Привилегированные
    const privileged = await $fetch<IState[]>(`/distant-api/user/${currentUserUuid.value}/privileged-states`)
        .catch(() => []);

    // 2. Добавляем текущее государство, чтобы оно точно отображалось в списке
    const result: IState[] = [...privileged];
    if (state.value && !result.some(s => s.uuid === state.value!.uuid)) {
      result.push(state.value);
    }

    userCreatableStates.value = result;
  } catch (e) {
    console.error('fetchUserCreatableStates error:', e);
    userCreatableStates.value = state.value ? [state.value] : [];
  }
}

/* -------------------------------------------------------------------------- */
/* Action handlers (review, leave, created)                                   */
/* -------------------------------------------------------------------------- */
async function handleReview(requestUuid: string, approve: boolean) {
  if (!state.value?.uuid || !currentUserUuid.value) return;
  try {
    await $fetch(`/distant-api/relations/${requestUuid}/review`, {
      method: 'POST',
      body: {
        reviewerStateUuid: state.value.uuid,
        reviewerPlayerUuid: currentUserUuid.value,
        approve,
      },
    });
    await fetchData();
  } catch (err: any) {
    alert(`Ошибка: ${err.data?.message || err.message}`);
    console.error(err);
  }
}

async function handleLeaveAlliance() {
  if (!allianceToLeave.value || !state.value?.uuid || !currentUserUuid.value) return;
  try {
    await $fetch(`/distant-api/alliances/${allianceToLeave.value.uuid}/leave`, {
      method: 'POST',
      body: {
        stateUuid: state.value.uuid,
        playerUuid: currentUserUuid.value,
      },
    });
    await fetchData();
  } catch (err: any) {
    alert(`Ошибка: ${err.data?.message || err.message}`);
    console.error(err);
  } finally {
    showLeaveConfirmation.value = false;
    allianceToLeave.value = null;
  }
}

function handleAllianceCreated() {
  isCreateModalOpen.value = false;
  fetchData();
}

/* -------------------------------------------------------------------------- */
/* Modal helpers                                                              */
/* -------------------------------------------------------------------------- */
function openDiplomacyModal(otherState: Partial<IState>) {
  if (!otherState.uuid || !otherState.name) return;
  selectedRelationTarget.value = { uuid: otherState.uuid, name: otherState.name };
  showDiplomacyModal.value = true;
}

function confirmLeaveAlliance(alliance: IAlliance) {
  allianceToLeave.value = alliance;
  showLeaveConfirmation.value = true;
}

/* -------------------------------------------------------------------------- */
/* Formatting helpers (relation/purpose texts)                                */
/* -------------------------------------------------------------------------- */
const getOtherState = (i: { otherState: Partial<IState> }) => i.otherState;
const getProposerStateName = (req: IStateRelationRequest) =>
    stateDetailsCache.value.get(req.proposer_state_uuid)?.name || 'Неизвестно';

const relationText = (k: RelationKind | null) => k === null
    ? 'Нейтралитет (разрыв)'
    : ({ [RelationKind.NEUTRAL]: 'Нейтралитет',
      [RelationKind.ALLY]:    'Дружба',
      [RelationKind.ENEMY]:   'Вражда' }[k]);

const relationClass = (k: RelationKind | null) => k === null
    ? 'text-gray-400'
    : ({ [RelationKind.NEUTRAL]: 'text-gray-300',
      [RelationKind.ALLY]:    'text-green-400',
      [RelationKind.ENEMY]:   'text-red-400' }[k]);

const purposeText = (p: string) =>
    ({ [AlliencePurpose.ECONOMIC]:   'Экономический',
      [AlliencePurpose.MILITARY]:   'Военный',
      [AlliencePurpose.DIPLOMATIC]: 'Дипломатический',
      [AlliencePurpose.GENERAL]:    'Общий',
      [AlliencePurpose.OTHER]:      'Другое' }[p] || 'Не указана');

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */
onMounted(async () => {
  if (state.value) {
    stateDetailsCache.value.set(state.value.uuid, state.value);
    diplomaticStates.value = [state.value.uuid];
    await Promise.all([fetchData(), fetchUserCreatableStates()]);
  }
});

/* Обновление при смене state */
watch(state, async (s) => {
  if (s) {
    stateDetailsCache.value.set(s.uuid, s);
    diplomaticStates.value = [s.uuid];
    await fetchData();
    await fetchUserCreatableStates(); // <-- добавлено
  }
});

/* После закрытия модалки дипломатии — обновляем данные */
watch(showDiplomacyModal, async (open) => {
  if (!open) {
    await fetchData();
    selectedRelationTarget.value = null;
  }
});

/* Следим за изменением auth-id */
watch(currentUserUuid, fetchUserCreatableStates);
</script>

<style scoped>
.tab-button {
  @apply px-4 py-3 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px transition-colors duration-200 flex items-center gap-2;
}
.tab-button:hover {
  @apply text-white;
}
.tab-button-active {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.btn-sm {
  @apply px-3 py-1 text-xs font-bold rounded-md transition-colors;
}
.btn-success {
  @apply bg-green-600 hover:bg-green-500 text-white;
}
.btn-danger {
  @apply bg-red-600 hover:bg-red-500 text-white;
}
.btn-secondary {
  @apply bg-gray-600 hover:bg-gray-500 text-white;
}
</style>
