<script setup lang="ts">
import type { Question } from "@/types/forms";

const props = defineProps<{
    question: Question;
}>();

const emit = defineEmits<{
    (e: 'update', q: Question): void;
    (e: 'delete', id: number): void;
    (e: 'move-up', id: number): void;
    (e: 'move-down', id: number): void;
}>();

const localQuestion = ref<Question>({...props.question});

interface QuestionOptions {
    choices?: string[];
    // Image block
    images?: string[];
    displayMode?: 'grid' | 'carousel' | 'random';
    // Text block
    content?: string;
    style?: 'normal' | 'info' | 'warning' | 'success';
}

const options = ref<QuestionOptions>(
    typeof props.question.options === 'string' 
    ? JSON.parse(props.question.options) 
    : (props.question.options || {})
);

// Sync local state if prop changes from outside
watch(() => props.question, (newVal: Question) => {
    localQuestion.value = {...newVal};
    options.value = typeof newVal.options === 'string' 
        ? JSON.parse(newVal.options) 
        : (newVal.options || {});
}, { deep: true });

// Emit changes
const save = (): void => {
    emit('update', {
        ...localQuestion.value,
        options: options.value 
    });
};

const onChange = (): void => save();

// Choice options (for multiple choice, checkbox, dropdown)
const addChoice = (): void => {
    if (!options.value.choices) options.value.choices = [];
    options.value.choices.push(`Option ${options.value.choices.length + 1}`);
    onChange();
};

const removeChoice = (idx: number): void => {
    if (options.value.choices) {
        options.value.choices.splice(idx, 1);
        onChange();
    }
};

// Image block: handle file upload
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadingImage = ref(false);

const triggerImageUpload = (): void => {
    fileInputRef.value?.click();
};

const handleImageUpload = async (e: Event): Promise<void> => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;
    
    uploadingImage.value = true;
    
    if (!options.value.images) options.value.images = [];
    
    for (const file of Array.from(files)) {
        if (options.value.images.length >= 10) break;
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('context', 'forms');
            
            const { data } = await useApiFetch<{ url: string }>('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (data.value?.url) {
                options.value.images.push(data.value.url);
            }
        } catch (err) {
            console.error('Failed to upload image:', err);
        }
    }
    
    uploadingImage.value = false;
    onChange();
    target.value = ''; // Reset input
};

const removeImage = (idx: number): void => {
    if (options.value.images) {
        options.value.images.splice(idx, 1);
        onChange();
    }
};

// Question types configuration
const types = [
    { label: 'Short Text', value: 'short_text', icon: 'ph:text-t-bold', category: 'input' },
    { label: 'Paragraph', value: 'paragraph', icon: 'ph:text-align-left-bold', category: 'input' },
    { label: 'Multiple Choice', value: 'multiple_choice', icon: 'ph:radio-button-bold', category: 'input' },
    { label: 'Checkboxes', value: 'checkbox', icon: 'ph:check-square-bold', category: 'input' },
    { label: 'Dropdown', value: 'dropdown', icon: 'ph:caret-down-bold', category: 'input' },
    // Decorative blocks
    { label: '📷 Изображения', value: 'image_block', icon: 'ph:image-bold', category: 'decorative' },
    { label: '📝 Текстовый блок', value: 'text_block', icon: 'ph:text-aa-bold', category: 'decorative' },
];

const isDecorativeBlock = computed(() => ['image_block', 'text_block'].includes(localQuestion.value.type));
const isChoiceType = computed(() => ['multiple_choice', 'checkbox', 'dropdown'].includes(localQuestion.value.type));
</script>

