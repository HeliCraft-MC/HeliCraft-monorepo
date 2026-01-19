<script setup lang="ts">
definePageMeta({
  layout: 'admin'
});

const route = useRoute();
const router = useRouter();

interface StatsData {
    total_responses: number;
    response_rate: string;
    last_response_at: number | null;
}

const stats = ref<StatsData | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

const fetchStats = async (): Promise<void> => {
    try {
        const { data, error: fetchError } = await useApiFetch<StatsData>(`/forms/${route.params.id}/stats`);
        if (fetchError.value) throw fetchError.value;
        stats.value = data.value;
    } catch (e: unknown) {
        error.value = 'Не удалось загрузить статистику';
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchStats);
</script>

<template>
    <div class="p-6 md:p-10 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex items-center gap-4 mb-8">
            <button @click="router.back()" class="text-gray-400 hover:text-white">
                <Icon name="ph:arrow-left-bold" size="24" />
            </button>
            <div>
                <h1 class="text-2xl font-bold text-white">Статистика формы</h1>
                <p class="text-gray-500 text-sm">Форма #{{ route.params.id }}</p>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="svg-spinners:3-dots-fade" size="40" class="text-red-400" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <Icon name="ph:warning-bold" size="48" class="text-red-400 mb-4" />
            <p class="text-red-400">{{ error }}</p>
            <button 
                @click="router.back()"
                class="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
                Назад
            </button>
        </div>

        <!-- Stats -->
        <div v-else-if="stats" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Total Responses -->
                <div class="bg-black/40 border border-white/5 rounded-xl p-6">
                    <div class="text-gray-500 text-sm mb-2">Всего ответов</div>
                    <div class="text-3xl font-bold text-white">{{ stats.total_responses }}</div>
                </div>
                
                <!-- Response Rate -->
                <div class="bg-black/40 border border-white/5 rounded-xl p-6">
                    <div class="text-gray-500 text-sm mb-2">Частота ответов</div>
                    <div class="text-3xl font-bold text-white">{{ stats.response_rate }}</div>
                </div>
                
                <!-- Last Response -->
                <div class="bg-black/40 border border-white/5 rounded-xl p-6">
                    <div class="text-gray-500 text-sm mb-2">Последний ответ</div>
                    <div class="text-xl font-bold text-white">
                        {{ stats.last_response_at ? new Date(stats.last_response_at).toLocaleDateString('ru-RU') : 'Нет данных' }}
                    </div>
                </div>
            </div>
            
            <!-- Placeholder for detailed stats -->
            <div class="bg-black/40 border border-white/5 rounded-xl p-6 text-center text-gray-500">
                <Icon name="ph:chart-bar-bold" size="48" class="mb-4 opacity-50" />
                <p>Детальная аналитика ответов будет добавлена в следующих обновлениях</p>
            </div>
        </div>

        <!-- No Stats -->
        <div v-else class="text-center py-20 text-gray-500">
            <Icon name="ph:chart-pie-slice" size="64" class="mb-4 opacity-50" />
            <p>Статистика недоступна</p>
        </div>
    </div>
</template>
