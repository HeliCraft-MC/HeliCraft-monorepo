<script setup lang="ts">
import type { Form } from "@/types/forms";
import FormCard from "@/components/forms/FormCard.vue";

definePageMeta({
  layout: 'admin'
});

const forms = ref<Form[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');

const filteredForms = computed<Form[]>(() => {
    if (!searchQuery.value) return forms.value;
    const q = searchQuery.value.toLowerCase();
    return forms.value.filter((f: Form) => f.title.toLowerCase().includes(q));
});

// Fetch forms
const fetchForms = async (): Promise<void> => {
    isLoading.value = true;
    try {
        const { data } = await useFetch<Form[]>('/api/forms', {
            headers: { Authorization: useAuth().token.value }
        });
        if (data.value) forms.value = data.value;
    } catch (e: unknown) {
        useAppEventBus().emit('show-error', { message: 'Failed to load forms' });
    } finally {
        isLoading.value = false;
    }
};

// Create Form
const createForm = async (): Promise<void> => {
    const title = prompt('Введите название новой формы:');
    if (!title) return;

    try {
        const { data, error } = await useFetch<Form>('/api/forms', {
            method: 'POST',
            body: { title },
            headers: { Authorization: useAuth().token.value }
        });
        
        if (error.value) throw error.value;
        if (data.value) {
            await navigateTo(`/admin/forms/${data.value.id}`);
        }
    } catch (e: unknown) {
        useAppEventBus().emit('show-error', { message: 'Failed to create form' });
    }
};

const deleteForm = async (id: number): Promise<void> => {
    if (!confirm('Вы уверены? Форма будет отправлена в архив.')) return;
    try {
        await useFetch(`/api/forms/${id}`, {
            method: 'DELETE',
            headers: { Authorization: useAuth().token.value }
        });
        await fetchForms();
    } catch (e: unknown) {
        useAppEventBus().emit('show-error', { message: 'Failed to delete form' });
    }
};

onMounted(fetchForms);
</script>

<template>
    <div class="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 class="text-3xl pr2p text-red-400 mb-2">Конструктор Форм</h1>
                <p class="text-gray-400">Управляйте опросами и анкетами</p>
            </div>
            <button 
                @click="createForm"
                class="px-6 py-3 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-[0_4px_0_rgb(153,27,27)] hover:shadow-[0_2px_0_rgb(153,27,27)] hover:translate-y-[2px]"
            >
                + Создать форму
            </button>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <Icon name="ph:magnifying-glass" class="text-gray-500" size="20" />
            <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Поиск форм..." 
                class="bg-transparent border-none focus:ring-0 text-white w-full placeholder:text-gray-600"
            />
        </div>

        <!-- Grid -->
        <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="svg-spinners:3-dots-fade" size="40" class="text-red-400" />
        </div>

        <div v-else-if="filteredForms.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormCard 
                v-for="form in filteredForms" 
                :key="form.id" 
                :form="form"
                @edit="(id: number) => navigateTo(`/admin/forms/${id}`)"
                @delete="deleteForm"
                @stats="(id: number) => navigateTo(`/admin/forms/${id}/stats`)"
            />
        </div>

        <div v-else class="text-center py-20 text-gray-500">
            <Icon name="ph:files" size="64" class="mb-4 opacity-50" />
            <p>Форм пока нет</p>
        </div>
    </div>
</template>
