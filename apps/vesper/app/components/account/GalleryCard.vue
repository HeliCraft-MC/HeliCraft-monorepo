<!-- components/account/GalleryCard.vue -->
<script setup lang="ts">
import type { IGalleryListResponse, IGalleryImagePublic } from '~/types/gallery.types'

const config = useRuntimeConfig()
const { token } = useAuth()

const images = ref<IGalleryImagePublic[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

async function loadMyImages() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<IGalleryListResponse>(
      `${config.public.backendURL}/gallery/my`,
      {
        query: { page: 1, perPage: 6 },
        headers: { Authorization: `Bearer ${token.value}` }
      }
    )
    images.value = response.items
    total.value = response.total
  } catch (e: any) {
    console.error('Error loading gallery:', e)
    error.value = 'Не удалось загрузить ваши изображения'
  } finally {
    loading.value = false
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return { text: 'Одобрено', class: 'bg-green-500/20 text-green-400' }
    case 'pending':
      return { text: 'На модерации', class: 'bg-yellow-500/20 text-yellow-400' }
    case 'rejected':
      return { text: 'Отклонено', class: 'bg-red-500/20 text-red-400' }
    default:
      return null
  }
}

onMounted(loadMyImages)
</script>

<template>
  <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-8">
    <div class="flex items-center justify-between mb-6">
      <h2 class="pr2p text-2xl text-red-500">Мои скриншоты</h2>
      <NuxtLink
        to="/gallery"
        class="text-gray-400 hover:text-red-400 transition text-sm flex items-center gap-1"
      >
        <span>В галерею</span>
        <Icon name="solar:alt-arrow-right-linear" class="w-4 h-4" />
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="w-8 h-8 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="text-center py-8 text-gray-500"
    >
      <Icon name="solar:danger-circle-bold" class="w-8 h-8 mx-auto mb-2 text-red-400" />
      <p>{{ error }}</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="images.length === 0"
      class="text-center py-8"
    >
      <Icon name="solar:gallery-bold-duotone" class="w-12 h-12 mx-auto mb-4 text-gray-600" />
      <p class="text-gray-500 mb-4">Вы ещё не загружали скриншоты</p>
      <NuxtLink
        to="/gallery"
        class="inline-block bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md font-bold text-black"
      >
        Загрузить первый скриншот
      </NuxtLink>
    </div>

    <!-- Images grid -->
    <template v-else>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <NuxtLink
          v-for="image in images"
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
            class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium"
            :class="getStatusBadge(image.status)?.class"
          >
            {{ getStatusBadge(image.status)?.text }}
          </span>
        </NuxtLink>
      </div>

      <!-- Show more link -->
      <div v-if="total > 6" class="text-center">
        <NuxtLink
          to="/gallery?my=true"
          class="text-red-400 hover:text-red-300 transition text-sm"
        >
          Показать все {{ total }} скриншотов →
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
