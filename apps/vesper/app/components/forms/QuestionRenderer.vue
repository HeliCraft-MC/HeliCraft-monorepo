<script setup lang="ts">
import type { Question } from "@/types/forms";
import ImageCarousel from "@/components/common/ImageCarousel.vue";
import ImageViewer from "@/components/common/ImageViewer.vue";

const props = defineProps<{
    question: Question;
    modelValue?: any;
    error?: string;
    readonly?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: any): void;
}>();

const internalValue = computed({
    get: (): any => props.modelValue,
    set: (val: any) => emit('update:modelValue', val)
});

interface QuestionOptions {
    choices?: string[];
    // Image block
    images?: string[];
    displayMode?: 'grid' | 'carousel' | 'random';
    // Text block
    content?: string;
    style?: 'normal' | 'info' | 'warning' | 'success';
}

// Parsed options if stored as JSON string
const options = computed<QuestionOptions>(() => {
    if (typeof props.question.options === 'string') {
        try { return JSON.parse(props.question.options); } catch { return {}; }
    }
    return props.question.options || {};
});

// For image_block with random mode
const randomImageIndex = ref(0);
const randomImage = computed(() => {
    const images = options.value.images || [];
    if (images.length === 0) return '';
    return images[randomImageIndex.value % images.length];
});

onMounted(() => {
    if (options.value.displayMode === 'random' && options.value.images?.length) {
        randomImageIndex.value = Math.floor(Math.random() * options.value.images.length);
    }
});

// Image viewer state
const viewerOpen = ref(false);
const viewerIndex = ref(0);

const openViewer = (index: number): void => {
    viewerIndex.value = index;
    viewerOpen.value = true;
};

// Text block style classes
const textBlockClasses = computed(() => {
    const style = options.value.style || 'normal';
    const baseClasses = 'p-4 rounded-lg text-gray-200 whitespace-pre-wrap';
    
    switch (style) {
        case 'info':
            return `${baseClasses} bg-blue-500/10 border border-blue-500/30`;
        case 'warning':
            return `${baseClasses} bg-yellow-500/10 border border-yellow-500/30`;
        case 'success':
            return `${baseClasses} bg-green-500/10 border border-green-500/30`;
        default:
            return `${baseClasses} bg-white/5`;
    }
});

const isDecorativeBlock = computed(() => ['image_block', 'text_block'].includes(props.question.type));
</script>

<template>
    <div 
        class="rounded-xl border border-white/5 bg-black/20 p-6 backdrop-blur-sm transition-all"
        :class="{'border-red-500/50': error}"
    >
        <!-- Header (only for question types and titled decorative blocks) -->
        <div v-if="!isDecorativeBlock || question.title" class="mb-4">
            <h4 v-if="!isDecorativeBlock" class="text-lg text-gray-100 font-bold mb-1 flex items-start gap-2">
                <span class="pr2p text-sm mt-1 text-red-400/80">Q{{ question.order_index + 1 }}.</span>
                {{ question.title }}
                <span v-if="question.is_required" class="text-red-500 ml-1">*</span>
            </h4>
            <h4 v-else-if="question.title" class="text-lg text-gray-100 font-bold mb-2">
                {{ question.title }}
            </h4>
            <p v-if="question.description && !isDecorativeBlock" class="text-sm text-gray-400 ml-7">
                {{ question.description }}
            </p>
        </div>

        <!-- Inputs -->
        <div :class="{'ml-7': !isDecorativeBlock}">
            <!-- Short Text -->
            <input 
                v-if="question.type === 'short_text'"
                v-model="internalValue"
                type="text"
                :disabled="readonly"
                class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 transition-all placeholder:text-gray-600"
                placeholder="Ваш ответ..."
            />

            <!-- Paragraph -->
            <textarea 
                v-else-if="question.type === 'paragraph'"
                v-model="internalValue"
                :disabled="readonly"
                rows="4"
                class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 transition-all placeholder:text-gray-600 resize-y"
                placeholder="Развернутый ответ..."
            ></textarea>

            <!-- Multiple Choice (Radio) -->
            <div v-else-if="question.type === 'multiple_choice'" class="space-y-3">
                <label 
                    v-for="(opt, idx) in options.choices || []" 
                    :key="idx"
                    class="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-white/5 cursor-pointer transition-colors"
                    :class="{'bg-red-400/10 border-red-400/30': internalValue === opt}"
                >
                    <input 
                        type="radio" 
                        :name="`q-${question.id}`" 
                        :value="opt"
                        v-model="internalValue"
                        class="w-5 h-5 accent-red-400"
                        :disabled="readonly"
                    />
                    <span class="text-gray-200">{{ opt }}</span>
                </label>
            </div>

             <!-- Checkbox -->
             <div v-else-if="question.type === 'checkbox'" class="space-y-3">
                <label 
                    v-for="(opt, idx) in options.choices || []" 
                    :key="idx"
                    class="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-white/5 cursor-pointer transition-colors"
                >
                    <input 
                        type="checkbox" 
                        :value="opt"
                        v-model="internalValue"
                        class="w-5 h-5 accent-red-400"
                        :disabled="readonly"
                    />
                    <span class="text-gray-200">{{ opt }}</span>
                </label>
            </div>

            <!-- Dropdown -->
            <select
                v-else-if="question.type === 'dropdown'"
                v-model="internalValue"
                :disabled="readonly"
                class="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-400 focus:outline-none transition-all appearance-none"
            >
                <option value="" disabled selected>Выберите вариант...</option>
                <option v-for="(opt, idx) in options.choices || []" :key="idx" :value="opt">
                    {{ opt }}
                </option>
            </select>

            <!-- Image Block -->
            <div v-else-if="question.type === 'image_block'" class="space-y-2">
                <!-- Grid Mode -->
                <div v-if="options.displayMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div 
                        v-for="(img, idx) in options.images || []" 
                        :key="idx"
                        class="aspect-video rounded-lg overflow-hidden bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                        @click="openViewer(idx)"
                    >
                        <img :src="img" :alt="`Image ${Number(idx) + 1}`" class="w-full h-full object-cover" />
                    </div>
                </div>
                
                <!-- Carousel Mode -->
                <ImageCarousel 
                    v-else-if="options.displayMode === 'carousel'" 
                    :images="options.images || []"
                    :show-arrows="true"
                    :show-dots="true"
                    @click="openViewer"
                />
                
                <!-- Random Mode -->
                <div 
                    v-else-if="options.displayMode === 'random'"
                    class="aspect-video rounded-lg overflow-hidden bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                    @click="openViewer(randomImageIndex)"
                >
                    <img :src="randomImage" alt="Random image" class="w-full h-full object-cover" />
                </div>
                
                <!-- Image Viewer Modal -->
                <ImageViewer 
                    :images="options.images || []" 
                    :initial-index="viewerIndex"
                    :is-open="viewerOpen" 
                    @close="viewerOpen = false" 
                />
            </div>

            <!-- Text Block -->
            <div v-else-if="question.type === 'text_block'" :class="textBlockClasses">
                {{ options.content }}
            </div>
            
            <p v-else class="text-yellow-500 text-sm italic">
                Неподдерживаемый тип вопроса: {{ question.type }}
            </p>
        </div>

        <!-- Error Msg -->
        <p v-if="error" class="mt-2 text-sm text-red-400 ml-7 animate-pulse">
            {{ error }}
        </p>
    </div>
</template>

<style scoped>
/* Custom Scrollbar for Textarea */
textarea::-webkit-scrollbar {
    width: 8px;
}
textarea::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
}
textarea::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.2);
    border-radius: 4px;
}
</style>
