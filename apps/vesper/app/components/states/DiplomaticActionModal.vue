<template>
  <!-- Используем встроенный компонент Transition для плавных анимаций -->
  <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
  >
    <!--
      Корневой элемент, отображается только когда isOpen === true.
      Устанавливаем CSS-переменную для акцентного цвета, чтобы использовать ее в стилях.
    -->
    <div v-if="isOpen" class="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true" :style="{ '--accent-color': accentColor || '#0ea5e9' }">
      <!-- Фон-затемнение с функцией закрытия по клику -->
      <div class="fixed inset-0 bg-black/80" @click.self="closeModal" aria-hidden="true"></div>

      <!-- Контейнер для центрирования модального окна -->
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <!-- Анимация для появления панели модального окна -->
          <transition
              enter-active-class="transition ease-out duration-300"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition ease-in duration-200"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
          >
            <!-- Панель модального окна с черным фоном -->
            <div class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-black border border-gray-800 p-6 text-left align-middle shadow-2xl transition-all">
              <h3 id="modal-title" class="text-xl font-bold leading-6 text-gray-100">
                Управление отношениями с <span class="font-bold" :style="{ color: accentColor }">{{ stateName }}</span>
              </h3>

              <div class="mt-4 space-y-6">
                <!-- Шаг 1: Выбор государства для действия -->
                <div>
                  <label for="managingState" class="block text-sm font-medium text-gray-400">Действовать от имени:</label>
                  <select id="managingState" v-model="selectedManagingStateUuid" class="modal-select mt-1">
                    <option disabled value="">Выберите государство</option>
                    <option v-for="st in managingStatesDetails" :key="st.uuid" :value="st.uuid">
                      {{ st.name }}
                    </option>
                  </select>
                </div>

                <!-- Шаг 2: Детали и действия (появляются после выбора государства) -->
                <div v-if="selectedManagingStateUuid" class="min-h-[12rem] flex flex-col justify-center">
                  <!-- Состояние загрузки деталей отношений -->
                  <div v-if="isLoadingDetails" class="flex h-full items-center justify-center">
                    <div class="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-neutral-600"></div>
                  </div>

                  <!-- Отображение ошибки -->
                  <div v-else-if="detailsError" class="modal-error">
                    <p><b>Ошибка:</b> {{ detailsError }}</p>
                  </div>

                  <!-- Форма с деталями отношений и действиями -->
                  <div v-else class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-400">Текущие отношения:</label>
                      <p class="mt-1 text-lg font-semibold" :class="relationClass(currentRelation)">
                        {{ relationText(currentRelation) }}
                      </p>
                    </div>

                    <!-- Информация о существующем запросе -->
                    <div v-if="pendingRequest" class="modal-warning">
                      <p><b>Ожидается ответ:</b> Заявка на изменение отношений на "{{ relationText(pendingRequest.requested_kind) }}" уже отправлена и ожидает рассмотрения.</p>
                    </div>

                    <!-- Радио-кнопки для выбора нового статуса -->
                    <fieldset v-else>
                      <legend class="block text-sm font-medium text-gray-400 mb-2">Изменить на:</legend>
                      <div class="space-y-2">
                        <div v-for="kind in availableRelationKinds" :key="kind.value ?? 'none'" class="flex items-center">
                          <input :id="`relation-${kind.value}`" name="relation-kind" type="radio" :value="kind.value" v-model="newRelationSelection" class="modal-radio">
                          <label :for="`relation-${kind.value}`" class="ml-3 block text-sm font-medium text-gray-300">{{ kind.label }}</label>
                        </div>
                      </div>
                    </fieldset>
                  </div>
                </div>
              </div>

              <!-- Кнопки действий модального окна -->
              <div class="mt-8 flex justify-end space-x-4">
                <button type="button" class="modal-btn-secondary" @click="closeModal">
                  Отмена
                </button>
                <button
                    type="button"
                    class="modal-btn-primary"
                    :disabled="isSubmitting || !!pendingRequest || !selectedManagingStateUuid || newRelationSelection === currentRelation"
                    @click="submitRelationChangeRequest"
                >
                  <span v-if="isSubmitting">Отправка...</span>
                  <span v-else>Отправить запрос</span>
                </button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { IState } from '~/types/state.types';
