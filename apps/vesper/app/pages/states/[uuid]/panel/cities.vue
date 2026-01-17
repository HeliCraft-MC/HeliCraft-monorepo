<!-- pages/states/[uuid]/panel/cities.vue -->
<template>
  <div class="space-y-6">
    <!-- Заголовок -->
    <h1 class="text-3xl font-bold" :style="{ color: accentColor }">
      Города государства
    </h1>

    <!-- Кнопка создания -->
    <button
        v-if="canManageCities"
        @click="openCreateModal"
        class="btn-base bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400"
    >
      <Icon name="material-symbols:add-location-rounded" class="w-5 h-5" />
      <span>Новый город</span>
    </button>

    <!-- Loader / ошибка -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <div class="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-neutral-500"></div>
    </div>
    <p v-else-if="error" class="text-center py-16 text-red-400">
      {{ error }}
    </p>

    <!-- Таблица -->
    <div v-else class="overflow-x-auto bg-gray-800/70 rounded-lg">
      <table class="min-w-full table-auto">
        <thead class="bg-gray-900 text-gray-400 text-sm">
        <tr>
          <th class="px-4 py-3 text-left">Название</th>
          <th class="px-4 py-3 text-left">Координаты</th>
          <th class="px-4 py-3 text-left">Столица</th>
          <th class="px-4 py-3 text-right" v-if="canManageCities">Действия</th>
        </tr>
        </thead>
        <tbody>
        <tr
            v-for="city in cities"
            :key="city.uuid"
            class="border-t border-gray-700 last:border-b"
        >
          <td class="px-4 py-3 font-medium text-gray-200">
            {{ city.name }}
          </td>
          <td class="px-4 py-3 text-gray-300">{{ city.coordinates }}</td>
          <td class="px-4 py-3">
              <span
                  v-if="city.is_capital"
                  class="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                  :style="{ backgroundColor: accentColor, color: '#000' }"
              >
                Столица
              </span>
          </td>
          <!-- Action buttons -->
          <td class="px-4 py-3 text-right space-x-2" v-if="canManageCities">
            <button
                @click="openEditModal(city)"
                class="btn-xs bg-gray-600 hover:bg-gray-500"
                title="Редактировать"
            >
              <Icon name="material-symbols:edit" />
            </button>
            <button
                v-if="!city.is_capital"
                @click="setCapital(city)"
                class="btn-xs bg-yellow-600 hover:bg-yellow-500"
                title="Сделать столицей"
            >
              <Icon name="material-symbols:flag" />
            </button>
            <button
                v-if="city.state_uuid"
                @click="detachCity(city)"
                class="btn-xs bg-gray-700 hover:bg-gray-600"
                title="Открепить"
            >
              <Icon name="material-symbols:link-off-rounded" />
            </button>
            <button
                @click="deleteCity(city)"
                class="btn-xs bg-red-600 hover:bg-red-500"
                title="Удалить"
            >
              <Icon name="material-symbols:delete" />
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- ─────────────  Модалка создания/редактирования  ───────────── -->
    <transition name="fade">
      <div
          v-if="modalOpen"
          class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          @click.self="closeModal"
      >
        <form
            @submit.prevent="submitModal"
            class="bg-gray-900 w-full max-w-lg rounded-lg p-6 space-y-4"
        >
          <h2 class="text-2xl font-bold mb-2" :style="{ color: accentColor }">
            {{ editingCity ? 'Редактирование города' : 'Создать город' }}
          </h2>

          <label class="block text-sm font-medium">
            Название
            <input
                v-model="form.name"
                type="text"
                required
                class="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring"
            />
          </label>

          <label class="block text-sm font-medium">
            Координаты (x,z или ссылка)
            <input
                v-model="form.coordinates"
                type="text"
                required
                class="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring"
            />
          </label>

          <!-- Флаг столицы -->
          <label class="inline-flex items-center gap-2 text-sm">
            <input
                v-model="form.is_capital"
                type="checkbox"
                :disabled="firstCity"
            />
            <span>Сделать столицей</span>
            <span
                v-if="firstCity"
                class="text-xs text-gray-500"
            >(первый город автоматически становится столицей)</span>
          </label>

          <!-- Actions -->
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="closeModal" class="btn-sm btn-secondary">
              Отмена
            </button>
            <button type="submit" class="btn-sm btn-success">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue'
