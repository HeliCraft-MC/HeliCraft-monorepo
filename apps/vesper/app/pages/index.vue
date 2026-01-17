<template>
  <div class="relative min-h-screen bg-black text-white flex flex-col">
    <!-- Фоновая карусель с двумя компонентами для плавного кроссфейда -->
    <NuxtImg
        v-if="imageSrcA"
        :key="imageSrcA"
        :src="imageSrcA"
        @load="onImageLoaded('A')"
        class="absolute inset-0 object-cover w-full h-full transition-opacity duration-1000 ease-in-out"
        :class="isAVisible ? 'opacity-100' : 'opacity-0'"
        format="avif,webp"
        quality="60"
        loading="eager"
        priority
        placeholder
    />
    <NuxtImg
        v-if="imageSrcB"
        :key="imageSrcB"
        :src="imageSrcB"
        @load="onImageLoaded('B')"
        class="absolute inset-0 object-cover w-full h-full transition-opacity duration-1000 ease-in-out"
        :class="!isAVisible ? 'opacity-100' : 'opacity-0'"
        format="avif,webp"
        quality="60"
        loading="eager"
        priority
        placeholder
    />

    <div class="absolute inset-0 bg-black/70"></div>

    <!-- Кредит за скриншоты -->
    <p
        class="absolute bottom-2 right-4 text-xs text-gray-300/80 backdrop-blur-sm px-2 rounded"
    >
      Скриншоты игроков HeliCraft
    </p>

    <!-- Основной контент -->
    <main
        class="relative flex-grow flex flex-col items-center justify-center px-6 py-16 pt-24 md:pt-28"
    >
      <h1 class="pr2p font-extrabold text-red-500 mb-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
        HeliCraft
      </h1>

      <p class="text-lg sm:text-xl text-gray-300 mb-6">
        Ванильный сервер на версии 1.21.6
      </p>

      <ServerAddressCopy
        :server-address="serverAddress"
        class="space-x-3"
      />

      <PlayerCountText
          :server-ip="serverAddress"
          class="text-red-400 text-base sm:text-lg mb-8"
      />

      <div class="max-w-xl text-center text-gray-400 mb-8 px-4">
        <p>
          HeliCraft — уникальный ванильный Minecraft-сервер с системой государств.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import PlayerCountText from "../components/ui/PlayerCountText.vue";
import ServerAddressCopy from "../components/ui/ServerAddressCopy.vue";

definePageMeta({ auth: false });

const serverAddress = 'mc.helicraft.ru';

const { data: images } = await useFetch<string[]>('/api/intro-images');

// --- Финальная, надежная логика для карусели ---

const imageSrcA = ref<string | null>(null);
const imageSrcB = ref<string | null>(null);
const isAVisible = ref(false);

// Ref для отслеживания ID последнего загруженного изображения
const lastLoaded = ref<'A' | 'B' | null>(null);
let stop = false;

// Обработчик просто записывает, КАКОЙ компонент загрузился
function onImageLoaded(id: 'A' | 'B') {
  //console.log(`%c[LOADED] Component '${id}' finished loading.`, 'color: green');
  lastLoaded.value = id;
}

// Хелпер, который ждет загрузки изображения с конкретным ID
function waitForLoad(idToWaitFor: 'A' | 'B'): Promise<void> {
  //console.log(`[WAIT] Waiting for component '${idToWaitFor}' to load.`);
  return new Promise(resolve => {
    const unwatch = watch(lastLoaded, (newlyLoadedId) => {
      if (newlyLoadedId === idToWaitFor) {
        //console.log(`[WATCH] Confirmed: '${idToWaitFor}' has loaded. Resolving promise.`);
        unwatch();
        resolve();
      }
    });
  });
}

// Хелпер для получения случайного изображения, не повторяющего текущее
function getNextImage(currentSrc: string | null): string | null {
  if (!images.value || images.value.length === 0) return null;
  if (images.value.length === 1) return images.value[0];

  let next;
  do {
    next = images.value[Math.floor(Math.random() * images.value.length)];
  } while (next === currentSrc);
  return next;
}

async function cycle() {
  console.log('%c[CYCLE] Cycle started.', 'font-weight: bold; color: blue;');
  if (!images.value || images.value.length === 0) {
    console.error('[CYCLE] No images found. Exiting.');
    return;
  }

  // 1. Загружаем начальное изображение в компонент A
  lastLoaded.value = null;
  const initialSrc = getNextImage(null);
  //console.log(`[CYCLE] 1. Assigning initial image to A: ${initialSrc}`);
  imageSrcA.value = initialSrc;
  await waitForLoad('A');
  if (stop) return;
  //console.log('[CYCLE] 1a. Initial image A has loaded.');

  // 2. Делаем компонент A видимым
  isAVisible.value = true;
  //console.log('[CYCLE] 2. Made component A visible.');

  // 3. Запускаем бесконечный цикл смены
  //console.log('%c[CYCLE] 3. Starting main loop...', 'font-weight: bold; color: blue;');
  while (!stop) {
    // 3a. Ждем 5 секунд
    //console.log('[CYCLE] 3a. Waiting for 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    if (stop) return;
    //console.log('[CYCLE] 3a. ...5 seconds passed.');

    // 3б. Определяем следующий URL
    const currentSrc = isAVisible.value ? imageSrcA.value : imageSrcB.value;
    const nextSrc = getNextImage(currentSrc);
    //console.log(`[CYCLE] 3b. Next src: ${nextSrc}`);

    lastLoaded.value = null;

    // 3в. Загружаем следующее изображение в невидимый компонент и ждем его
    if (isAVisible.value) {
      // A видимый, значит загружаем в B
      //console.log('[CYCLE] 3c. A is visible. Loading next image into B.');
      imageSrcB.value = nextSrc;
      await waitForLoad('B');
    } else {
      // B видимый, значит загружаем в A
      //console.log('[CYCLE] 3c. B is visible. Loading next image into A.');
      imageSrcA.value = nextSrc;
      await waitForLoad('A');
    }

    if (stop) {
      //console.log('%c[CYCLE] Stop signal received, exiting loop.', 'color: red');
      return;
    }

    // 3г. Переключаем видимость, чтобы показать новое изображение
    //console.log(`%c[CYCLE] 3d. Toggling visibility. 'isAVisible' will become ${!isAVisible.value}`, 'color: purple');
    isAVisible.value = !isAVisible.value;
    //console.log('--------------------------------');
  }
}

onMounted(cycle);

onUnmounted(() => {
  stop = true;
});
</script>

<style scoped>
/* Дополнительные стили не требуются, так как все управляется классами Tailwind */
</style>
