<!-- components/gallery/GalleryEditModal.vue -->
<script setup lang="ts">
import type { IGalleryImagePublic, IGalleryImageUpdateRequest, IPlayerSearchResult } from '~/types/gallery.types'
import PlayerSearchInput from './PlayerSearchInput.vue'

const props = defineProps<{
  isOpen: boolean
  image: IGalleryImagePublic | null
  isAdmin: boolean
}>()

const emit = defineEmits<{
  close: []
  updated: [image: IGalleryImagePublic]
}>()

const config = useRuntimeConfig()
const { token } = useAuth()

const description = ref('')
const category = ref('')
const season = ref('')
const coordX = ref<number | null>(null)
const coordY = ref<number | null>(null)
const coordZ = ref<number | null>(null)
const involvedPlayers = ref<IPlayerSearchResult[]>([])

const isSaving = ref(false)
const error = ref('')

// Parse involved players from comma-separated UUIDs
async function parseInvolvedPlayers(uuids: string | null) {
  if (!uuids) return []
  
  const uuidList = uuids.split(',').filter(u => u.trim())
  const players: IPlayerSearchResult[] = []
  
  for (const uuid of uuidList) {
    try {
      const response = await $fetch<{ uuid: string; nickname: string }>(
        `${config.public.backendURL}/user/${uuid.trim()}`
      )
      players.push({ uuid: response.uuid, nickname: response.nickname })
    } catch {
      // Skip invalid UUIDs
    }
  }
  
  return players
}

// Populate form when image changes
watch(() => props.image, async (newImage) => {
  if (newImage) {
    description.value = newImage.description || ''
    category.value = newImage.category || ''
    season.value = newImage.season || ''
    coordX.value = newImage.coord_x
    coordY.value = newImage.coord_y
    coordZ.value = newImage.coord_z
    involvedPlayers.value = await parseInvolvedPlayers(newImage.involved_players)
  }
}, { immediate: true })

async function save() {
  if (!props.image) return
  
  isSaving.value = true
  error.value = ''
  
  try {
    const body: IGalleryImageUpdateRequest = {
      description: description.value.trim() || undefined
    }
    
    // Admin-only fields
    if (props.isAdmin) {
      body.category = category.value.trim() || undefined
      body.season = season.value.trim() || undefined
      body.coord_x = coordX.value ?? undefined
      body.coord_y = coordY.value ?? undefined
      body.coord_z = coordZ.value ?? undefined
      body.involved_players = involvedPlayers.value.map(p => p.uuid).join(',') || undefined
    }
    
    const response = await $fetch<IGalleryImagePublic>(
      `${config.public.backendURL}/gallery/${props.image.id}`,
      {
        method: 'PATCH',
        body,
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      }
    )
    
    emit('updated', response)
    emit('close')
  } catch (e: any) {
    console.error('Update error:', e)
    error.value = e.data?.message || 'Не удалось сохранить изменения'
  } finally {
    isSaving.value = false
  }
}

function closeModal() {
  error.value = ''
  emit('close')
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen && image"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
      @click.self="closeModal"
    >
      <div class="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-900/90">
          <h2 class="text-xl font-bold text-red-500">Редактирование изображения</h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-white transition"
          >
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Error message -->
          <div
            v-if="error"
            class="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm"
          >
            {{ error }}
          </div>

          <!-- Image preview -->
          <div class="rounded-lg overflow-hidden bg-gray-800">
            <img
              :src="`${config.public.backendURL}/gallery/${image.id}/image`"
              :alt="image.description || 'Gallery image'"
              class="w-full max-h-64 object-contain"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">
              Описание
            </label>
            <textarea
              v-model="description"
              placeholder="Описание изображения..."
              class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition resize-none h-24"
            />
          </div>

          <!-- Admin-only fields -->
          <template v-if="isAdmin">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Category -->
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  Категория
                </label>
                <input
                  v-model="category"
                  type="text"
                  placeholder="Например: Постройки"
                  class="w-full bg-gray-800/70 rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition"
                />
              </div>

              <!-- Season -->
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  Сезон
                </label>
                <input
                  v-model="season"
                  type="text"
                  placeholder="Например: Сезон 5"
                  class="w-full bg-gray-800/70 rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition"
                />
              </div>
            </div>

            <!-- Coordinates -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">
                Координаты в игре
              </label>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">X</label>
                  <input
                    v-model.number="coordX"
                    type="number"
                    placeholder="X"
                    class="w-full bg-gray-800/70 rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Y</label>
                  <input
                    v-model.number="coordY"
                    type="number"
                    placeholder="Y"
                    class="w-full bg-gray-800/70 rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Z</label>
                  <input
                    v-model.number="coordZ"
                    type="number"
                    placeholder="Z"
                    class="w-full bg-gray-800/70 rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition"
                  />
                </div>
              </div>
            </div>

            <!-- Involved players -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">
                Участвующие игроки
              </label>
              <PlayerSearchInput v-model="involvedPlayers" />
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-4 p-6 border-t border-gray-700 sticky bottom-0 bg-gray-900/90">
          <button
            @click="closeModal"
            class="bg-gray-700 hover:bg-gray-600 transition px-6 py-2 rounded-md font-bold"
          >
            Отмена
          </button>
          <button
            @click="save"
            :disabled="isSaving"
            class="bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSaving" class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              Сохранение...
            </span>
            <span v-else>Сохранить</span>
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
