<!-- components/gallery/GalleryUploadModal.vue -->
<script setup lang="ts">
import type { IGalleryActionResponse } from '~/types/gallery.types'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  uploaded: [image: IGalleryActionResponse]
}>()

const config = useRuntimeConfig()
const { token } = useAuth()

const description = ref('')
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isUploading = ref(false)
const error = ref('')
const dragOver = ref(false)

// Upload constraints
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    validateAndSetFile(input.files[0])
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    validateAndSetFile(event.dataTransfer.files[0])
  }
}

function validateAndSetFile(file: File) {
  error.value = ''
  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    error.value = 'Поддерживаются только форматы PNG, JPEG и WebP'
    return
  }
  
  if (file.size > MAX_FILE_SIZE_BYTES) {
    error.value = `Максимальный размер файла — ${MAX_FILE_SIZE_MB} МБ`
    return
  }
  
  selectedFile.value = file
  
  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function removeFile() {
  selectedFile.value = null
  previewUrl.value = null
}

async function upload() {
  if (!selectedFile.value) {
    error.value = 'Выберите файл для загрузки'
    return
  }
  
  isUploading.value = true
  error.value = ''
  
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    if (description.value.trim()) {
      formData.append('description', description.value.trim())
    }
    
    const response = await $fetch<IGalleryActionResponse>(`${config.public.backendURL}/gallery`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token.value}`
      }
    })
    
    if (response.ok) {
      emit('uploaded', response)
      resetForm()
      emit('close')
    } else {
      error.value = 'Не удалось загрузить изображение'
    }
  } catch (e: any) {
    console.error('Upload error:', e)
    if (e.status === 413) {
      error.value = 'Файл слишком большой'
    } else if (e.status === 415) {
      error.value = 'Неподдерживаемый формат файла'
    } else if (e.status === 403) {
      error.value = 'Вы заблокированы и не можете загружать изображения'
    } else {
      error.value = e.data?.message || 'Произошла ошибка при загрузке'
    }
  } finally {
    isUploading.value = false
  }
}

function resetForm() {
  description.value = ''
  selectedFile.value = null
  previewUrl.value = null
  error.value = ''
}

function closeModal() {
  resetForm()
  emit('close')
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
      @click.self="closeModal"
    >
      <div class="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-xl w-full max-w-lg border border-gray-700">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 class="text-xl font-bold text-red-500">Загрузить изображение</h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-white transition"
          >
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <!-- Error message -->
          <div
            v-if="error"
            class="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm"
          >
            {{ error }}
          </div>

          <!-- Drop zone / Preview -->
          <div
            v-if="!previewUrl"
            class="border-2 border-dashed rounded-lg p-8 text-center transition"
            :class="dragOver ? 'border-red-500 bg-red-500/10' : 'border-gray-600 hover:border-gray-500'"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop="handleDrop"
          >
            <Icon name="solar:upload-bold-duotone" class="w-12 h-12 mx-auto text-gray-500 mb-4" />
            <p class="text-gray-400 mb-2">Перетащите изображение сюда или</p>
            <label class="inline-block">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden"
                @change="handleFileSelect"
              />
              <span class="bg-red-500 hover:bg-red-600 transition text-black font-bold px-4 py-2 rounded-md cursor-pointer">
                Выберите файл
              </span>
            </label>
            <p class="text-xs text-gray-500 mt-4">
              PNG, JPEG или WebP до 10 МБ
            </p>
          </div>

          <!-- Preview -->
          <div v-else class="relative">
            <img
              :src="previewUrl"
              alt="Preview"
              class="w-full h-64 object-contain rounded-lg bg-gray-800"
            />
            <button
              @click="removeFile"
              class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 transition rounded-full p-1"
            >
              <Icon name="mdi:close" class="w-5 h-5 text-white" />
            </button>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">
              Описание (необязательно)
            </label>
            <textarea
              v-model="description"
              placeholder="Добавьте описание к изображению..."
              class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition resize-none h-24"
            />
          </div>

          <!-- Info -->
          <p class="text-xs text-gray-500">
            Изображение будет отправлено на модерацию. После одобрения администратором оно появится в общей галерее.
          </p>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-4 p-6 border-t border-gray-700">
          <button
            @click="closeModal"
            class="bg-gray-700 hover:bg-gray-600 transition px-6 py-2 rounded-md font-bold"
          >
            Отмена
          </button>
          <button
            @click="upload"
            :disabled="!selectedFile || isUploading"
            class="bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isUploading" class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              Загрузка...
            </span>
            <span v-else>Загрузить</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
