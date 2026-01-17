<!-- components/alliances/CreateAllianceModal.vue -->
<template>
  <div v-if="isOpen"
       class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center"
       @click.self="closeModal">
    <form @submit.prevent="handleSubmit"
          class="relative bg-gray-900 rounded-lg p-8 space-y-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <button type="button"
              @click="closeModal"
              class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>

      <h2 class="text-2xl font-bold text-center text-white">Создание нового альянса</h2>

      <!-- Основные поля -->
      <div class="space-y-4">
        <input v-model="form.name"
               required
               placeholder="Название альянса"
               class="w-full bg-gray-800/70 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"/>
        <textarea v-model="form.description"
                  required
                  placeholder="Описание / Устав"
                  class="w-full bg-gray-800/70 px-4 py-3 rounded-lg outline-none h-28 focus:ring-2 focus:ring-blue-500"/>

        <!-- Государство-основатель -->
        <div>
          <label for="creatorState" class="block text-sm font-medium text-gray-400 mb-1">Государство-основатель</label>
          <select id="creatorState"
                  v-model="form.creatorStateUuid"
                  required
                  class="w-full bg-gray-800/70 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
            <option disabled value="">Выберите государство</option>
            <option v-for="state in props.managedStates" :key="state.uuid" :value="state.uuid">
              {{ state.name }}
            </option>
          </select>
        </div>

        <div class="flex gap-4 flex-wrap items-center">
          <label class="flex items-center gap-2 cursor-pointer">
            Цвет: <input type="color" v-model="form.colorHex" class="w-8 h-8"/>
          </label>
          <select v-model="form.purpose"
                  required
                  class="bg-gray-800/70 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
            <option disabled value="">Цель альянса</option>
            <option v-for="(text, key) in purposeOptions" :key="key" :value="key">{{ text }}</option>
          </select>
        </div>
      </div>

      <!-- Флаг -->
      <div class="space-y-3">
        <p class="font-semibold text-gray-300">Флаг:</p>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="editor" v-model="mode"/> Создать в редакторе
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="upload" v-model="mode"/> Загрузить PNG
          </label>
        </div>

        <!-- Редактор -->
        <button v-if="mode==='editor'"
                type="button"
                @click="editor=true"
                class="bg-gray-700 rounded-lg py-2 px-4 hover:bg-gray-600 transition-colors">
          Открыть редактор
        </button>

        <!-- Загрузка -->
        <input v-if="mode==='upload'"
               type="file"
               accept=".png"
               @change="handleFileChange"
               class="block w-full text-sm text-gray-400
                      file:mr-4 file:px-4 file:py-2 file:rounded-lg
                      file:border-0 file:text-sm file:font-semibold
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-500 file:transition cursor-pointer"/>

        <!-- Превью -->
        <img v-if="preview"
             :src="preview"
             alt="Превью флага"
             class="w-24 h-40 rounded-md mt-2 object-cover border-2 border-gray-700"/>
      </div>

      <p class="text-gray-500 text-xs">
        ⚠️ Флаги, нарушающие правила сервера, будут удалены, а создатели альянса — наказаны.
      </p>

      <button :disabled="loading"
              class="w-full bg-blue-600 hover:bg-blue-500 transition rounded-lg py-3 font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed">
        {{ loading ? 'Создаём…' : 'Создать альянс' }}
      </button>
      <p v-if="errorMsg" class="text-red-400 text-center">{{ errorMsg }}</p>
    </form>

    <!-- Модал редактора баннера -->
    <BannerEditorModal v-model="banner"
                       :open="editor"
                       @close="handleEditorClose"/>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { IState } from '~/types/state.types';
import { AlliencePurpose } from '~/types/diplomacy.types';
import BannerEditorModal from '~/components/BannerEditorModal.vue';

interface BannerLayer {
  id: string;
  color: string;
}

