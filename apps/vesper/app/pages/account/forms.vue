<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user: authData } = useAuthSystem()
const userNickname = computed(() => authData.value?.nickname || 'Гость');

interface AvailableForm {
    id: number;
    title: string;
    description?: string;
    public_hash: string;
    created_at: number;
    has_responded: boolean;
    can_submit: boolean;
}

const forms = ref<AvailableForm[]>([]);
const isLoading = ref(true);

const fetchForms = async (): Promise<void> => {
    try {
        const { data, error } = await useApiFetch<AvailableForm[]>('/forms/user/available');
        if (error.value) throw error.value;
        if (data.value) forms.value = data.value;
    } catch (e: unknown) {
        console.error('Failed to load forms', e);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchForms);

function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}
</script>

<template>
    <div class="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-black py-10 px-4 pt-24">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl md:text-4xl pr2p text-red-400 mb-2">Доступные формы</h1>
                <p class="text-gray-400">
                    Формы и опросы, которые вы можете заполнить, {{ userNickname }}
                </p>
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="flex justify-center py-20">
                <Icon name="svg-spinners:3-dots-fade" size="40" class="text-red-400" />
            </div>

            <!-- Forms List -->
            <div v-else-if="forms.length > 0" class="space-y-4">
                <div 
                    v-for="form in forms" 
                    :key="form.id"
                    class="group relative rounded-xl border bg-black/60 backdrop-blur-md p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                    :class="form.can_submit 
                        ? 'border-white/10 hover:border-red-400/50 hover:shadow-red-500/10' 
                        : 'border-green-500/30 bg-green-500/5'"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <h3 class="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                                    {{ form.title }}
                                </h3>
                                <span 
                                    v-if="form.has_responded"
                                    class="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30"
                                >
                                    ✓ Заполнено
                                </span>
                            </div>
                            <p v-if="form.description" class="text-gray-400 text-sm line-clamp-2 mb-3">
                                {{ form.description }}
                            </p>
                            <span class="text-xs text-gray-600 font-mono">
                                Создано: {{ formatDate(form.created_at) }}
                            </span>
                        </div>
                        
                        <div>
                            <NuxtLink 
                                :to="`/forms/user/${form.public_hash}`"
                                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                                :class="form.can_submit 
                                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
                            >
                                <Icon :name="form.can_submit ? 'ph:pencil-simple-bold' : 'ph:eye-bold'" size="18" />
                                {{ form.can_submit ? 'Заполнить' : 'Просмотреть' }}
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-20 text-gray-500">
                <Icon name="ph:files" size="64" class="mb-4 opacity-50" />
                <p class="text-xl mb-2">Нет доступных форм</p>
                <p class="text-sm">Когда появятся новые формы, они отобразятся здесь</p>
            </div>
        </div>
    </div>
</template>
