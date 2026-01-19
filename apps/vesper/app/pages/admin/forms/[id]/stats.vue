<script setup lang="ts">
definePageMeta({
  layout: 'admin'
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

const fetchData = async (): Promise<void> => {
    try {
        const { data: result, error: fetchError } = await useApiFetch<StatsData>(`/forms/${formId.value}/responses`);
        if (fetchError.value) throw fetchError.value;
        if (result.value) data.value = result.value;
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
                    <h3 class="font-bold text-white mb-4">{{ question.title }}</h3>
                    
                    <!-- Choice-based questions -->
                    <div v-if="['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && question.options?.choices" class="space-y-2">
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
                
                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-black/60 text-gray-400">
                            <tr>
                                <th class="px-4 py-3 font-medium">Никнейм</th>
                                <th class="px-4 py-3 font-medium">Дата</th>
                                <th 
                                    v-for="q in data.questions" 
                                    :key="q.id" 
                                    class="px-4 py-3 font-medium max-w-[200px] truncate"
                                    :title="q.title"
                                >
                                    {{ q.title }}
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            <tr 
                                v-for="resp in data.responses" 
                                :key="resp.id"
                                class="hover:bg-white/5 transition-colors"
                            >
                                <td class="px-4 py-3 text-white font-medium">{{ resp.respondent_nickname }}</td>
                                <td class="px-4 py-3 text-gray-400">{{ formatDate(resp.submitted_at) }}</td>
                                <td 
                                    v-for="q in data.questions" 
                                    :key="`${resp.id}-${q.id}`" 
                                    class="px-4 py-3 text-gray-300 max-w-[200px] truncate"
                                    :title="formatAnswer(resp.answers[q.uuid])"
                                >
                                    {{ formatAnswer(resp.answers[q.uuid]) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
