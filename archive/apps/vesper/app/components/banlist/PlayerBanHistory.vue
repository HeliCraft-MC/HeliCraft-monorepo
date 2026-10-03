<!-- components/banlist/PlayerBanHistory.vue -->
<script setup lang="ts">
import type { IBan } from '~/types/banlist.types'
import { useTimeFormat } from '~/composables/useTimeFormat'
import { getBanStatus, getBanDuration, readBanField } from '~/utils/banlist.utils'

const props = defineProps<{
  playerUuid: string
  playerNickname: string
}>()

const { formatTime } = useTimeFormat()

/* ───── Состояние ───── */
const loading = ref(true)
const error = ref('')
const playerBans = ref<IBan[]>([])
const expandedBans = ref<Set<number>>(new Set())

/* ───── Вспомогательные функции ───── */
function formatSpecialName(name: string | null): string {
  if (!name) return '—'
  if (name === '#expired') return 'Автоистечение'
  if (name === '[Console]' || name === 'Console' || name === 'CONSOLE') return 'Консоль'
  if (name?.startsWith('[')) return name.slice(1, -1)
  return name
}

/* ───── Управление раскрытием банов ───── */
function toggleBan(banId: number) {
  if (expandedBans.value.has(banId)) {
    expandedBans.value.delete(banId)
  } else {
    expandedBans.value.add(banId)
  }
}

function expandAll() {
  playerBans.value.forEach(ban => expandedBans.value.add(ban.id))
}

function collapseAll() {
  expandedBans.value.clear()
}

