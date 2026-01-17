<template>
  <div class="space-y-8">
    <h1 class="text-3xl font-bold" :style="{ color: accentColor }">
      Панель управления
    </h1>

    <!-- Блок со статистикой -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="stat-card">
        <Icon name="material-symbols:groups-outline-rounded" class="stat-icon" :style="{ color: accentColor }" />
        <div class="text-right">
          <p class="text-sm text-gray-400">Граждане</p>
          <p class="text-2xl font-bold">{{ membersCount ?? '...' }}</p>
        </div>
      </div>
      <div class="stat-card">
        <Icon name="material-symbols:how-to-reg-outline-rounded" class="stat-icon" :style="{ color: accentColor }" />
        <div class="text-right">
          <p class="text-sm text-gray-400">Заявки</p>
          <p class="text-2xl font-bold">{{ applicantCount ?? '...' }}</p>
        </div>
      </div>
      <div class="stat-card">
        <Icon name="material-symbols:location-city-rounded" class="stat-icon" :style="{ color: accentColor }" />
        <div class="text-right">
          <p class="text-sm text-gray-400">Города</p>
          <p class="text-2xl font-bold">{{ citiesCount ?? '...' }}</p>
        </div>
      </div>
      <div class="stat-card">
        <Icon name="material-symbols:shield-outline-rounded" class="stat-icon" :style="{ color: accentColor }" />
        <div class="text-right">
          <p class="text-sm text-gray-400">Альянсы</p>
          <p class="text-2xl font-bold">{{ alliancesCount ?? '...' }}</p>
        </div>
      </div>
    </div>

    <!-- Блок с основной информацией -->
    <div class="card">
      <div class="card-header">
        <h2 class="text-xl font-semibold">Основная информация</h2>
        <button @click="toggleEditMode" class="btn btn-secondary ml-auto">
          <Icon :name="isEditing ? 'material-symbols:close-rounded' : 'material-symbols:edit-outline-rounded'" class="w-5 h-5" />
          <span>{{ isEditing ? 'Отмена' : 'Редактировать' }}</span>
        </button>
      </div>

      <div v-if="state && editableState" class="card-body">
        <!-- Режим просмотра -->
        <div v-if="!isEditing" class="space-y-6">
          <div class="flex items-start gap-6">
            <img :src="state.flag_link" alt="Флаг" class="w-24 h-auto object-cover rounded-md shadow-md flex-shrink-0"/>
            <div class="flex-1">
              <p class="text-gray-400 text-sm">Название</p>
              <h3 class="text-2xl font-bold">{{ state.name }}</h3>
            </div>
          </div>
          <div>
            <p class="text-gray-400 text-sm">Описание</p>
            <p class="text-gray-200 whitespace-pre-line">{{ state.description }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p class="text-gray-400 text-sm">Форма правления</p>
              <p class="text-gray-200 font-medium">{{ govFormTranslations[state.gov_form] || 'Не указана' }}</p>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Выборы</p>
              <p class="text-gray-200 font-medium">{{ state.has_elections ? 'Проводятся' : 'Отсутствуют' }}</p>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Двойное гражданство</p>
              <p class="text-gray-200 font-medium">{{ state.allow_dual_citizenship ? 'Разрешено' : 'Запрещено' }}</p>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Вход на территорию</p>
              <p class="text-gray-200 font-medium">{{ state.free_entry ? 'Свободный' : 'Ограниченный' }}</p>
            </div>
          </div>
          <div v-if="!state.free_entry && state.free_entry_description">
            <p class="text-gray-400 text-sm">Порядок входа на территорию</p>
            <p class="text-gray-200 whitespace-pre-line">{{ state.free_entry_description }}</p>
          </div>

          <div>
            <p class="text-gray-400 text-sm">Ссылки</p>
            <div class="flex flex-wrap gap-4 mt-1">
              <a v-if="state.telegram_link" :href="state.telegram_link" target="_blank" rel="noopener noreferrer" class="info-badge hover:opacity-80">
                <Icon name="simple-icons:telegram" /> Telegram
              </a>
              <a v-if="state.map_link" :href="state.map_link" target="_blank" rel="noopener noreferrer" class="info-badge hover:opacity-80">
                <Icon name="material-symbols:map-outline-rounded" /> Карта
              </a>
              <span v-if="!state.telegram_link && !state.map_link" class="text-gray-500 text-sm">Нет</span>
            </div>
          </div>
        </div>

        <!-- Режим редактирования -->
        <form v-else @submit.prevent="saveChanges" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-1 space-y-2">
              <label for="flagUpload" class="label">Флаг</label>
              <img :src="flagPreview || editableState.flag_link" alt="Превью флага" class="w-32 h-auto object-cover rounded-md shadow-md mb-2"/>
              <input id="flagUpload" type="file" @change="onFileChange" accept="image/png" class="file-input">
            </div>
            <div class="md:col-span-2 space-y-6">
              <div>
                <label for="stateName" class="label">Название государства</label>
                <input id="stateName" type="text" v-model="editableState.name" class="input" required>
              </div>
              <div>
                <label for="stateDescription" class="label">Описание</label>
                <textarea id="stateDescription" v-model="editableState.description" rows="5" class="input"></textarea>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="govForm" class="label">Форма правления</label>
              <select id="govForm" v-model="editableState.gov_form" class="input">
                <option v-for="(name, key) in govFormTranslations" :key="key" :value="key">{{ name }}</option>
              </select>
            </div>
            <div>
              <label for="color" class="label">Цвет государства</label>
              <input id="color" type="text" v-model="editableState.color_hex" class="input" placeholder="#RRGGBB">
            </div>
            <div>
              <label for="telegramLink" class="label">Ссылка на Telegram</label>
              <input id="telegramLink" type="url" v-model="editableState.telegram_link" class="input" placeholder="https://t.me/...">
            </div>
            <div>
              <label for="mapLink" class="label">Ссылка на карту</label>
              <input id="mapLink" type="url" v-model="editableState.map_link" class="input" placeholder="https://map.example.com">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-4 border-t border-gray-800">
            <label class="checkbox-label">
              <input type="checkbox" v-model="editableState.has_elections" class="checkbox" />
              <span>Проводятся выборы</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="editableState.allow_dual_citizenship" class="checkbox" />
              <span>Разрешить двойное гражданство</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="editableState.free_entry" class="checkbox" />
              <span>Свободный вход</span>
            </label>
          </div>

          <div v-if="!editableState.free_entry">
            <label for="freeEntryDesc" class="label">Описание порядка входа на территорию</label>
            <textarea id="freeEntryDesc" v-model="editableState.free_entry_description" rows="3" class="input"></textarea>
          </div>


          <div class="pt-6 border-t border-gray-800 flex justify-end gap-4">
            <button type="button" @click="toggleEditMode" class="btn btn-secondary">Отмена</button>
            <button type="submit" class="btn btn-primary" :disabled="isSaving">
              <Icon v-if="isSaving" name="eos-icons:loading" class="w-5 h-5" />
              <span v-else>Сохранить изменения</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, watch } from 'vue';
