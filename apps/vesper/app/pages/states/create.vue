<!-- pages/states/create.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BannerEditorModal from '@/components/BannerEditorModal.vue'

// Определяем тип для v-model, так как Pattern может быть не экспортирован глобально
interface BannerLayer {
  id: string;
  color: string;
}

/* —— форма —— */
const form = ref({
  name:'',
  description:'',
  color:'#ff0000',
  govForm:'monarchy',
  hasElections:false,
  telegramLink:'',
  // FIX: Имя поля приведено в соответствие с тем, что ожидает бэкенд
  allowDualCitezenship:false,
  freeEntry:true,
  freeEntryDesc:''
})
const router   = useRouter()
const loading  = ref(false)
const errorMsg = ref('')

/* —— флаг: upload vs editor —— */
const mode     = ref<'editor'|'upload'>('editor')
const file     = ref<File|null>(null)
const banner   = ref<BannerLayer[]>([])
const preview  = ref<string>('')    // data-url для превью
const editor   = ref(false)

/**
 * Вспомогательная функция для конвертации dataURL в объект File.
 * @param dataUrl - Строка в формате data:image/png;base64,...
 * @param filename - Имя будущего файла.
 * @returns {File | null}
 */
function dataURLtoFile(dataUrl: string, filename: string): File | null {
  try {
    const arr = dataUrl.split(',')
    if (!arr[0] || !arr[1]) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  } catch (e) {
    console.error("Error converting dataURL to File:", e);
    return null;
  }
}

/* авто-превью при загрузке файла */
watch(file, newFile => {
  if (!newFile) {
    preview.value = '';
    return;
  }

  const url = URL.createObjectURL(newFile);

  if (newFile.name === 'flag-from-editor.png') {
    preview.value = url;
    return;
  }

  const img = new Image();
  img.onload = () => {
    const ratio = img.height / img.width;
    if (ratio < 1.6 || ratio > 2.4) {
      errorMsg.value = 'Флаг должен быть вертикальным (соотношение сторон ~2:1)';
      file.value = null;
      preview.value = '';
    } else {
      errorMsg.value = '';
      preview.value = url;
    }
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    errorMsg.value = 'Не удалось прочитать файл изображения.';
    file.value = null;
    preview.value = '';
    URL.revokeObjectURL(url);
  }
  img.src = url;
});


/**
 * Обработчик закрытия редактора флагов.
 */
function handleEditorClose(payload?: { dataUrl?: string }) {
  editor.value = false;
  if (payload?.dataUrl) {
    preview.value = payload.dataUrl;
    const generatedFile = dataURLtoFile(payload.dataUrl, 'flag-from-editor.png');
    if (generatedFile) {
      file.value = generatedFile;
    } else {
      errorMsg.value = "Ошибка создания файла из редактора."
    }
  }
}

async function handleSubmit() {
  errorMsg.value = '';

  if (!file.value) {
    return errorMsg.value = mode.value === 'upload'
        ? 'Загрузите PNG файл флага'
        : 'Создайте флаг в редакторе';
  }

  loading.value = true;
  try {
    const body = new FormData();
    Object.entries(form.value).forEach(([k, v]) => body.append(k, String(v)));

    body.append('flag', file.value);

    const { uuid } = await $fetch('/distant-api/state/create', { method: 'POST', body });
    await router.push(`/states/${uuid}`);
  } catch (e: any) {
    errorMsg.value = e.data.data.statusMessageRu || e.message || 'Произошла неизвестная ошибка';
    console.error('Ошибка при создании государства:', e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col items-center
               justify-center px-4 py-24">
    <form @submit.prevent="handleSubmit"
          class="w-full max-w-2xl bg-gray-900/70 rounded-lg p-8 space-y-6">

      <h1 class="pr2p text-red-500 text-3xl text-center">Новое государство</h1>

      <!-- основные поля -->
      <input v-model="form.name" required placeholder="Название"
             class="w-full bg-gray-800/70 px-4 py-3 rounded outline-none"/>
      <textarea v-model="form.description" required placeholder="Описание"
                class="w-full bg-gray-800/70 px-4 py-3 rounded outline-none h-32"/>

      <div class="flex gap-4 flex-wrap">
        <label class="flex items-center gap-2">
          Цвет: <input type="color" v-model="form.color"/>
        </label>
        <select v-model="form.govForm"
                class="bg-gray-800/70 px-3 py-2 rounded">
          <option value="monarchy">Монархия</option>
          <option value="republic">Республика</option>
          <option value="federation">Федерация</option>
          <option value="oligarchy">Олигархия</option>
          <option value="tribal">Племя</option>
          <option value="other">Другая</option>
        </select>
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="form.hasElections"/> Есть выборы
        </label>
        <!-- FIX: v-model привязан к новому имени поля -->
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="form.allowDualCitezenship"/> Двойное гражданство
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="form.freeEntry"/> Свободный вход
        </label>
      </div>

      <!-- FIX: Поле теперь отображается, когда свободный вход ОТКЛЮЧЕН -->
      <input v-if="!form.freeEntry"
             v-model="form.freeEntryDesc" placeholder="Условия получения гражданства (визы)"
             class="w-full bg-gray-800/70 px-4 py-3 rounded outline-none"/>

      <input v-model="form.telegramLink" placeholder="Ссылка на Telegram"
             class="w-full bg-gray-800/70 px-4 py-3 rounded outline-none"/>

      <!-- выбор способа флага -->
      <div class="space-y-2">
        <p class="font-semibold">Флаг:</p>
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input type="radio" value="editor" v-model="mode"/> Создать в редакторе
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" value="upload" v-model="mode"/> Загрузить PNG
          </label>
        </div>

        <!-- редактор -->
        <button v-if="mode==='editor'"
                @click.prevent="editor=true"
                class="bg-gray-700 rounded py-2 px-4 hover:bg-gray-600">
          Открыть редактор
        </button>

        <!-- upload -->
        <input v-if="mode==='upload'" type="file" accept=".png"
               @change="file=($event.target as HTMLInputElement).files?.[0] ?? null"
               class="file:mr-4 file:bg-red-500 file:text-black file:px-3
                      file:py-2 file:rounded file:border-0"/>

        <!-- превью -->
        <img v-if="preview" :src="preview" class="w-24 h-40 rounded mt-2 object-cover border border-gray-700"/>
      </div>

      <p class="text-gray-500 text-xs">
        ⚠️ Флаги, нарушающие правила сервера, будут удалены, а авторы — забанены.
      </p>

      <button :disabled="loading"
              class="w-full bg-red-500 hover:bg-red-600 transition rounded-md py-3
                     font-bold text-black disabled:opacity-60">
        {{ loading ? 'Создаём…' : 'Создать' }}
      </button>
      <p v-if="errorMsg" class="text-red-400 text-center">{{ errorMsg }}</p>
    </form>

    <BannerEditorModal v-model="banner" :open="editor" @close="handleEditorClose"/>
  </main>
</template>
