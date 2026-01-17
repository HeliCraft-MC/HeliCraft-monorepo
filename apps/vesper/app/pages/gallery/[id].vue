<!-- pages/gallery/[id].vue -->
<script setup lang="ts">
import type { IGalleryImagePublic, IGalleryActionResponse, IPlayerSearchResult } from '~/types/gallery.types'
import { GalleryImageStatus } from '~/types/gallery.types'
import GalleryEditModal from '~/components/gallery/GalleryEditModal.vue'

definePageMeta({ auth: false })

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { data: session, status, token } = useAuth()

const imageId = computed(() => route.params.id as string)
const isLoggedIn = computed(() => status.value === 'authenticated')
const userUuid = computed(() => session.value?.uuid)

/* ───── State ───── */
const image = ref<IGalleryImagePublic | null>(null)
const uploaderNickname = ref('')
const involvedPlayers = ref<IPlayerSearchResult[]>([])
const loading = ref(true)
const error = ref('')
const isAdmin = ref(false)
const checkingAdmin = ref(false)

// Modals
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)

// Actions
const processing = ref(false)

/* ───── Check if current user owns the image ───── */
const isOwner = computed(() => 
  userUuid.value && image.value && userUuid.value === image.value.uploader_uuid
)

/* ───── Can edit ───── */
const canEdit = computed(() => isOwner.value || isAdmin.value)

/* ───── Image URL ───── */
const imageUrl = computed(() =>
  `${config.public.backendURL}/gallery/${imageId.value}/image`
)

/* ───── Format date ───── */
function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/* ───── Status badge ───── */
const statusBadge = computed(() => {
  if (!image.value) return null
  
  switch (image.value.status) {
    case GalleryImageStatus.APPROVED:
      return { text: 'Одобрено', class: 'bg-green-500/20 text-green-400' }
    case GalleryImageStatus.PENDING:
      return { text: 'На модерации', class: 'bg-yellow-500/20 text-yellow-400' }
    case GalleryImageStatus.REJECTED:
      return { text: 'Отклонено', class: 'bg-red-500/20 text-red-400' }
    default:
      return null
  }
})

/* ───── Load image data ───── */
async function loadImage() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<IGalleryImagePublic>(
      `${config.public.backendURL}/gallery/${imageId.value}`
    )
    image.value = response
    
    // Load uploader nickname
    try {
      const uploaderRes = await $fetch<{ nickname: string }>(
        `${config.public.backendURL}/user/${response.uploader_uuid}`
      )
      uploaderNickname.value = uploaderRes.nickname
    } catch {
      uploaderNickname.value = 'Неизвестный'
    }
    
    // Load involved players
    if (response.involved_players) {
      const uuids = response.involved_players.split(',').filter(u => u.trim())
      const players: IPlayerSearchResult[] = []
      
      for (const uuid of uuids) {
        try {
          const playerRes = await $fetch<{ uuid: string; nickname: string }>(
            `${config.public.backendURL}/user/${uuid.trim()}`
          )
          players.push({ uuid: playerRes.uuid, nickname: playerRes.nickname })
        } catch {
          // Skip invalid UUIDs
        }
      }
      
      involvedPlayers.value = players
    }
  } catch (e: any) {
    console.error('Error loading image:', e)
    if (e.status === 404) {
      error.value = 'Изображение не найдено'
    } else if (e.status === 403) {
      error.value = 'У вас нет доступа к этому изображению'
    } else {
      error.value = e.data?.message || 'Не удалось загрузить изображение'
    }
  } finally {
    loading.value = false
  }
}

/* ───── Check admin status ───── */
async function checkAdminStatus() {
  if (!userUuid.value) {
    isAdmin.value = false
    return
  }

  checkingAdmin.value = true
  try {
    isAdmin.value = await $fetch<boolean>(`/distant-api/user/${userUuid.value}/isAdmin`)
  } catch {
    isAdmin.value = false
  } finally {
    checkingAdmin.value = false
  }
}

