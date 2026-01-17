<!-- components/gallery/PlayerSearchInput.vue -->
<script setup lang="ts">
import type { IPlayerSearchResult } from '~/types/gallery.types'

const props = defineProps<{
  modelValue: IPlayerSearchResult[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: IPlayerSearchResult[]]
}>()

const config = useRuntimeConfig()
const searchQuery = ref('')
const searchResults = ref<IPlayerSearchResult[]>([])
const isSearching = ref(false)
const showDropdown = ref(false)

let searchTimeout: number | undefined

async function searchPlayers() {
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    const response = await $fetch<IPlayerSearchResult[]>(`${config.public.backendURL}/user/search`, {
      query: {
        nickname: searchQuery.value,
        startAt: 0,
        limit: 5
      }
    })
    searchResults.value = response.filter(
      player => !props.modelValue.some(p => p.uuid === player.uuid)
    )
  } catch (e) {
    console.error('Error searching players:', e)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchPlayers()
  }, 300) as unknown as number
}

function addPlayer(player: IPlayerSearchResult) {
  emit('update:modelValue', [...props.modelValue, player])
  searchQuery.value = ''
  searchResults.value = []
  showDropdown.value = false
}

function removePlayer(uuid: string) {
  emit('update:modelValue', props.modelValue.filter(p => p.uuid !== uuid))
}

function onBlur() {
  // Delay hiding dropdown to allow click on results
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Selected players -->
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="player in modelValue"
        :key="player.uuid"
        class="flex items-center gap-2 bg-gray-700 rounded-md px-3 py-1"
      >
        <img
          :src="`${config.public.backendURL}/user/${player.uuid}/skin/head.png`"
          :alt="player.nickname"
          class="w-6 h-6 rounded"
        />
        <span class="text-sm">{{ player.nickname }}</span>
        <button
          v-if="!disabled"
          type="button"
          @click="removePlayer(player.uuid)"
          class="text-gray-400 hover:text-red-400 transition"
        >
          <Icon name="mdi:close" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Search input -->
    <div v-if="!disabled" class="relative">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Поиск игрока по нику..."
        class="w-full bg-gray-800/70 rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition"
        @input="onSearchInput"
        @focus="showDropdown = true"
        @blur="onBlur"
      />
      
      <!-- Loading indicator -->
      <div v-if="isSearching" class="absolute right-3 top-1/2 -translate-y-1/2">
        <div class="w-4 h-4 border-2 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
      </div>

      <!-- Dropdown results -->
      <div
        v-if="showDropdown && searchResults.length > 0"
        class="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden"
      >
        <button
          v-for="player in searchResults"
          :key="player.uuid"
          type="button"
          class="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 transition"
          @click="addPlayer(player)"
        >
          <img
            :src="`${config.public.backendURL}/user/${player.uuid}/skin/head.png`"
            :alt="player.nickname"
            class="w-8 h-8 rounded"
          />
          <span>{{ player.nickname }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
