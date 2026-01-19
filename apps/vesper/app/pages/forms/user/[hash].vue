<script setup lang="ts">
import type { Form, Question } from "@/types/forms";
import QuestionRenderer from "@/components/forms/QuestionRenderer.vue";

const route = useRoute();
const form = ref<Form | null>(null);
const questions = ref<Question[]>([]);
const answers = reactive<Record<string, any>>({}); // Key: question_uuid
const fetchError = ref<boolean>(false);

const isSubmitting = ref(false);
const isSuccess = ref(false);
const errors = reactive<Record<string, string>>({});

// Fetch
const fetchForm = async (): Promise<void> => {
    const { data, error } = await useApiFetch<{ form: Form, questions: Question[] }>(`/forms/user/${route.params.hash}`);
    if (error.value) {
        fetchError.value = true;
        return;
    }
    if (data.value) {
        form.value = data.value.form;
        questions.value = data.value.questions;
        
        // Init answers
        questions.value.forEach((q: Question) => {
            answers[q.uuid] = q.type === 'checkbox' ? [] : '';
        });
    }
}
await fetchForm();

const validate = (): boolean => {
    let isValid = true;
    Object.keys(errors).forEach(k => delete errors[k]);

    questions.value.forEach((q: Question) => {
        const val = answers[q.uuid];
        if (q.is_required) {
            if (!val || (Array.isArray(val) && val.length === 0)) {
                errors[q.uuid] = 'Это поле обязательно';
                isValid = false;
            }
        }
    });
    return isValid;
};

const submit = async (): Promise<void> => {
    if (!validate()) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    isSubmitting.value = true;
    try {
        const payload = {
            answers: Object.entries(answers).map(([uuid, value]) => ({ question_uuid: uuid, value }))
        };

        const { error: submitError } = await useApiFetch(`/forms/user/${route.params.hash}/submit`, {
            method: 'POST',
            body: payload
        });

        if (submitError.value) throw submitError.value;
        isSuccess.value = true;
    } catch (e: any) {
        if (e.statusCode === 401) {
            alert('Пожалуйста, войдите в аккаунт, чтобы заполнить форму.');
        } else {
             alert('Ошибка отправки. Попробуйте позже.');
        }
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div v-if="form" class="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-black py-10 px-4">
        <div v-if="!isSuccess" class="max-w-3xl mx-auto space-y-6">
            <!-- Header -->
            <div class="rounded-xl border-t-8 border-red-500 bg-black/60 border border-white/5 p-8 backdrop-blur-md shadow-2xl">
                <h1 class="text-3xl md:text-4xl pr2p text-white mb-4">{{ form.title }}</h1>
                <div v-if="form.description" class="text-gray-300 text-lg whitespace-pre-line leading-relaxed">
                    {{ form.description }}
                </div>
                <!-- User Info Warning to assure them logic is safe -->
                 <div class="mt-6 flex items-center gap-2 text-sm text-gray-500 bg-white/5 p-3 rounded-lg w-fit">
                    <Icon name="ph:info" />
                    <span>Вы заполняете форму как <b>{{ useAuth().user.value?.nickname || 'Гость' }}</b></span>
                </div>
            </div>

            <!-- Questions -->
            <div class="space-y-4">
                <QuestionRenderer 
                    v-for="q in questions" 
                    :key="q.id"
                    :question="q"
                    v-model="answers[q.uuid]"
                    :error="errors[q.uuid]"
                />
            </div>

            <!-- Footer -->
            <div class="flex justify-between items-center pt-8">
                <button 
                    @click="submit"
                    :disabled="isSubmitting"
                    class="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                    <Icon v-if="isSubmitting" name="svg-spinners:ring-resize" />
                    <span>{{ isSubmitting ? 'Отправка...' : 'Отправить' }}</span>
                </button>
                <button class="text-gray-500 hover:text-white text-sm" @click="answers = {}">Очистить форму</button>
            </div>
        </div>

        <!-- Success State -->
        <div v-else class="max-w-2xl mx-auto text-center py-20 animate-fade-in">
            <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="ph:check-bold" class="text-green-500" size="48" />
            </div>
            <h2 class="text-3xl font-bold text-white mb-2">Ответ записан!</h2>
            <p class="text-gray-400 mb-8">Спасибо за ваше участие.</p>
            <button @click="navigateTo('/')" class="text-red-400 hover:text-red-300 underline">Вернуться на главную</button>
        </div>
    </div>
    <div v-else-if="fetchError" class="min-h-screen flex items-center justify-center text-center p-4">
        <div>
            <h1 class="text-2xl text-red-500 font-bold mb-2">Форма не найдена</h1>
            <p class="text-gray-500">Возможно, она была удалена или ссылка неверна.</p>
        </div>
    </div>
    <div v-else class="min-h-screen flex items-center justify-center">
        <Icon name="svg-spinners:3-dots-fade" size="40" class="text-red-400" />
    </div>
</template>

<style>
.animate-fade-in {
    animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
