<script setup lang="ts">
import type { Question } from "@/types/forms";

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
}

// Parsed options if stored as JSON string
const options = computed<QuestionOptions>(() => {
    if (typeof props.question.options === 'string') {
        try { return JSON.parse(props.question.options); } catch { return {}; }
    }
    return props.question.options || {};
});
</script>

<template>
    <div 
        class="rounded-xl border border-white/5 bg-black/20 p-6 backdrop-blur-sm transition-all"
        :class="{'border-red-500/50': error}"
    >
        <!-- Header -->
        <div class="mb-4">
            <h4 class="text-lg text-gray-100 font-bold mb-1 flex items-start gap-2">
                <span class="pr2p text-sm mt-1 text-red-400/80">Q{{ question.order_index + 1 }}.</span>
                {{ question.title }}
                <span v-if="question.is_required" class="text-red-500 ml-1">*</span>
            </h4>
            <p v-if="question.description" class="text-sm text-gray-400 ml-7">
                {{ question.description }}
            </p>
        </div>

        <!-- Inputs -->
        <div class="ml-7">
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
/* Custom Scrollbar for Textarea if needed */
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
