<script setup lang="ts">
import type { IGalleryListResponse, IGalleryImagePublic } from '~/types/gallery.types'
import { GalleryImageStatus } from '~/types/gallery.types'

definePageMeta({ auth: true })

const config = useRuntimeConfig()
const { token } = useAuth()

/* ───── State ───── */
const images = ref<IGalleryImagePublic[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const perPage = ref(12)
const statusFilter = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')

/* ───── Computed ───── */
const totalPages = computed(() => Math.ceil(total.value / perPage.value))

/* ───── Load images ───── */
async function loadImages() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<IGalleryListResponse>(
      `${config.public.backendURL}/gallery/my`,
      {
        query: { page: currentPage.value, perPage: perPage.value },
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )
    images.value = response.items
    total.value = response.total
  } catch (e: any) {
    console.error('Error loading gallery:', e)
    error.value = 'Не удалось загрузить изображения'
  } finally {
    loading.value = false
  }
}

/* ───── Filtered images ───── */
const filteredImages = computed(() => {
  if (statusFilter.value === 'all') return images.value
  return images.value.filter(img => img.status === statusFilter.value)
})

/* ───── Format date ───── */
function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/* ───── Status badge ───── */
function getStatusBadge(status: string) {
  switch (status) {
    case GalleryImageStatus.APPROVED:
      return { text: 'Одобрено', class: 'bg-green-500/20 text-green-400' }
    case GalleryImageStatus.PENDING:
      return { text: 'На модерации', class: 'bg-yellow-500/20 text-yellow-400' }
    case GalleryImageStatus.REJECTED:
      return { text: 'Отклонено', class: 'bg-red-500/20 text-red-400' }
    default:
      return null
  }
}

/* ───── Pagination ───── */
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

/* ───── Watch ───── */
watch(currentPage, loadImages)

/* ───── Initialize ───── */
onMounted(loadImages)
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28 px-4 pb-20">
    <div class="w-full max-w-5xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <NuxtLink
            to="/account"
            class="inline-flex items-center gap-2 text-gray-400 hover:text-red-400 transition mb-4"
          >
            <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
            <span>Назад в аккаунт</span>
          </NuxtLink>
          <h1 class="pr2p text-2xl md:text-3xl text-red-500">Мои скриншоты</h1>
          <p class="text-gray-400 mt-1">Управление загруженными изображениями</p>
        </div>

        <NuxtLink
          to="/gallery"
          class="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition px-6 py-3 rounded-md font-bold text-black"
        >
          <Icon name="solar:upload-bold-duotone" class="w-5 h-5" />
          Загрузить новый
        </NuxtLink>
      </div>

      <!-- Filters -->
      <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="filter in [
              { value: 'all', label: 'Все' },
              { value: 'pending', label: 'На модерации' },
              { value: 'approved', label: 'Одобренные' },
              { value: 'rejected', label: 'Отклонённые' }
            ]"
            :key="filter.value"
            @click="statusFilter = filter.value as typeof statusFilter"
            class="px-4 py-2 rounded-md text-sm font-medium transition"
            :class="statusFilter === filter.value 
              ? 'bg-red-500 text-black' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="bg-red-900/30 border border-red-500/50 rounded-lg p-8 text-center"
      >
        <Icon name="solar:danger-circle-bold" class="w-12 h-12 mx-auto text-red-400 mb-4" />
        <p class="text-red-300">{{ error }}</p>
        <button
          @click="loadImages"
          class="mt-4 bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md font-bold text-black"
        >
          Повторить
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredImages.length === 0"
        class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-12 text-center"
      >
        <Icon name="solar:gallery-bold-duotone" class="w-16 h-16 mx-auto text-gray-600 mb-4" />
        <p class="text-gray-400 text-lg">
          {{ statusFilter === 'all' ? 'Вы ещё не загружали изображений' : 'Нет изображений с таким статусом' }}
        </p>
        <NuxtLink
          v-if="statusFilter === 'all'"
          to="/gallery"
          class="inline-block mt-6 bg-red-500 hover:bg-red-600 transition px-6 py-3 rounded-md font-bold text-black"
        >
          Загрузить первый скриншот
        </NuxtLink>
      </div>

      <!-- Images grid -->
      <div v-else class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NuxtLink
            v-for="image in filteredImages"
            :key="image.id"
            :to="`/gallery/${image.id}`"
            class="group relative aspect-video overflow-hidden rounded-lg bg-gray-800"
          >
            <img
              :src="`${config.public.backendURL}/gallery/${image.id}/image`"
              :alt="image.description || 'Gallery image'"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            
            <!-- Status badge -->
            <span
              v-if="getStatusBadge(image.status)"
              class="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium"
              :class="getStatusBadge(image.status)?.class"
            >
              {{ getStatusBadge(image.status)?.text }}
            </span>

            <!-- Overlay -->
            <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <p v-if="image.description" class="text-white text-sm truncate">
                {{ image.description }}
              </p>
              <p class="text-gray-400 text-xs">{{ formatDate(image.created_at) }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Pagination -->
      <nav
        v-if="!loading && totalPages > 1"
        class="flex items-center justify-center gap-2"
      >
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
        </button>

        <span class="px-4 text-gray-400">
          {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Icon name="solar:alt-arrow-right-linear" class="w-5 h-5" />
        </button>
      </nav>

      <!-- Stats -->
      <div class="text-center text-sm text-gray-500">
        Всего: {{ total }} изображений
      </div>
    </div>
  </main>
</template>
