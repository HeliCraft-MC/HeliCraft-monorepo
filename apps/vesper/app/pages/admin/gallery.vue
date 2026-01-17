<!-- pages/admin/gallery.vue -->
<script setup lang="ts">
import type { IGalleryListResponse, IGalleryImagePublic, IGalleryActionResponse, IPlayerSearchResult } from '~/types/gallery.types'
import { GalleryImageStatus } from '~/types/gallery.types'
import GalleryEditModal from '~/components/gallery/GalleryEditModal.vue'

definePageMeta({ layout: 'admin' })

const config = useRuntimeConfig()
const { data: session, token } = useAuth()
const userUuid = computed(() => session.value?.uuid)

/* ───── State ───── */
const activeTab = ref<'pending' | 'approved' | 'rejected'>('pending')
const pendingImages = ref<IGalleryImagePublic[]>([])
const approvedImages = ref<IGalleryImagePublic[]>([])
const rejectedImages = ref<IGalleryImagePublic[]>([])

const loading = ref(true)
const error = ref<string | null>(null)
const processing = ref<string | null>(null)
const currentPage = ref(1)
const perPage = ref(20)
const totalItems = ref(0)

// Uploader nicknames cache
const uploaderNicknames = ref<Map<string, string>>(new Map())

// Edit modal
const showEditModal = ref(false)
const editingImage = ref<IGalleryImagePublic | null>(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const deletingImage = ref<IGalleryImagePublic | null>(null)

/* ───── Computed ───── */
const currentList = computed(() => {
  switch (activeTab.value) {
    case 'pending': return pendingImages
    case 'approved': return approvedImages
    case 'rejected': return rejectedImages
  }
})

const totalPages = computed(() => Math.ceil(totalItems.value / perPage.value))

/* ───── Fetch uploader nickname ───── */
async function fetchUploaderNickname(uuid: string): Promise<string> {
  if (uploaderNicknames.value.has(uuid)) {
    return uploaderNicknames.value.get(uuid)!
  }
  
  try {
    const response = await $fetch<{ nickname: string }>(
      `${config.public.backendURL}/user/${uuid}`
    )
    uploaderNicknames.value.set(uuid, response.nickname)
    return response.nickname
  } catch {
    uploaderNicknames.value.set(uuid, 'Неизвестный')
    return 'Неизвестный'
  }
}

/* ───── Fetch data ───── */
async function fetchCurrentTabData() {
  loading.value = true
  error.value = null

  try {
    let endpoint = ''
    switch (activeTab.value) {
      case 'pending':
        endpoint = '/gallery/pending'
        break
      case 'approved':
        endpoint = '/gallery'
        break
      case 'rejected':
        // No specific endpoint, we'll use the main one with all access
        endpoint = '/gallery'
        break
    }

    const response = await $fetch<IGalleryListResponse>(
      `${config.public.backendURL}${endpoint}`,
      {
        query: { page: currentPage.value, perPage: perPage.value },
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )

    currentList.value.value = response.items
    totalItems.value = response.total

    // Fetch uploader nicknames
    const uniqueUuids = [...new Set(response.items.map(img => img.uploader_uuid))]
    await Promise.all(uniqueUuids.map(uuid => fetchUploaderNickname(uuid)))
  } catch (e: any) {
    console.error('Error fetching gallery:', e)
    error.value = e.data?.message || 'Не удалось загрузить данные'
  } finally {
    loading.value = false
  }
}

/* ───── Actions ───── */
async function approveImage(image: IGalleryImagePublic) {
  if (processing.value) return
  processing.value = image.id

  try {
    const response = await $fetch<IGalleryActionResponse>(
      `${config.public.backendURL}/gallery/${image.id}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )

    if (response.ok) {
      await fetchCurrentTabData()
    }
  } catch (e: any) {
    console.error('Approve error:', e)
    error.value = e.data?.message || 'Не удалось одобрить изображение'
  } finally {
    processing.value = null
  }
}

async function rejectImage(image: IGalleryImagePublic) {
  if (processing.value) return
  processing.value = image.id

  try {
    const response = await $fetch<IGalleryActionResponse>(
      `${config.public.backendURL}/gallery/${image.id}/reject`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )

    if (response.ok) {
      await fetchCurrentTabData()
    }
  } catch (e: any) {
    console.error('Reject error:', e)
    error.value = e.data?.message || 'Не удалось отклонить изображение'
  } finally {
    processing.value = null
  }
}

async function deleteImage() {
  if (!deletingImage.value || processing.value) return
  processing.value = deletingImage.value.id

  try {
    await $fetch<IGalleryActionResponse>(
      `${config.public.backendURL}/gallery/${deletingImage.value.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )

    showDeleteConfirm.value = false
    deletingImage.value = null
    await fetchCurrentTabData()
  } catch (e: any) {
    console.error('Delete error:', e)
    error.value = e.data?.message || 'Не удалось удалить изображение'
  } finally {
    processing.value = null
  }
}

function openEditModal(image: IGalleryImagePublic) {
  editingImage.value = image
  showEditModal.value = true
}

function openDeleteConfirm(image: IGalleryImagePublic) {
  deletingImage.value = image
  showDeleteConfirm.value = true
}

function handleUpdated(updatedImage: IGalleryImagePublic) {
  // Update the image in the list
  const list = currentList.value.value
  const index = list.findIndex(img => img.id === updatedImage.id)
  if (index !== -1) {
    list[index] = updatedImage
  }
}

/* ───── Format date ───── */
function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/* ───── Pagination ───── */
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

/* ───── Watchers ───── */
watch(activeTab, () => {
  currentPage.value = 1
  fetchCurrentTabData()
})

watch(currentPage, fetchCurrentTabData)

/* ───── Initialize ───── */
onMounted(fetchCurrentTabData)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Управление галереей</h1>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <div class="flex items-center">
        <button
          @click="activeTab = 'pending'"
          :class="['tab-btn', activeTab === 'pending' && 'tab-active']"
        >
          На модерации
        </button>
        <button
          @click="activeTab = 'approved'"
          :class="['tab-btn', activeTab === 'approved' && 'tab-active']"
        >
          Одобренные
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-24">
      <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-gray-500"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center text-red-400 py-24 bg-red-900/20 rounded-lg">
      <h3 class="font-bold text-lg">Произошла ошибка</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Empty state -->
      <div
        v-if="currentList.value.length === 0"
        class="text-center py-24 text-gray-500"
      >
        <Icon name="solar:gallery-bold-duotone" class="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p class="text-lg">
          {{ activeTab === 'pending' ? 'Нет изображений на модерации' : 'Нет одобренных изображений' }}
        </p>
      </div>

      <!-- Images grid -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          v-for="image in currentList.value"
          :key="image.id"
          class="bg-gray-800 rounded-lg overflow-hidden"
        >
          <!-- Image preview -->
          <NuxtLink
            :to="`/gallery/${image.id}`"
            target="_blank"
            class="block aspect-video bg-gray-900 overflow-hidden"
          >
            <img
              :src="`${config.public.backendURL}/gallery/${image.id}/image`"
              :alt="image.description || 'Gallery image'"
              class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </NuxtLink>

          <!-- Info -->
          <div class="p-4 space-y-3">
            <!-- Description -->
            <p
              v-if="image.description"
              class="text-gray-300 text-sm line-clamp-2"
            >
              {{ image.description }}
            </p>
            <p v-else class="text-gray-500 text-sm italic">Без описания</p>

            <!-- Uploader -->
            <div class="flex items-center gap-2 text-sm">
              <img
                :src="`${config.public.backendURL}/user/${image.uploader_uuid}/skin/head.png`"
                :alt="uploaderNicknames.get(image.uploader_uuid) || 'User'"
                class="w-6 h-6 rounded"
              />
              <span class="text-gray-400">
                {{ uploaderNicknames.get(image.uploader_uuid) || 'Загрузка...' }}
              </span>
            </div>

            <!-- Date -->
            <div class="text-xs text-gray-500">
              {{ formatDate(image.created_at) }}
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap gap-2 pt-2">
              <!-- Pending actions -->
              <template v-if="activeTab === 'pending'">
                <button
                  @click="approveImage(image)"
                  :disabled="processing === image.id"
                  class="btn-success"
                >
                  Одобрить
                </button>
                <button
                  @click="rejectImage(image)"
                  :disabled="processing === image.id"
                  class="btn-warning"
                >
                  Отклонить
                </button>
              </template>

              <!-- Common actions -->
              <button
                @click="openEditModal(image)"
                :disabled="processing === image.id"
                class="btn-secondary"
              >
                Редактировать
              </button>
              <button
                @click="openDeleteConfirm(image)"
                :disabled="processing === image.id"
                class="btn-danger"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <nav
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-2 mt-8"
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
    </div>

    <!-- Edit modal -->
    <GalleryEditModal
      :is-open="showEditModal"
      :image="editingImage"
      :is-admin="true"
      @close="showEditModal = false; editingImage = null"
      @updated="handleUpdated"
    />

    <!-- Delete confirmation modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity"
      @click.self="showDeleteConfirm = false; deletingImage = null"
    >
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-sm shadow-xl m-4">
        <h3 class="text-lg font-bold text-red-500">Удалить изображение?</h3>
        <p class="mt-2 text-gray-300">
          Это действие нельзя отменить. Изображение будет удалено навсегда.
        </p>
        <div class="mt-6 flex justify-end gap-4">
          <button
            @click="showDeleteConfirm = false; deletingImage = null"
            class="btn-secondary"
          >
            Отмена
          </button>
          <button
            @click="deleteImage"
            :disabled="processing !== null"
            class="btn-danger"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  @apply px-4 py-3 text-base font-semibold text-gray-400 border-b-2 border-transparent -mb-px transition-colors duration-200;
}
.tab-btn:hover {
  @apply text-white;
}
.tab-active {
  @apply border-blue-500 text-blue-500;
}

.btn {
  @apply px-3 py-1.5 rounded-md text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-primary {
  @apply btn bg-blue-600 hover:bg-blue-500 text-white;
}

.btn-secondary {
  @apply btn bg-gray-600 hover:bg-gray-500 text-white;
}

.btn-success {
  @apply btn bg-green-600 hover:bg-green-500 text-white;
}
.btn-warning {
  @apply btn bg-yellow-500 hover:bg-yellow-400 text-black;
}
.btn-danger {
  @apply btn bg-red-600 hover:bg-red-500 text-white;
}

.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
