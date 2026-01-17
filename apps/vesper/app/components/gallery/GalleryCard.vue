<!-- components/gallery/GalleryCard.vue -->
<script setup lang="ts">
import type { IGalleryImagePublic } from '~/types/gallery.types'

const props = defineProps<{
  image: IGalleryImagePublic
}>()

const config = useRuntimeConfig()

const imageUrl = computed(() => 
  `${config.public.backendURL}/gallery/${props.image.id}/image`
)
</script>

<template>
  <NuxtLink
    :to="`/gallery/${image.id}`"
    class="group relative aspect-video overflow-hidden rounded-lg bg-gray-800 hover:ring-2 hover:ring-red-500 transition-all duration-300"
  >
    <!-- Image -->
    <img
      :src="imageUrl"
      :alt="image.description || 'Gallery image'"
      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy"
    />
    
    <!-- Overlay on hover -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div class="absolute bottom-0 left-0 right-0 p-4">
        <p v-if="image.description" class="text-white text-sm line-clamp-2">
          {{ image.description }}
        </p>
        <div class="flex items-center gap-2 mt-2 text-gray-300 text-xs">
          <span v-if="image.category" class="bg-red-500/80 px-2 py-1 rounded">
            {{ image.category }}
          </span>
          <span v-if="image.season" class="bg-gray-700/80 px-2 py-1 rounded">
            {{ image.season }}
          </span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
