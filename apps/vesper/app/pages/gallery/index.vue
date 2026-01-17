<!-- pages/gallery/index.vue -->
<script setup lang="ts">
import type { IGalleryListResponse, IGalleryCategoriesResponse, IGallerySeasonsResponse } from '~/types/gallery.types'
import GalleryGrid from '~/components/gallery/GalleryGrid.vue'
import GalleryUploadModal from '~/components/gallery/GalleryUploadModal.vue'

definePageMeta({ auth: false })

const config = useRuntimeConfig()
const { status, data: session } = useAuth()

const isLoggedIn = computed(() => status.value === 'authenticated')

/* ───── State ───── */
const galleryData = ref<IGalleryListResponse>({
  items: [],
  total: 0,
  page: 1,
  perPage: 20,
  totalPages: 0
})
const categories = ref<string[]>([])
const seasons = ref<string[]>([])

const loading = ref(true)
const error = ref('')

// Filters
const selectedCategory = ref('')
const selectedSeason = ref('')
const perPage = ref(20)
const currentPage = ref(1)

// Constants
const MAX_VISIBLE_PAGES = 5

// Modal
const showUploadModal = ref(false)

/* ───── Load gallery data ───── */
async function loadGallery() {
  loading.value = true
  error.value = ''

  try {
    const query: Record<string, any> = {
      page: currentPage.value,
      perPage: perPage.value
    }

    if (selectedCategory.value) {
      query.category = selectedCategory.value
    }
    if (selectedSeason.value) {
      query.season = selectedSeason.value
    }

    const response = await $fetch<IGalleryListResponse>(`${config.public.backendURL}/gallery`, {
      query
    })

    galleryData.value = response
  } catch (e: any) {
    console.error('Error loading gallery:', e)
    error.value = e.data?.message || 'Не удалось загрузить галерею'
  } finally {
    loading.value = false
  }
}

/* ───── Load filters ───── */
async function loadFilters() {
  try {
    const [categoriesRes, seasonsRes] = await Promise.all([
      $fetch<IGalleryCategoriesResponse>(`${config.public.backendURL}/gallery/categories`),
      $fetch<IGallerySeasonsResponse>(`${config.public.backendURL}/gallery/seasons`)
    ])
    categories.value = categoriesRes.categories
    seasons.value = seasonsRes.seasons
  } catch (e) {
    console.error('Error loading filters:', e)
  }
}

/* ───── Pagination ───── */
function goToPage(page: number) {
  if (page < 1 || page > galleryData.value.totalPages) return
  currentPage.value = page
}

function nextPage() {
  if (currentPage.value < galleryData.value.totalPages) {
    goToPage(currentPage.value + 1)
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1)
  }
}

/* ───── Watch for changes ───── */
watch([selectedCategory, selectedSeason], () => {
  currentPage.value = 1
  loadGallery()
})

watch([currentPage, perPage], () => {
  loadGallery()
})

/* ───── Upload handler ───── */
function handleUploaded() {
  // Show success message or reload
  loadGallery()
}

/* ───── Initialize ───── */
onMounted(() => {
  Promise.all([loadGallery(), loadFilters()])
})
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28 px-4 pb-20">
    <div class="w-full max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="pr2p text-3xl md:text-4xl font-extrabold text-red-500 flex items-center gap-3">
            <Icon name="solar:gallery-bold-duotone" class="w-8 h-8" />
            Галерея
          </h1>
          <p class="text-gray-400 mt-2">
            Скриншоты игроков HeliCraft
          </p>
        </div>

        <!-- Upload button -->
        <button
          v-if="isLoggedIn"
          @click="showUploadModal = true"
          class="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition px-6 py-3 rounded-md font-bold text-black"
        >
          <Icon name="solar:upload-bold-duotone" class="w-5 h-5" />
          Загрузить
        </button>
      </header>

      <!-- Filters -->
      <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Category filter -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">Категория</label>
            <select
              v-model="selectedCategory"
              class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition"
            >
              <option value="">Все категории</option>
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <!-- Season filter -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">Сезон</label>
            <select
              v-model="selectedSeason"
              class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition"
            >
              <option value="">Все сезоны</option>
              <option v-for="s in seasons" :key="s" :value="s">
                {{ s }}
              </option>
            </select>
          </div>

          <!-- Per page -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">Показывать по</label>
            <select
              v-model.number="perPage"
              class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition"
            >
              <option :value="12">12</option>
              <option :value="20">20</option>
              <option :value="40">40</option>
              <option :value="60">60</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Error -->
      <div
        v-if="error"
        class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300"
      >
        <div class="flex items-center gap-2">
          <Icon name="solar:danger-circle-bold" class="w-5 h-5" />
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Gallery -->
      <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6">
        <GalleryGrid :images="galleryData.items" :loading="loading" />
      </section>

      <!-- Pagination -->
      <nav
        v-if="!loading && galleryData.totalPages > 1"
        class="flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div class="text-sm text-gray-400">
          Показано {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, galleryData.total) }} из {{ galleryData.total }}
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
          </button>

          <div class="flex items-center gap-1">
            <button
              v-for="page in Math.min(MAX_VISIBLE_PAGES, galleryData.totalPages)"
              :key="page"
              @click="goToPage(page)"
              class="px-4 py-2 rounded-md transition"
              :class="currentPage === page ? 'bg-red-500 text-black font-bold' : 'bg-gray-800 hover:bg-gray-700'"
            >
              {{ page }}
            </button>
            <span v-if="galleryData.totalPages > MAX_VISIBLE_PAGES" class="px-2 text-gray-500">...</span>
            <button
              v-if="galleryData.totalPages > MAX_VISIBLE_PAGES"
              @click="goToPage(galleryData.totalPages)"
              class="px-4 py-2 rounded-md transition"
              :class="currentPage === galleryData.totalPages ? 'bg-red-500 text-black font-bold' : 'bg-gray-800 hover:bg-gray-700'"
            >
              {{ galleryData.totalPages }}
            </button>
          </div>

          <button
            @click="nextPage"
            :disabled="currentPage === galleryData.totalPages"
            class="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Icon name="solar:alt-arrow-right-linear" class="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>

    <!-- Upload modal -->
    <GalleryUploadModal
      :is-open="showUploadModal"
      @close="showUploadModal = false"
      @uploaded="handleUploaded"
    />
  </main>
</template>