import { RelationKind, type IStateRelationRequest } from '~/types/diplomacy.types';

// =================================================================================
// PROPS & EMITS
// =================================================================================
const props = defineProps<{
  isOpen: boolean,
  stateUuid: string,
  stateName: string,
  managingStates: string[],
  accentColor: string,
}>();

const emit = defineEmits(['close']);

// =================================================================================
// SESSION & AUTH
// =================================================================================
const { data: session } = useAuth();
const userUuid = computed(() => session.value?.uuid);

// =================================================================================
// STATE
// =================================================================================
const selectedManagingStateUuid = ref<string>('');
const managingStatesDetails = ref<Pick<IState, 'uuid' | 'name'>[]>([]);
const isLoadingDetails = ref(false);
const detailsError = ref<string | null>(null);
const currentRelation = ref<RelationKind | null>(null);
const newRelationSelection = ref<RelationKind>(RelationKind.NEUTRAL);
const pendingRequest = ref<IStateRelationRequest | null>(null);
const isSubmitting = ref(false);

// =================================================================================
// CONSTANTS & HELPERS
// =================================================================================
const availableRelationKinds = [
  { value: RelationKind.ALLY, label: 'Дружба' },
  { value: RelationKind.NEUTRAL, label: 'Нейтралитет' },
  { value: null, label: 'Нет отношений' },
  { value: RelationKind.ENEMY, label: 'Вражда' },
];

const relationText = (kind: RelationKind | null) => availableRelationKinds.find(k => k.value === kind)?.label ?? 'Нет';

const relationClass = (kind: RelationKind | null) => ({
  'text-gray-300': (kind === RelationKind.NEUTRAL) || (kind == null),
  'text-green-400': kind === RelationKind.ALLY,
  'text-red-400': kind === RelationKind.ENEMY,
});

const closeModal = () => emit('close');

// =================================================================================
// API LOGIC
// =================================================================================
async function fetchManagingStatesDetails() {
  console.warn(props.managingStates)
  if (!props.managingStates?.length) {
    managingStatesDetails.value = [];
    return;
  }
  try {
    const details = await Promise.all(
        props.managingStates
            .filter(uuid => uuid)
            .map(uuid =>
                $fetch<Pick<IState, 'uuid' | 'name'>>(`/distant-api/state/${uuid}`)
                    .catch(() => ({ uuid, name: `Ошибка загрузки (${uuid.slice(0, 8)})` }))
            )
    );
    managingStatesDetails.value = details;
    if (details.length === 1) {
      selectedManagingStateUuid.value = details[0].uuid;
    }
  } catch (err) {
    console.error("Failed to fetch managing states details", err);
  }
}

