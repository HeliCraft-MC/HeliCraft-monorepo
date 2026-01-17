<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import type { IStateOrder } from '~/types/state.types';
import StateOrderCard from '~/components/states/StateOrderCard.vue';

// Перечисление для уровней важности, чтобы избежать "магических строк"
enum Importance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  PINNED = 'pinned'
};

// Расширенный тип для удобства работы в шаблоне
type DecreeWithDetails = IStateOrder & {
  issuerNickname?: string,
  issuerPlayerHead?: string
};

const props = defineProps<{
  stateUuid: string,
  accentColor?: string
}>();

const decrees = ref<DecreeWithDetails[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const isCreateModalOpen = ref(false); // Состояние для управления модальным окном
const isSubmitting = ref(false); // Состояние для процесса отправки формы
const activeTab = ref<'active' | 'archive'>('active');
const { data: session } = useAuth();
const currentUserUuid = computed(() => session.value?.uuid);

// Реактивный объект для данных нового указа из формы
const newDecree = reactive({
  title: '',
  text: '',
  importance: Importance.MEDIUM,
  expiresInDays: 0 // 0 означает бессрочный
});

// Порядок сортировки по важности
const importanceOrder: Record<Importance, number> = {
  [Importance.PINNED]: 0,
  [Importance.HIGH]: 1,
  [Importance.MEDIUM]: 2,
  [Importance.LOW]: 3,
};

// Отсортированные указы
const sortedDecrees = computed(() => {
  return [...decrees.value].sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);
});

// Фильтрация на активные и архивные
const activeDecrees = computed(() => sortedDecrees.value.filter(o => !(o.expires_at && new Date(o.expires_at) < new Date())));
const archivedDecrees = computed(() => sortedDecrees.value.filter(o => o.expires_at && new Date(o.expires_at) < new Date()));

// --- МЕТОДЫ API ---

