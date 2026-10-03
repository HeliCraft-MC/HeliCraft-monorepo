<!-- components/states/StateWarrantCard.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { IStateWarrant } from '~/types/state.types'

const props = defineProps<{
  warrant: IStateWarrant,
  color?: string,
  affectedPlayerNickname: string,
  issuerPlayerNickname: string,
  canManage: boolean // Prop to control if action menu is shown
}>()

const emit = defineEmits(['delete'])

const isMenuOpen = ref(false)

const issueDate = computed(() => {
  return new Date(props.warrant.created).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
})

const defaultColor = '#ef4444' // Red color as a fallback

function handleDelete() {
  emit('delete', props.warrant.uuid)
  isMenuOpen.value = false
}
</script>

<template>
  <div class="warrant-card-container overflow-hidden rounded-lg border" :style="{ borderColor: color || defaultColor }">
    <article class="bg-gray-900/60 backdrop-blur-sm p-5 space-y-5 relative">
      <!-- Action Menu -->
      <div v-if="canManage" class="absolute top-2 right-2">
        <button @click.stop="isMenuOpen = !isMenuOpen" class="p-2 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors">
          <Icon name="solar:menu-dots-bold" class="w-5 h-5" />
        </button>
        <div v-if="isMenuOpen" v-click-outside="() => isMenuOpen = false" class="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
          <button @click="handleDelete" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
            <Icon name="solar:trash-bin-trash-bold" />
            <span>Отозвать</span>
          </button>
        </div>
      </div>

      <header class="flex items-center justify-between pb-3 border-b border-gray-700/50">
        <h3 class="font-bold text-xl tracking-wider uppercase" :style="{ color: color || defaultColor }">Арестный ордер</h3>
        <div class="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/20"><Icon name="grommet-icons:gavel" class="w-6 h-6" :style="{ color: color || defaultColor }" /></div>
      </header>

      <section class="flex items-center gap-4">
        <img :src="`/distant-api/user/${warrant.affected_player_uuid}/skin/head.png`" alt="Player head" class="w-20 h-20 rounded-md bg-gray-700 border-2 border-gray-700/50 flex-shrink-0" @error="($event.target as HTMLImageElement).src = '[https://placehold.co/80x80/1f2937/9ca3af?text=](https://placehold.co/80x80/1f2937/9ca3af?text=)?'"/>
        <div>
          <p class="text-sm text-gray-400">Разыскивается:</p>
          <p class="font-bold text-2xl text-white truncate">{{ affectedPlayerNickname || 'Загрузка...' }}</p>
        </div>
      </section>

      <section class="space-y-4 pt-4">
        <div class="warrant-detail-item"><Icon name="solar:document-text-linear" class="w-5 h-5 text-gray-500 flex-shrink-0" /><div><p class="text-sm font-semibold text-gray-400">Причина:</p><p class="text-gray-200 text-base leading-relaxed">{{ warrant.reason }}</p></div></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="warrant-detail-item"><Icon name="solar:user-speak-rounded-linear" class="w-5 h-5 text-gray-500 flex-shrink-0" /><div><p class="text-sm font-semibold text-gray-400">Выдан кем:</p><p class="text-gray-200">{{ issuerPlayerNickname || '...' }}</p></div></div>
          <div class="warrant-detail-item"><Icon name="solar:calendar-date-linear" class="w-5 h-5 text-gray-500 flex-shrink-0" /><div><p class="text-sm font-semibold text-gray-400">Дата выдачи:</p><p class="text-gray-200">{{ issueDate }}</p></div></div>
        </div>
      </section>

      <section class="pt-5 border-t border-gray-700/50 space-y-4">
        <h4 class="font-semibold text-gray-300">Принятые меры</h4>
        <div class="action-details-block" :class="warrant.actions_taken_by_admins ? 'border-green-500/30' : 'border-gray-700/50'">
          <div class="flex items-center gap-2"><Icon v-if="warrant.actions_taken_by_admins" name="solar:shield-check-bold" class="w-5 h-5 text-green-400"/><Icon v-else name="solar:shield-cross-bold" class="w-5 h-5 text-yellow-500"/><p class="font-semibold text-white">Действия администрации:</p><span :class="warrant.actions_taken_by_admins ? 'text-green-400' : 'text-yellow-500'">{{ warrant.actions_taken_by_admins ? 'Приняты' : 'Не приняты' }}</span></div>
          <p v-if="warrant.actions_by_admins_details" class="text-gray-400 text-sm pl-7 mt-1">{{ warrant.actions_by_admins_details }}</p>
        </div>
        <div class="action-details-block" :class="warrant.actions_taken_by_state ? 'border-green-500/30' : 'border-gray-700/50'">
          <div class="flex items-center gap-2"><Icon v-if="warrant.actions_taken_by_state" name="solar:flag-2-bold" class="w-5 h-5 text-green-400"/><Icon v-else name="solar:flag-2-bold-duotone" class="w-5 h-5 text-yellow-500"/><p class="font-semibold text-white">Действия государства:</p><span :class="warrant.actions_taken_by_state ? 'text-green-400' : 'text-yellow-500'">{{ warrant.actions_taken_by_state ? 'Приняты' : 'Не приняты' }}</span></div>
          <p v-if="warrant.actions_by_state_details" class="text-gray-400 text-sm pl-7 mt-1">{{ warrant.actions_by_state_details }}</p>
        </div>
      </section>
    </article>
  </div>
</template>

<style scoped>
.warrant-card-container { background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), inset 0 0 20px rgba(0,0,0,0.2); }
.warrant-detail-item { @apply flex items-start gap-3; }
.action-details-block { @apply bg-gray-800/50 p-3 rounded-md border; }
</style>