<template>
    <div class="rounded-xl border border-white/10 bg-black/60 backdrop-blur-md p-6 transition-all hover:border-white/20">
        <!-- Toolbar -->
        <div class="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
            <div class="flex items-center gap-2 text-gray-400">
                <Icon name="ph:dots-six-vertical-bold" size="20" class="cursor-move hover:text-white" />
                <span class="text-xs font-mono">{{ isDecorativeBlock ? 'BLOCK' : 'Q' }}{{ question.order_index + 1 }}</span>
            </div>
             <div class="flex items-center gap-2">
                 <button @click="$emit('move-up', question.id)" class="p-1 hover:text-white text-gray-500"><Icon name="ph:arrow-up" /></button>
                 <button @click="$emit('move-down', question.id)" class="p-1 hover:text-white text-gray-500"><Icon name="ph:arrow-down" /></button>
                 <div class="h-4 w-px bg-white/10 mx-1"></div>
                 <button @click="$emit('delete', question.id)" class="p-1 hover:text-red-400 text-gray-500 transition-colors"><Icon name="ph:trash" /></button>
             </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
            <!-- Main Content -->
            <div class="md:col-span-8 space-y-4">
                <!-- Title (for all types) -->
                <input 
                    v-model="localQuestion.title" 
                    @change="onChange"
                    type="text" 
                    class="w-full bg-transparent text-lg font-bold text-white placeholder:text-gray-600 focus:outline-none border-b border-transparent focus:border-red-400 transition-colors py-2"
                    :placeholder="isDecorativeBlock ? 'Заголовок блока (опционально)...' : 'Вопрос...'"
                />
                <input 
                    v-if="!isDecorativeBlock"
                    v-model="localQuestion.description" 
                    @change="onChange"
                    type="text" 
                    class="w-full bg-transparent text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none border-b border-transparent focus:border-red-400 transition-colors py-1"
                    placeholder="Описание (опционально)..."
                />

                <!-- Choice Options Editor -->
                <div v-if="isChoiceType" class="mt-4 space-y-2">
                    <p class="text-xs text-gray-500 font-mono uppercase">Варианты ответа</p>
                    <div v-for="(choice, idx) in options.choices || []" :key="idx" class="flex items-center gap-2">
                        <Icon :name="localQuestion.type === 'multiple_choice' ? 'ph:circle' : 'ph:square'" class="text-gray-600" />
                        <input 
                            v-model="options.choices![idx]" 
                            @change="onChange"
                            class="flex-1 bg-white/5 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:bg-white/10"
                        />
                        <button @click="removeChoice(idx)" class="text-gray-600 hover:text-red-400"><Icon name="ph:x" /></button>
                    </div>
                    <button @click="addChoice" class="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 mt-2">
                        <Icon name="ph:plus" /> Добавить вариант
                    </button>
                </div>

                <!-- Image Block Editor -->
                <div v-if="localQuestion.type === 'image_block'" class="mt-4 space-y-4">
                    <p class="text-xs text-gray-500 font-mono uppercase">Изображения (до 10)</p>
                    
                    <!-- Image Grid -->
                    <div class="grid grid-cols-3 gap-2">
                        <div 
                            v-for="(img, idx) in options.images || []" 
                            :key="idx"
                            class="relative aspect-video rounded-lg overflow-hidden bg-gray-800 group"
                        >
                            <img :src="img" :alt="`Image ${Number(idx) + 1}`" class="w-full h-full object-cover" />
                            <button 
                                @click="removeImage(idx)"
                                class="absolute top-1 right-1 p-1 bg-red-500/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Icon name="ph:x-bold" size="12" class="text-white" />
                            </button>
                        </div>
                        
                        <!-- Add Image Button -->
                        <button 
                            v-if="(options.images?.length || 0) < 10"
                            @click="triggerImageUpload"
                            :disabled="uploadingImage"
                            class="aspect-video rounded-lg border-2 border-dashed border-white/10 hover:border-red-400/30 hover:bg-red-400/5 flex items-center justify-center transition-all"
                        >
                            <Icon v-if="uploadingImage" name="svg-spinners:ring-resize" size="24" class="text-gray-500" />
                            <Icon v-else name="ph:plus-bold" size="24" class="text-gray-500" />
                        </button>
                    </div>
                    
                    <input 
                        ref="fileInputRef"
                        type="file" 
                        accept="image/*" 
                        multiple 
                        class="hidden"
                        @change="handleImageUpload"
                    />
                    
                    <!-- Display Mode Selector -->
                    <div class="flex items-center gap-4">
                        <span class="text-xs text-gray-500">Режим:</span>
                        <label v-for="mode in ['grid', 'carousel', 'random']" :key="mode" class="flex items-center gap-1 cursor-pointer">
                            <input 
                                type="radio" 
                                :value="mode" 
                                v-model="options.displayMode"
                                @change="onChange"
                                class="accent-red-400"
                            />
                            <span class="text-sm text-gray-300 capitalize">{{ mode === 'grid' ? 'Плитка' : mode === 'carousel' ? 'Слайдер' : 'Случайная' }}</span>
                        </label>
                    </div>
                </div>

                <!-- Text Block Editor -->
                <div v-if="localQuestion.type === 'text_block'" class="mt-4 space-y-4">
                    <p class="text-xs text-gray-500 font-mono uppercase">Содержимое</p>
                    <textarea 
                        v-model="options.content"
                        @change="onChange"
                        rows="4"
                        class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-red-400 resize-y"
                        placeholder="Текст блока..."
                    ></textarea>
                    
                    <!-- Style Selector -->
                    <div class="flex items-center gap-4">
                        <span class="text-xs text-gray-500">Стиль:</span>
                        <label v-for="s in ['normal', 'info', 'warning', 'success']" :key="s" class="flex items-center gap-1 cursor-pointer">
                            <input 
                                type="radio" 
                                :value="s" 
                                v-model="options.style"
                                @change="onChange"
                                class="accent-red-400"
                            />
                            <span class="text-sm text-gray-300 capitalize">{{ s === 'normal' ? 'Обычный' : s === 'info' ? 'Инфо' : s === 'warning' ? 'Внимание' : 'Успех' }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Sidebar Settings -->
            <div class="md:col-span-4 space-y-4 border-l border-white/5 pl-6">
                <!-- Type Selector -->
                <div class="space-y-1">
                    <label class="text-xs text-gray-500">Тип</label>
                    <div class="relative">
                        <select 
                            v-model="localQuestion.type" 
                            @change="onChange"
                            class="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-400"
                        >
                            <optgroup label="Вопросы">
                                <option v-for="t in types.filter((t: any) => t.category === 'input')" :key="t.value" :value="t.value">
                                    {{ t.label }}
                                </option>
                            </optgroup>
                            <optgroup label="Декоративные блоки">
                                <option v-for="t in types.filter((t: any) => t.category === 'decorative')" :key="t.value" :value="t.value">
                                    {{ t.label }}
                                </option>
                            </optgroup>
                        </select>
                        <Icon name="ph:caret-down" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <!-- Toggles (only for input types) -->
                <label v-if="!isDecorativeBlock" class="flex items-center justify-between cursor-pointer group">
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">Обязательный</span>
                    <div class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" v-model="localQuestion.is_required" @change="onChange" class="sr-only peer">
                        <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                    </div>
                </label>
            </div>
        </div>
    </div>
</template>
