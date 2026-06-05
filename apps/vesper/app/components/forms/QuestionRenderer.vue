<script setup lang="ts">
import type { Question } from "@/types/forms";
import type { IGalleryImagePublic } from "~/types/gallery.types";
import ImageCarousel from "@/components/common/ImageCarousel.vue";
import ImageViewer from "@/components/common/ImageViewer.vue";

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
    // Image block
    images?: string[];
    galleryImageIds?: string[]; // IDs from gallery
    useGalleryImages?: boolean;
    displayMode?: 'grid' | 'carousel' | 'random' | 'vertical';
    showCaptions?: boolean;
    captions?: string[];
    // Text block
    content?: string;
    style?: 'normal' | 'info' | 'warning' | 'success';
}

// Parsed options if stored as JSON string
const options = computed<QuestionOptions>(() => {
    if (typeof props.question.options === 'string') {
        try { return JSON.parse(props.question.options); } catch { return {}; }
    }
    return props.question.options || {};
});

// Transform backend URLs to proxy for auth
const config = useRuntimeConfig();
function proxyImageUrl(url: string): string {
    if (!url) return '';
    // If URL points to backend, route through proxy
    const backendUrl = config.public.backendURL as string;
    if (url.startsWith(backendUrl)) {
        return url.replace(backendUrl, '/distant-api');
    }
    // For relative URLs that start with /upload or similar
    if (url.startsWith('/upload')) {
        return `/distant-api${url}`;
    }
    return url;
}

// Get proxied images array
const proxiedImages = computed(() => 
    (options.value.images || []).map(proxyImageUrl)
);

// Fetch gallery image info for watermarks
const galleryImageInfo = ref<Map<string, IGalleryImagePublic>>(new Map());

async function fetchGalleryInfo() {
    const ids = options.value.galleryImageIds || [];
    if (ids.length === 0) return;
    
    for (const id of ids) {
        if (galleryImageInfo.value.has(id)) continue;
        try {
            const { data } = await useApiFetch<IGalleryImagePublic>(`/gallery/${id}`);
            if (data.value) {
                galleryImageInfo.value.set(id, data.value);
            }
        } catch {
            // Ignore errors - just won't show watermark
        }
    }
}

// Get author info for image by index
const getImageAuthor = (idx: number) => {
    const ids = options.value.galleryImageIds || [];
    if (idx >= ids.length) return null;
    return galleryImageInfo.value.get(ids[idx])?.owner || null;
};

// Get gallery link for image by index
const getGalleryLink = (idx: number): string | null => {
    const ids = options.value.galleryImageIds || [];
    if (idx >= ids.length) return null;
    return `/gallery/${ids[idx]}`;
};

// For image_block with random mode
const randomImageIndex = ref(0);
const randomImage = computed(() => {
    if (proxiedImages.value.length === 0) return '';
    return proxiedImages.value[randomImageIndex.value % proxiedImages.value.length];
});

const randomCaption = computed(() => {
    const list = options.value.captions || [];
    if (list.length === 0) return '';
    const idx = randomImageIndex.value % (options.value.images?.length || 1);
    return list[idx] || '';
});

onMounted(() => {
    if (options.value.displayMode === 'random' && options.value.images?.length) {
        randomImageIndex.value = Math.floor(Math.random() * options.value.images.length);
    }
    // Fetch gallery info for watermarks
    if (options.value.useGalleryImages && options.value.galleryImageIds?.length) {
        fetchGalleryInfo();
    }
});

// Image viewer state
const viewerOpen = ref(false);
const viewerIndex = ref(0);

const openViewer = (index: number): void => {
    viewerIndex.value = index;
    viewerOpen.value = true;
};

// Text block style classes
const textBlockClasses = computed(() => {
    const style = options.value.style || 'normal';
    const baseClasses = 'p-4 rounded-lg text-gray-200 whitespace-pre-wrap';
    
    switch (style) {
        case 'info':
            return `${baseClasses} bg-blue-500/10 border border-blue-500/30`;
        case 'warning':
            return `${baseClasses} bg-yellow-500/10 border border-yellow-500/30`;
        case 'success':
            return `${baseClasses} bg-green-500/10 border border-green-500/30`;
        default:
            return `${baseClasses} bg-white/5`;
    }
});