const props = defineProps<{
  isOpen: boolean;
  managedStates: IState[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', allianceUuid: string): void;
}>();

/* -------------------------------------------------------------------------- */
/* Reactive form state                                                        */
/* -------------------------------------------------------------------------- */
const form = ref({
  name: '',
  description: '',
  creatorStateUuid: '',
  colorHex: '#ffffff',
  purpose: AlliencePurpose.GENERAL,
});

const file      = ref<File | null>(null);
const preview   = ref<string>('');
const loading   = ref(false);
const errorMsg  = ref('');

/* -------------------------------------------------------------------------- */
/* Flag logic                                                                 */
/* -------------------------------------------------------------------------- */
const mode    = ref<'editor' | 'upload'>('editor');
const editor  = ref(false);
const banner  = ref<BannerLayer[]>([]);

const purposeOptions: Record<string, string> = {
  [AlliencePurpose.GENERAL]:     'Общий',
  [AlliencePurpose.ECONOMIC]:    'Экономический',
  [AlliencePurpose.MILITARY]:    'Военный',
  [AlliencePurpose.DIPLOMATIC]:  'Дипломатический',
  [AlliencePurpose.OTHER]:       'Другое',
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function closeModal() {
  emit('close');
}

/** Сброс формы при открытии модалки */
function resetForm() {
  form.value = {
    name: '',
    description: '',
    creatorStateUuid: props.managedStates.length ? props.managedStates[0].uuid : '',
    colorHex: '#ffffff',
    purpose: AlliencePurpose.GENERAL,
  };
  file.value     = null;
  preview.value  = '';
  errorMsg.value = '';
  loading.value  = false;
  banner.value   = [];
}

/** Обработка выбора файла */
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  file.value = target.files?.[0] ?? null;
}

/** dataURL → File */
function dataURLtoFile(dataUrl: string, filename: string): File | null {
  try {
    const [header, data] = dataUrl.split(',');
    if (!header || !data) return null;
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(data);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
    return new File([u8], filename, { type: mime });
  } catch (err) {
    console.error('dataURL → File error', err);
    return null;
  }
}

/** Закрытие редактора баннеров */
function handleEditorClose(payload?: { dataUrl?: string }) {
  editor.value = false;
  if (payload?.dataUrl) {
    const f = dataURLtoFile(payload.dataUrl, 'flag-from-editor.png');
    if (f) {
      file.value = f;
    } else {
      errorMsg.value = 'Ошибка создания файла из редактора.';
    }
  }
}

/** Отправка формы */
async function handleSubmit() {
  if (!file.value || !form.value.creatorStateUuid) {
    errorMsg.value = 'Пожалуйста, заполните все поля и выберите флаг.';
    return;
  }
  errorMsg.value = '';
  loading.value  = true;

  try {
    const body = new FormData();
    body.append('name',             form.value.name);
    body.append('description',      form.value.description);
    body.append('creatorStateUuid', form.value.creatorStateUuid);
    body.append('colorHex',         form.value.colorHex);
    body.append('purpose',          form.value.purpose);
    body.append('flag',             file.value);

    const { uuid } = await $fetch<{ uuid: string }>('/distant-api/alliances/create', {
      method: 'POST',
      body,
    });

    emit('created', uuid);
    closeModal();
  } catch (e: any) {
    errorMsg.value = e.data?.data?.statusMessageRu || e.data?.message || 'Произошла неизвестная ошибка';
    console.error('Alliance create error:', e);
  } finally {
    loading.value = false;
  }
}

/* -------------------------------------------------------------------------- */
/* Watchers                                                                   */
/* -------------------------------------------------------------------------- */
watch(() => props.isOpen, (open) => open && resetForm());

watch(file, (f) => {
  // Очищаем старое превью
  if (preview.value.startsWith('blob:')) URL.revokeObjectURL(preview.value);

  if (!f) { preview.value = ''; return; }

  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const ratio = img.height / img.width;
    if (ratio < 1.5 || ratio > 2.5) {
      errorMsg.value = 'Флаг должен быть вертикальным (~1:2).';
      file.value = null;
    } else {
      errorMsg.value = '';
      preview.value = url;
    }
  };
  img.onerror = () => {
    errorMsg.value = 'Не удалось прочитать файл изображения.';
    file.value = null;
  };
  img.src = url;
});
</script>
