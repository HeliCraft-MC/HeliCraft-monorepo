<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

definePageMeta({ auth: false })

type OSType = 'windows' | 'macos' | 'linux' | 'unknown'

const detectedOS = ref<OSType>('unknown')
const selectedOS = ref<OSType>('unknown')

const selectedOsInfo = computed(() => {
  const os = selectedOS.value
  return getOsInfo(os);
})

function getOsInfo(osName: string) {
  switch (osName) {
    case 'windows':
      return {
        name: 'Windows',
        file: 'HeliLauncher.exe',
        url: 'https://launcher.helicraft.ru/HeliLauncher.exe',
        description: 'Для Windows (7+)'
      }
    case 'macos':
      return {
        name: 'macOS',
        file: 'HeliLauncher.jar',
        url: 'https://launcher.helicraft.ru/HeliLauncher.jar',
        description: 'Для macOS'
      }
    case 'linux':
      return {
        name: 'Linux',
        file: 'HeliLauncher.jar',
        url: 'https://launcher.helicraft.ru/HeliLauncher.jar',
        description: 'Для Linux'
      }
    default:
      return {
        name: 'Выберите ОС',
        file: '',
        url: '',
        description: 'Не удалось определить операционную систему'
      }
  }
}

function detectOS(): OSType {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.indexOf('win') > -1) return 'windows'
  if (userAgent.indexOf('mac') > -1) return 'macos'
  if (userAgent.indexOf('linux') > -1) return 'linux'

  return 'unknown'
}

