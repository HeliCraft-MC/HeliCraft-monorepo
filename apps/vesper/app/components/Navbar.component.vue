<template>
  <!-- Фиксированная шапка -->
  <nav
      class="fixed inset-x-0 top-0 z-50 w-screen flex items-center justify-center
           bg-gradient-to-b from-red-950/80 to-transparent backdrop-blur-sm"
  >
    <div class="flex items-center justify-between w-full max-w-[1700px] px-4 py-3">
      <!-- Логотип -->
      <NuxtLink
          to="/"
          class="flex-shrink-0 flex items-center space-x-2 text-red-400 text-2xl font-bold pr2p"
      >
        <NuxtImg src="/logo_noback.png" alt="HeliCraft Logo" class="w-10 h-10" />
        <span class="hidden sm:inline truncate">HeliCraft</span>
      </NuxtLink>

      <!-- Десктоп-меню ≥1280 px (xl) -->
      <ul
          class="hidden xl:flex flex-1 justify-end items-center gap-6"
      >
        <li>
          <NuxtLink
              to="/"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:home-2-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Главная</span>
          </NuxtLink>
        </li>
        
        <!-- Dropdown: Сервер -->
        <li class="relative" @mouseenter="serverDropdownOpen = true" @mouseleave="serverDropdownOpen = false">
          <button
            @click="serverDropdownOpen = !serverDropdownOpen"
            class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:server-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Сервер</span>
            <Icon name="ph:caret-down" class="w-4 h-4 ml-1 transition" :class="serverDropdownOpen ? 'rotate-180' : ''" />
          </button>
          <Transition
            enter-from-class="opacity-0 -translate-y-2"
            enter-active-class="transition-all duration-200"
            enter-to-class="opacity-100 translate-y-0"
            leave-from-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div v-if="serverDropdownOpen" class="absolute top-full left-0 pt-2 z-[60]">
              <div class="bg-black/95 border border-white/10 rounded-lg py-2 min-w-40 shadow-xl backdrop-blur-sm">
                <NuxtLink
                  to="/rules"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-white/5 transition"
                  @click="serverDropdownOpen = false"
                >
                  <Icon name="solar:sledgehammer-bold-duotone" class="w-4 h-4" />
                  Правила
                </NuxtLink>
                <NuxtLink
                  to="/map"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-white/5 transition"
                  @click="serverDropdownOpen = false"
                >
                  <Icon name="solar:map-point-bold-duotone" class="w-4 h-4" />
                  Карта
                </NuxtLink>
                <NuxtLink
                  v-if="banlistEnabled"
                  to="/banlist"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-white/5 transition"
                  @click="serverDropdownOpen = false"
                >
                  <Icon name="solar:shield-warning-bold-duotone" class="w-4 h-4" />
                  Банлист
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </li>

        <li>
          <NuxtLink
              to="/download"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:download-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Скачать</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
              to="/gallery"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:gallery-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Галерея</span>
          </NuxtLink>
        </li>
        <li v-if="!isStatesDisabled">
          <NuxtLink
              to="/states"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:shield-minimalistic-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Государства</span>
          </NuxtLink>
        </li>

        <!-- Admin link (only for admins) -->
        <li v-if="isLoggedIn && isAdminUser">
          <NuxtLink
              to="/admin"
              class="flex items-center gap-1 font-bold pr2p text-red-400 hover:text-red-300 transition"
          >
            <Icon name="ph:shield-star-bold" class="w-5 h-5" />
            <span class="truncate">Админ</span>
          </NuxtLink>
        </li>

        <!-- Авторизация -->
        <li v-if="isLoggedIn">
          <NuxtLink
              to="/account"
              class="flex items-center gap-2 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <img
                :src="`${origin}/distant-api/user/${nickname}/skin/head`"
                alt="Avatar"
                class="w-8 h-8 rounded-md"
            />
            <span class="truncate">{{ nickname }}</span>
          </NuxtLink>
        </li>
        <li v-else>
          <NuxtLink
              to="/login"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <span class="truncate">Войти</span>
          </NuxtLink>
        </li>
      </ul>

      <!-- Бургер <1280 px -->
      <button
          class="xl:hidden flex-shrink-0 text-gray-200 hover:text-red-400 transition"
          @click="toggleMobileMenu"
          aria-label="Открыть меню"
      >
        <Icon :name="showMobileMenu ? 'ic:outline-close' : 'ic:outline-menu'" class="w-7 h-7" />
      </button>
    </div>

    <!-- Мобильное меню -->
    <Transition
        enter-from-class="opacity-0 -translate-y-4"
        enter-active-class="transition-all duration-300 ease-out"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-to-class="opacity-0 -translate-y-4"
    >
      <div
          v-if="showMobileMenu"
          class="absolute top-full left-0 w-full bg-black/95 backdrop-blur-sm xl:hidden border-b border-white/10"
      >
        <ul class="flex flex-col px-6 py-4 space-y-3">
          <li>
            <NuxtLink
                to="/"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="solar:home-2-bold-duotone" class="w-5 h-5" />
              <span class="truncate">Главная</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/rules"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="solar:sledgehammer-bold-duotone" class="w-5 h-5" />
              <span class="truncate">Правила</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/map"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="solar:map-point-bold-duotone" class="w-5 h-5" />
              <span class="truncate">Карта</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/download"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="solar:download-bold-duotone" class="w-5 h-5" />
              <span class="truncate">Скачать</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/gallery"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="solar:gallery-bold-duotone" class="w-5 h-5" />
              <span class="truncate">Галерея</span>
            </NuxtLink>
          </li>
          <li v-if="!isStatesDisabled">
            <NuxtLink
                to="/states"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="solar:shield-minimalistic-bold-duotone" class="w-5 h-5" />
              <span class="truncate">Государства</span>
            </NuxtLink>
          </li>
          <li v-if="banlistEnabled">
            <NuxtLink
                to="/banlist"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <Icon name="solar:shield-warning-bold-duotone" class="w-5 h-5" />
              <span class="truncate">Банлист</span>
            </NuxtLink>
          </li>
          
          <!-- Admin link for mobile -->
          <li v-if="isLoggedIn && isAdminUser">
            <NuxtLink
                to="/admin"
                class="flex items-center gap-2 pr2p text-red-400 hover:text-red-300 transition"
                @click="closeMobileMenu"
            >
              <Icon name="ph:shield-star-bold" class="w-5 h-5" />
              <span class="truncate">Админ-панель</span>
            </NuxtLink>
          </li>

          <li v-if="isLoggedIn" class="pt-2 border-t border-white/10">
            <NuxtLink
                to="/account"
                class="flex items-center gap-2 pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              <NuxtImg
                  :src="`${origin}/distant-api/user/${nickname}/skin/head`"
                  alt="Avatar"
                  class="w-8 h-8 rounded-md"
              />
              <span class="truncate">{{ nickname }}</span>
            </NuxtLink>
          </li>
          <li v-else class="pt-2 border-t border-white/10">
            <NuxtLink
                to="/login"
                class="pr2p text-gray-200 hover:text-red-400 transition"
                @click="closeMobileMenu"
            >
              Войти
            </NuxtLink>
          </li>
          <li v-if="isLoggedIn">
            <button
                class="pr2p text-left text-gray-500 hover:text-red-400 transition text-sm"
                @click="handleLogout"
            >
              Выйти
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { useAuth } from '#imports'

