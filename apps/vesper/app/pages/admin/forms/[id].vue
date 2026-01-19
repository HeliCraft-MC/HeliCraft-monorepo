<script setup lang="ts">
import type { Form, Question } from "@/types/forms";
import QuestionEditor from "@/components/forms/QuestionEditor.vue";
import ConfirmModal from "@/components/common/ConfirmModal.vue";

definePageMeta({
  layout: 'admin'
});

const route = useRoute();
const router = useRouter();
const form = ref<Form | null>(null);
const questions = ref<Question[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);

// Modal states
const publishModalOpen = ref(false);
const deleteQuestionModalOpen = ref(false);
const questionToDelete = ref<number | null>(null);

const publicUrl = computed<string | null>(() => {
    if (!form.value?.public_hash) return null;
    return `${window.location.origin}/forms/user/${form.value.public_hash}`;
});

// Fetch Data
const fetchData = async (): Promise<void> => {
    try {
        const { data } = await useApiFetch<Form & { questions: Question[] }>(`/forms/${route.params.id}`);
        if (data.value) {
            const { questions: qs, ...f } = data.value;
            form.value = f;
            questions.value = qs || [];
        }
    } catch (e: unknown) {
        useAppEventBus().emit('show-error', { message: 'Failed to load form' });
    } finally {
        isLoading.value = false;
    }
};

// Actions
const updateFormMetadata = async (): Promise<void> => {
    if (!form.value) return;
    isSaving.value = true;
    try {
        await useApiFetch(`/forms/${form.value.id}`, {
            method: 'PATCH',
            body: { title: form.value.title, description: form.value.description }
        });
    } finally {
        isSaving.value = false;
    }
};

const addQuestion = async (): Promise<void> => {
    if (!form.value) return;
    try {
        const { data } = await useApiFetch<Question>(`/forms/${form.value.id}/questions`, {
            method: 'POST',
            body: { 
                type: 'short_text', 
                title: 'Новый вопрос',
                order_index: questions.value.length
            }
        });
        if (data.value) questions.value.push(data.value);
    } catch (e: unknown) { console.error(e) }
};

const updateQuestion = async (q: Question): Promise<void> => {
    try {
        await useApiFetch(`/forms/questions/${q.id}`, {
            method: 'PATCH',
            body: q
        });
        const idx = questions.value.findIndex((item: Question) => item.id === q.id);
        if (idx !== -1) questions.value[idx] = q;
    } catch (e: unknown) { console.error(e) }
};

const confirmDeleteQuestion = (id: number): void => {
    questionToDelete.value = id;
    deleteQuestionModalOpen.value = true;
};

const handleDeleteQuestionConfirm = async (): Promise<void> => {
    deleteQuestionModalOpen.value = false;
    if (!questionToDelete.value) return;
    
    try {
        await useApiFetch(`/forms/questions/${questionToDelete.value}`, { method: 'DELETE' });
        questions.value = questions.value.filter((q: Question) => q.id !== questionToDelete.value);
        questionToDelete.value = null;
    } catch (e: unknown) { console.error(e) }
};

const handlePublishConfirm = async (): Promise<void> => {
    publishModalOpen.value = false;
    if (!form.value) return;
    
    try {
        const { data } = await useApiFetch<{ public_hash: string }>(`/forms/${form.value.id}/publish`, {
            method: 'POST'
        });
        if (data.value) form.value.public_hash = data.value.public_hash;
        form.value.status = 'published';
    } catch (e: unknown) {
        useAppEventBus().emit('show-error', { message: 'Failed to publish' });
    }
};

const reorder = async (direction: 'up'|'down', id: number): Promise<void> => {
    const idx = questions.value.findIndex((q: Question) => q.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === questions.value.length - 1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = questions.value[idx];
    questions.value[idx] = questions.value[newIdx];
    questions.value[newIdx] = temp;

    const ids = questions.value.map((q: Question) => q.id);
    await useApiFetch(`/forms/${form.value?.id}/order`, {
        method: 'PUT',
        body: ids
    });
};

onMounted(fetchData);
</script>

<template>
    <div v-if="form" class="min-h-screen bg-[#050505] pb-20">
        <!-- Sticky Header -->
        <div class="sticky top-0 z-30 border-b border-white/5 bg-black/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
            <div class="flex items-center gap-4 w-full md:w-auto">
                <button @click="router.back()" class="text-gray-400 hover:text-white"><Icon name="ph:arrow-left-bold" size="24" /></button>
                <div class="flex-1">
                    <input 
                        v-model="form.title" 
                        @blur="updateFormMetadata"
                        class="bg-transparent text-xl font-bold text-white placeholder:text-gray-600 focus:outline-none w-full border-b border-transparent focus:border-red-400 transition-colors"
                    />
                    <span class="text-xs text-gray-500 font-mono uppercase">{{ isSaving ? 'Сохранение...' : 'Сохранено' }}</span>
                </div>
            </div>

            <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                 <button 
                    v-if="form.status !== 'published'"
                    @click="publishModalOpen = true"
                    class="px-4 py-2 bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 rounded-lg transition-colors flex items-center gap-2"
                >
                    <Icon name="ph:paper-plane-right-bold" /> Опубликовать
                </button>
                 <div v-else class="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
                    <Icon name="ph:globe" class="text-green-400" />
                    <span class="text-xs text-gray-400 truncate max-w-[150px]">{{ form.public_hash }}</span>
                    <button class="text-gray-500 hover:text-white" @click="navigateTo(`/forms/user/${form.public_hash}`, { open: { target: '_blank'}})">
                        <Icon name="ph:arrow-square-out" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="max-w-4xl mx-auto p-6 space-y-6">
            <!-- Header Card -->
            <div class="rounded-xl border-t-4 border-red-500 bg-black/40 border border-white/5 p-8 backdrop-blur-sm">
                <textarea 
                    v-model="form.description"
                     @blur="updateFormMetadata"
                    class="w-full bg-transparent text-gray-300 resize-none focus:outline-none placeholder:text-gray-600"
                    placeholder="Описание формы (подсказка для пользователей)..."
                    rows="2"
                ></textarea>
            </div>

            <!-- Questions List -->
            <transition-group name="list" tag="div" class="space-y-4">
                <QuestionEditor 
                    v-for="(q, idx) in questions" 
                    :key="q.id" 
                    :question="{...q, order_index: idx}"
                    @update="updateQuestion"
                    @delete="confirmDeleteQuestion"
                    @move-up="reorder('up', $event)"
                    @move-down="reorder('down', $event)"
                />
            </transition-group>

            <!-- Add Button -->
            <button 
                @click="addQuestion"
                class="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-all flex items-center justify-center gap-2"
            >
                <Icon name="ph:plus-bold" size="24" />
                <span>Добавить вопрос</span>
            </button>
        </div>
        
        <!-- Modals -->
        <ConfirmModal 
            :is-open="publishModalOpen"
            title="Опубликовать форму?"
            message="После публикации ссылка станет доступной. Пользователи смогут заполнять форму."
            confirm-text="Опубликовать"
            @confirm="handlePublishConfirm"
            @cancel="publishModalOpen = false"
        />
        
        <ConfirmModal 
            :is-open="deleteQuestionModalOpen"
            title="Удалить вопрос?"
            message="Вопрос будет удален безвозвратно."
            confirm-text="Удалить"
            confirm-variant="danger"
            @confirm="handleDeleteQuestionConfirm"
            @cancel="deleteQuestionModalOpen = false"
        />
    </div>
    <div v-else class="flex justify-center py-20">
        <Icon name="svg-spinners:3-dots-fade" size="40" class="text-red-400" />
    </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
