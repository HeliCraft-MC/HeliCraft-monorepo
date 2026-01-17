<script setup lang="ts">
/* ──────────────────────────────── Meta & Imports ─────────────────────────────── */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfirmationModal from '~/components/ui/ConfirmationModal.vue';
import AllianceApplicationModal from '~/components/alliances/AllianceApplicationModal.vue';
import StateCard from '~/components/states/StateCard.vue';

import { type IAlliance, type IAllianceMember, AlliencePurpose } from '~/types/diplomacy.types';
import type { IState } from '~/types/state.types';

definePageMeta({ auth: false });

const route = useRoute();
const router = useRouter();
const allianceUuid = route.params.uuid as string;

/* ──────────────────────────────── Session ─────────────────────────────── */
const { data: session } = useAuth();
const userUuid = computed(() => session.value?.uuid ?? null);

/* ──────────────────────────────── Refs ─────────────────────────────── */
const alliance = ref<IAlliance | null>(null);
const members  = ref<(IAllianceMember & { stateDetails: Partial<IState> })[]>([]);
const managedStates = ref<IState[]>([]); // государства, которыми игрок может дипломатически управлять

const loading       = ref(true);
const errorMessage  = ref<string | null>(null);

/* Modal */
const showConfirmationModal = ref(false);
const confirmationDetails   = ref<{ title: string; message: string; onConfirm: () => void; }>(
    { title: '', message: '', onConfirm: () => {} }
);
const showApplicationModal = ref(false);

/* ──────────────────────────────── Accent helpers ─────────────────────────────── */
const isTooDark = (hex: string) => {
  if (!hex) return false;
  const n = parseInt(hex.slice(1), 16);
  const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return l < 0.25;
};
const lighten = (hex: string, amt = 0.5) => {
  if (!hex) return '#ffffff';
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + 255 * amt);
  const g = Math.min(255, ((n >> 8) & 255) + 255 * amt);
  const b = Math.min(255, (n & 255) + 255 * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b | 0).toString(16).slice(1);
};

const accentRaw = computed(() => alliance.value?.color_hex || '#3b82f6');
const accent    = computed(() => isTooDark(accentRaw.value) ? lighten(accentRaw.value) : accentRaw.value);
const accentBg  = computed(() => accentRaw.value);

/* ──────────────────────────────── Membership helpers ─────────────────────────────── */
const allMemberUuids      = computed(() => new Set(members.value.map(m => m.state_uuid)));
const approvedMemberUuids = computed(() => new Set(members.value.filter(m => !m.is_pending).map(m => m.state_uuid)));
const pendingMemberUuids  = computed(() => new Set(members.value.filter(m => m.is_pending).map(m => m.state_uuid)));

const isCreator = computed(() => {
  if (!alliance.value || !userUuid.value) return false;
  return managedStates.value.some(s => s.uuid === alliance.value!.creator_state_uuid);
});

const isMember = computed(() => managedStates.value.some(s => approvedMemberUuids.value.has(s.uuid)));
const isApplicant = computed(() => managedStates.value.some(s => pendingMemberUuids.value.has(s.uuid)));

/* Список государств, которыми игрок может подать заявку (не состоят и не подали заявку) */
const canApply = computed(() => managedStates.value.filter(s => !allMemberUuids.value.has(s.uuid)));

/* Derived arrays for template */
const approvedMembers = computed(() => members.value.filter(m => approvedMemberUuids.value.has(m.state_uuid)));
const pendingMembers  = computed(() => members.value.filter(m => pendingMemberUuids.value.has(m.state_uuid)));
const creatorState    = computed(() => members.value.find(m => m.state_uuid === alliance.value?.creator_state_uuid)?.stateDetails ?? null);

/* ──────────────────────────────── API util ─────────────────────────────── */
async function handleApiAction(action: () => Promise<any>, reload: boolean = true) {
  try {
    await action();
    if (reload) await loadAllData();
  } catch (err: any) {
    // eslint-disable-next-line no-alert
    alert(`Ошибка: ${err?.data?.message || err.message || 'Неизвестная ошибка'}`);
    console.error(err);
  }
}

function confirmAndExecute(title: string, message: string, onConfirm: () => Promise<void>) {
  confirmationDetails.value = { title, message, onConfirm: async () => {
      await onConfirm();
      showConfirmationModal.value = false;
    }};
  showConfirmationModal.value = true;
}

/* ──────────────────────────────── Actions ─────────────────────────────── */
async function handleApply(stateUuid: string) {
  showApplicationModal.value = false;
  await handleApiAction(() =>
      $fetch(`/distant-api/alliances/${allianceUuid}/join`, {
        method: 'POST',
        body: { stateUuid, playerUuid: userUuid.value }
      })
  );
}

