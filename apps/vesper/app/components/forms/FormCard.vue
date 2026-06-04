<script setup lang="ts">
import type { Form } from "@/types/forms";

const props = defineProps<{
    form: Form;
}>();

const emit = defineEmits<{
    (e: 'edit', id: number): void;
    (e: 'delete', id: number): void;
    (e: 'stats', id: number): void;
}>();

const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    published: 'bg-green-500/20 text-green-400 border-green-500/50',
    closed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    archived: 'bg-red-500/20 text-red-400 border-red-500/50',
};

const formatDate = (ts: number): string => new Date(ts).toLocaleDateString();
</script>

<template>
    <div 
        class="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(248,113,113,0.1)] p-5"
    >
        <!-- Header -->
        <div class="mb-4">
            <div class="flex items-start justify-between">
                <h3 class="line-clamp-2 text-lg font-bold text-white transition-colors group-hover:text-red-400">
                    {{ form.title }}
                </h3>
                <span 
                    class="ml-2 rounded-full border px-2 py-0.5 text-xs font-mono uppercase tracking-wider"
                    :class="statusColors[form.status] || statusColors.draft"
                >
                    {{ form.status }}
                </span>
            </div>
            <p class="mt-2 text-sm text-gray-400 line-clamp-2">
                {{ form.description || 'Нет описания' }}
            </p>
        </div>

        <!-- Meta -->
        <div class="mt-auto pt-4 border-t border-white/5 text-xs text-gray-500 font-mono flex justify-between">
            <span>Создано: {{ formatDate(form.created_at) }}</span>
            <span v-if="form.public_hash">#{{ form.public_hash.slice(0,6) }}</span>
        </div>

        <!-- Actions (Overlay on Hover/Focus) -->
        <div class="absolute inset-x-0 bottom-0 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 flex p-4 gap-2 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 rounded-b-xl items-center justify-around">
            <button @click.stop="emit('edit', form.id)" class="p-2 hover:text-white text-gray-400 transition-colors" title="Редактировать">
                <Icon name="ph:pencil-simple-bold" size="20" />
            </button>
            <button @click.stop="emit('stats', form.id)" class="p-2 hover:text-blue-400 text-gray-400 transition-colors" title="Статистика">
                <Icon name="ph:chart-bar-bold" size="20" />
            </button>
            <button @click.stop="emit('delete', form.id)" class="p-2 hover:text-red-400 text-gray-400 transition-colors" title="Удалить">
                <Icon name="ph:trash-bold" size="20" />
            </button>
        </div>
    </div>
</template>
