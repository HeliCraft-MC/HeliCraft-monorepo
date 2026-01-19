<script setup lang="ts">
/**
 * ImageViewer - Full-screen lightbox for viewing images
 * Supports multiple images with navigation
 */

const props = defineProps<{
    images: string[];
    initialIndex?: number;
    isOpen: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

const currentIndex = ref(props.initialIndex || 0);

// Reset index when opening
watch(() => props.isOpen, (open: boolean) => {
    if (open) {
        currentIndex.value = props.initialIndex || 0;
    }
});

const currentImage = computed<string>(() => props.images[currentIndex.value] || '');
const hasMultiple = computed<boolean>(() => props.images.length > 1);

const next = (): void => {
    if (currentIndex.value < props.images.length - 1) {
        currentIndex.value++;
    } else {
        currentIndex.value = 0; // Loop
    }
};

const prev = (): void => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    } else {
        currentIndex.value = props.images.length - 1; // Loop
    }
};

const close = (): void => {
    emit('close');
};

// Keyboard navigation
const handleKeydown = (e: KeyboardEvent): void => {
    if (!props.isOpen) return;
    
    switch (e.key) {
        case 'Escape':
            close();
            break;
        case 'ArrowRight':
            next();
            break;
        case 'ArrowLeft':
            prev();
            break;
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <Teleport to="body">
        <Transition name="fade">
            <div 
                v-if="isOpen" 
                class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
                @click.self="close"
            >
                <!-- Close button -->
                <button 
                    @click="close"
                    class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
                >
                    <Icon name="ph:x-bold" size="32" />
                </button>

                <!-- Image counter -->
                <div v-if="hasMultiple" class="absolute top-4 left-4 text-white/70 text-sm font-mono">
                    {{ currentIndex + 1 }} / {{ images.length }}
                </div>

                <!-- Navigation: Previous -->
                <button 
                    v-if="hasMultiple"
                    @click="prev"
                    class="absolute left-4 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                    <Icon name="ph:caret-left-bold" size="32" />
                </button>

                <!-- Main Image -->
                <div class="max-w-[90vw] max-h-[90vh] relative">
                    <img 
                        :src="currentImage" 
                        :alt="`Image ${currentIndex + 1}`"
                        class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>

                <!-- Navigation: Next -->
                <button 
                    v-if="hasMultiple"
                    @click="next"
                    class="absolute right-4 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                    <Icon name="ph:caret-right-bold" size="32" />
                </button>

                <!-- Dots pagination -->
                <div v-if="hasMultiple" class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    <button 
                        v-for="(_, idx) in images" 
                        :key="idx"
                        @click="currentIndex = idx"
                        class="w-2 h-2 rounded-full transition-all"
                        :class="idx === currentIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'"
                    />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
