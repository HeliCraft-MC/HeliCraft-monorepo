<!-- components/BannerEditorModal.vue -->
<script setup lang="ts">
/**
 * Улучшенный редактор флагов для Minecraft.
 * Фон вынесен в отдельную сущность и не учитывается в лимите слоев.
 *
 * Алгоритм работы:
 * 1. Загружается спрайт-лист с узорами.
 * 2. Фон отображается как отдельный, первый элемент в списке, его можно выбрать и изменить цвет.
 * 3. Пользователь может выбрать слой узора, кликнув по нему в списке.
 * 4. Слои узоров можно менять местами, удалять и изменять их цвет.
 * 5. Финальный флаг перерисовывается: сначала фон, затем узоры поверх него.
 *
 * Copyright (c) 2025, ms0ur (original author)
 * Refactored and improved by Gemini
 */
import { ref, watch, onMounted, nextTick, defineEmits } from 'vue'

export interface BannerLayer {
  /** ID узора, например, 'pattern_0' */
  id: string
  /** Цвет в формате web, например, '#RRGGBB' */
  color: string
}

/* ───── PROPS & EMITS ───── */
const props = defineProps<{
  open: boolean;
  modelValue: BannerLayer[];
}>()
const emit  = defineEmits(['update:modelValue', 'close'])

/* ───── МЕТАДАННЫЕ СПРАЙТА И РАЗРЕШЕНИЕ ───── */
const SPRITE_URL = '/banner.webp'
const CELL_W = 20
const CELL_H = 40
const GRID_COLS = 44
const PATTERN_COUNT = 44
const GAP = 2
const EXPORT_SCALE = 50; // <--- FIX: Множитель для высокого разрешения

const patterns = Array.from({ length: PATTERN_COUNT }, (_, i) => `pattern_${i}`)
type PatternId = typeof patterns[number]

/* ───── РЕАКТИВНОЕ СОСТОЯНИЕ ───── */
const backgroundLayer = ref<BannerLayer>({ id: 'pattern_0', color: '#FFFFFF' });
const patternLayers = ref<BannerLayer[]>([]);
const selectedIndex = ref<number>(-1);

const palette = [
  '#FFFFFF', '#9D9D97', '#474F52', '#1D1D21', '#B02E26', '#F9801D',
  '#FED83D', '#80C71F', '#5E7C16', '#3AB3DA', '#169C9C', '#3C44AA',
  '#8932B8', '#C74EBD', '#F38BAA', '#835432'
]
const colorSel = ref(palette[0])

/* ───── REFS & ASSETS ───── */
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const sprite = new Image()
let isSpriteLoaded = false
let tempCanvas: HTMLCanvasElement | null = null;
if (typeof window !== 'undefined') {
  tempCanvas = document.createElement('canvas');
  tempCanvas.width = CELL_W * EXPORT_SCALE;
  tempCanvas.height = CELL_H * EXPORT_SCALE;
}

/* ───── ЛОГИКА ОТРИСОВКИ ───── */

function drawFinalBanner() {
  if (!previewCanvasRef.value || !isSpriteLoaded || !tempCanvas) return;
  const ctx = previewCanvasRef.value.getContext('2d');
  if (!ctx) return;

  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  // Отключаем сглаживание для пиксельного вида
  ctx.imageSmoothingEnabled = false;
  tempCtx.imageSmoothingEnabled = false;

  const w = CELL_W * EXPORT_SCALE;
  const h = CELL_H * EXPORT_SCALE;

  // 1. Отрисовываем фон
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = backgroundLayer.value.color;
  ctx.fillRect(0, 0, w, h);

  // 2. Последовательно наносим узоры
  for (const layer of patternLayers.value) {
    const index = patterns.indexOf(layer.id);
    if (index === -1) continue;

    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const sx = col * (CELL_W + GAP);
    const sy = row * (CELL_H + GAP);

    tempCtx.clearRect(0, 0, w, h);
    tempCtx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, w, h);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = layer.color;
    tempCtx.fillRect(0, 0, w, h);
    tempCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(tempCanvas, 0, 0);
  }
}

// Вспомогательные функции отрисовки превью остаются без изменений,
// так как они рисуют на маленьких холстах в интерфейсе.

function drawPatternPreviews() {
  if (!isSpriteLoaded) return;
  patterns.forEach((id, index) => {
    const canvas = document.querySelector(`canvas[data-pattern-id="${id}"]`) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const sx = col * (CELL_W + GAP);
    const sy = row * (CELL_H + GAP);
    ctx.clearRect(0, 0, CELL_W, CELL_H);
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 0, CELL_W, CELL_H);
    ctx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
  });
}

