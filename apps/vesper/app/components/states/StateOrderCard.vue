<!-- components/states/StateOrderCard.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { IStateOrder } from '~/types/state.types'

// Define props and emits
const props = defineProps<{
  order: IStateOrder,
  color?: string,
  issuerPlayerNickname: string,
  issuerPlayerHead: string,
  canManage: boolean // Prop to control if action menu is shown
}>()

const emit = defineEmits(['delete'])

// --- State ---
const isMenuOpen = ref(false)
const menuButton = ref<HTMLElement | null>(null)

// --- Computed Properties ---
const importanceConfig = computed(() => {
  switch (props.order.importance) {
    case 'pinned': return { borderColor: '#facc15', icon: 'solar:pin-bold-duotone', label: 'Закреплено' }
    case 'high': return { borderColor: '#f87171', icon: 'solar:danger-bold-duotone', label: 'Высокая важность' }
    case 'medium': return { borderColor: '#fb923c', icon: 'solar:sort-from-top-to-bottom-line-duotone', label: 'Средняя важность' }
    default: return { borderColor: '#60a5fa', icon: 'solar:list-arrow-down-minimalistic-line-duotone', label: 'Низкая важность' }
  }
})

const expirationInfo = computed(() => {
  if (props.order.expires_at === null) {
    return { text: 'Действует бессрочно', icon: 'solar:infinity-bold-duotone', colorClass: 'text-green-400' }
  }
  const isExpired = Date.now() > props.order.expires_at
  const date = new Date(props.order.expires_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
  return isExpired
      ? { text: `Истёк ${date}`, icon: 'solar:clock-circle-bold-duotone', colorClass: 'text-red-500' }
      : { text: `Действует до ${date}`, icon: 'solar:clock-circle-line-duotone', colorClass: 'text-gray-400' }
})

const publicationDate = computed(() => {
  return new Date(props.order.published_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short'})
})

// --- Methods ---
function handleDelete() {
  emit('delete', props.order.uuid)
  isMenuOpen.value = false
}
</script>

<template>
  <div class="document-card-container overflow-hidden rounded-lg border" :style="{ borderColor: importanceConfig.borderColor }">
    <article class="bg-gray-900/60 backdrop-blur-sm p-5 space-y-4 relative">
      <!-- Action Menu -->
      <div v-if="canManage" class="absolute top-2 right-2">
        <button @click.stop="isMenuOpen = !isMenuOpen" ref="menuButton" class="p-2 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors">
          <Icon name="solar:menu-dots-bold" class="w-5 h-5" />
        </button>
        <!-- Dropdown Menu -->
        <div v-if="isMenuOpen" v-click-outside="() => isMenuOpen = false" class="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
          <button @click="handleDelete" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
            <Icon name="solar:trash-bin-trash-bold" />
            <span>Удалить</span>
          </button>
        </div>
      </div>

      <header class="flex items-start gap-4">
        <div class="w-10 h-10 flex-shrink-0 bg-gray-800 rounded-md flex items-center justify-center border border-gray-700">
          <Icon :name="importanceConfig.icon" class="w-6 h-6" :style="{ color: importanceConfig.borderColor }" />
        </div>
        <div>
          <h3 class="font-bold text-xl text-white">{{ order.title }}</h3>
          <span class="text-xs font-semibold" :style="{ color: importanceConfig.borderColor }">{{ importanceConfig.label }}</span>
        </div>
      </header>

      <section class="prose prose-sm prose-invert max-w-none text-gray-300 whitespace-pre-line leading-relaxed">{{ order.text }}</section>

      <footer class="pt-4 border-t border-gray-700/50 space-y-3 text-xs text-gray-400">
        <div class="flex items-center gap-3">
          <img :src="issuerPlayerHead" alt="Issuer's head" class="w-8 h-8 rounded-md bg-gray-700" @error="($event.target as HTMLImageElement).src = 'https://placehold.co/32x32/1f2937/9ca3af?text=?'"/>
          <div>
            <span class="font-semibold text-gray-300">{{ issuerPlayerNickname }}</span><span class="text-gray-500"> | Опубликовал указ</span>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2">
          <div class="flex items-center gap-2"><Icon name="solar:calendar-mark-line-duotone" class="w-4 h-4"/><span class="truncate">Опубликовано: {{ publicationDate }}</span></div>
          <div class="flex items-center gap-2" :class="expirationInfo.colorClass"><Icon :name="expirationInfo.icon" class="w-4 h-4"/><span class="truncate">{{ expirationInfo.text }}</span></div>
        </div>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.document-card-container { background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), inset 0 0 20px rgba(0,0,0,0.2); }
.prose { line-height: 1.65; }
</style>