function downloadLauncher() {
  const url = selectedOsInfo.value.url
  if (url) {
    // Создаем скрытую ссылку и кликаем на неё
    const link = document.createElement('a')
    link.href = url
    link.download = selectedOsInfo.value.file
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

onMounted(() => {
  const detected = detectOS()
  detectedOS.value = detected
  selectedOS.value = detected
})
</script>

<template>
  <div class="relative min-h-screen bg-black text-white flex flex-col">
    <!-- Фоновый градиент -->
    <div class="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black"></div>

    <!-- Основной контент -->
    <main class="relative flex-grow flex flex-col items-center justify-center px-4 py-20 pt-24 md:pt-28">
      <div class="w-full max-w-2xl space-y-12">
        <!-- Заголовок -->
        <div class="text-center space-y-4">
          <h1 class="pr2p font-extrabold text-red-500 text-4xl sm:text-5xl md:text-6xl">
            Скачать лаунчер
          </h1>
          <p class="text-lg sm:text-xl text-gray-300">
            Наш лаунчер для HeliCraft
          </p>
        </div>

        <!-- Выбор ОС -->
        <div class="space-y-4">
          <p class="text-gray-400 text-center mb-6">Выберите вашу операционную систему:</p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Windows -->
            <label
                :class="[
                  'p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer block',
                  selectedOS === 'windows'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                ]"
            >
              <input
                  type="radio"
                  v-model="selectedOS"
                  value="windows"
                  class="hidden"
              />
              <Icon name="solar:monitor-bold-duotone" class="w-8 h-8 mb-2" />
              <div class="font-bold text-white">Windows</div>
              <div class="text-xs text-gray-400">7 и выше</div>
            </label>

            <!-- macOS -->
            <label
                :class="[
                  'p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer block',
                  selectedOS === 'macos'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                ]"
            >
              <input
                  type="radio"
                  v-model="selectedOS"
                  value="macos"
                  class="hidden"
              />
              <Icon name="solar:laptop-bold-duotone" class="w-8 h-8 mb-2" />
              <div class="font-bold text-white">macOS</div>
              <div class="text-xs text-gray-400">10.9+</div>
            </label>

            <!-- Linux -->
            <label
                :class="[
                  'p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer block',
                  selectedOS === 'linux'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                ]"
            >
              <input
                  type="radio"
                  v-model="selectedOS"
                  value="linux"
                  class="hidden"
              />
              <Icon name="solar:server-bold-duotone" class="w-8 h-8 mb-2" />
              <div class="font-bold text-white">Linux</div>
              <div class="text-xs text-gray-400">Любая версия</div>
            </label>
          </div>

          <!-- Информация об автоопределении -->
          <div v-if="detectedOS !== 'unknown'" class="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
            <Icon name="solar:magnifer-bold-duotone" class="w-4 h-4 flex-shrink-0" />
            Мы определили: <span class="text-gray-300 font-semibold">{{ getOsInfo(detectedOS).name }}</span>
          </div>
        </div>

        <!-- Информационный блок -->
        <div
            class="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 rounded-lg p-6 space-y-3"
        >
          <h2 class="text-xl font-bold flex items-center gap-2">
            <Icon
              :name="
                selectedOS === 'windows' ? 'solar:monitor-bold-duotone' :
                selectedOS === 'macos' ? 'solar:laptop-bold-duotone' :
                selectedOS === 'linux' ? 'solar:server-bold-duotone' :
                'solar:help-bold-duotone'
              "
              class="w-6 h-6"
            />
            {{ selectedOsInfo.name }}
          </h2>
          <p class="text-gray-300">
            {{ selectedOsInfo.description }}
          </p>
          <p class="text-sm text-gray-400">
            <span class="font-semibold">Файл:</span> {{ selectedOsInfo.file }}
          </p>
        </div>

        <!-- Кнопка скачивания -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
              @click="downloadLauncher"
              :disabled="selectedOS === 'unknown'"
              class="flex-1 sm:flex-initial bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all px-8 py-4 rounded-lg font-bold text-black disabled:text-gray-400 text-lg flex items-center justify-center gap-2"
          >
            <Icon name="solar:download-bold-duotone" class="w-5 h-5" />
            Скачать лаунчер
          </button>
          <a
              :href="selectedOsInfo.url"
              v-if="selectedOsInfo.url"
              class="flex-1 sm:flex-initial bg-gray-700 hover:bg-gray-600 transition-all px-8 py-4 rounded-lg font-semibold text-white text-center flex items-center justify-center gap-2"
              download
          >
            <Icon name="solar:link-bold-duotone" class="w-5 h-5" />
            Прямая ссылка
          </a>
        </div>

        <!-- Информация -->
        <div class="space-y-4 text-gray-400 text-center">
          <p class="text-sm flex items-center justify-center gap-2">
            <Icon name="solar:lightbulb-bold-duotone" class="w-5 h-5 flex-shrink-0" />
            Если лаунчер не запускается автоматически, пожалуйста, нажмите на файл два раза.
          </p>

          <div class="bg-gray-800/30 border border-gray-700 rounded-lg p-4 space-y-2 text-left">
            <p class="font-semibold text-gray-300 flex items-center gap-2">
              <Icon name="solar:info-circle-bold-duotone" class="w-5 h-5 flex-shrink-0" />
              Требования:
            </p>
            <ul class="text-sm space-y-1 ml-6">
              <li class="flex items-center gap-2">
                <Icon name="solar:check-circle-bold-duotone" class="w-4 h-4 flex-shrink-0 text-green-400" />
                Java 8 или выше (для версий на Linux и MacOS)
              </li>
              <li class="flex items-center gap-2">
                <Icon name="solar:check-circle-bold-duotone" class="w-4 h-4 flex-shrink-0 text-green-400" />
                2 ГБ свободного места
              </li>
              <li class="flex items-center gap-2">
                <Icon name="solar:check-circle-bold-duotone" class="w-4 h-4 flex-shrink-0 text-green-400" />
                Стабильное интернет соединение
              </li>
            </ul>
          </div>

          <p class="text-xs">
            <NuxtLink to="/rules" class="underline hover:text-red-400">
              Прочитайте правила сервера
            </NuxtLink>
            перед присоединением
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.pr2p {
  font-family: 'Courier New', monospace;
  letter-spacing: -0.02em;
}

/* Плавный переход при смене ОС */
button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

button:active {
  transform: scale(0.98);
}
</style>