/* ───── Admin actions ───── */
async function approveImage() {
  if (!image.value || processing.value) return
  
  processing.value = true
  try {
    const response = await $fetch<IGalleryActionResponse>(
      `${config.public.backendURL}/gallery/${imageId.value}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )
    
    if (response.ok && response.image) {
      image.value = response.image
    }
  } catch (e: any) {
    console.error('Approve error:', e)
    error.value = e.data?.message || 'Не удалось одобрить изображение'
  } finally {
    processing.value = false
  }
}

async function rejectImage() {
  if (!image.value || processing.value) return
  
  processing.value = true
  try {
    const response = await $fetch<IGalleryActionResponse>(
      `${config.public.backendURL}/gallery/${imageId.value}/reject`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )
    
    if (response.ok && response.image) {
      image.value = response.image
    }
  } catch (e: any) {
    console.error('Reject error:', e)
    error.value = e.data?.message || 'Не удалось отклонить изображение'
  } finally {
    processing.value = false
  }
}

async function deleteImage() {
  if (!image.value || processing.value) return
  
  processing.value = true
  try {
    await $fetch<IGalleryActionResponse>(
      `${config.public.backendURL}/gallery/${imageId.value}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )
    
    router.push('/gallery')
  } catch (e: any) {
    console.error('Delete error:', e)
    error.value = e.data?.message || 'Не удалось удалить изображение'
    showDeleteConfirm.value = false
  } finally {
    processing.value = false
  }
}

/* ───── Handle edit update ───── */
function handleUpdated(updatedImage: IGalleryImagePublic) {
  image.value = updatedImage
}

