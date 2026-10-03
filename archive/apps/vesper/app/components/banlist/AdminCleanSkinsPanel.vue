<!-- components/banlist/AdminCleanSkinsPanel.vue -->
<script setup lang="ts">
const props = defineProps<{
  isAdmin: boolean
}>()

const emit = defineEmits<{
  banRemoved: [banId: number]
}>()

/* ───── Состояние ───── */
const showCleanSkinsModal = ref(false)
const showCreateBanModal = ref(false)
const showRemoveBanModal = ref(false)

const loading = ref(false)
const error = ref('')
const success = ref('')

// Форма очистки скинов
const cleanSkinsForm = reactive({
  durationMode: 'preset', // 'preset' или 'custom'
  minDuration: '2592000000', // По умолчанию 30 дней
  customDays: 30,
  customHours: 0,
  customMinutes: 0
})

// Форма создания бана
const createBanForm = reactive({
  playerNickname: '',
  reason: '',
  duration: 'permanent',
  customDays: 30,
  customHours: 0,
  customMinutes: 0,
  isIpBan: false,
  isSilent: false
})

// Форма снятия бана
const removeBanForm = reactive({
  banId: null as number | null,
  banNickname: '',
  reason: ''
})

const cleanDurationOptions = [
  { label: '1 день', value: '86400000' },
  { label: '7 дней', value: '604800000' },
  { label: '30 дней', value: '2592000000' },
  { label: '90 дней', value: '7776000000' },
  { label: 'Перманентные баны', value: '-1' }
]

/* ───── Вычисления длительности ───── */
function getCustomDurationMs(): number {
  return (cleanSkinsForm.customDays * 24 * 60 * 60 * 1000) +
         (cleanSkinsForm.customHours * 60 * 60 * 1000) +
         (cleanSkinsForm.customMinutes * 60 * 1000)
}

function getBanDurationMs(): number {
  if (createBanForm.duration === 'permanent') return -1
  return (createBanForm.customDays * 24 * 60 * 60 * 1000) +
         (createBanForm.customHours * 60 * 60 * 1000) +
         (createBanForm.customMinutes * 60 * 1000)
}

