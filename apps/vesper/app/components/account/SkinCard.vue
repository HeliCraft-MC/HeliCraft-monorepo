<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAuth } from '#imports'
import * as skinview3d from 'skinview3d'
import FileDropDown from "~/components/ui/FileDropDown.vue";

const { data } = useAuth()
const nickname = computed(() => data.value?.nickname ?? '')

/* ---------- viewer ---------- */
const canvasRef = ref<HTMLCanvasElement | null>(null)
let viewer: skinview3d.SkinViewer | null = null
const error = ref<string>('')

onMounted(() => {
  if (!canvasRef.value) return
  viewer = new skinview3d.SkinViewer({
    canvas: canvasRef.value,
    width: 180,
    height: 200
  })
  viewer.autoRotate = true

  /* ——— Загрузка скина при любом изменении nickname ——— */
  watchEffect(() => {
    // при первом запуске и при любом обновлении nickname.value
    if (viewer && nickname.value) {
      viewer.loadSkin(`/distant-api/user/${nickname.value}/skin`)
    }
  })
})

onBeforeUnmount(() => {
  viewer?.dispose?.()
})


/* ---------- загрузка ---------- */
const file      = ref<File | null>(null)
const preview   = ref<string>('')      // blob-URL
const showModal = ref(false)
const uploading = ref(false)

function onSelect (selectedFile: File, previewLink: string) {
  file.value = selectedFile;
  preview.value = previewLink;
}

function onRemove() {
  file.value = null;
  preview.value = '';
}


async function confirmUpload() {
  if (!file.value) return
  uploading.value = true
  showModal.value = false

  try {
    //const config = useRuntimeConfig()
    const { token } = useAuth()

    const fd = new FormData()
    fd.append('skin', file.value)

    // raw → даёт полноценный Response
    const res = await $fetch.raw(`/distant-api/user/${nickname.value}/skin`, {
      method:   'POST',
      credentials: 'include',
      headers:  token.value ? { Authorization: `${token.value}` } : undefined,
      body:     fd
    })

    if (!res.ok) {
      throw new Error(`Ошибка загрузки: ${res.status}`)
    }
    window.location.reload()
  } catch (e: any) {
    console.error('Ошибка при загрузке скина:', e.message)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-8">
    <h2 class="pr2p text-2xl text-red-500 mb-6">Скин</h2>

    <div class="flex flex-col items-center sm:items-stretch sm:flex-row gap-6">
      <!-- 3-D skin -->
      <canvas ref="canvasRef" class="rounded-md border border-gray-700 h-full"></canvas>

      <!-- инструменты -->
      <div class="flex-1 space-y-4 flex flex-col">

        <FileDropDown
            class="grow"
            :fileTypes="['image/png']"
            @onSelect="onSelect"
            @onRemove="onRemove"
        />

        <button :disabled="!file || uploading"
                @click="showModal = true"
                class="bg-red-500 hover:bg-red-600 transition px-6 py-3 rounded-md
                       text-black font-bold disabled:opacity-60 shrink w-auto">
          {{ uploading ? 'Загружаю…' : 'Загрузить новый скин' }}
        </button>
      </div>
    </div>

    <!-- модальное подтверждение -->
    <Teleport to="body">
      <div v-if="showModal"
           class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div class="bg-gray-900 rounded-lg p-6 w-11/12 max-w-md space-y-4">
          <h3 class="pr2p text-xl text-red-400">Подтвердить загрузку</h3>
          <p class="text-gray-300 text-sm">
            Скины, нарушающие <NuxtLink to="/rules" class="underline">правила</NuxtLink>, запрещены.
            За неуместный скин можно получить бан.
          </p>
          <NuxtImg v-if="preview" :src="preview"
                   class="w-40 h-40 mx-auto rounded-md border border-gray-700 object-cover" />

          <div class="flex justify-end gap-3 pt-2">
            <button @click="showModal = false"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md">
              Отмена
            </button>
            <button @click="confirmUpload"
                    class="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-black font-bold">
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
