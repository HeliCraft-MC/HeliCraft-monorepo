<!-- pages/banlist.vue -->
<script setup lang="ts">
import type { IBanListResponse } from '~/types/banlist.types'
import BanlistTable from '~/components/banlist/BanlistTable.vue'
import TimeFormatToggle from '~/components/ui/TimeFormatToggle.vue'
import AdminCleanSkinsPanel from '~/components/banlist/AdminCleanSkinsPanel.vue'

definePageMeta({ auth: false })

const config = useRuntimeConfig()
const { data: session } = useAuth()

// Проверка, включён ли банлист
if (!config.public.banlistEnabled) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Страница не найдена'
  })
}

const userUuid = computed(() => session.value?.uuid)

/* ───── Состояние ───── */
const searchQuery = ref('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')
const limit = ref(20)
const offset = ref(0)
const loading = ref(true)
const error = ref('')
const isAdmin = ref(false)
const checkingAdmin = ref(false)

const banlistData = ref<IBanListResponse>({ items: [], total: 0 })
const adminPanelRef = ref<InstanceType<typeof AdminCleanSkinsPanel> | null>(null)

/* ───── Вычисляемые значения для пагинации ───── */
const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.ceil(banlistData.value.total / limit.value))

/* ───── Загрузка данных ───── */
async function loadBanlist() {
  loading.value = true
  error.value = ''

  try {
    const query: any = {
      limit: limit.value,
      offset: offset.value
    }

    if (searchQuery.value.trim()) {
      query.q = searchQuery.value.trim()
    }

    if (activeFilter.value === 'active') {
      query.active = 'true'
    } else if (activeFilter.value === 'inactive') {
      query.active = 'false'
    }

    const data = await useApiFetch<IBanListResponse>('/banlist', {
      query
    })

    if (data.data.value) {
      banlistData.value = data.data.value
    } else if (data.error.value) {
      throw new Error(data.error.value.message || 'Не удалось загрузить банлист')
    }
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при загрузке данных'
    console.error('Ошибка загрузки банлиста:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Пагинация ───── */
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  offset.value = (page - 1) * limit.value
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1)
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1)
  }
}

/* ───── Отслеживание изменений фильтров ───── */
watch([searchQuery, activeFilter, offset], () => {
  loadBanlist()
})

watch(limit, () => {
  offset.value = 0 // Сброс на первую страницу при изменении лимита
})

/* ───── Инициализация ───── */
onMounted(async () => {
  await Promise.all([loadBanlist(), checkAdminStatus()])
})

/* ───── Проверка админ-статуса ───── */
async function checkAdminStatus() {
  if (!userUuid.value) {
    isAdmin.value = false
    return
  }

  checkingAdmin.value = true
  try {
    isAdmin.value = await $fetch<boolean>(`/distant-api/user/${userUuid.value}/isAdmin`)
  } catch (e) {
    console.error('Ошибка проверки админ-статуса:', e)
    isAdmin.value = false
  } finally {
    checkingAdmin.value = false
  }
}

/* ───── Обработка снятия бана из таблицы ───── */
function handleRemoveBan(banId: number, banNickname: string) {
  if (adminPanelRef.value) {
    adminPanelRef.value.openRemoveBanModal(banId, banNickname)
  }
}

/* ───── Обработка события банRemoved ───── */
function handleBanRemoved(banId: number) {
  // Перезагружаем список банов
  loadBanlist()
}
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28 px-4 pb-20">
    <div class="w-full max-w-7xl mx-auto space-y-6">
      <!-- Заголовок -->
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="pr2p text-3xl md:text-4xl font-extrabold text-red-500 flex items-center gap-3">
            <Icon name="solar:shield-warning-bold-duotone" class="w-8 h-8" />
            Банлист
          </h1>
          <p class="text-gray-400 mt-2">
            История банов на сервере HeliCraft
          </p>
        </div>

        <!-- Переключатель формата времени -->
        <TimeFormatToggle />
      </header>

      <!-- Фильтры и поиск -->
      <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Поиск -->
          <div class="md:col-span-2">
            <label class="block text-sm text-gray-400 mb-2">Поиск</label>
            <div class="relative">
              <Icon name="solar:magnifer-linear" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="UUID игрока, имя админа или причина бана..."
                  class="w-full bg-gray-800/70 rounded-md pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition"
              />
            </div>
          </div>

          <!-- Фильтр статуса -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">Статус</label>
            <select
                v-model="activeFilter"
                class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition"
            >
              <option value="all">Все баны</option>
              <option value="active">Активные</option>
              <option value="inactive">Снятые</option>
            </select>
          </div>
        </div>

        <!-- Количество записей на странице -->
        <div class="flex items-center gap-4">
          <label class="text-sm text-gray-400">Показывать по:</label>
          <select
              v-model.number="limit"
              class="bg-gray-800/70 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 transition text-sm"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </section>

      <!-- Ошибка -->
      <div v-if="error" class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300">
        <div class="flex items-center gap-2">
          <Icon name="solar:danger-circle-bold" class="w-5 h-5" />
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Таблица -->
      <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg overflow-hidden">
        <BanlistTable
          :bans="banlistData.items"
          :loading="loading"
          :is-admin="isAdmin"
          @removeBan="handleRemoveBan"
        />
      </section>

      <!-- Панель администратора -->
      <AdminCleanSkinsPanel
        v-if="isAdmin && !checkingAdmin"
        ref="adminPanelRef"
        :is-admin="isAdmin"
        @banRemoved="handleBanRemoved"
      />

      <!-- Пагинация -->
      <nav v-if="!loading && totalPages > 1" class="flex items-center justify-between">
        <div class="text-sm text-gray-400">
          Показано {{ offset + 1 }}–{{ Math.min(offset + limit, banlistData.total) }} из {{ banlistData.total }}
        </div>

        <div class="flex items-center gap-2">
          <button
              @click="prevPage"
              :disabled="currentPage === 1"
              class="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
          </button>

          <div class="flex items-center gap-1">
            <button
                v-for="page in Math.min(5, totalPages)"
                :key="page"
                @click="goToPage(page)"
                class="px-4 py-2 rounded-md transition"
                :class="currentPage === page ? 'bg-red-500 text-black font-bold' : 'bg-gray-800 hover:bg-gray-700'"
            >
              {{ page }}
            </button>
            <span v-if="totalPages > 5" class="px-2 text-gray-500">...</span>
            <button
                v-if="totalPages > 5"
                @click="goToPage(totalPages)"
                class="px-4 py-2 rounded-md transition"
                :class="currentPage === totalPages ? 'bg-red-500 text-black font-bold' : 'bg-gray-800 hover:bg-gray-700'"
            >
              {{ totalPages }}
            </button>
          </div>

          <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Icon name="solar:alt-arrow-right-linear" class="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  </main>
</template>