/* ───── Очистка скинов ───── */
async function cleanSkins() {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const duration = cleanSkinsForm.durationMode === 'custom'
      ? getCustomDurationMs()
      : parseInt(cleanSkinsForm.minDuration)

    const { data, error: fetchError } = await useApiFetch(
      `/banlist/admin/clean-skins?minDuration=${duration}`,
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

/* ───── Создание бана ───── */
async function createBan() {
  if (!createBanForm.playerNickname.trim()) {
    error.value = 'Укажите ник игрока'
    return
  }
  if (!createBanForm.reason.trim()) {
    error.value = 'Укажите причину бана'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const durationMs = getBanDurationMs()

    const { error: fetchError } = await useApiFetch('banlist', {
      method: 'POST',
      body: {
        target: createBanForm.playerNickname.trim(),
        reason: createBanForm.reason.trim(),
        duration: durationMs,
        ipban: createBanForm.isIpBan ? 1 : 0,
        silent: createBanForm.isSilent ? 1 : 0
      }
    })

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Ошибка при создании бана')
    }

    success.value = 'Бан успешно создан!'
    showCreateBanModal.value = false
    // Сброс формы
    createBanForm.playerNickname = ''
    createBanForm.reason = ''
    createBanForm.duration = 'permanent'
    createBanForm.customDays = 30
    createBanForm.customHours = 0
    createBanForm.customMinutes = 0
    createBanForm.isIpBan = false
    createBanForm.isSilent = false
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при создании бана'
    console.error('Ошибка создания бана:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Снятие бана ───── */
async function removeBan() {
  if (!removeBanForm.banId) return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const { error: fetchError } = await useApiFetch(`/banlist/${removeBanForm.banId}`, {
      method: 'DELETE',
      body: {
        reason: removeBanForm.reason || 'Снят через веб-интерфейс'
      }
    })

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Не удалось снять бан')
    }

    success.value = 'Бан успешно снят!'
    showRemoveBanModal.value = false
    emit('banRemoved', removeBanForm.banId)
    // Сброс формы
    removeBanForm.banId = null
    removeBanForm.banNickname = ''
    removeBanForm.reason = ''
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при снятии бана'
    console.error('Ошибка снятия бана:', e)
  } finally {
    loading.value = false
  }
}

/* ───── Открытие модального окна для снятия бана из таблицы ───── */
function openRemoveBanModal(banId: number, banNickname: string) {
  removeBanForm.banId = banId
  removeBanForm.banNickname = banNickname
  removeBanForm.reason = ''
  showRemoveBanModal.value = true
}

/* ───── Expose для использования из родительского компонента ───── */
defineExpose({
  openRemoveBanModal
})

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

      <!-- Кнопки -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
            @click="showCreateBanModal = true"
            :disabled="loading"
            class="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition px-6 py-3 rounded-md text-white font-bold flex items-center gap-2"
        >
          <Icon name="solar:shield-warning-bold-duotone" class="w-5 h-5" />
          <span>Создать бан</span>
        </button>

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

    <!-- ======================================= -->
    <!-- МОДАЛЬНОЕ ОКНО СОЗДАНИЯ БАНА ========= -->
    <!-- ======================================= -->
    <Teleport to="body">
      <Transition name="fade">
        <div
            v-if="showCreateBanModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            @click.self="showCreateBanModal = false"
        >
          <div class="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-700 mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center sticky top-0 bg-gray-900/90 pb-2">
              <h2 class="text-xl font-bold text-red-500">Создать бан</h2>
              <button @click="showCreateBanModal = false" class="text-gray-400 hover:text-white transition">
                <Icon name="mdi:close" class="w-6 h-6" />
              </button>
            </div>

            <!-- Ник игрока -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Ник игрока <span class="text-red-500">*</span></label>
              <input
                  v-model="createBanForm.playerNickname"
                  type="text"
                  placeholder="Например: Steve"
                  class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition text-sm text-white placeholder-gray-500"
              />
            </div>

            <!-- Причина бана -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Причина бана <span class="text-red-500">*</span></label>
              <textarea
                  v-model="createBanForm.reason"
                  placeholder="Укажите причину бана..."
                  class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition resize-none text-sm text-white placeholder-gray-500"
                  rows="3"
              ></textarea>
            </div>

            <!-- Длительность бана -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Длительность</label>
              <div class="space-y-3">
                <div class="flex gap-2">
                  <button
                      @click="createBanForm.duration = 'permanent'"
                      :class="[
                        'flex-1 py-2 px-3 rounded-md font-bold text-sm transition',
                        createBanForm.duration === 'permanent'
                          ? 'bg-red-500 text-black'
                          : 'bg-gray-800 hover:bg-gray-700 text-white'
                      ]"
                  >
                    Вечный
                  </button>
                  <button
                      @click="createBanForm.duration = 'custom'"
                      :class="[
                        'flex-1 py-2 px-3 rounded-md font-bold text-sm transition',
                        createBanForm.duration === 'custom'
                          ? 'bg-red-500 text-black'
                          : 'bg-gray-800 hover:bg-gray-700 text-white'
                      ]"
                  >
                    Временный
                  </button>
                </div>

                <!-- Пользовательская длительность -->
                <div v-if="createBanForm.duration === 'custom'" class="space-y-2">
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <label class="text-xs text-gray-500">Дни</label>
                      <input
                          v-model.number="createBanForm.customDays"
                          type="number"
                          min="0"
                          class="w-full bg-gray-800/70 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 transition text-sm text-white"
                      />
                    </div>
                    <div class="flex-1">
                      <label class="text-xs text-gray-500">Часы</label>
                      <input
                          v-model.number="createBanForm.customHours"
                          type="number"
                          min="0"
                          max="23"
                          class="w-full bg-gray-800/70 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 transition text-sm text-white"
                      />
                    </div>
                    <div class="flex-1">
                      <label class="text-xs text-gray-500">Минуты</label>
                      <input
                          v-model.number="createBanForm.customMinutes"
                          type="number"
                          min="0"
                          max="59"
                          class="w-full bg-gray-800/70 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 transition text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Тип бана -->
            <div class="space-y-2">
              <label class="block text-sm text-gray-400">Тип бана</label>
              <div class="space-y-2">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                      v-model="createBanForm.isIpBan"
                      type="checkbox"
                      class="w-4 h-4 rounded"
                  />
                  <span class="text-sm text-gray-300">IP Ban</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                      v-model="createBanForm.isSilent"
                      type="checkbox"
                      class="w-4 h-4 rounded"
                  />
                  <span class="text-sm text-gray-300">Скрытый бан</span>
                </label>
              </div>
            </div>

            <!-- Кнопки -->
            <div class="flex gap-3 pt-4 sticky bottom-0 bg-gray-900/90">
              <button
                  @click="showCreateBanModal = false"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-md text-white font-bold"
              >
                Отмена
              </button>
              <button
                  @click="createBan"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-md text-white font-bold flex items-center justify-center gap-2"
              >
                <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ loading ? 'Создание...' : 'Создать' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================= -->
    <!-- МОДАЛЬНОЕ ОКНО СНЯТИЯ БАНА ========== -->
    <!-- ======================================= -->
    <Teleport to="body">
      <Transition name="fade">
        <div
            v-if="showRemoveBanModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            @click.self="showRemoveBanModal = false"
        >
          <div class="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-700 mx-4">
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-bold text-red-500">Снять бан</h2>
              <button @click="showRemoveBanModal = false" class="text-gray-400 hover:text-white transition">
                <Icon name="mdi:close" class="w-6 h-6" />
              </button>
            </div>

            <p class="text-gray-300">
              Вы уверены, что хотите снять бан игроку <span class="font-bold text-red-400">{{ removeBanForm.banNickname }}</span>?
            </p>

            <div>
              <label class="block text-sm text-gray-400 mb-2">Причина снятия (опционально)</label>
              <textarea
                  v-model="removeBanForm.reason"
                  placeholder="Укажите причину снятия бана..."
                  class="w-full bg-gray-800/70 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition resize-none"
                  rows="3"
              ></textarea>
            </div>

            <div class="flex justify-end gap-4 pt-4">
              <button
                  @click="showRemoveBanModal = false"
                  :disabled="loading"
                  class="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition py-2 px-6 rounded-md font-bold text-white"
              >
                Отмена
              </button>
              <button
                  @click="removeBan"
                  :disabled="loading"
                  class="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition py-2 px-6 rounded-md font-bold text-black flex items-center gap-2"
              >
                <span v-if="loading" class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <span>{{ loading ? 'Снятие...' : 'Снять бан' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================= -->
    <!-- МОДАЛЬНОЕ ОКНО ОЧИСТКИ СКИНОВ ====== -->
    <!-- ======================================= -->
    <Teleport to="body">
      <Transition name="fade">
        <div
            v-if="showCleanSkinsModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            @click.self="showCleanSkinsModal = false"
        >
          <div class="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-700 mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center sticky top-0 bg-gray-900/90 pb-2">
              <h2 class="text-xl font-bold text-purple-500">Очистить скины</h2>
              <button @click="showCleanSkinsModal = false" class="text-gray-400 hover:text-white transition">
                <Icon name="mdi:close" class="w-6 h-6" />
              </button>
            </div>

            <!-- Информация -->
            <p class="text-sm text-gray-400">
              Выберите минимальный срок бана для очистки скинов. Скины всех игроков с баном на этот срок или дольше будут удалены.
            </p>

            <!-- Режим выбора -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Режим выбора</label>
              <div class="flex gap-2">
                <button
                    @click="cleanSkinsForm.durationMode = 'preset'"
                    :class="[
                      'flex-1 py-2 px-3 rounded-md font-bold text-sm transition',
                      cleanSkinsForm.durationMode === 'preset'
                        ? 'bg-purple-500 text-black'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    ]"
                >
                  Предусмотренное
                </button>
                <button
                    @click="cleanSkinsForm.durationMode = 'custom'"
                    :class="[
                      'flex-1 py-2 px-3 rounded-md font-bold text-sm transition',
                      cleanSkinsForm.durationMode === 'custom'
                        ? 'bg-purple-500 text-black'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    ]"
                >
                  Пользовательское
                </button>
              </div>
            </div>

            <!-- Выбор срока -->
            <div v-if="cleanSkinsForm.durationMode === 'preset'">
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

            <!-- Пользовательская длительность -->
            <div v-else class="space-y-2">
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="text-xs text-gray-500 block mb-1">Дни</label>
                  <input
                      v-model.number="cleanSkinsForm.customDays"
                      type="number"
                      min="0"
                      class="w-full bg-gray-800/70 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 transition text-sm text-white"
                  />
                </div>
                <div class="flex-1">
                  <label class="text-xs text-gray-500 block mb-1">Часы</label>
                  <input
                      v-model.number="cleanSkinsForm.customHours"
                      type="number"
                      min="0"
                      max="23"
                      class="w-full bg-gray-800/70 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 transition text-sm text-white"
                  />
                </div>
                <div class="flex-1">
                  <label class="text-xs text-gray-500 block mb-1">Минуты</label>
                  <input
                      v-model.number="cleanSkinsForm.customMinutes"
                      type="number"
                      min="0"
                      max="59"
                      class="w-full bg-gray-800/70 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 transition text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <!-- Предупреждение -->
            <div class="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-yellow-300 text-sm">
              <div class="flex gap-2">
                <Icon name="solar:info-circle-bold" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Это действие необратимо. Скины будут окончательно удалены.</span>
              </div>
            </div>

            <!-- Кнопки -->
            <div class="flex gap-3 pt-4 sticky bottom-0 bg-gray-900/90">
              <button
                  @click="showCleanSkinsModal = false"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-md text-white font-bold"
              >
                Отмена
              </button>
              <button
                  @click="cleanSkins"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-md text-white font-bold flex items-center justify-center gap-2"
              >
                <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ loading ? 'Обработка...' : 'Очистить' }}</span>
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

