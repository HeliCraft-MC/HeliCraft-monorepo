<script setup lang="ts">
/**
 * ConfirmModal - Reusable confirmation dialog
 */
const props = withDefaults(defineProps<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger';
}>(), {
    title: 'Подтверждение',
    confirmText: 'Подтвердить',
    cancelText: 'Отмена',
    confirmVariant: 'primary'
});

const emit = defineEmits<{
    (e: 'confirm'): void;
    (e: 'cancel'): void;
}>();

const confirmButtonClass = computed(() => {
    return props.confirmVariant === 'danger' 
        ? 'bg-red-500 hover:bg-red-600 text-white'
        : 'bg-red-500 hover:bg-red-600 text-white';
});

const handleKeydown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;
    if (e.key === 'Escape') emit('cancel');
    if (e.key === 'Enter') emit('confirm');
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="$emit('cancel')"></div>
                
                <!-- Modal -->
                <div class="relative bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <!-- Title -->
                    <h3 class="text-xl font-bold text-white mb-4">{{ title }}</h3>
                    
                    <!-- Message -->
                    <p class="text-gray-300 mb-6">{{ message }}</p>
                    
                    <!-- Actions -->
                    <div class="flex justify-end gap-3">
                        <button 
                            @click="$emit('cancel')"
                            class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                        >
                            {{ cancelText }}
                        </button>
                        <button 
                            @click="$emit('confirm')"
                            :class="confirmButtonClass"
                            class="px-4 py-2 rounded-lg transition-colors font-medium"
                        >
                            {{ confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