/* ───── Загрузка банов игрока ───── */
async function loadPlayerBans() {
  loading.value = true
  error.value = ''

  try {
    const data = await useApiFetch<{ items: IBan[], total: number }>('/banlist', {
      query: { limit: 1000, offset: 0, q: props.playerUuid }
    })

    if (data.data.value) {
      // Фильтруем только баны этого игрока
      playerBans.value = data.data.value.items
        .filter(ban => ban.uuid.toLowerCase().replace(/-/g, '') === props.playerUuid.toLowerCase().replace(/-/g, ''))
        .sort((a, b) => b.time - a.time) // Сортируем по дате (новые сверху)

      // По умолчанию раскрываем последние 2 бана
      if (playerBans.value.length > 0) {
        const firstBan = playerBans.value[0]
        if (firstBan) expandedBans.value.add(firstBan.id)
        if (playerBans.value.length > 1) {
          const secondBan = playerBans.value[1]
          if (secondBan) expandedBans.value.add(secondBan.id)
        }
      }
    } else if (data.error.value) {
      throw new Error(data.error.value.message || 'Не удалось загрузить историю банов')
    }
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при загрузке данных'
    console.error('Ошибка загрузки банов игрока:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Вычисляемые значения ───── */
const totalBans = computed(() => playerBans.value.length)
const activeBans = computed(() => playerBans.value.filter(b =>
  readBanField(b.active) === 1
).length)
const permanentBans = computed(() => playerBans.value.filter(b => {
  const isActive = readBanField(b.active) === 1;
  return (b.until === -1 || b.until === 0) && isActive
}).length)

/* ───── Инициализация ───── */
onMounted(() => {
  loadPlayerBans()
})
</script>

<template>
  <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6 space-y-4">
    <!-- Заголовок с управлением -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-800">
      <div>
        <h2 class="text-2xl font-bold flex items-center gap-2">
          <Icon name="solar:history-bold-duotone" class="w-6 h-6 text-red-500" />
          История банов
        </h2>

        <!-- Статистика -->
        <div class="grid grid-cols-3 gap-4 mt-4">
          <div class="bg-gray-800/50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-white">{{ totalBans }}</div>
            <div class="text-xs text-gray-400 mt-1">Всего банов</div>
          </div>
          <div class="bg-gray-800/50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-yellow-500">{{ activeBans }}</div>
            <div class="text-xs text-gray-400 mt-1">Активных</div>
          </div>
          <div class="bg-gray-800/50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-500">{{ permanentBans }}</div>
            <div class="text-xs text-gray-400 mt-1">Перманентных</div>
          </div>
        </div>
      </div>

      <div class="flex gap-2">
        <button
            v-if="playerBans.length > 2"
            @click="expandAll"
            class="text-sm text-gray-400 hover:text-red-400 transition"
        >
          Развернуть все
        </button>
        <button
            v-if="expandedBans.size > 0"
            @click="collapseAll"
            class="text-sm text-gray-400 hover:text-red-400 transition"
        >
          Свернуть все
        </button>
      </div>
    </div>

    <!-- Ошибка при загрузке -->
    <div v-if="error && !loading" class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300">
      <div class="flex items-center gap-2">
        <Icon name="solar:danger-circle-bold" class="w-5 h-5" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="text-center py-12 text-gray-400">
      <div class="flex justify-center items-center gap-3">
        <div class="w-8 h-8 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
        <span>Загрузка истории банов...</span>
      </div>
    </div>

    <!-- Нет банов -->
    <div v-else-if="playerBans.length === 0" class="text-center py-12 text-gray-400">
      <Icon name="solar:check-circle-bold-duotone" class="w-16 h-16 mx-auto mb-4 text-green-500" />
      <p class="text-lg">У этого игрока нет банов</p>
    </div>

    <!-- Список банов -->
    <div v-else class="space-y-3">
      <div
          v-for="ban in playerBans"
          :key="ban.id"
          class="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 transition-all"
          :class="{ 'ring-2 ring-red-500/30': expandedBans.has(ban.id) }"
      >
        <!-- Заголовок бана (всегда видим) -->
        <div class="flex items-center justify-between hover:bg-gray-700/30 transition">
          <button
              @click="toggleBan(ban.id)"
              class="flex-1 px-4 py-3 flex items-center gap-4 text-left"
          >
            <Icon
                :name="expandedBans.has(ban.id) ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'"
                class="w-5 h-5 text-gray-400 transition-transform flex-shrink-0"
            />
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <span class="font-semibold" :class="getBanStatus(ban).color">
                  {{ getBanStatus(ban).text }}
                </span>
                <span class="text-sm text-gray-400">
                  {{ formatTime(ban.time) }}
                </span>
              </div>
              <div class="text-sm text-gray-500 mt-1 line-clamp-1">
                {{ ban.reason }}
              </div>
            </div>
          </button>
        </div>

        <!-- Детали бана (раскрывающиеся) -->
        <Transition name="expand">
          <div v-if="expandedBans.has(ban.id)" class="px-4 pb-4 space-y-3 border-t border-gray-700/50">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <!-- Администратор -->
              <div>
                <label class="block text-xs text-gray-500 mb-1">Выдал бан</label>
                <div class="text-white">{{ ban.banned_by_name }}</div>
              </div>

              <!-- Длительность -->
              <div>
                <label class="block text-xs text-gray-500 mb-1">Длительность</label>
                <div class="text-white">{{ getBanDuration(ban) }}</div>
              </div>

              <!-- Дата выдачи -->
              <div>
                <label class="block text-xs text-gray-500 mb-1">Дата выдачи</label>
                <div class="text-white">{{ formatTime(ban.time) }}</div>
              </div>

              <!-- Истекает -->
              <div>
                <label class="block text-xs text-gray-500 mb-1">Истекает</label>
                <div class="text-white">{{ formatTime(ban.until) }}</div>
              </div>

              <!-- Тип бана -->
              <div>
                <label class="block text-xs text-gray-500 mb-1">Тип</label>
                <div class="flex gap-2">
                  <span v-if="readBanField(ban.ipban) === 1" class="px-2 py-0.5 bg-red-900/50 border border-red-500/50 rounded text-red-300 text-xs">
                    IP Ban
                  </span>
                  <span v-if="readBanField(ban.silent) === 1" class="px-2 py-0.5 bg-purple-900/50 border border-purple-500/50 rounded text-purple-300 text-xs">
                    Скрытый
                  </span>
                </div>
              </div>

              <!-- IP адрес -->
              <div v-if="false" class="display-none">
                <!-- Поле IP удалено для безопасности -->
              </div>

              <!-- Причина -->
              <div class="md:col-span-2">
                <label class="block text-xs text-gray-500 mb-1">Причина</label>
                <div class="bg-gray-900/50 rounded p-3 text-white text-sm whitespace-pre-wrap">
                  {{ ban.reason }}
                </div>
              </div>

              <!-- Информация о снятии -->
              <template v-if="ban.removed_by_name">
                <div class="md:col-span-2 pt-3 border-t border-gray-700/50">
                  <div class="flex items-center gap-2 text-green-400 mb-3">
                    <Icon name="solar:check-circle-bold" class="w-5 h-5" />
                    <span class="font-semibold">Бан снят</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Снял</label>
                      <div class="text-white">{{ formatSpecialName(ban.removed_by_name) }}</div>
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Дата снятия</label>
                      <div class="text-white">{{ ban.removed_by_date ? new Date(ban.removed_by_date).toLocaleDateString('ru-RU') : '—' }}</div>
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-xs text-gray-500 mb-1">Причина снятия</label>
                      <div class="bg-gray-900/50 rounded p-3 text-white text-sm">
                        {{ ban.removed_by_reason || '—' }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>

