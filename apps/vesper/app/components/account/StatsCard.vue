<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuth } from '#imports'
import { usePlanFetch } from '@/composables/usePlanFetch'

/* ---------- auth ---------- */
const { data } = useAuth()
const uuid = computed(() => data.value?.uuid ?? '')
const nickname = computed(() => data.value?.nickname ?? '')

/* ✅ создаём planFetch в setup */
const planFetch = usePlanFetch()

/* ---------- state ---------- */
const loading = ref(true)
const needReg = ref(false)
const planCode = ref('')
const password = ref('')
const error = ref('')
const raw = ref<any>(null)

/* ---------- helpers ---------- */
const msNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : NaN
  return Number.isFinite(n) ? n : null
}

const dt = (e?: number) => (e ? new Date(e).toLocaleString() : '–')

function formatDurationMs(v: unknown): string {
  const ms = msNum(v)
  if (ms === null) return '–'
  if (ms < 0) return '–'

  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const parts: string[] = []
  if (days) parts.push(`${days}д`)
  if (hours || days) parts.push(`${hours}ч`)
  parts.push(`${mins}м`)

  // секунды показываем только если меньше минуты и нет часов/дней
  if (!days && !hours && mins === 0) parts.push(`${secs}с`)

  return parts.join(' ')
}

const fmt2 = (v: unknown): string => {
  const n = msNum(v)
  if (n === null) return '–'
  return n.toFixed(2)
}

const ms = (s?: string) => (s ? Number.parseFloat(s) : null)

/* ---------- fetch ---------- */
onMounted(loadStats)

async function loadStats() {
  loading.value = true
  error.value = ''
  planCode.value = ''

  try {
    raw.value = await planFetch('/v1/player', { query: { player: uuid.value } })
    needReg.value = false
  } catch (e: any) {
    if (e?.name === 'PlanAuthRequired' || e?.status === 401 || e?.status === 403) {
      needReg.value = true
    } else {
      error.value = e?.message || 'Ошибка загрузки статистики'
    }
  } finally {
    loading.value = false
  }
}

async function planLogin() {
  error.value = ''
  planCode.value = ''
  if (!password.value) {
    error.value = 'Введите пароль'
    return
  }

  const body = new URLSearchParams({ user: nickname.value, password: password.value }).toString()

  try {
    await planFetch('/auth/login', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    needReg.value = false
    await loadStats()
  } catch (e: any) {
    if (e?.status === 401) {
      error.value = 'Неверный пароль для веб-аккаунта Plan'
    } else {
      error.value = e?.message || 'Не удалось войти'
    }
  }
}

async function planRegister() {
  error.value = ''
  if (!password.value) {
    error.value = 'Введите пароль'
    return
  }

  const body = new URLSearchParams({ user: nickname.value, password: password.value }).toString()

  try {
    const r = await planFetch<{ code?: string }>('/auth/register', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    planCode.value = r?.code || ''
    if (!planCode.value) throw new Error('Пустой код регистрации')
  } catch (e: any) {
    error.value = e?.message || 'Не удалось зарегистрироваться'
  }
}

async function checkActivation() {
  error.value = ''
  if (!password.value) {
    error.value = 'Введите пароль'
    return
  }

  const body = new URLSearchParams({ user: nickname.value, password: password.value }).toString()

  try {
    await planFetch('/auth/login', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    needReg.value = false
    planCode.value = ''
    await loadStats()
  } catch {
    error.value = 'Код ещё не активирован на сервере'
  }
}

/* ---------- ui метрики ---------- */
const stats = computed(() => {
  if (!raw.value) return null

  const i = raw.value.info ?? {}
  const k = raw.value.kill_data ?? {}

  return [
    { icon: 'mdi:history',        label: 'Сессий',            val: i.session_count },
    { icon: 'mdi:clock',          label: 'Игровое время',     val: formatDurationMs(i.playtime) },
    { icon: 'mdi:progress-clock', label: 'Активное',          val: formatDurationMs(i.active_playtime) },
    { icon: 'mdi:sleep',          label: 'AFK',               val: formatDurationMs(i.afk_time) },
    { icon: 'mdi:check-decagram', label: 'Индекс активности', val: fmt2(i.activity_index) },
    { icon: 'mdi:login',          label: 'Последний визит',   val: dt(i.last_seen_raw_value) },
    { icon: 'mdi:lan',            label: '⌀ пинг, мс',        val: ms(i.average_ping) ?? '–' },
    { icon: 'mdi:sword',          label: 'PvP-киллы',         val: k.player_kills_total },
    { icon: 'mdi:emoticon-dead',  label: 'Смерти',            val: k.deaths_total },
    { icon: 'mdi:cow',            label: 'Mob-киллы',         val: k.mob_kills_total },
    { icon: 'mdi:server',         label: 'Любимый сервер',    val: i.favorite_server ?? '–' },
    { icon: 'mdi:trophy',         label: 'MAX сессия',        val: formatDurationMs(i.longest_session_length) }
  ]
})
</script>

<template>
  <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-8">
    <h2 class="pr2p text-2xl text-red-500 mb-6 flex items-center gap-2">
      <Icon name="mdi:chart-box" class="w-6 h-6" /> Статистика
    </h2>

    <p v-if="loading" class="text-gray-400">Загружаем…</p>

    <template v-else-if="needReg">
      <div class="space-y-4">
        <p class="text-gray-300">
          Чтобы видеть личную статистику, войдите в Plan или создайте веб-аккаунт.
        </p>

        <input
            v-model="password"
            type="password"
            placeholder="Пароль веб-аккаунта Plan"
            class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none"
        />

        <div class="flex flex-col sm:flex-row gap-3">
          <button
              @click="planLogin"
              class="flex-1 bg-red-500 hover:bg-red-600 rounded-md py-3 font-bold text-black"
          >
            Войти
          </button>
          <button
              @click="planRegister"
              class="flex-1 bg-gray-700 hover:bg-gray-600 rounded-md py-3"
          >
            Создать веб-аккаунт
          </button>
        </div>

        <p v-if="error" class="text-red-400">{{ error }}</p>

        <div v-if="planCode" class="space-y-3 pt-2">
          <p class="text-gray-300 text-sm">
            На сервере выполните команду:<br>
            <code class="bg-gray-800 px-2 py-1 rounded text-red-400 select-all">
              /planproxy register --code {{ planCode }}
            </code>
          </p>
          <button
              @click="checkActivation"
              class="w-full bg-gray-700 hover:bg-gray-600 rounded-md py-3"
          >
            Проверить готово ли
          </button>
        </div>
      </div>
    </template>

    <table v-else class="w-full text-gray-300 text-sm md:text-base">
      <tbody>
      <tr v-for="s in stats" :key="s.label" class="border-t border-gray-800/70">
        <td class="py-2 flex items-center gap-2">
          <Icon :name="s.icon" class="w-4 h-4 shrink-0" /> {{ s.label }}
        </td>
        <td class="py-2 text-right font-semibold">{{ s.val }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>
