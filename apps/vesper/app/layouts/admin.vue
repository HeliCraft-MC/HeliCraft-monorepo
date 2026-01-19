<!-- layouts/admin.vue -->
<template>
  <div class="flex min-h-screen bg-[#050505] text-white pt-20">
    <!-- Mobile sidebar overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-64 bg-black/90 lg:bg-black/40 border-r border-white/5 overflow-y-auto pt-20 backdrop-blur-sm transform transition-transform lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="py-6 px-4">
        <div class="flex items-center justify-between lg:block">
          <div>
            <div class="text-xl font-bold mb-2 text-red-400">Админ-панель</div>
            <div class="text-xs text-gray-500 mb-6">Управление сайтом</div>
          </div>
          <button
            @click="sidebarOpen = false"
            class="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <Icon name="ph:x-bold" size="24" />
          </button>
        </div>
        
        <nav class="space-y-1">
          <!-- States, Alliances, Warrants - only if states enabled -->
          <template v-if="!statesDisabled">
            <NuxtLink
                to="/admin/states"
                class="nav-link"
                active-class="nav-link-active"
                @click="sidebarOpen = false"
            >
              <Icon name="ph:flag-bold" size="18" />
              Государства
            </NuxtLink>
            <NuxtLink
                to="/admin/alliances"
                class="nav-link"
                active-class="nav-link-active"
                @click="sidebarOpen = false"
            >
              <Icon name="ph:handshake-bold" size="18" />
              Альянсы
            </NuxtLink>
            <NuxtLink
                to="/admin/warrants"
                class="nav-link"
                active-class="nav-link-active"
                @click="sidebarOpen = false"
            >
              <Icon name="ph:scroll-bold" size="18" />
              Указы
            </NuxtLink>
          </template>
          
          <!-- Always visible -->
          <NuxtLink
              to="/admin/gallery"
              class="nav-link"
              active-class="nav-link-active"
              @click="sidebarOpen = false"
          >
            <Icon name="ph:images-bold" size="18" />
            Галерея
          </NuxtLink>
          
          <NuxtLink
              to="/admin/forms"
              class="nav-link"
              active-class="nav-link-active"
              @click="sidebarOpen = false"
          >
            <Icon name="ph:clipboard-text-bold" size="18" />
            Формы
          </NuxtLink>
        </nav>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 lg:ml-64 min-h-screen">
      <!-- Mobile menu toggle -->
      <div class="lg:hidden fixed top-24 left-4 z-30">
        <button
          @click="sidebarOpen = true"
          class="bg-gray-800/90 hover:bg-gray-700 backdrop-blur-sm p-2 rounded-lg shadow-lg transition"
        >
          <Icon name="ph:list-bold" size="24" class="text-white" />
        </button>
      </div>

      <!-- Загрузка проверки прав -->
      <div v-if="isAdmin === null" class="flex justify-center items-center h-[80vh]">
        <Icon name="svg-spinners:3-dots-fade" size="40" class="text-red-400" />
      </div>

      <!-- Ошибка доступа -->
      <div v-else-if="!isAdmin" class="flex flex-col items-center justify-center h-[80vh] text-gray-400 px-4">
        <Icon name="ph:lock-key-bold" size="64" class="mb-4 text-red-400/50" />
        <p class="mb-4 text-center">Доступ запрещён. У вас нет прав администратора.</p>
        <button
            @click="router.push('/')"
            class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
        >
          Вернуться на главную
        </button>
      </div>

      <!-- Контент разделов -->
      <div v-else class="p-4 lg:p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const config = useRuntimeConfig()
const { data: session } = useAuth()
const userUuid = computed(() => session.value?.uuid)
const isAdmin = ref<boolean|null>(null)
const sidebarOpen = ref(false)

// Check if states feature is disabled
const statesDisabled = computed(() => config.public.statesDisabled === true)

async function checkAdmin() {
  if (!userUuid.value) {
    isAdmin.value = false
    return
  }
  try {
    isAdmin.value = await $fetch<boolean>(`/distant-api/user/${userUuid.value}/isAdmin`)
  } catch {
    isAdmin.value = false
  }
}

onMounted(checkAdmin)
</script>

<style scoped>
.nav-link {
  @apply flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all;
}
.nav-link-active {
  @apply text-red-400 bg-red-400/10 border-l-2 border-red-400;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