async function fetchRelationDetails() {
  if (!selectedManagingStateUuid.value) return

  isLoadingDetails.value = true
  detailsError.value = null
  pendingRequest.value = null

  try {
    const stateA = [props.stateUuid, selectedManagingStateUuid.value].sort()[0]
    const stateB = [props.stateUuid, selectedManagingStateUuid.value].sort()[1]

    /* ------------------------------------------------------------------
     * 1. Получаем данные о существующих отношениях.
     *    Используем responseType: 'text' и parseResponse, чтобы
     *    корректно обрабатывать пустое тело ответа ('' → null).
     * ---------------------------------------------------------------- */
    const raw = await $fetch<
        | { kind: RelationKind }
        | RelationKind
        | null
        | string
    >(`/distant-api/relations/get`, {
      query: { stateUuidA: stateA, stateUuidB: stateB },
      responseType: 'text',
      /* Если тело пустое → вернём null, иначе попробуем JSON.parse,
         а при ошибке парсинга вернём исходную строку. */
      parseResponse: txt => {
        if (!txt) return null
        try {
          return JSON.parse(txt)
        } catch {
          return txt
        }
      },
    }).catch(() => null)

    /* ------------------------------------------------------------------
     * 2. Определяем итоговый тип отношений.
     * ---------------------------------------------------------------- */
    let kind: RelationKind | null
    if (raw == null || raw === '') {
      kind = null
    } else if (typeof raw === 'string') {
      kind = raw as RelationKind
    } else {
      kind = (raw as any).kind ?? RelationKind.NEUTRAL
    }

    currentRelation.value = kind
    newRelationSelection.value = kind ?? RelationKind.NEUTRAL

    /* ------------------------------------------------------------------
     * 3. Получаем незавершённые запросы (если есть).
     * ---------------------------------------------------------------- */
    const requestsResponse = await $fetch<IStateRelationRequest[]>(
        `/distant-api/state/${selectedManagingStateUuid.value}/relation-requests`,
    ).catch(() => [])

    pendingRequest.value =
        requestsResponse.find(
            req =>
                req.state_a_uuid === stateA &&
                req.state_b_uuid === stateB &&
                req.status === 'pending',
        ) ?? null
  } catch (err: any) {
    detailsError.value =
        err?.data?.message || 'Не удалось загрузить информацию об отношениях.'
    console.error(err)
  } finally {
    isLoadingDetails.value = false
  }
}


async function submitRelationChangeRequest() {
  if (!selectedManagingStateUuid.value || !userUuid.value) {
    detailsError.value = "Не выбрано государство, от имени которого вы действуете.";
    return;
  }
  isSubmitting.value = true;
  detailsError.value = null;

  try {
    await $fetch(`/distant-api/relations/request`, {
      method: 'POST',
      body: {
        proposerStateUuid: selectedManagingStateUuid.value,
        targetStateUuid: props.stateUuid,
        requestedKind: newRelationSelection.value,
        proposerPlayerUuid: userUuid.value
      }
    });
    closeModal();
  } catch (err: any)
  {
    detailsError.value = err.data?.message || "Произошла ошибка при отправке запроса.";
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
}
// =================================================================================
// WATCHERS
// =================================================================================
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    selectedManagingStateUuid.value = '';
    managingStatesDetails.value = [];
    isLoadingDetails.value = false;
    detailsError.value = null;
    isSubmitting.value = false;
    pendingRequest.value = null;
    currentRelation.value = RelationKind.NEUTRAL;
    newRelationSelection.value = RelationKind.NEUTRAL;
    fetchManagingStatesDetails();
  }
}, { immediate: true });

watch(selectedManagingStateUuid, (newVal) => {
  if (newVal && props.isOpen) {
    fetchRelationDetails();
  }
});
</script>

<style scoped>
.modal-select {
  @apply block w-full rounded-lg border-gray-700 bg-gray-900 text-gray-200 shadow-sm focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] sm:text-sm transition;
}
.modal-radio {
  @apply h-4 w-4 border-gray-600 bg-gray-700 text-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 focus:ring-offset-black;
}
.modal-btn-primary {
  @apply inline-flex justify-center rounded-lg border border-transparent px-5 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed transition-all;
  background-color: var(--accent-color);
}
.modal-btn-primary:hover:not(:disabled) {
  filter: brightness(1.15);
}
.modal-btn-primary:disabled {
  @apply bg-gray-700 text-gray-500;
}
.modal-btn-secondary {
  @apply inline-flex justify-center rounded-lg border border-gray-700 bg-transparent px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors;
}
.modal-error {
  @apply p-3 bg-red-900/50 border border-red-500/30 text-red-300 rounded-lg text-sm;
}
.modal-warning {
  @apply p-3 bg-yellow-900/50 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm;
}
</style>