import { GovernmentForm, RolesInState } from '~/types/state.types';
import type { IState, IStateMember } from '~/types/state.types';
import type { ICity } from '~/types/city.types';
import type { IAlliance } from '~/types/alliance.types';


definePageMeta({
  layout: 'panel',
});

// --- Внедрение данных из Layout ---
const accentColor = inject<globalThis.Ref<string>>('accentColor', ref('#ffffff'));
const state = inject<globalThis.Ref<IState | null>>('state', ref(null));
const fetchStateData = inject<() => Promise<void>>('fetchStateData');

// --- Статистика ---
const membersCount = ref<number | null>(null);
const applicantCount = ref<number | null>(null);
const citiesCount = ref<number | null>(null);
const alliancesCount = ref<number | null>(null);


// --- Редактирование ---
const isEditing = ref(false);
const isSaving = ref(false);
const editableState = ref<Partial<IState>>({});
const newFlagFile = ref<File | null>(null);
const flagPreview = ref<string | null>(null);

// --- Словари ---
const govFormTranslations: Record<GovernmentForm, string> = {
  [GovernmentForm.MONARCHY]: 'Монархия',
  [GovernmentForm.REPUBLIC]: 'Республика',
  [GovernmentForm.FEDERATION]: 'Федерация',
  [GovernmentForm.OLIGARCHY]: 'Олигархия / совет',
  [GovernmentForm.TRIBAL]: 'Племенное устройство',
  [GovernmentForm.OTHER]: 'Иное / смешанное'
};

// --- Методы ---
async function fetchStats() {
  if (!state.value?.uuid) return;
  try {
    const [membersData, citiesData, alliancesData] = await Promise.all([
      $fetch<IStateMember[]>(`/distant-api/state/${state.value.uuid}/members`).catch(() => []),
      $fetch<ICity[]>(`/distant-api/state/${state.value.uuid}/cities`).catch(() => []),
      $fetch<IAlliance[]>(`/distant-api/state/${state.value.uuid}/alliances`).catch(() => []),
    ]);

    membersCount.value = membersData.filter(m => m.role !== RolesInState.APPLICANT).length;
    applicantCount.value = membersData.filter(m => m.role === RolesInState.APPLICANT).length;
    citiesCount.value = citiesData.length;
    alliancesCount.value = alliancesData.length;

  } catch (error) {
    console.error("Ошибка при загрузке статистики:", error);
  }
}

