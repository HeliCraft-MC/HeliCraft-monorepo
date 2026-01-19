<!-- layouts/admin.vue -->
<template>
  <div class="flex min-h-screen bg-[#050505] text-white">
    <!-- Mobile sidebar overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/60 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar - z-index 30 to be below navbar (z-50) -->
    <aside
      class="fixed top-20 bottom-0 left-0 z-30 border-r border-white/5 overflow-y-auto backdrop-blur-sm transform transition-all lg:translate-x-0 flex flex-col"
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'w-16' : 'w-64',
        'bg-black/90 lg:bg-black/40'
      ]"
    >
      <!-- Header -->
      <div class="p-4" :class="collapsed ? 'px-2' : ''">
        <div class="flex items-center justify-between">
          <div v-if="!collapsed">
            <div class="text-xl font-bold text-red-400">Админ-панель</div>
            <div class="text-xs text-gray-500">Управление сайтом</div>
          </div>
          <button
            @click="sidebarOpen = false"
            class="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <Icon name="ph:x-bold" size="24" />
          </button>
        </div>
      </div>
      
      <!-- Nav links -->
      <nav class="flex-1 px-2 space-y-1">
        <!-- Home -->
        <NuxtLink
            to="/admin"
            class="nav-link"
            :class="{'justify-center': collapsed}"
            active-class="nav-link-active"
            @click="sidebarOpen = false"
            :title="collapsed ? 'Главная' : ''"
        >
          <Icon name="ph:house-bold" size="18" />
          <span v-if="!collapsed">Главная</span>
        </NuxtLink>

        <!-- States, Alliances, Warrants - only if states enabled -->
        <template v-if="!statesDisabled">
          <NuxtLink
              to="/admin/states"
              class="nav-link"
              :class="{'justify-center': collapsed}"
              active-class="nav-link-active"
              @click="sidebarOpen = false"
              :title="collapsed ? 'Государства' : ''"
          >
            <Icon name="ph:flag-bold" size="18" />
            <span v-if="!collapsed">Государства</span>
          </NuxtLink>
          <NuxtLink
              to="/admin/alliances"
              class="nav-link"
              :class="{'justify-center': collapsed}"
              active-class="nav-link-active"
              @click="sidebarOpen = false"
              :title="collapsed ? 'Альянсы' : ''"
          >
            <Icon name="ph:handshake-bold" size="18" />
            <span v-if="!collapsed">Альянсы</span>
          </NuxtLink>
          <NuxtLink
              to="/admin/warrants"
              class="nav-link"
              :class="{'justify-center': collapsed}"
              active-class="nav-link-active"
              @click="sidebarOpen = false"
              :title="collapsed ? 'Указы' : ''"
          >
            <Icon name="ph:scroll-bold" size="18" />
            <span v-if="!collapsed">Указы</span>
          </NuxtLink>
        </template>
        
        <!-- Always visible -->
        <NuxtLink
            to="/admin/gallery"
            class="nav-link"
            :class="{'justify-center': collapsed}"
            active-class="nav-link-active"
            @click="sidebarOpen = false"
            :title="collapsed ? 'Галерея' : ''"
        >
          <Icon name="ph:images-bold" size="18" />
          <span v-if="!collapsed">Галерея</span>
        </NuxtLink>
        
        <NuxtLink
            to="/admin/forms"
            class="nav-link"
            :class="{'justify-center': collapsed}"
            active-class="nav-link-active"
            @click="sidebarOpen = false"
            :title="collapsed ? 'Формы' : ''"
        >
          <Icon name="ph:clipboard-text-bold" size="18" />
          <span v-if="!collapsed">Формы</span>
        </NuxtLink>
      </nav>

      <!-- Collapse toggle (desktop only) -->
      <div class="hidden lg:block px-2 py-2 border-t border-white/5">
        <button
          @click="collapsed = !collapsed"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          :class="{'justify-center': collapsed}"
        >
          <Icon :name="collapsed ? 'ph:caret-double-right-bold' : 'ph:caret-double-left-bold'" size="18" />
          <span v-if="!collapsed">Свернуть</span>
        </button>
      </div>

      <!-- Admin profile -->
      <div class="px-2 pb-4 pt-2 border-t border-white/5">
        <NuxtLink
          to="/account"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          :class="{'justify-center': collapsed}"
          :title="collapsed ? nickname : ''"
        >
          <img
            :src="`/distant-api/user/${userUuid}/skin/head.png`"
            :alt="nickname"
            class="w-8 h-8 rounded-md flex-shrink-0"
          />
          <div v-if="!collapsed" class="min-w-0">
            <div class="font-medium text-white truncate">{{ nickname }}</div>
            <div class="text-xs text-gray-500">Администратор</div>
          </div>
        </NuxtLink>
      </div>
    </aside>

    <!-- Main content -->
    <main 
      class="flex-1 min-h-screen pt-20 transition-all"
      :class="collapsed ? 'lg:ml-16' : 'lg:ml-64'"
    >
      <!-- Mobile menu toggle -->
      <div class="lg:hidden fixed top-24 left-4 z-20">
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
const nickname = computed(() => session.value?.nickname || 'Admin')
const isAdmin = ref<boolean|null>(null)
const sidebarOpen = ref(false)
const collapsed = ref(false)

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
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all;
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
