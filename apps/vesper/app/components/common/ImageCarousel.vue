<script setup lang="ts">
/**
 * ImageCarousel - Carousel/slider for multiple images
 * Supports auto-advance, navigation, and touch gestures
 */

const props = withDefaults(defineProps<{
    images: string[];
    autoPlay?: boolean;
    interval?: number;
    showDots?: boolean;
    showArrows?: boolean;
    captions?: string[];
}>(), {
    autoPlay: false,
    interval: 5000,
    showDots: true,
    showArrows: true,
    captions: () => []
});

const emit = defineEmits<{
    (e: 'click', index: number): void;
}>();

const currentIndex = ref(0);
const isHovered = ref(false);
let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

const next = (): void => {
    if (currentIndex.value < props.images.length - 1) {
        currentIndex.value++;
    } else {
        currentIndex.value = 0;
    }
};

const prev = (): void => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    } else {
        currentIndex.value = props.images.length - 1;
    }
};

const goTo = (index: number): void => {
    currentIndex.value = index;
};

// Auto-play logic
const startAutoPlay = (): void => {
    if (props.autoPlay && !autoPlayTimer) {
        autoPlayTimer = setInterval(next, props.interval);
    }
};

const stopAutoPlay = (): void => {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }
};

watch(() => props.autoPlay, (enabled: boolean) => {
    if (enabled) {
        startAutoPlay();
    } else {
        stopAutoPlay();
    }
});

watch(isHovered, (hovered: boolean) => {
    if (hovered) {
        stopAutoPlay();
    } else if (props.autoPlay) {
        startAutoPlay();
    }
});

onMounted(() => {
    if (props.autoPlay) {
        startAutoPlay();
    }
});

onUnmounted(() => {
    stopAutoPlay();
});

// Touch/swipe support
const touchStartX = ref(0);
const touchEndX = ref(0);

const handleTouchStart = (e: TouchEvent): void => {
    touchStartX.value = e.touches[0]?.clientX ?? 0;
};

const handleTouchEnd = (e: TouchEvent): void => {
    touchEndX.value = e.changedTouches[0]?.clientX ?? 0;
    const diff = touchStartX.value - touchEndX.value;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
            next();
        } else {
            prev();
        }
    }
};
</script>

<template>
    <div 
        class="relative overflow-hidden rounded-xl group"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
    >
        <!-- Images track -->
        <div 
            class="flex transition-transform duration-500 ease-out"
            :style="{ transform: `translateX(-${Number(currentIndex) * 100}%)` }"
        >
            <div 
                v-for="(img, idx) in images" 
                :key="idx"
                class="min-w-full aspect-video cursor-pointer"
                @click="$emit('click', idx)"
            >
                <img 
                    :src="img" 
                    :alt="`Slide ${Number(idx) + 1}`"
                    class="w-full h-full object-cover"
                    loading="lazy"
                />
                <!-- Caption Overlay -->
                <div 
                    v-if="captions && captions[idx]" 
                    class="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-3 text-center transition-opacity duration-300"
                    :class="showDots ? 'pb-8' : ''"
                >
                    <p class="text-white text-sm md:text-base font-medium">{{ captions[idx] }}</p>
                </div>
            </div>
        </div>

        <!-- Navigation arrows -->
        <template v-if="showArrows && images.length > 1">
            <button 
                @click.stop="prev"
                class="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Icon name="ph:caret-left-bold" size="20" />
            </button>
            <button 
                @click.stop="next"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Icon name="ph:caret-right-bold" size="20" />
            </button>
        </template>

        <!-- Dots -->
        <div v-if="showDots && images.length > 1" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            <button 
                v-for="(_, idx) in images" 
                :key="idx"
                @click.stop="goTo(idx)"
                class="w-2 h-2 rounded-full transition-all"
                :class="idx === currentIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/70'"
            />
        </div>
    </div>
</template>