function toggleEditMode() {
  isEditing.value = !isEditing.value;
  if (isEditing.value && state.value) {
    editableState.value = JSON.parse(JSON.stringify(state.value));
  } else {
    newFlagFile.value = null;
    flagPreview.value = null;
  }
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if(file.type.startsWith('image/')) {
      newFlagFile.value = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        flagPreview.value = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
}

async function saveChanges() {
  if (!state.value?.uuid) return;
  isSaving.value = true;

  try {
    const original = state.value!;
    const edited = editableState.value;

    // локальные утилиты для сравнения
    const normStr = (v: unknown) => (v ?? '').toString().trim();
    const normBool = (v: unknown) => Boolean(v);
    const strChanged = (a: unknown, b: unknown) => normStr(a) !== normStr(b);
    const boolChanged = (a: unknown, b: unknown) => normBool(a) !== normBool(b);

    const formData = new FormData();
    const { data: session } = useAuth();

    // Всегда добавляем того, кто обновляет
    formData.append('updaterUuid', session.value?.uuid || '');

    let changes = 0;

    // --- Строковые поля ---
    const stringMap: Array<[keyof IState, string]> = [
      ['name', 'name'],
      ['description', 'description'],
      ['color_hex', 'color'],
      ['gov_form', 'govForm'],
      ['telegram_link', 'telegramLink'],
      ['map_link', 'map_link'],
    ];

    for (const [k, apiKey] of stringMap) {
      if (k in edited && strChanged((edited as any)[k], (original as any)[k])) {
        formData.append(apiKey, normStr((edited as any)[k]));
        changes++;
      }
    }

    // --- Булевы поля ---
    const boolMap: Array<[keyof IState, string]> = [
      ['has_elections', 'hasElections'],
      ['allow_dual_citizenship', 'allowDualCitezenship'],
      ['free_entry', 'freeEntry'],
    ];

    let freeEntryChanged = false;

    for (const [k, apiKey] of boolMap) {
      if (k in edited && boolChanged((edited as any)[k], (original as any)[k])) {
        formData.append(apiKey, String(normBool((edited as any)[k])));
        changes++;
        if (k === 'free_entry') freeEntryChanged = true;
      }
    }

    // --- free_entry_description — только когда вход несвободный ---
    const editedFreeEntry = 'free_entry' in edited ? normBool((edited as any).free_entry) : normBool((original as any).free_entry);
    const needDescNow = !editedFreeEntry;

    if (needDescNow) {
      const descChanged = ('free_entry_description' in edited)
          ? strChanged((edited as any).free_entry_description, (original as any).free_entry_description)
          : false;

      if (descChanged || freeEntryChanged) {
        formData.append('freeEntryDesc', normStr((edited as any).free_entry_description));
        changes++;
      }
    } else {
      // ignore
    }

    // --- Файл флага ---
    if (newFlagFile.value) {
      formData.append('flag', newFlagFile.value);
      changes++;
    }

    // Если изменений нет — не отправляем запрос
    if (changes === 0) {
      isSaving.value = false;
      alert('Нет изменений для сохранения.');
      return;
    }

    await $fetch(`/distant-api/state/${original.uuid}`, {
      method: 'POST', // или 'PATCH', если поддерживается частичное обновление
      body: formData,
    });

    if (fetchStateData) {
      await fetchStateData();
    }

    isEditing.value = false;
    newFlagFile.value = null;
    flagPreview.value = null;

  } catch (error: any) {
    console.error("Ошибка при сохранении изменений:", error);
    alert(`Ошибка: ${error.data?.data?.statusMessage || error.message}`);
  } finally {
    isSaving.value = false;
  }
}


// --- Жизненный цикл ---
onMounted(() => {
  if (state.value) {
    fetchStats();
  }
});

watch(state, (newState) => {
  if(newState) {
    fetchStats();
    if (isEditing.value) {
      isEditing.value = false;
    }
  }
}, { deep: true });

</script>

<style scoped>
.card {
  @apply bg-gray-900/50 border border-gray-800 rounded-lg shadow-lg;
}
.card-header {
  @apply flex items-center justify-between p-4 border-b border-gray-700/50;
}
.card-body {
  @apply p-4 md:p-6;
}

.stat-card {
  @apply bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex justify-between items-center transition-transform hover:scale-105;
}
.stat-icon {
  @apply w-8 h-8 opacity-70;
}

.label {
  @apply block text-sm font-medium text-gray-400 mb-2;
}
.input {
  @apply w-full bg-gray-900/70 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500;
  @apply focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition;
  --tw-ring-color: var(--accent-color);
}
textarea.input {
  @apply min-h-[80px];
}

.file-input {
  @apply block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer;
}

.info-badge {
  @apply inline-flex items-center gap-2 px-3 py-1 bg-gray-800/60 text-gray-300 rounded-full text-sm;
}
.btn {
  @apply inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-primary {
  @apply text-black focus:ring-white;
  background-color: var(--accent-color);
}
.btn-primary:hover:not(:disabled) {
  @apply opacity-90;
}
.btn-secondary {
  @apply bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500;
}
.checkbox-label {
  @apply flex items-center gap-2 cursor-pointer;
}
.checkbox {
  @apply w-5 h-5 rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-600;
  --tw-ring-color: var(--accent-color);
}
</style>