const config = useRuntimeConfig()
const banlistEnabled = computed(() => config.public.banlistEnabled)

const showMobileMenu = ref(false)
const serverDropdownOpen = ref(false)
const { status, data, signOut } = useAuth()
const isLoggedIn = computed(() => status.value === 'authenticated')
const nickname   = computed(() => data.value?.nickname || '')
const userUuid   = computed(() => data.value?.uuid || '')
const origin     = process.client ? window.location.origin : ''

const isStatesDisabled = useRuntimeConfig().public.statesDisabled

// Check if user is admin
const isAdminUser = ref(false)
const $api = use$apiFetch()

async function checkAdminStatus() {
  if (!isLoggedIn.value || !userUuid.value) {
    isAdminUser.value = false
    return
  }
  try {
    isAdminUser.value = await $api<boolean>(`/user/${userUuid.value}/isAdmin`)
  } catch {
    isAdminUser.value = false
  }
}

// Check admin status when logged in
watch(isLoggedIn, (logged: any) => {
  if (logged) {
    checkAdminStatus()
  } else {
    isAdminUser.value = false
  }
}, { immediate: true })

function toggleMobileMenu () {
  showMobileMenu.value = !showMobileMenu.value
}
function closeMobileMenu () {
  showMobileMenu.value = false
}
function handleLogout () {
  signOut()              /* nuxt-auth signOut */
  closeMobileMenu()
}

/* Закрываем бургер при навигации */
watch(useRoute(), closeMobileMenu)
</script>
