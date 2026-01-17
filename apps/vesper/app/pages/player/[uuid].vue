<!-- pages/player/[uuid].vue -->
<script setup lang="ts">
import TimeFormatToggle from '~/components/ui/TimeFormatToggle.vue'
import PlayerBanHistory from '~/components/banlist/PlayerBanHistory.vue'
import AdminBanPanel from '~/components/banlist/AdminBanPanel.vue'

definePageMeta({ auth: false })

const route = useRoute()
const config = useRuntimeConfig()
const { data: session } = useAuth()

// Проверка, включён ли банлист
if (!config.public.banlistEnabled) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Страница не найдена'
  })
}

const playerUuid = computed(() => route.params.uuid as string)
const userUuid = computed(() => session.value?.uuid)

/* ───── Состояние ───── */
const loading = ref(true)
const error = ref('')
const nickname = ref('')
const isAdmin = ref(false)
const checkingAdmin = ref(false)

/* ───── Загрузка никнейма игрока ───── */
async function loadPlayerNickname() {
  try {
    // Исправлен запрос: убрана часть /uuid/
    const response = await $fetch(`/distant-api/user/${playerUuid.value}`)
    if (response && typeof response === 'object' && 'nickname' in response) {
      nickname.value = (response as any).nickname
    } else {
      // Если API не возвращает ник, используем UUID
      nickname.value = playerUuid.value.slice(0, 8)
    }
  } catch (e) {
    console.error('Ошибка загрузки никнейма:', e)
    // В случае ошибки используем сокращённый UUID
    nickname.value = playerUuid.value.slice(0, 8)
  } finally {
    loading.value = false
  }
}

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

/* ───── Инициализация ───── */
onMounted(() => {
  Promise.all([loadPlayerNickname(), checkAdminStatus()])
})


</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col pt-24 md:pt-28 px-4 pb-20">
    <div class="w-full max-w-5xl mx-auto space-y-6">
      <!-- Навигация назад -->
      <NuxtLink to="/banlist" class="inline-flex items-center gap-2 text-gray-400 hover:text-red-400 transition">
        <Icon name="solar:alt-arrow-left-linear" class="w-5 h-5" />
        <span>Вернуться к банлисту</span>
      </NuxtLink>

      <!-- Загрузка -->
      <div v-if="loading" class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-12 text-center">
        <div class="flex justify-center items-center gap-3">
          <div class="w-8 h-8 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin"></div>
          <span class="text-gray-400">Загрузка...</span>
        </div>
      </div>

      <!-- Профиль игрока -->
      <template v-else>
        <!-- Информация об игроке -->
        <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6">
          <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <!-- Голова и скин -->
            <div class="flex gap-4">
              <img
                  :src="`/distant-api/user/${nickname}/skin/head`"
                  :alt="nickname"
                  class="w-24 h-24 rounded-lg border-4 border-gray-800"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
              />
              <img
                  :src="`/distant-api/user/${nickname}/skin`"
                  :alt="`${nickname} skin`"
                  class="h-48 w-auto"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
              />
            </div>

            <!-- Информация -->
            <div class="flex-1 space-y-4">
              <div>
                <h1 class="pr2p text-3xl md:text-4xl font-extrabold text-red-500">
                  {{ nickname }}
                </h1>
                <p class="font-mono text-sm text-gray-400 mt-1 break-all">
                  {{ playerUuid }}
                </p>
              </div>

              <!-- Кнопка перехода в банлист -->
              <NuxtLink
                to="/banlist"
                class="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 transition px-6 py-2 rounded-md text-black font-bold"
              >
                <Icon name="solar:shield-warning-bold-duotone" class="w-5 h-5" />
                <span>К банлисту</span>
              </NuxtLink>
            </div>
          </div>
        </section>

        <!-- История банов (отдельный компонент) -->
        <PlayerBanHistory :player-uuid="playerUuid" :player-nickname="nickname" />

        <!-- Панель администратора -->
        <AdminBanPanel
            v-if="isAdmin && !checkingAdmin"
            :player-uuid="playerUuid"
            :player-nickname="nickname"
            :is-admin="isAdmin"
            @ban-created="$forceUpdate"
            @ban-removed="$forceUpdate"
        />
      </template>
    </div>
  </main>
</template>


