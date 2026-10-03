<!-- components/banlist/AdminBanPanel.vue -->
<script setup lang="ts">
const props = defineProps<{
  playerUuid: string
  playerNickname: string
  isAdmin: boolean
}>()

const emit = defineEmits<{
  banCreated: []
  banRemoved: []
}>()

/* ───── Состояние ───── */
const showCreateBanModal = ref(false)
const showCleanSkinsModal = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

// Форма создания бана
const banForm = reactive({
  reason: '',
  duration: '86400000', // По умолчанию 1 день
  ipBan: false,
  silent: false
})

// Форма очистки скинов
const cleanSkinsForm = reactive({
  minDuration: '2592000000' // По умолчанию 30 дней
})

const durationOptions = [
  { label: '1 час', value: '3600000' },
  { label: '1 день', value: '86400000' },
  { label: '7 дней', value: '604800000' },
  { label: '30 дней', value: '2592000000' },
  { label: '90 дней', value: '7776000000' },
  { label: 'Перманентно', value: '-1' }
]

const cleanDurationOptions = [
  { label: '1 день', value: '86400000' },
  { label: '7 дней', value: '604800000' },
  { label: '30 дней', value: '2592000000' },
  { label: '90 дней', value: '7776000000' },
  { label: 'Перманентные баны', value: '-1' }
]

/* ───── Создание бана ───── */
async function createBan() {
  if (!banForm.reason.trim()) {
    error.value = 'Укажите причину бана'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const { data, error: fetchError } = await useApiFetch('/api/banlist', {
      method: 'POST',
      body: {
        target: props.playerUuid,
        reason: banForm.reason,
        duration: parseInt(banForm.duration),
        ipBan: banForm.ipBan,
        silent: banForm.silent
      }
    })

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Ошибка при создании бана')
    }

    success.value = 'Бан успешно выдан!'
    showCreateBanModal.value = false
    banForm.reason = ''
    banForm.duration = '86400000'
    banForm.ipBan = false
    banForm.silent = false

    emit('banCreated')
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при создании бана'
    console.error('Ошибка создания бана:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Очистка скинов ───── */
async function cleanSkins() {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const { data, error: fetchError } = await useApiFetch(
      `/api/banlist/admin/clean-skins?minDuration=${cleanSkinsForm.minDuration}`,
      {
        method: 'POST'
      }
    )

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Ошибка при очистке скинов')
    }

    if (data.value && (data.value as any).deleted !== undefined) {
      const result = data.value as any
      success.value = `Скины успешно очищены! Удалено: ${result.deleted} из ${result.total}`
      showCleanSkinsModal.value = false
    }
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при очистке скинов'
    console.error('Ошибка очистки скинов:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Очистка сообщений ───── */
watch(success, (val) => {
  if (val) {
    setTimeout(() => {
      success.value = ''
    }, 5000)
  }
})
</script>

<template>
  <div v-if="isAdmin" class="space-y-4">
    <!-- Сообщения об ошибках и успехе -->
    <div v-if="error" class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300">
      <div class="flex items-center gap-2">
        <Icon name="solar:danger-circle-bold" class="w-5 h-5" />
        <span>{{ error }}</span>
      </div>
    </div>

    <div v-if="success" class="bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-green-300">
      <div class="flex items-center gap-2">
        <Icon name="solar:check-circle-bold" class="w-5 h-5" />
        <span>{{ success }}</span>
      </div>
    </div>

    <!-- Панель администратора -->
    <section class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-6">
      <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
        <Icon name="solar:shield-user-bold-duotone" class="w-6 h-6 text-red-500" />
        Панель администратора
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Кнопка создания бана -->
        <button
            @click="showCreateBanModal = true"
            :disabled="loading"
            class="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition px-6 py-3 rounded-md text-white font-bold flex items-center gap-2"
        >
          <Icon name="solar:shield-warning-bold-duotone" class="w-5 h-5" />
          <span>Выдать бан</span>
        </button>

        <!-- Кнопка очистки скинов -->
        <button
            @click="showCleanSkinsModal = true"
            :disabled="loading"
            class="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition px-6 py-3 rounded-md text-white font-bold flex items-center gap-2"
        >
          <Icon name="solar:trash-bin-2-bold-duotone" class="w-5 h-5" />
          <span>Очистить скины</span>
        </button>
      </div>
    </section>

    <!-- Модальное окно создания бана -->
    <Teleport to="body">
      <Transition name="fade">
        <div
            v-if="showCreateBanModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            @click.self="showCreateBanModal = false"
        >
          <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h4 class="text-xl font-bold">Выдать бан</h4>

            <!-- Причина -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Причина бана</label>
              <textarea
                  v-model="banForm.reason"
                  class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500"
                  placeholder="Введите причину бана..."
                  rows="4"
              ></textarea>
            </div>

            <!-- Длительность -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Длительность</label>
              <select
                  v-model="banForm.duration"
                  class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              >
                <option v-for="opt in durationOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Чекбоксы -->
            <div class="space-y-2">
              <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                    v-model="banForm.ipBan"
                    type="checkbox"
                    class="w-4 h-4 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-red-500"
                />
                <span>IP бан</span>
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                    v-model="banForm.silent"
                    type="checkbox"
                    class="w-4 h-4 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-red-500"
                />
                <span>Скрытый бан</span>
              </label>
            </div>

            <!-- Кнопки -->
            <div class="flex gap-3 pt-4">
              <button
                  @click="showCreateBanModal = false"
                  class="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 transition rounded-md text-white font-bold"
              >
                Отмена
              </button>
              <button
                  @click="createBan"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-md text-white font-bold"
              >
                {{ loading ? 'Обработка...' : 'Выдать бан' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Модальное окно очистки скинов -->
    <Teleport to="body">
      <Transition name="fade">
        <div
            v-if="showCleanSkinsModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            @click.self="showCleanSkinsModal = false"
        >
          <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h4 class="text-xl font-bold">Очистить скины</h4>

            <!-- Информация -->
            <p class="text-sm text-gray-400">
              Выберите минимальный срок бана для очистки скинов. Скины всех игроков с баном на этот срок или дольше будут удалены.
            </p>

            <!-- Выбор срока -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Минимальный срок бана</label>
              <select
                  v-model="cleanSkinsForm.minDuration"
                  class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option v-for="opt in cleanDurationOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Предупреждение -->
            <div class="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-yellow-300 text-sm">
              <div class="flex gap-2">
                <Icon name="solar:info-circle-bold" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Это действие необратимо. Скины будут окончательно удалены.</span>
              </div>
            </div>

            <!-- Кнопки -->
            <div class="flex gap-3 pt-4">
              <button
                  @click="showCleanSkinsModal = false"
                  class="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 transition rounded-md text-white font-bold"
              >
                Отмена
              </button>
              <button
                  @click="cleanSkins"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-md text-white font-bold"
              >
                {{ loading ? 'Обработка...' : 'Очистить' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

