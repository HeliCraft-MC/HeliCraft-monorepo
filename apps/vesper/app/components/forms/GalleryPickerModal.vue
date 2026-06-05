<script setup lang="ts">
import type { IGalleryListResponse, IGalleryImagePublic, IGalleryCategoriesResponse, IGallerySeasonsResponse, GallerySortBy } from '~/types/gallery.types'

const props = defineProps<{
    isOpen: boolean;
    max?: number;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'select', images: IGalleryImagePublic[]): void;
}>();

const config = useRuntimeConfig();
const images = ref<IGalleryImagePublic[]>([]);
const loading = ref(true);
const page = ref(1);
const totalPages = ref(1);

// Filters
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedSeason = ref('');
const sortBy = ref<GallerySortBy>('created_at');
const categories = ref<string[]>([]);
const seasons = ref<string[]>([]);

const selectedImages = ref<IGalleryImagePublic[]>([]);

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Fetch images with filters
const fetchImages = async () => {
    loading.value = true;
    try {
        const query: Record<string, any> = {
            page: page.value,
            perPage: 12,
            sort: sortBy.value
        };
        
        if (searchQuery.value.trim()) {
            query.search = searchQuery.value.trim();
        }
        if (selectedCategory.value) {
            query.category = selectedCategory.value;
        }
        if (selectedSeason.value) {
            query.season = selectedSeason.value;
        }
        
        const { data } = await useApiFetch<IGalleryListResponse>('/gallery', { query });
        
        if (data.value) {
            images.value = data.value.items;
            totalPages.value = data.value.totalPages;
        }
    } catch (e) {
        console.error('Failed to load gallery:', e);
    } finally {
        loading.value = false;
    }
};

// Fetch filter options
const fetchFilters = async () => {
    try {
        const [catData, seasonData] = await Promise.all([
            useApiFetch<IGalleryCategoriesResponse>('/gallery/categories'),
            useApiFetch<IGallerySeasonsResponse>('/gallery/seasons')
        ]);
        
        if (catData.data.value) {
            categories.value = catData.data.value.categories;
        }
        if (seasonData.data.value) {
            seasons.value = seasonData.data.value.seasons;
        }
    } catch (e) {
        console.error('Failed to load filters:', e);
    }
};

watch(() => props.isOpen, (open) => {
    if (open) {
        selectedImages.value = [];
        page.value = 1;
        searchQuery.value = '';
        selectedCategory.value = '';
        selectedSeason.value = '';
        sortBy.value = 'created_at';
        fetchImages();
        fetchFilters();
    }
});

// Watch for filter changes
watch([selectedCategory, selectedSeason, sortBy], () => {
    page.value = 1;
    fetchImages();
});

// Debounced search
watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        page.value = 1;
        fetchImages();
    }, 300);
});

watch(page, fetchImages);

const toggleSelection = (img: IGalleryImagePublic) => {
    const idx = selectedImages.value.findIndex(s => s.id === img.id);
    if (idx !== -1) {
        selectedImages.value.splice(idx, 1);
    } else {
        if (props.max && selectedImages.value.length >= props.max) return;
        selectedImages.value.push(img);
    }
};

const submit = () => {
    emit('select', selectedImages.value);
    emit('close');
};

const isSelected = (id: string) => selectedImages.value.some(s => s.id === id);

// Helper for image url
const getImageUrl = (id: string) => `${config.public.backendURL}/gallery/${id}/image`;
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="emit('close')"></div>
        
        <!-- Modal -->
        <div class="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col max-h-[90vh]">
            <!-- Header -->
            <div class="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 class="text-xl font-bold text-white pr2p">Выберите изображения</h3>
                <button @click="emit('close')" class="text-gray-400 hover:text-white">
                    <Icon name="ph:x-bold" size="24" />
                </button>
            </div>
            
            <!-- Filters -->
            <div class="p-4 border-b border-white/10 space-y-4">
                <!-- Search -->
                <div class="relative">
                    <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        v-model="searchQuery"
                        type="text"
                        placeholder="Поиск по описанию, игрокам..."
                        class="w-full bg-gray-800/70 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500 transition"
                    />
                </div>
                
                <!-- Filter row -->
                <div class="flex flex-wrap gap-3">
                    <!-- Category -->
                    <select 
                        v-model="selectedCategory"
                        class="bg-gray-800/70 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition min-w-[150px]"
                    >
                        <option value="">Все категории</option>
                        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                    
                    <!-- Season -->
                    <select 
                        v-model="selectedSeason"
                        class="bg-gray-800/70 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition min-w-[150px]"
                    >
                        <option value="">Все сезоны</option>
                        <option v-for="s in seasons" :key="s" :value="s">{{ s }}</option>
                    </select>
                    
                    <!-- Sort -->
                    <select 
                        v-model="sortBy"
                        class="bg-gray-800/70 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition min-w-[150px]"
                    >
                        <option value="created_at">Новые</option>
                        <option value="likes">Популярные</option>
                    </select>
                </div>
            </div>
            
            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6">
                <div v-if="loading" class="flex justify-center py-20">
                    <Icon name="svg-spinners:3-dots-fade" size="40" class="text-red-400" />
                </div>
                
                <div v-else-if="images.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div 
                        v-for="img in images" 
                        :key="img.id"
                        class="relative aspect-video rounded-lg overflow-hidden cursor-pointer group border-2 transition-all"
                        :class="isSelected(img.id) ? 'border-red-500 opacity-100' : 'border-transparent opacity-70 hover:opacity-100'"
                        @click="toggleSelection(img)"
                    >
                        <img 
                            :src="getImageUrl(img.id)" 
                            class="w-full h-full object-cover"
                            loading="lazy"
                        />
                        
                        <!-- Checkmark -->
                        <div v-if="isSelected(img.id)" class="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <div class="bg-red-500 rounded-full p-1">
                                <Icon name="ph:check-bold" class="text-white" />
                            </div>
                        </div>
                        
                        <!-- Info overlay -->
                        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p class="text-xs text-white truncate">{{ img.description || 'Без описания' }}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs text-gray-400">{{ img.owner.nickname }}</span>
                                <span v-if="img.likes_count > 0" class="text-xs text-gray-400 flex items-center gap-1">
                                    <Icon name="ph:heart-fill" class="text-red-400" size="12" />
                                    {{ img.likes_count }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div v-else class="text-center py-20 text-gray-500">
                    <Icon name="ph:image" size="48" class="mb-4 opacity-50" />
                    <p>Изображения не найдены</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
                <!-- Pagination -->
                <div class="flex items-center gap-2">
                    <button 
                        @click="page--" 
                        :disabled="page <= 1"
                        class="p-2 rounded hover:bg-white/5 disabled:opacity-50"
                    >
                        <Icon name="ph:caret-left-bold" />
                    </button>
                    <span class="text-sm text-gray-400">Стр. {{ page }} из {{ totalPages }}</span>
                    <button 
                        @click="page++" 
                        :disabled="page >= totalPages"
                        class="p-2 rounded hover:bg-white/5 disabled:opacity-50"
                    >
                        <Icon name="ph:caret-right-bold" />
                    </button>
                </div>
                
                <div class="flex items-center gap-4">
                    <div class="text-sm text-gray-400">
                        Выбрано: <span class="text-white font-bold">{{ selectedImages.length }}</span>
                        <span v-if="max"> / {{ max }}</span>
                    </div>
                    <button 
                        @click="submit"
                        :disabled="selectedImages.length === 0"
                        class="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Добавить
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