/* ───── Initialize ───── */
onMounted(() => {
  Promise.all([loadImage(), checkAdminStatus()])
})
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28 px-4 pb-20">
    <div class="w-full max-w-5xl mx-auto space-y-6">
      <!-- Back link -->
      <NuxtLink
        to="/gallery"
        class="inline-flex items-center gap-2 text-gray-400 hover:text-red-400 transition"
      >
        <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
        <span>Назад в галерею</span>
      </NuxtLink>

      <!-- Loading -->
      <div v-if="loading" class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-12 text-center">
        <div class="flex justify-center items-center gap-3">
          <div class="w-8 h-8 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
          <span class="text-gray-400">Загрузка...</span>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="bg-red-900/30 border border-red-500/50 rounded-lg p-8 text-center"
      >
        <Icon name="solar:danger-circle-bold" class="w-12 h-12 mx-auto text-red-400 mb-4" />
        <p class="text-red-300 text-lg">{{ error }}</p>
        <NuxtLink
          to="/gallery"
          class="inline-block mt-4 bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md font-bold text-black"
        >
          Вернуться в галерею
        </NuxtLink>
      </div>

      <!-- Image content -->
      <template v-else-if="image">
        <!-- Image -->
        <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg overflow-hidden">
          <a
            :href="imageUrl"
            target="_blank"
            rel="noopener"
            class="block"
          >
            <img
              :src="imageUrl"
              :alt="image.description || 'Gallery image'"
              class="w-full max-h-[70vh] object-contain bg-gray-800"
            />
          </a>
        </section>

        <!-- Info -->
        <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6 space-y-6">
          <!-- Header with status badge -->
          <div class="flex flex-wrap items-center justify-between gap-4">
            <h1 class="pr2p text-xl md:text-2xl text-red-500">
              Информация о скриншоте
            </h1>
            <span
              v-if="statusBadge"
              class="px-3 py-1 rounded-full text-sm font-medium"
              :class="statusBadge.class"
            >
              {{ statusBadge.text }}
            </span>
          </div>

          <!-- Description -->
          <div v-if="image.description">
            <h3 class="text-sm text-gray-400 mb-2">Описание</h3>
            <p class="text-gray-200">{{ image.description }}</p>
          </div>

          <!-- Uploader -->
          <div>
            <h3 class="text-sm text-gray-400 mb-2">Автор</h3>
            <div class="flex items-center gap-3">
              <img
                :src="`${config.public.backendURL}/user/${image.uploader_uuid}/skin/head.png`"
                :alt="uploaderNickname"
                class="w-10 h-10 rounded"
              />
              <span class="font-medium">{{ uploaderNickname }}</span>
            </div>
          </div>

          <!-- Category & Season -->
          <div v-if="image.category || image.season" class="flex flex-wrap gap-4">
            <div v-if="image.category">
              <h3 class="text-sm text-gray-400 mb-1">Категория</h3>
              <span class="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">
                {{ image.category }}
              </span>
            </div>
            <div v-if="image.season">
              <h3 class="text-sm text-gray-400 mb-1">Сезон</h3>
              <span class="bg-gray-700 px-3 py-1 rounded-full text-sm">
                {{ image.season }}
              </span>
            </div>
          </div>

          <!-- Coordinates -->
          <div v-if="image.coord_x !== null || image.coord_y !== null || image.coord_z !== null">
            <h3 class="text-sm text-gray-400 mb-2">Координаты</h3>
            <div class="flex items-center gap-4 font-mono text-sm">
              <span v-if="image.coord_x !== null" class="bg-gray-800 px-3 py-1 rounded">
                X: {{ image.coord_x }}
              </span>
              <span v-if="image.coord_y !== null" class="bg-gray-800 px-3 py-1 rounded">
                Y: {{ image.coord_y }}
              </span>
              <span v-if="image.coord_z !== null" class="bg-gray-800 px-3 py-1 rounded">
                Z: {{ image.coord_z }}
              </span>
            </div>
          </div>

          <!-- Involved players -->
          <div v-if="involvedPlayers.length > 0">
            <h3 class="text-sm text-gray-400 mb-2">Участвующие игроки</h3>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="player in involvedPlayers"
                :key="player.uuid"
                class="flex items-center gap-2 bg-gray-800 rounded-md px-3 py-1"
              >
                <img
                  :src="`${config.public.backendURL}/user/${player.uuid}/skin/head.png`"
                  :alt="player.nickname"
                  class="w-6 h-6 rounded"
                />
                <span class="text-sm">{{ player.nickname }}</span>
              </div>
            </div>
          </div>

          <!-- Dates -->
          <div class="flex flex-wrap gap-8 text-sm text-gray-500">
            <div>
              <span>Загружено: </span>
              <span class="text-gray-300">{{ formatDate(image.created_at) }}</span>
            </div>
            <div v-if="image.updated_at !== image.created_at">
              <span>Обновлено: </span>
              <span class="text-gray-300">{{ formatDate(image.updated_at) }}</span>
            </div>
          </div>
        </section>

        <!-- Actions -->
        <section
          v-if="canEdit || isAdmin"
          class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6"
        >
          <h2 class="pr2p text-lg text-red-500 mb-4">Действия</h2>
          
          <div class="flex flex-wrap gap-3">
            <!-- Edit button -->
            <button
              v-if="canEdit"
              @click="showEditModal = true"
              class="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 transition px-4 py-2 rounded-md"
            >
              <Icon name="solar:pen-bold" class="w-5 h-5" />
              <span>Редактировать</span>
            </button>

            <!-- Admin actions -->
            <template v-if="isAdmin && !checkingAdmin">
              <!-- Approve -->
              <button
                v-if="image.status !== GalleryImageStatus.APPROVED"
                @click="approveImage"
                :disabled="processing"
                class="flex items-center gap-2 bg-green-600 hover:bg-green-500 transition px-4 py-2 rounded-md text-white disabled:opacity-50"
              >
                <Icon name="solar:check-circle-bold" class="w-5 h-5" />
                <span>Одобрить</span>
              </button>

              <!-- Reject -->
              <button
                v-if="image.status !== GalleryImageStatus.REJECTED"
                @click="rejectImage"
                :disabled="processing"
                class="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 transition px-4 py-2 rounded-md text-white disabled:opacity-50"
              >
                <Icon name="solar:close-circle-bold" class="w-5 h-5" />
                <span>Отклонить</span>
              </button>

              <!-- Delete -->
              <button
                @click="showDeleteConfirm = true"
                :disabled="processing"
                class="flex items-center gap-2 bg-red-600 hover:bg-red-500 transition px-4 py-2 rounded-md text-white disabled:opacity-50"
              >
                <Icon name="solar:trash-bin-trash-bold" class="w-5 h-5" />
                <span>Удалить</span>
              </button>
            </template>
          </div>
        </section>
      </template>
    </div>

    <!-- Edit modal -->
    <GalleryEditModal
      :is-open="showEditModal"
      :image="image"
      :is-admin="isAdmin"
      @close="showEditModal = false"
      @updated="handleUpdated"
    />

    <!-- Delete confirmation modal -->
    <Transition name="fade">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-xl w-full max-w-sm border border-gray-700 p-6">
          <h3 class="text-lg font-bold text-red-500 mb-4">Удалить изображение?</h3>
          <p class="text-gray-300 mb-6">
            Это действие нельзя отменить. Изображение будет удалено навсегда.
          </p>
          <div class="flex justify-end gap-4">
            <button
              @click="showDeleteConfirm = false"
              class="bg-gray-700 hover:bg-gray-600 transition px-6 py-2 rounded-md font-bold"
            >
              Отмена
            </button>
            <button
              @click="deleteImage"
              :disabled="processing"
              class="bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md font-bold text-black disabled:opacity-50"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
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
