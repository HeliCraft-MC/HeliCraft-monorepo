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

      <!-- Десктоп-меню ≥1320 px -->
      <ul
          class="hidden min-[1320px]:flex flex-1 justify-end items-center gap-8 overflow-hidden"
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
        <li>
          <NuxtLink
              to="/rules"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:sledgehammer-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Правила сервера</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
              to="/map"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:map-point-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Карта</span>
          </NuxtLink>
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
        <li v-if="banlistEnabled">
          <NuxtLink
              to="/banlist"
              class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
          >
            <Icon name="solar:shield-warning-bold-duotone" class="w-5 h-5" />
            <span class="truncate">Банлист</span>
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

      <!-- Бургер ≤1319 px -->
      <button
          class="min-[1320px]:hidden flex-shrink-0 text-gray-200 hover:text-red-400 transition"
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
          class="absolute top-full left-0 w-full bg-black/80 backdrop-blur-sm min-[1320px]:hidden"
      >
        <ul class="flex flex-col px-6 py-4 space-y-4">
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
              <span class="truncate">Правила сервера</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
                to="/map"
                class="flex items-center gap-1 font-bold pr2p text-gray-200 hover:text-red-400 transition"
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
              <span class="truncate">Скачать лаунчер</span>
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
          <li v-if="isLoggedIn">
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
          <li v-else>
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
                class="pr2p text-left text-gray-200 hover:text-red-400 transition"
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
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '#imports'

const config = useRuntimeConfig()
const banlistEnabled = computed(() => config.public.banlistEnabled)

const showMobileMenu = ref(false)
const { status, data, signOut } = useAuth()
const isLoggedIn = computed(() => status.value === 'authenticated')
const nickname   = computed(() => data.value?.nickname || '')
const origin     = process.client ? window.location.origin : ''

const isStatesDisabled = useRuntimeConfig().public.statesDisabled

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