function drawLayerListPreviews() {
  if (!isSpriteLoaded || !tempCanvas) return;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  tempCtx.imageSmoothingEnabled = false;

  patternLayers.value.forEach((layer, index) => {
    const canvas = document.querySelector(`canvas[data-layer-index="${index}"]`) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const patternIndex = patterns.indexOf(layer.id);
    if (patternIndex === -1) return;

    // Для отрисовки превью слоя используем временный холст низкого разрешения, чтобы не создавать новый
    const smallTempCanvas = document.createElement('canvas');
    smallTempCanvas.width = CELL_W;
    smallTempCanvas.height = CELL_H;
    const smallTempCtx = smallTempCanvas.getContext('2d')!;
    smallTempCtx.imageSmoothingEnabled = false;

    const col = patternIndex % GRID_COLS;
    const row = Math.floor(patternIndex / GRID_COLS);
    const sx = col * (CELL_W + GAP);
    const sy = row * (CELL_H + GAP);

    smallTempCtx.clearRect(0, 0, CELL_W, CELL_H);
    smallTempCtx.drawImage(sprite, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
    smallTempCtx.globalCompositeOperation = 'source-in';
    smallTempCtx.fillStyle = layer.color;
    smallTempCtx.fillRect(0, 0, CELL_W, CELL_H);
    smallTempCtx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, CELL_W, CELL_H);
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, CELL_W, CELL_H);
    ctx.drawImage(smallTempCanvas, 0, 0);
  });
}

function drawAll() {
  if (!isSpriteLoaded || !props.open) return;
  nextTick(() => {
    drawFinalBanner();
    drawPatternPreviews();
    drawLayerListPreviews();
  });
}

/* ───── МЕТОДЫ-ДЕЙСТВИЯ (без изменений) ───── */

function selectLayer(index: number) {
  if (selectedIndex.value === index) {
    // @ts-ignore
    selectedIndex.value = null;
  } else {
    selectedIndex.value = index;
    if (index === -1) {
      colorSel.value = backgroundLayer.value.color;
    } else {
      colorSel.value = patternLayers.value[index].color;
    }
  }
}

function applyColor(color: string) {
  colorSel.value = color;
  if (selectedIndex.value === -1) {
    backgroundLayer.value.color = color;
  } else if (selectedIndex.value !== null && patternLayers.value[selectedIndex.value]) {
    patternLayers.value[selectedIndex.value].color = color;
  }
}

function addLayer(id: PatternId) {
  if (patternLayers.value.length >= 16) return;
  patternLayers.value.push({ id, color: colorSel.value });
  selectLayer(patternLayers.value.length - 1);
}

function removeLayer(index: number) {
  patternLayers.value.splice(index, 1);
  if (selectedIndex.value === index) {
    selectLayer(-1);
  } else if (selectedIndex.value !== null && selectedIndex.value > index) {
    selectedIndex.value--;
  }
}

function moveLayer(index: number, direction: 'up' | 'down') {
  if (direction === 'up' && index === 0) return;
  if (direction === 'down' && index === patternLayers.value.length - 1) return;

  const newIndex = direction === 'up' ? index - 1 : index + 1;
  [patternLayers.value[index], patternLayers.value[newIndex]] = [patternLayers.value[newIndex], patternLayers.value[index]];

  if (selectedIndex.value === index) {
    selectedIndex.value = newIndex;
  } else if (selectedIndex.value === newIndex) {
    selectedIndex.value = index;
  }
}

function clearAllLayers() {
  backgroundLayer.value = { id: 'pattern_0', color: '#FFFFFF' };
  patternLayers.value = [];
  selectLayer(-1);
}

function closeAndConfirm() {
  // Экспортируем изображение высокого качества
  const dataUrl = previewCanvasRef.value?.toDataURL('image/png');
  const finalLayers = [backgroundLayer.value, ...patternLayers.value];
  emit('update:modelValue', finalLayers);
  emit('close', { dataUrl });
}

/* ───── WATCHERS & LIFECYCLE ───── */
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    const sourceLayers = JSON.parse(JSON.stringify(props.modelValue));
    if (sourceLayers.length > 0) {
      backgroundLayer.value = sourceLayers[0];
      patternLayers.value = sourceLayers.slice(1);
    } else {
      backgroundLayer.value = { id: 'pattern_0', color: '#FFFFFF' };
      patternLayers.value = [];
    }
    selectLayer(-1);
    if (isSpriteLoaded) drawAll();
  }
});

watch([backgroundLayer, patternLayers], () => {
  drawFinalBanner();
  nextTick(drawLayerListPreviews);
}, { deep: true });