import type { ICity } from '~/types/city.types'
import type { IState } from '~/types/state.types'
import { RolesInState } from '~/types/state.types'

definePageMeta({ layout: 'panel' })

/* ▸ Инжект из layout */
const accentColor = inject<Ref<string>>('accentColor', ref('#ffffff'))
const state = inject<Ref<IState | null>>('state', ref(null))

/* ▸ Аутентификация */
const { data: session } = useAuth()
const currentUserUuid = computed(() => session.value?.uuid)

/* ▸ Локальный стейт */
const cities = ref<ICity[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

/* ▸ Роль пользователя в государстве — передана layout-ом */
const userRole = inject<Ref<RolesInState | null>>('userRole', ref(null))
const canManageCities = computed(() =>
    userRole.value
        ? [RolesInState.RULER, RolesInState.VICE_RULER, RolesInState.MINISTER].includes(
            userRole.value,
        )
        : false,
)

/* ▸ Modal */
const modalOpen = ref(false)
const editingCity = ref<ICity | null>(null)
const form = ref({ name: '', coordinates: '', is_capital: false })
const firstCity = computed(() => cities.value.length === 0)

/* ──────────────────────────────────────────────────────────── */
/*  API helpers                                                */
/* ──────────────────────────────────────────────────────────── */
async function fetchCities() {
  if (!state.value?.uuid) return
  loading.value = true
  error.value = null
  try {
    cities.value = await $fetch<ICity[]>(
        `/distant-api/state/${state.value.uuid}/cities`,
    )
  } catch (e: any) {
    error.value = e.data?.statusMessageRu || e.message
  } finally {
    loading.value = false
  }
}

/*  Создание / обновление */
async function submitModal() {
  if (!state.value) return
  try {
    if (editingCity.value) {
      /* PUT /cities/{uuid} */
      await $fetch(`/distant-api/cities/${editingCity.value.uuid}`, {
        method: 'PUT',
        body: {
          name: form.value.name,
          coordinates: form.value.coordinates,
        },
      })
    } else {
      /* POST /cities/create */
      await $fetch(`/distant-api/cities/create`, {
        method: 'POST',
        body: {
          name: form.value.name,
          coordinates: form.value.coordinates,
          stateUuid: state.value.uuid,
          isCapital: form.value.is_capital,
        },
      })
    }
    await fetchCities()
    closeModal()
  } catch (err: any) {
    alert(`Ошибка: ${err.data?.statusMessageRu || err.message}`)
  }
}

/*  Прочие действия */
async function setCapital(city: ICity) {
  if (!window.confirm(`Сделать "${city.name}" столицей?`)) return
  await $fetch(`/distant-api/cities/${city.uuid}/set-capital`, { method: 'POST' })
  await fetchCities()
}

async function detachCity(city: ICity) {
  if (!window.confirm(`Открепить "${city.name}" от государства?`)) return
  await $fetch(`/distant-api/cities/${city.uuid}/detach`, { method: 'POST' })
  await fetchCities()
}

async function deleteCity(city: ICity) {
  if (!window.confirm(`Удалить город "${city.name}" безвозвратно?`)) return
  await $fetch(`/distant-api/cities/${city.uuid}`, { method: 'DELETE' })
  await fetchCities()
}

/*  Modal helpers */
function openCreateModal() {
  editingCity.value = null
  form.value = {
    name: '',
    coordinates: '',
    is_capital: firstCity.value, // первый город автоматически столица
  }
  modalOpen.value = true
}
function openEditModal(city: ICity) {
  editingCity.value = city
  form.value = {
    name: city.name,
    coordinates: city.coordinates,
    is_capital: city.is_capital,
  }
  modalOpen.value = true
}
function closeModal() {
  modalOpen.value = false
}

/*  Lifecycle */
onMounted(fetchCities)
watch(state, (s) => s && fetchCities())
</script>

<style scoped>
.btn-base,
.btn-sm,
.btn-xs {
  @apply inline-flex items-center gap-1 font-semibold rounded-md transition-colors;
}
.btn-base {
  @apply px-4 py-2 text-sm;
}
.btn-sm {
  @apply px-3 py-1 text-xs;
}
.btn-xs {
  @apply p-1 text-xs;
}
.btn-success {
  @apply bg-green-600 hover:bg-green-500 text-white;
}
.btn-secondary {
  @apply bg-gray-600 hover:bg-gray-500 text-white;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