async function fetchDecrees() {
  loading.value = true;
  error.value = null;
  try {
    const decreeList = await $fetch<IStateOrder[]>(`/distant-api/order/list`, {
      query: { stateUuid: props.stateUuid, limit: 1000 }
    });
    // Параллельно запрашиваем детали издателей указов
    decrees.value = await Promise.all(decreeList.map(async (decree) => {
      try {
        const user = await $fetch<{ nickname: string }>(`/distant-api/user/${decree.issued_by_player_uuid}`);
        return {
          ...decree,
          issuerNickname: user.nickname,
          issuerPlayerHead: `/distant-api/user/${decree.issued_by_player_uuid}/skin/head.png`
        };
      } catch {
        return { ...decree, issuerNickname: 'Неизвестно', issuerPlayerHead: '' };
      }
    }));
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!currentUserUuid.value) {
    console.error("Не удалось определить текущего пользователя.");
    return;
  }
  isSubmitting.value = true;
  try {
    const expiresAt = newDecree.expiresInDays > 0
        ? Date.now() + newDecree.expiresInDays * 86400000 // days to ms
        : null;

    await $fetch('/distant-api/order/create', {
      method: 'POST',
      body: {
        stateUuid: props.stateUuid,
        issuedByPlayerUuid: currentUserUuid.value,
        title: newDecree.title,
        text: newDecree.text,
        importance: newDecree.importance,
        expiresAt: expiresAt
      }
    });
    closeModal();
    await fetchDecrees(); // Обновляем список после создания
  } catch (err: any) {
    console.error(`Ошибка при создании указа: ${err.data?.statusMessage || err.message}`);
    // Здесь можно добавить уведомление для пользователя
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDelete(decreeUuid: string) {
  if (!currentUserUuid.value || !confirm('Вы уверены, что хотите удалить этот указ?')) {
    return;
  }
  try {
    await $fetch(`/distant-api/order/${decreeUuid}/delete`, {
      method: 'POST',
      body: { requesterUuid: currentUserUuid.value }
    });
    await fetchDecrees(); // Обновляем список
  } catch (err: any) {
    console.error(`Ошибка при удалении указа: ${err.data?.statusMessage || err.message}`);
  }
}

// --- УПРАВЛЕНИЕ ФОРМОЙ И МОДАЛЬНЫМ ОКНОМ ---

function resetForm() {
  Object.assign(newDecree, {
    title: '',
    text: '',
    importance: Importance.MEDIUM,
    expiresInDays: 0
  });
}

function openModal() {
  isCreateModalOpen.value = true;
}

function closeModal() {
  isCreateModalOpen.value = false;
  resetForm();
}

onMounted(() => {
  fetchDecrees();
});

watch(() => props.stateUuid, fetchDecrees);

</script>

<template>
  <div class="space-y-4">
    <div class="panel-header-container">
      <h2 class="panel-header">
        <Icon name="solar:document-add-bold-duotone" />
        <span>Управление Указами</span>
      </h2>
      <button @click="openModal" class="action-button-success">
        <Icon name="solar:add-circle-bold" />
        <span>Создать указ</span>
      </button>
    </div>

    <div class="tab-container">
      <button @click="activeTab = 'active'" :class="{'tab-active': activeTab === 'active'}">
        Активные ({{ activeDecrees.length }})
      </button>
      <button @click="activeTab = 'archive'" :class="{'tab-active': activeTab === 'archive'}">
        Архив ({{ archivedDecrees.length }})
      </button>
    </div>

    <div v-if="loading" class="loading-spinner">
      <div class="spinner"></div>
    </div>
    <div v-else-if="error" class="feed-empty-state">
      Не удалось загрузить указы.
    </div>

    <div v-else>
      <div v-show="activeTab === 'active'" class="space-y-4">
        <div v-if="!activeDecrees.length" class="feed-empty-state">
          Нет активных указов.
        </div>
        <StateOrderCard v-for="decree in activeDecrees" :key="decree.uuid" :order="decree" :color="accentColor" :issuerPlayerNickname="decree.issuerNickname!" :issuerPlayerHead="decree.issuerPlayerHead!" :canManage="true" @delete="handleDelete" />
      </div>
      <div v-show="activeTab === 'archive'" class="space-y-4">
        <div v-if="!archivedDecrees.length" class="feed-empty-state">
          Архив указов пуст.
        </div>
        <StateOrderCard v-for="decree in archivedDecrees" :key="decree.uuid" :order="decree" :color="accentColor" :issuerPlayerNickname="decree.issuerNickname!" :issuerPlayerHead="decree.issuerPlayerHead!" :canManage="true" @delete="handleDelete" />
      </div>
    </div>

    <div v-if="isCreateModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <h3 class="modal-title">Новый указ</h3>
        <form @submit.prevent="handleCreate" class="space-y-4">
          <input v-model="newDecree.title" type="text" placeholder="Заголовок указа" class="form-input" required maxlength="100">

          <textarea v-model="newDecree.text" placeholder="Текст указа..." class="form-input" rows="5" required maxlength="2000"></textarea>

          <select v-model="newDecree.importance" class="form-input" required>
            <option :value="Importance.LOW">Низкая важность</option>
            <option :value="Importance.MEDIUM">Средняя важность</option>
            <option :value="Importance.HIGH">Высокая важность</option>
          </select>

          <input v-model.number="newDecree.expiresInDays" type="number" placeholder="Срок действия в днях (0 = бессрочно)" class="form-input" min="0" step="1">

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="form-button-secondary">
              Отмена
            </button>
            <button type="submit" class="form-button-primary" :disabled="isSubmitting" :style="{ backgroundColor: accentColor }">
              <span v-if="!isSubmitting">Опубликовать</span>
              <span v-else>Публикация...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Стили взяты из вашего примера для консистентности */
.panel-header-container { @apply flex justify-between items-center pb-4 border-b border-gray-700/50; }
.panel-header { @apply text-2xl font-bold flex items-center gap-3 text-white; }
.action-button-success { @apply inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 bg-green-500/10 text-green-300 hover:bg-green-500/20; }

.modal-backdrop { @apply fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4; }
.modal-content { @apply bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg shadow-2xl; }
.modal-title { @apply text-xl font-bold mb-4 text-white; }
.modal-actions { @apply flex justify-end gap-3 pt-4; }

.form-input { @apply w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900; }
.form-input:focus { --tw-ring-color: v-bind(accentColor); } /* Динамический цвет фокуса */

.form-button-primary { @apply px-4 py-2 rounded-md font-semibold text-white transition-colors; }
.form-button-primary:disabled { @apply opacity-50 cursor-not-allowed; }
.form-button-secondary { @apply px-4 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors; }

.feed-empty-state { @apply text-gray-500 text-center py-10 bg-gray-800/20 rounded-lg border border-dashed border-gray-700; }

.tab-container { @apply flex items-center gap-2 p-1 bg-gray-800/50 rounded-lg w-full mb-2; }
.tab-container button { @apply flex-1 text-center text-sm font-semibold text-gray-400 px-3 py-1.5 rounded-md transition-colors; }
.tab-container button.tab-active { @apply bg-gray-700 text-white; }

.loading-spinner { @apply flex justify-center items-center py-10; }
.spinner { @apply w-8 h-8 border-4 border-dashed rounded-full animate-spin border-neutral-500; }
</style>