async function handleReview(applicantStateUuid: string, approve: boolean) {
  await handleApiAction(() =>
      $fetch(`/distant-api/alliances/${allianceUuid}/review`, {
        method: 'POST',
        body: {
          applicantStateUuid,
          approverStateUuid: alliance.value?.creator_state_uuid,
          approverPlayerUuid: userUuid.value,
          approve
        }
      })
  );
}

function confirmLeave() {
  const stateToLeave = managedStates.value.find(s => approvedMemberUuids.value.has(s.uuid));
  if (!stateToLeave) return;
  confirmAndExecute(
      'Покинуть альянс?',
      `Государство «${stateToLeave.name}» выйдет из альянса «${alliance.value?.name}». Продолжить?`,
      () => handleApiAction(() =>
          $fetch(`/distant-api/alliances/${allianceUuid}/leave`, {
            method: 'POST',
            body: { stateUuid: stateToLeave.uuid, playerUuid: userUuid.value }
          })
      )
  );
}

function confirmDissolve() {
  console.log("Attempting to dissolve alliance. For now, this is just a log.");
  confirmAndExecute(
      'Распустить альянс?',
      `Альянс «${alliance.value?.name}» будет безвозвратно распущен. Вы уверены?`,
      async () => {
        await handleApiAction(() =>
                $fetch(`/distant-api/alliances/${allianceUuid}/dissolve`, {
                  method: 'POST',
                  body: { byPlayerUuid: userUuid.value, stateUuid: alliance.value?.creator_state_uuid }
                }),
            false
        );
        router.push('/alliances');
      }
  );
}

/* ──────────────────────────────── Data loading ─────────────────────────────── */
async function loadAllData() {
  loading.value = true;
  errorMessage.value = null;

  try {
    /* Alliance & members info */
    const [allianceData, memberData] = await Promise.all([
      $fetch<IAlliance>(`/distant-api/alliances/${allianceUuid}`),
      $fetch<IAllianceMember[]>(`/distant-api/alliances/${allianceUuid}/members`)
    ]);

    alliance.value = allianceData;

    /* Player‑controlled states (по аналогии с isDiplomaticActionsAllowedForPlayer) */
    let diplomaticData: { stateUuid: string; isDiplomaticActionsAllowed: boolean }[] = [];
    if (userUuid.value) {
      diplomaticData = await $fetch(`/distant-api/user/${userUuid.value}/isDiplomaticActionsAllowedForPlayer`).catch(() => []);
    }

    const controlledUuids = diplomaticData
        .filter(d => d.isDiplomaticActionsAllowed)
        .map(d => d.stateUuid);

    /* Get state details for controlled states & member states */
    const stateUuids = Array.from(new Set([
      ...controlledUuids,
      ...memberData.map(m => m.state_uuid)
    ]));

    const stateDetailsArr = await Promise.all(
        stateUuids.map(u =>
            $fetch<IState>(`/distant-api/state/${u}`).catch(() => ({ uuid: u, name: 'Неизвестно' } as Partial<IState>))
        )
    );
    const stateMap = new Map<string, Partial<IState>>(stateDetailsArr.map(s => [s.uuid, s]));

    managedStates.value = stateDetailsArr.filter(s => controlledUuids.includes(s.uuid)) as IState[];

    members.value = memberData.map(m => ({
      ...m,
      stateDetails: stateMap.get(m.state_uuid) || { uuid: m.state_uuid, name: 'Неизвестно' }
    }));
  } catch (err: any) {
    if (err.response?.status === 404) {
      errorMessage.value = 'Альянс с таким UUID не найден.';
    } else {
      errorMessage.value = 'Не удалось загрузить данные альянса.';
    }
    console.error(err);
  } finally {
    loading.value = false;
  }
}

/* ──────────────────────────────── Helpers ─────────────────────────────── */
const purposeMap: Record<string, string> = {
  [AlliencePurpose.ECONOMIC]:   'Экономический',
  [AlliencePurpose.MILITARY]:   'Военный',
  [AlliencePurpose.DIPLOMATIC]: 'Дипломатический',
  [AlliencePurpose.GENERAL]:    'Общий',
  [AlliencePurpose.OTHER]:      'Другое'
};
const purposeText = (p: string) => purposeMap[p] || p;

onMounted(loadAllData);
</script>

