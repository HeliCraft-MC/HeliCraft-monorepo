<script setup lang="ts">
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';
import ConfirmModal from "@/components/common/ConfirmModal.vue";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
});

const route = useRoute();
const router = useRouter();
const formId = computed(() => Number(route.params.id));

interface Question {
    id: number;
    uuid: string;
    title: string;
    type: string;
    order_index: number;
    options?: any;
}

interface Response {
    id: number;
    respondent_uuid: string;
    respondent_nickname: string;
    submitted_at: number;
    answers: Record<string, string | string[]>;
}

interface StatsData {
    form: { id: number; title: string; status: string };
    questions: Question[];
    responses: Response[];
}

const data = ref<StatsData | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Delete response state
const deleteModalOpen = ref(false);
const responseToDelete = ref<number | null>(null);

// Chart display mode per question
const chartModes = ref<Record<number, 'bar' | 'pie'>>({});

const fetchData = async (): Promise<void> => {
    try {
        const { data: result, error: fetchError } = await useApiFetch<StatsData>(`/forms/${formId.value}/responses`);
        if (fetchError.value) throw fetchError.value;
        if (result.value) {
            data.value = result.value;
            // Initialize chart modes
            result.value.questions.forEach(q => {
                if (['multiple_choice', 'checkbox', 'dropdown'].includes(q.type)) {
                    chartModes.value[q.id] = 'bar';
                }
            });
        }
    } catch (e: unknown) {
        error.value = 'Не удалось загрузить статистику';
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchData);

// Format date
function formatDate(ts: number): string {
    return new Date(ts).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format answer for display
function formatAnswer(answer: string | string[] | undefined): string {
    if (!answer) return '—';
    if (Array.isArray(answer)) return answer.join(', ');
    return answer;
}

// Get choice distribution for a question
function getChoiceDistribution(questionUuid: string, choices: string[]): Record<string, number> {
    if (!data.value) return {};
    const dist: Record<string, number> = {};
    choices.forEach(c => dist[c] = 0);
    
    data.value.responses.forEach(r => {
        const answer = r.answers[questionUuid];
        if (Array.isArray(answer)) {
            answer.forEach(a => {
                if (dist[a] !== undefined) dist[a]++;
            });
        } else if (answer && dist[answer] !== undefined) {
            dist[answer]++;
        }
    });
    return dist;
}

// Generate colors for pie chart
const chartColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', 
    '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4'
];

// Delete response
const confirmDeleteResponse = (id: number): void => {
    responseToDelete.value = id;
    deleteModalOpen.value = true;
};

const handleDeleteResponseConfirm = async (): Promise<void> => {
    deleteModalOpen.value = false;
    if (!responseToDelete.value || !data.value) return;
    
    try {
        await useApiFetch(`/forms/responses/${responseToDelete.value}`, { method: 'DELETE' });
        data.value.responses = data.value.responses.filter(r => r.id !== responseToDelete.value);
        responseToDelete.value = null;
    } catch (e: unknown) {
        useAppEventBus().emit('show-error', { message: 'Failed to delete response' });
    }
};

// Export to CSV
function exportCSV(): void {
    if (!data.value) return;
    
    const headers = ['ID', 'Никнейм', 'Дата', ...data.value.questions.map(q => q.title)];
    const rows = data.value.responses.map(r => [
        r.id,
        r.respondent_nickname,
        formatDate(r.submitted_at),
        ...data.value!.questions.map(q => formatAnswer(r.answers[q.uuid]))
    ]);
    
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `form_${formId.value}_responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Pie chart component
const PieChart = defineComponent({
    props: {
        distribution: { type: Object as PropType<Record<string, number>>, required: true }
    },
    setup(props) {
        const chartCanvas = ref<HTMLCanvasElement | null>(null);
        let chartInstance: Chart | null = null;

        onMounted(() => {
            if (!chartCanvas.value) return;
            const labels = Object.keys(props.distribution);
            const values = Object.values(props.distribution);
            
            chartInstance = new Chart(chartCanvas.value, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: chartColors.slice(0, labels.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#9ca3af', font: { size: 11 } }
                        }
                    }
                }
            });
        });

        onUnmounted(() => {
            chartInstance?.destroy();
        });

        return () => h('canvas', { ref: chartCanvas, class: 'w-full h-48' });
    }
});
</script>

<template>
    <div class="p-6 md:p-10 max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex items-center gap-4 mb-8">
            <button @click="router.back()" class="text-gray-400 hover:text-white transition">
                <Icon name="ph:arrow-left-bold" size="24" />
            </button>
            <div class="flex-1">
                <h1 class="text-2xl font-bold text-white">Статистика формы</h1>
                <p v-if="data" class="text-gray-500 text-sm">{{ data.form.title }}</p>
            </div>
            <button 
                v-if="data && data.responses.length > 0"
                @click="exportCSV"
                class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
                <Icon name="ph:file-csv-bold" size="20" />
                Экспорт CSV
            </button>
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
        <div v-else-if="data" class="space-y-8">
            <!-- Overview Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-black/40 border border-white/5 rounded-xl p-6">
                    <div class="text-gray-500 text-sm mb-2">Всего ответов</div>
                    <div class="text-4xl font-bold text-white">{{ data.responses.length }}</div>
                </div>
                <div class="bg-black/40 border border-white/5 rounded-xl p-6">
                    <div class="text-gray-500 text-sm mb-2">Вопросов</div>
                    <div class="text-4xl font-bold text-white">{{ data.questions.length }}</div>
                </div>
                <div class="bg-black/40 border border-white/5 rounded-xl p-6">
                    <div class="text-gray-500 text-sm mb-2">Последний ответ</div>
                    <div class="text-xl font-bold text-white">
                        {{ (data?.responses.length || 0) > 0 ? formatDate(data!.responses[0]!.submitted_at) : 'Нет ответов' }}
                    </div>
                </div>
            </div>

            <!-- Question Analytics -->
            <div v-if="data.responses.length > 0" class="space-y-6">
                <h2 class="text-xl font-bold text-white">Аналитика по вопросам</h2>
                
                <div v-for="question in data.questions" :key="question.id" class="bg-black/40 border border-white/5 rounded-xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-bold text-white">{{ question.title }}</h3>
                        
                        <!-- Chart mode toggle for choice questions -->
                        <div 
                            v-if="['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && question.options?.choices"
                            class="flex gap-1 bg-white/5 rounded-lg p-1"
                        >
                            <button 
                                @click="chartModes[question.id] = 'bar'"
                                class="px-2 py-1 text-xs rounded transition-colors"
                                :class="chartModes[question.id] === 'bar' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'"
                            >
                                Бары
                            </button>
                            <button 
                                @click="chartModes[question.id] = 'pie'"
                                class="px-2 py-1 text-xs rounded transition-colors"
                                :class="chartModes[question.id] === 'pie' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'"
                            >
                                Диаграмма
                            </button>
                        </div>
                    </div>
                    
                    <!-- Choice-based questions -->
                    <div v-if="['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && question.options?.choices">
                        <!-- Bar mode -->
                        <div v-if="chartModes[question.id] === 'bar'" class="space-y-2">
                            <div 
                                v-for="(count, choice) in getChoiceDistribution(question.uuid, question.options.choices)" 
                                :key="String(choice)"
                                class="flex items-center gap-3"
                            >
                                <div class="flex-1">
                                    <div class="flex justify-between mb-1">
                                        <span class="text-gray-300 text-sm">{{ choice }}</span>
                                        <span class="text-gray-500 text-sm">{{ count }} ({{ data.responses.length > 0 ? Math.round((count / data.responses.length) * 100) : 0 }}%)</span>
                                    </div>
                                    <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            class="h-full bg-red-500 transition-all"
                                            :style="{ width: `${data.responses.length > 0 ? (count / data.responses.length) * 100 : 0}%` }"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Pie chart mode -->
                        <div v-else class="h-48">
                            <PieChart :distribution="getChoiceDistribution(question.uuid, question.options.choices)" />
                        </div>
                    </div>
                    
                    <!-- Text questions - show sample answers -->
                    <div v-else class="text-gray-400 text-sm">
                        <p class="mb-2">Последние ответы:</p>
                        <ul class="space-y-1 max-h-32 overflow-y-auto">
                            <li 
                                v-for="(resp, idx) in data.responses.slice(0, 5)" 
                                :key="idx"
                                class="bg-black/30 rounded px-3 py-2 text-gray-300"
                            >
                                {{ formatAnswer(resp.answers[question.uuid]) }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Responses Table -->
            <div>
                <h2 class="text-xl font-bold text-white mb-4">Все ответы</h2>
                
                <div v-if="data.responses.length === 0" class="text-center py-12 text-gray-500">
                    <Icon name="ph:clipboard" size="64" class="mb-4 opacity-50" />
                    <p>Ответов пока нет</p>
                </div>
                
                <div v-else class="overflow-x-auto rounded-xl border border-white/5">
                    <table class="w-full text-left text-sm" style="min-width: 800px;">
                        <thead class="bg-black/60 text-gray-400">
                            <tr>
                                <th class="px-4 py-3 font-medium sticky left-0 bg-black/80 z-10 min-w-[120px]">Никнейм</th>
                                <th class="px-4 py-3 font-medium sticky left-[120px] bg-black/80 z-10 min-w-[120px]">Дата</th>
                                <th 
                                    v-for="q in data.questions" 
                                    :key="q.id" 
                                    class="px-4 py-3 font-medium min-w-[150px] max-w-[200px] truncate"
                                    :title="q.title"
                                >
                                    {{ q.title }}
                                </th>
                                <th class="px-4 py-3 font-medium w-[60px]"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            <tr 
                                v-for="resp in data.responses" 
                                :key="resp.id"
                                class="hover:bg-white/5 transition-colors"
                            >
                                <td class="px-4 py-3 text-white font-medium sticky left-0 bg-[#0a0a0a] z-10">{{ resp.respondent_nickname }}</td>
                                <td class="px-4 py-3 text-gray-400 sticky left-[120px] bg-[#0a0a0a] z-10">{{ formatDate(resp.submitted_at) }}</td>
                                <td 
                                    v-for="q in data.questions" 
                                    :key="`${resp.id}-${q.id}`" 
                                    class="px-4 py-3 text-gray-300 max-w-[200px] truncate"
                                    :title="formatAnswer(resp.answers[q.uuid])"
                                >
                                    {{ formatAnswer(resp.answers[q.uuid]) }}
                                </td>
                                <td class="px-4 py-3">
                                    <button 
                                        @click="confirmDeleteResponse(resp.id)"
                                        class="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                        title="Удалить ответ"
                                    >
                                        <Icon name="ph:trash-bold" size="16" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Delete Response Modal -->
        <ConfirmModal 
            :is-open="deleteModalOpen"
            title="Удалить ответ?"
            message="Ответ будет удален безвозвратно."
            confirm-text="Удалить"
            confirm-variant="danger"
            @confirm="handleDeleteResponseConfirm"
            @cancel="deleteModalOpen = false"
        />
    </div>
</template>

