<!-- layouts/admin.vue -->
<template>
  <div class="flex min-h-screen bg-black text-white pt-20">
    <!-- Sidebar -->
    <aside class="w-64 bg-gray-900 fixed inset-y-0 left-0 overflow-y-auto pt-20">
      <div class="py-6 px-4">
        <div class="text-xl font-bold mb-6">Админ-панель</div>
        <nav class="space-y-2">
          <NuxtLink
              to="/admin/states"
              class="block px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            Государства
          </NuxtLink>
          <NuxtLink
              to="/admin/alliances"
              class="block px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            Альянсы
          </NuxtLink>
          <NuxtLink
              to="/admin/gallery"
              class="block px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            Галерея
          </NuxtLink>
          <NuxtLink
              to="/admin/players"
              class="block px-4 py-2 rounded hover:bg-gray-700 transition"
              disabled
          >
            Игроки
          </NuxtLink>
          <NuxtLink
              to="/admin/warrants"
              class="block px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            Указы
          </NuxtLink>
        </nav>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 ml-64 p-6">
      <!-- Загрузка проверки прав -->
      <div v-if="isAdmin === null" class="flex justify-center items-center h-full">
        <div class="w-12 h-12 border-4 border-gray-600 border-t-gray-300 rounded-full animate-spin"></div>
      </div>

      <!-- Ошибка доступа -->
      <div v-else-if="!isAdmin" class="flex flex-col items-center justify-center h-full text-red-400">
        <p class="mb-4">Доступ запрещён. У вас нет прав администратора.</p>
        <button
            @click="router.push('/')"
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
        >
          Вернуться на главную
        </button>
      </div>

      <!-- Контент разделов -->
      <div v-else>
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '#imports'

const router = useRouter()
const { data: session } = useAuth()
const userUuid = computed(() => session.value?.uuid)
const isAdmin = ref<boolean|null>(null)

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
/* Всё стилизовано через Tailwind — дополнительных CSS не требуется */
</style>
