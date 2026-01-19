<script setup lang="ts">
/**
 * PromptModal - Reusable input dialog
 */
const props = withDefaults(defineProps<{
    isOpen: boolean;
    title?: string;
    placeholder?: string;
    initialValue?: string;
    submitText?: string;
    cancelText?: string;
}>(), {
    title: 'Введите значение',
    placeholder: '',
    initialValue: '',
    submitText: 'Сохранить',
    cancelText: 'Отмена'
});

const emit = defineEmits<{
    (e: 'submit', value: string): void;
    (e: 'cancel'): void;
}>();

const inputValue = ref(props.initialValue);
const inputRef = ref<HTMLInputElement | null>(null);

// Reset value when modal opens
watch(() => props.isOpen, (open: boolean) => {
    if (open) {
        inputValue.value = props.initialValue;
        nextTick(() => {
            inputRef.value?.focus();
            inputRef.value?.select();
        });
    }
});

const handleSubmit = () => {
    if (inputValue.value.trim()) {
        emit('submit', inputValue.value.trim());
    }
};

const handleKeydown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;
    if (e.key === 'Escape') emit('cancel');
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
                    
                    <!-- Input -->
                    <form @submit.prevent="handleSubmit">
                        <input 
                            ref="inputRef"
                            v-model="inputValue"
                            type="text"
                            :placeholder="placeholder"
                            class="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 transition-all placeholder:text-gray-500 mb-6"
                        />
                        
                        <!-- Actions -->
                        <div class="flex justify-end gap-3">
                            <button 
                                type="button"
                                @click="$emit('cancel')"
                                class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                            >
                                {{ cancelText }}
                            </button>
                            <button 
                                type="submit"
                                :disabled="!inputValue.trim()"
                                class="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors font-medium"
                            >
                                {{ submitText }}
                            </button>
                        </div>
                    </form>
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