onMounted(() => {
  sprite.onload = () => {
    isSpriteLoaded = true;
    if (props.open) drawAll();
  };
  sprite.src = SPRITE_URL;
  if (sprite.complete) { // на случай если изображение уже в кэше
    isSpriteLoaded = true;
    if (props.open) drawAll();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">

        <div class="bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
          <header class="p-5 border-b border-gray-700/50">
            <h2 class="text-2xl font-bold text-center">Редактор флага</h2>
          </header>

          <main class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto">
            <!-- Предпросмотр -->
            <section class="bg-gray-800 rounded-lg flex flex-col items-center justify-center p-6 min-h-[400px]">
              <h3 class="text-lg font-semibold text-gray-300 mb-4">Предпросмотр</h3>
              <div class="p-2 bg-grid-pattern rounded-md w-full flex-grow flex items-center justify-center">
                <!-- FIX: Устанавливаем реальное разрешение и убираем CSS-трансформацию -->
                <canvas ref="previewCanvasRef"
                        :width="CELL_W * EXPORT_SCALE"
                        :height="CELL_H * EXPORT_SCALE"
                        class="border border-gray-600 rounded-sm"
                        style="width: 200px; height: 400px;"></canvas>
              </div>
            </section>

            <!-- Слои -->
            <section class="flex flex-col gap-3 min-h-[400px]">
              <h3 class="text-lg font-semibold text-gray-300">Слои ({{ patternLayers.length }}/16)</h3>
              <div class="space-y-2 bg-gray-800 p-4 rounded-lg flex-1 overflow-y-auto">
                <!-- Слой фона -->
                <div @click="selectLayer(-1)"
                     class="flex items-center gap-3 p-2 rounded-md transition-all border-2 cursor-pointer"
                     :class="selectedIndex === -1 ? 'bg-red-600/30 border-red-500' : 'bg-gray-700/50 border-transparent hover:border-gray-500'">
                  <div class="w-10 h-20 flex-shrink-0"></div> <!-- Placeholder for alignment -->
                  <div class="flex-grow flex items-center gap-4">
                    <span class="font-bold text-gray-300">Фон</span>
                    <span class="w-6 h-6 rounded-sm border border-gray-500 inline-block" :style="{ background: backgroundLayer.color }" />
                  </div>
                </div>

                <!-- Слои узоров -->
                <div v-for="(layer, i) in patternLayers" :key="i"
                     @click="selectLayer(i)"
                     class="flex items-center gap-3 p-2 rounded-md transition-all border-2 cursor-pointer"
                     :class="selectedIndex === i ? 'bg-red-600/30 border-red-500' : 'bg-gray-700/50 border-transparent hover:border-gray-500'">

                  <div class="flex flex-col gap-1">
                    <button @click.stop="moveLayer(i, 'up')" :disabled="i === 0" class="disabled:opacity-20 hover:text-red-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
                    </button>
                    <button @click.stop="moveLayer(i, 'down')" :disabled="i === patternLayers.length - 1" class="disabled:opacity-20 hover:text-red-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                    </button>
                  </div>

                  <div class="w-10 h-20 bg-gray-800 rounded-sm flex items-center justify-center border border-gray-600 flex-shrink-0">
                    <canvas :data-layer-index="i" :width="CELL_W" :height="CELL_H" class="rounded-sm"></canvas>
                  </div>

                  <div class="flex-grow text-center">
                    <span class="w-6 h-6 rounded-sm border border-gray-500 inline-block" :style="{ background: layer.color }" />
                  </div>

                  <button @click.stop="removeLayer(i)" class="ml-auto text-gray-400 hover:text-red-400 transition-colors text-2xl font-bold flex-shrink-0">
                    ×
                  </button>
                </div>
              </div>
            </section>

            <!-- Палитра и узоры -->
            <section class="flex flex-col gap-8 min-h-[400px]">
              <div>
                <h3 class="text-lg font-semibold text-gray-300 mb-3">Цвет слоя</h3>
                <div class="grid grid-cols-8 gap-2">
                  <button v-for="color in palette" :key="color" @click="applyColor(color)" :style="{ backgroundColor: color }"
                          :class="['w-full aspect-square rounded-md border-2 transition-all', colorSel === color ? 'border-red-500 scale-110' : 'border-transparent hover:border-gray-500']" />
                </div>
              </div>

              <div class="flex-1 flex flex-col">
                <h3 class="text-lg font-semibold text-gray-300 mb-3">Добавить узор</h3>
                <div class="grid grid-cols-6 gap-3 overflow-y-auto pr-2 flex-1">
                  <button v-for="id in patterns.filter(p => p !== 'pattern_0')" :key="id" @click="addLayer(id)"
                          class="w-full aspect-[1/2] bg-gray-800 rounded-md border border-gray-700 hover:border-red-500 hover:scale-105 transition-all flex items-center justify-center p-1">
                    <canvas :data-pattern-id="id" :width="CELL_W" :height="CELL_H" class="rounded-sm"></canvas>
                  </button>
                </div>
              </div>
            </section>
          </main>

          <!-- Футер -->
          <footer class="flex gap-4 p-5 border-t border-gray-700/50">
            <button @click="clearAllLayers" class="flex-1 bg-gray-700 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors">Сбросить</button>
            <button @click="$emit('close')" class="flex-1 bg-gray-600 py-3 rounded-lg font-bold hover:bg-gray-500 transition-colors">Отмена</button>
            <button @click="closeAndConfirm" class="flex-1 bg-red-600 py-3 rounded-lg font-bold text-white hover:bg-red-700 transition-colors">Готово</button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.bg-grid-pattern {
  background-color: #374151;
  background-image:
      linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 20px 20px;
}
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #1f2937; border-radius: 10px; }
::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #6b7280; }
</style>
