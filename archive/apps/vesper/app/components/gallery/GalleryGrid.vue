<!-- components/gallery/GalleryGrid.vue -->
<script setup lang="ts">
import type { IGalleryImagePublic } from '~/types/gallery.types'
import GalleryCard from './GalleryCard.vue'

const props = defineProps<{
  images: IGalleryImagePublic[]
  loading?: boolean
  showLikes?: boolean
  canLike?: boolean
}>()

const emit = defineEmits<{
  (e: 'like', imageId: string, isLiked: boolean): void
}>()

function handleLike(imageId: string, isLiked: boolean) {
  emit('like', imageId, isLiked)
}
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="i in 8"
        :key="i"
        class="aspect-video bg-gray-800 rounded-lg animate-pulse"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="images.length === 0"
      class="text-center py-16 text-gray-500"
    >
      <Icon name="solar:gallery-bold-duotone" class="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p class="text-lg">Изображения не найдены</p>
    </div>

    <!-- Gallery grid -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <GalleryCard
        v-for="image in images"
        :key="image.id"
        :image="image"
        :show-likes="showLikes"
        :can-like="canLike"
        @like="handleLike"
      />
    </div>
  </div>
</template>
