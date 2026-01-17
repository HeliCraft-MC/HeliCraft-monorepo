<script setup lang="ts">
import AllianceCard from '@/components/alliances/AllianceCard.vue'

import {
  type IAlliance,
  AlliencePurpose,
  AllianceStatus
} from '~/types/diplomacy.types'
import type { IState } from '~/types/state.types'

definePageMeta({ auth: false })

/* ───── Шаблонные данные ───── */

const q = ref('')

const filters = ref({
  purpose: '',
  status: ''
})

const loading = ref(true)
const rows = ref<(IAlliance & { members: number | null })[]>([])

/* ───── Данные по пользователю ───── */

const { data: session } = useAuth()
const userUuid = computed(() => session.value?.uuid)

const managedStates = ref<IState[]>([])
const isCreateModalOpen = ref(false)

/** Пользователь — правитель хотя бы одного государства */
const creatableStates = computed(() =>
    managedStates.value.filter(s => s.ruler_uuid === userUuid.value)
)
const canCreateAlliance = computed(() => creatableStates.value.length > 0)

/* ───── Загрузка данных ───── */

async function load () {
  loading.value = true

  try {
    /* Получаем список альянсов */
    const query: any = {}
    if (q.value) query.search = q.value
    if (filters.value.purpose) query.purpose = filters.value.purpose
    if (filters.value.status) query.status = filters.value.status

    const alliances: IAlliance[] = await $fetch('/distant-api/alliances/list', {
      query
    })

    /* Подтягиваем количество участников для каждого альянса */
    const alliancesWithMembers = await Promise.all(
        alliances.map(async a => {
          try {
            const membersArr = await $fetch(
                `/distant-api/alliances/${a.uuid}/members`
            )
            const count = Array.isArray(membersArr) ? membersArr.length : 0
            return { ...a, members: count }
          } catch {
            return { ...a, members: null } // если не удалось загрузить
          }
        })
    )

    rows.value = alliancesWithMembers

    /* Если залогинен — получаем государства пользователя,
       чтобы знать, может ли он создавать альянсы */
    if (userUuid.value) {
      const states: IState[] = await $fetch(
          `/distant-api/user/${userUuid.value}/states`
      ).catch(() => [])
      managedStates.value = states
    }
  } catch (err) {
    console.error('Failed to load alliances:', err)
  } finally {
    loading.value = false
  }
}

/* Следим за изменениями поискового запроса и фильтров */
watch([q, filters], load, { deep: true })

onMounted(load)

/* ───── Обработка создания ───── */

function handleAllianceCreated (allianceUuid: string) {
  isCreateModalOpen.value = false
  useRouter().push(`/alliances/${allianceUuid}`)
}

/* Сброс фильтров */
function resetFilters () {
  filters.value = { purpose: '', status: '' }
}
</script>

<template>
  <main class="min-h-screen bg-black text-white flex pt-24 md:pt-28">
    <!-- Фильтры (desktop) -->
    <aside
        class="w-64 shrink-0 border-r border-gray-800/60 p-6 space-y-6 hidden lg:block"
    >
      <div>
        <h3 class="font-semibold mb-2">Цель альянса</h3>
        <select v-model="filters.purpose" class="w-full bg-gray-800 px-3 py-2 rounded">
          <option value="">Любая</option>
          <option value="economic">Экономический</option>
          <option value="military">Военный</option>
          <option value="diplomatic">Дипломатический</option>
          <option value="general">Общий</option>
          <option value="other">Другое</option>
        </select>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Статус</h3>
        <select v-model="filters.status" class="w-full bg-gray-800 px-3 py-2 rounded">
          <option value="">Любой</option>
          <option value="active">Активен</option>
          <option value="dissolved">Распущен</option>
        </select>
      </div>

      <button
          @click="resetFilters"
          class="text-sm text-gray-400 hover:text-red-400"
      >
        Сбросить
      </button>
    </aside>

    <!-- Правая часть: поиск + список -->
    <section class="flex-1 p-6 space-y-6">
      <div class="flex flex-wrap items-center gap-4">
        <input
            v-model="q"
            placeholder="Поиск альянса..."
            class="flex-1 min-w-[200px] bg-gray-800/70 px-4 py-3 rounded outline-none"
        />

        <button
            v-if="canCreateAlliance"
            @click="isCreateModalOpen = true"
            class="btn-action-primary"
        >
          <Icon name="material-symbols:add-shield-rounded" class="w-5 h-5" />
          <span class="hidden sm:inline">Создать альянс</span>
        </button>
      </div>

      <p v-if="loading" class="text-gray-400">Загружаем…</p>

      <div v-else-if="!rows.length" class="text-gray-400">Ничего не найдено.</div>

      <div v-else class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AllianceCard
            v-for="a in rows"
            :key="a.uuid"
            :alliance="a"
            :members="a.members"
        />
      </div>
    </section>


  </main>
</template>

<style scoped>
.btn-action-primary {
  @apply inline-flex items-center justify-center gap-2.5 font-semibold rounded-lg px-5 py-2.5 transition-all duration-200 transform focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400 shadow-md hover:shadow-lg;
}
</style>