<template>
  <div class="bg-black text-gray-200 min-h-screen" :style="{ '--accent': accent, '--accent-bg': accentBg }">
    <!-- ──────────────── Modals ──────────────── -->
    <ConfirmationModal
        :is-open="showConfirmationModal"
        :title="confirmationDetails.title"
        :message="confirmationDetails.message"
        @close="showConfirmationModal = false"
        @confirm="confirmationDetails.onConfirm"
    />
    <AllianceApplicationModal
        v-if="canApply.length"
        :is-open="showApplicationModal"
        :states="canApply"
        :alliance-name="alliance?.name || ''"
        @close="showApplicationModal = false"
        @apply="handleApply"
    />

    <!-- ──────────────── Loading State ──────────────── -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div class="w-16 h-16 border-4 border-dashed rounded-full animate-spin" :style="{ borderColor: 'var(--accent)' }" />
      <p class="mt-4 text-lg text-gray-400">Загружаем данные альянса...</p>
    </div>

    <!-- ──────────────── Error State ──────────────── -->
    <div v-else-if="errorMessage" class="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <Icon name="material-symbols:wifi-off-rounded" class="w-20 h-20 text-red-500 mb-4" />
      <h2 class="text-3xl font-bold text-red-400">Произошла ошибка</h2>
      <p class="mt-2 text-lg text-gray-400 max-w-md">{{ errorMessage }}</p>
      <button @click="router.push('/alliances')" class="mt-8 inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-5 py-2.5 transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500">
        К списку альянсов
      </button>
    </div>

    <!-- ──────────────── Main content ──────────────── -->
    <main v-else-if="alliance" class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
      <!-- Header -->
      <header class="pt-24 pb-12 md:pt-32 md:pb-20">
        <div class="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          <div class="flex-shrink-0 mx-auto md:mx-0">
            <img
                :src="alliance.flag_link"
                alt="Флаг альянса"
                class="w-24 h-48 md:w-32 md:h-64 object-cover rounded-lg shadow-2xl shadow-black/50 border-2"
                :style="{ borderColor: accentBg }"
            />
          </div>
          <div class="flex-1 space-y-3 text-center md:text-left">
            <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tighter text-balance" :style="{ color: 'var(--accent)' }">{{ alliance.name }}</h1>
            <p class="text-gray-400 whitespace-pre-line text-base leading-relaxed max-w-3xl mx-auto md:mx-0">{{ alliance.description }}</p>
          </div>
        </div>
      </header>

      <div class="space-y-12 md:space-y-16 pb-24">
        <!-- Info & Actions -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <!-- Info Column -->
          <div class="lg:col-span-1 space-y-4">
            <div class="flex items-start gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800/50">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-gray-900 text-[var(--accent)]">
                <Icon name="material-symbols:military-tech-outline-rounded" class="w-7 h-7" />
              </div>
              <div>
                <span class="text-sm text-gray-500">Цель альянса</span>
                <p class="font-semibold text-gray-100 mt-0.5">{{ purposeText(alliance.purpose) }}</p>
              </div>
            </div>
            <div class="flex items-start gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800/50">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-gray-900 text-[var(--accent)]">
                <Icon name="material-symbols:flag-outline-rounded" class="w-7 h-7" />
              </div>
              <div>
                <span class="text-sm text-gray-500">Государство‑основатель</span>
                <NuxtLink v-if="creatorState" :to="`/states/${creatorState.uuid}`" class="block font-semibold mt-0.5 hover:underline" :style="{ color: 'var(--accent)' }">
                  {{ creatorState.name }}
                </NuxtLink>
                <p v-else class="font-semibold text-gray-400 mt-0.5">Неизвестно</p>
              </div>
            </div>
            <div class="flex items-start gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800/50">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-gray-900 text-[var(--accent)]">
                <Icon name="material-symbols:groups-outline-rounded" class="w-7 h-7" />
              </div>
              <div>
                <span class="text-sm text-gray-500">Число участников</span>
                <p class="font-semibold text-gray-100 mt-0.5">{{ approvedMembers.length }}</p>
              </div>
            </div>
            <div v-if="alliance.telegram_link" class="flex items-start gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800/50">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-gray-900 text-[var(--accent)]">
                <Icon name="simple-icons:telegram" class="w-6 h-6" />
              </div>
              <div>
                <span class="text-sm text-gray-500">Telegram</span>
                <a :href="alliance.telegram_link" target="_blank" rel="noopener noreferrer" class="block font-semibold mt-0.5 hover:underline" :style="{ color: 'var(--accent)' }">
                  Присоединиться к чату
                </a>
              </div>
            </div>
          </div>

          <!-- Action Panels Column -->
          <div class="lg:col-span-2 space-y-4">
            <!-- Founder panel (Admin) -->
            <div v-if="isCreator" class="bg-gray-950 p-5 rounded-xl border border-purple-500/50 space-y-3">
              <h3 class="text-lg font-bold text-purple-300 flex items-center gap-2">
                <Icon name="material-symbols:shield-person-outline-rounded" />
                <span>Панель основателя</span>
              </h3>
              <p class="text-sm text-gray-400">Вы управляете этим альянсом. Вы можете рассмотреть заявки или распустить альянс.</p>
              <button @click="confirmDissolve" class="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 text-sm transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-red-500">Распустить альянс</button>
            </div>

            <!-- Member panel -->
            <div v-if="isMember && !isCreator" class="bg-gray-950 p-5 rounded-xl border border-gray-800/50 space-y-3">
              <h3 class="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Icon name="material-symbols:handshake-outline" />
                <span>Действия участника</span>
              </h3>
              <p class="text-sm text-gray-400">Вы являетесь участником этого альянса. Вы можете покинуть его в любое время.</p>
              <button @click="confirmLeave" class="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 text-sm transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-red-500">Покинуть альянс</button>
            </div>

            <!-- Join panel (Non-member) -->
            <div v-if="!isMember && !isApplicant && canApply.length" class="bg-gray-950 p-5 rounded-xl border border-gray-800/50 space-y-3">
              <h3 class="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Icon name="material-symbols:door-open-outline-rounded" />
                <span>Вступление в альянс</span>
              </h3>
              <p class="text-sm text-gray-400">Подайте заявку, чтобы присоединиться к этому альянсу и его целям.</p>
              <button @click="showApplicationModal = true" class="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 text-sm transition-all duration-200 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-green-500">Подать заявку</button>
            </div>

            <!-- Applicant notice -->
            <div v-if="isApplicant" class="bg-blue-950/70 p-5 rounded-xl border border-blue-500/50 text-blue-300">
              <h3 class="text-lg font-bold flex items-center gap-2">
                <Icon name="material-symbols:hourglass-outline-rounded" />
                <span>Заявка на рассмотрении</span>
              </h3>
              <p class="mt-2 text-sm text-blue-300/80">Ваша заявка была отправлена и ожидает рассмотрения основателем альянса.</p>
            </div>
          </div>
        </section>

        <!-- Members & Requests -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-12 border-t border-gray-800/50 pt-12">
          <!-- Approved members -->
          <div>
            <h2 class="text-2xl font-bold tracking-tight pb-3 border-b-2 mb-6" :style="{ borderColor: 'var(--accent-bg)', color: 'var(--accent)' }">Участники альянса</h2>
            <div v-if="!approvedMembers.length" class="flex flex-col items-center justify-center text-center p-10 bg-gray-950 rounded-xl border border-dashed border-gray-700/50">
              <Icon name="material-symbols:group-off-outline-rounded" class="w-12 h-12 text-gray-600 mb-2"/>
              <p class="text-gray-500">В альянсе пока нет участников.</p>
            </div>
            <div v-else class="space-y-4">
              <StateCard v-for="m in approvedMembers" :key="m.uuid" :state="m.stateDetails" :color="alliance.color_hex" />
            </div>
          </div>

          <!-- Pending requests -->
          <div v-if="isCreator">
            <h2 class="text-2xl font-bold tracking-tight pb-3 border-b-2 mb-6" :style="{ borderColor: 'var(--accent-bg)', color: 'var(--accent)' }">Заявки на вступление ({{ pendingMembers.length }})</h2>
            <div v-if="!pendingMembers.length" class="flex flex-col items-center justify-center text-center p-10 bg-gray-950 rounded-xl border border-dashed border-gray-700/50">
              <Icon name="material-symbols:mark-email-read-outline-rounded" class="w-12 h-12 text-gray-600 mb-2"/>
              <p class="text-gray-500">Новых заявок нет.</p>
            </div>
            <div v-else class="space-y-4">
              <div v-for="req in pendingMembers" :key="req.uuid" class="bg-gray-950 p-3 rounded-xl border border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex-grow w-full">
                  <StateCard :state="req.stateDetails" :color="alliance.color_hex" />
                </div>
                <div class="flex gap-3 flex-shrink-0 w-full sm:w-auto">
                  <button @click="handleReview(req.state_uuid, true)" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 text-sm transition-all duration-200 bg-green-600 hover:bg-green-700 text-white">Принять</button>
                  <button @click="handleReview(req.state_uuid, false)" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 text-sm transition-all duration-200 bg-red-600 hover:bg-red-700 text-white">Отклонить</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Added a global animation class that can be used anywhere */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>