const isDecorativeBlock = computed(() => ['image_block', 'text_block'].includes(props.question.type));
</script>

<template>
    <div 
        class="rounded-xl border border-white/5 bg-black/20 p-6 backdrop-blur-sm transition-all"
        :class="{'border-red-500/50': error}"
    >
        <!-- Header (always show for all block types with appropriate prefix) -->
        <div class="mb-4">
            <h4 class="text-lg text-gray-100 font-bold mb-1 flex items-start gap-2">
                <span v-if="question.type === 'image_block'" class="pr2p text-sm mt-1 text-blue-400/80">P{{ question.order_index + 1 }}.</span>
                <span v-else-if="question.type === 'text_block'" class="pr2p text-sm mt-1 text-green-400/80">T{{ question.order_index + 1 }}.</span>
                <span v-else class="pr2p text-sm mt-1 text-red-400/80">Q{{ question.order_index + 1 }}.</span>
                {{ question.title || (question.type === 'image_block' ? 'Изображения' : question.type === 'text_block' ? 'Текстовый блок' : 'Новый вопрос') }}
                <span v-if="question.is_required && !isDecorativeBlock" class="text-red-500 ml-1">*</span>
            </h4>
            <p v-if="question.description && !isDecorativeBlock" class="text-sm text-gray-400 ml-7">
                {{ question.description }}
            </p>
        </div>

        <!-- Inputs -->
        <div :class="{'ml-7': !isDecorativeBlock}">
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
            <div v-else-if="question.type === 'dropdown'" class="relative">
                <select
                    v-model="internalValue"
                    :disabled="readonly"
                    class="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-400 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                    <option value="" disabled selected class="bg-gray-900 text-gray-400">Выберите вариант...</option>
                    <option 
                        v-for="(opt, idx) in options.choices || []" 
                        :key="idx" 
                        :value="opt"
                        class="bg-gray-900 text-white py-2"
                    >
                        {{ opt }}
                    </option>
                </select>
                <!-- Custom dropdown arrow -->
                <Icon 
                    name="ph:caret-down" 
                    class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" 
                />
            </div>

            <!-- Image Block -->
            <div v-else-if="question.type === 'image_block'" class="space-y-2">
                <!-- Grid Mode -->
                <div v-if="options.displayMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div 
                        v-for="(img, idx) in proxiedImages" 
                        :key="idx"
                        class="relative aspect-video rounded-lg overflow-hidden bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity group"
                        @click="openViewer(idx)"
                    >
                        <img :src="img" :alt="`Image ${Number(idx) + 1}`" class="w-full h-full object-cover" />
                        
                        <!-- Author Watermark for Gallery Images -->
                        <div 
                            v-if="options.useGalleryImages && getImageAuthor(idx)"
                            class="absolute bottom-1 right-1 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs text-white"
                        >
                            <img 
                                :src="`/distant-api/user/${getImageAuthor(idx)?.uuid}/head`" 
                                class="w-4 h-4 rounded-sm"
                            />
                            <span>{{ getImageAuthor(idx)?.nickname }}</span>
                        </div>
                        
                        <!-- Gallery Link Button -->
                        <NuxtLink 
                            v-if="options.useGalleryImages && getGalleryLink(idx)"
                            :to="getGalleryLink(idx)!"
                            @click.stop
                            class="absolute top-1 right-1 p-1 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            title="Открыть в галерее"
                        >
                            <Icon name="ph:arrow-square-out" class="w-4 h-4 text-white" />
                        </NuxtLink>
                    </div>
                </div>
                
                <!-- Carousel Mode -->
                <ImageCarousel 
                    v-else-if="options.displayMode === 'carousel'" 
                    :images="proxiedImages"
                    :show-arrows="true"
                    :show-dots="true"
                    :captions="options.showCaptions ? (options.captions || []) : []"
                    @click="openViewer"
                />
                
                <!-- Random Mode -->
                <div v-else-if="options.displayMode === 'random'" class="space-y-2">
                    <div 
                        class="aspect-video rounded-lg overflow-hidden bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity relative group"
                        @click="openViewer(randomImageIndex)"
                    >
                        <img :src="randomImage" alt="Random image" class="w-full h-full object-cover" />
                        
                        <!-- Caption Overlay for Random -->
                        <div 
                            v-if="options.showCaptions && randomCaption" 
                            class="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-3 text-center"
                        >
                            <p class="text-white text-sm md:text-base font-medium">{{ randomCaption }}</p>
                        </div>
                        
                        <!-- Author Watermark for Random -->
                        <div 
                            v-if="options.useGalleryImages && getImageAuthor(randomImageIndex)"
                            class="absolute bottom-1 right-1 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs text-white"
                            :class="{ 'bottom-12': options.showCaptions && randomCaption }"
                        >
                            <img 
                                :src="`/distant-api/user/${getImageAuthor(randomImageIndex)?.uuid}/head`" 
                                class="w-4 h-4 rounded-sm"
                            />
                            <span>{{ getImageAuthor(randomImageIndex)?.nickname }}</span>
                        </div>
                        
                        <!-- Gallery Link Button -->
                        <NuxtLink 
                            v-if="options.useGalleryImages && getGalleryLink(randomImageIndex)"
                            :to="getGalleryLink(randomImageIndex)!"
                            @click.stop
                            class="absolute top-1 right-1 p-1 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            title="Открыть в галерее"
                        >
                            <Icon name="ph:arrow-square-out" class="w-4 h-4 text-white" />
                        </NuxtLink>
                    </div>
                </div>

                <!-- Vertical Mode (Image Left, Caption Right) -->
                <div v-else-if="options.displayMode === 'vertical'" class="space-y-4">
                    <div 
                        v-for="(img, idx) in proxiedImages" 
                        :key="idx"
                        class="flex flex-col md:flex-row gap-4 items-start"
                    >
                        <div 
                            class="relative w-full md:w-2/5 aspect-video rounded-lg overflow-hidden bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity shrink-0 group"
                            @click="openViewer(idx)"
                        >
                             <img :src="img" :alt="`Image ${Number(idx) + 1}`" class="w-full h-full object-cover" />
                             
                             <!-- Author Watermark -->
                             <div 
                                v-if="options.useGalleryImages && getImageAuthor(idx)"
                                class="absolute bottom-1 right-1 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs text-white"
                             >
                                <img 
                                    :src="`/distant-api/user/${getImageAuthor(idx)?.uuid}/head`" 
                                    class="w-4 h-4 rounded-sm"
                                />
                                <span>{{ getImageAuthor(idx)?.nickname }}</span>
                             </div>
                             
                             <!-- Gallery Link Button -->
                             <NuxtLink 
                                v-if="options.useGalleryImages && getGalleryLink(idx)"
                                :to="getGalleryLink(idx)!"
                                @click.stop
                                class="absolute top-1 right-1 p-1 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                title="Открыть в галерее"
                             >
                                <Icon name="ph:arrow-square-out" class="w-4 h-4 text-white" />
                             </NuxtLink>
                        </div>
                        <div class="w-full md:w-3/5 text-gray-200 whitespace-pre-wrap pt-1">
                            {{ options.captions?.[idx] || '' }}
                        </div>
                    </div>
                </div>
                
                <!-- Image Viewer Modal -->
                <ImageViewer 
                    :images="proxiedImages" 
                    :initial-index="viewerIndex"
                    :is-open="viewerOpen"
                    :captions="options.showCaptions ? (options.captions || []) : []"
                    @close="viewerOpen = false" 
                />
            </div>

            <!-- Text Block -->
            <div v-else-if="question.type === 'text_block'" :class="textBlockClasses">
                {{ options.content }}
            </div>
            
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
/* Custom Scrollbar for Textarea */
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
