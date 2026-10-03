<!-- components/gallery/GalleryCard.vue -->
<script setup lang="ts">
import type { IGalleryImagePublic } from '~/types/gallery.types'

const props = defineProps<{
  image: IGalleryImagePublic
  showLikes?: boolean
  canLike?: boolean
}>()

const emit = defineEmits<{
  (e: 'like', imageId: string, isLiked: boolean): void
}>()

const config = useRuntimeConfig()

const imageUrl = computed(() => 
  `${config.public.backendURL}/gallery/${props.image.id}/image`
)

function handleLikeClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (props.canLike) {
    emit('like', props.image.id, props.image.is_liked || false)
  }
}
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
    
    <!-- Like button (always visible in corner) -->
    <div v-if="showLikes" class="absolute top-2 right-2 z-10">
      <button
        v-if="canLike"
        @click="handleLikeClick"
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all"
        :class="image.is_liked 
          ? 'bg-red-500 text-white hover:bg-red-600' 
          : 'bg-black/60 text-white hover:bg-black/80'"
      >
        <Icon 
          :name="image.is_liked ? 'ph:heart-fill' : 'ph:heart'" 
          class="w-4 h-4"
          :class="image.is_liked ? 'text-white' : 'text-red-400'"
        />
        <span class="text-sm font-medium">{{ image.likes_count || 0 }}</span>
      </button>
      <div 
        v-else
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 text-white"
      >
        <Icon name="ph:heart" class="w-4 h-4 text-red-400" />
        <span class="text-sm font-medium">{{ image.likes_count || 0 }}</span>
      </div>
    </div>
    
    <!-- Overlay on hover -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div class="absolute bottom-0 left-0 right-0 p-4">
        <p v-if="image.description" class="text-white text-sm line-clamp-2">
          {{ image.description }}
        </p>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-gray-300 text-xs">{{ image.owner.nickname }}</span>
          <span v-if="image.category" class="text-xs bg-red-500/80 px-2 py-1 rounded">
            {{ image.category }}
          </span>
          <span v-if="image.season" class="text-xs bg-gray-700/80 px-2 py-1 rounded">
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
