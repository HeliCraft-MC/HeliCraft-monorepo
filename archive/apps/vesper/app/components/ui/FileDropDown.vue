<script setup lang="ts">

import {generateFileUrl} from "~/utils/files.utils";

const { fileTypes } = defineProps<{
  fileTypes: string[];
}>();

const $emit = defineEmits<{
  onSelect: [file: File, previewLink: string];
  onRemove: [];
}>();

const eventBus = useAppEventBus()

const isDragging = ref(false);
const chosenFile = ref<File | null>(null);
const previewLink = ref<string | null>(null); // blob from file

async function showError(error: string) {
  eventBus.emit('show-error', {
    message: error
  })
}

async function onSelect(selectedFile: File) {
  if(previewLink.value)
    revokeFileUrl(previewLink.value);
  previewLink.value = null;
  chosenFile.value = null;

  if (!selectedFile) return;

  // Проверяем тип и расширение
  const isValidType = fileTypes.includes(selectedFile.type);
  console.log(isValidType);
  if (!isValidType) {
    await showError('Неверный формат файла.');
    return
  }

  chosenFile.value = selectedFile
  previewLink.value = generateFileUrl(chosenFile.value)

  $emit('onSelect', chosenFile.value, previewLink.value);
}

async function onRemove() {
  chosenFile.value = null;
  if(previewLink.value)
    revokeFileUrl(previewLink.value);
  previewLink.value = null;

  $emit('onRemove');
}

async function onSelectFileInInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  await onSelect(target.files[0]!);

  // Обнуляем инпут
  target.value = '';
}

async function dropDownDragOver(e: DragEvent) {
  if(chosenFile.value !== null)
    return;

  e.preventDefault();
  isDragging.value = true;
}
async function dropDownDragLeave() {
  isDragging.value = false;
}
async function dropDownDrop(e: DragEvent) {
  if(chosenFile.value !== null)
    return;

  e.preventDefault();
  if(!e.dataTransfer)
    return;
  if(e.dataTransfer.files.length !== 1) {
    await showError("Перетащите только один файл");
    await dropDownDragLeave();
    return;
  }

  await onSelect(e.dataTransfer.files.item(0)!);
  isDragging.value = false;
}

</script>

<template>
  <div
      class="bg-gray-900/60 text-center dropzone-border
             flex flex-col items-center justify-center
              w-full"
      :class="{
        'dragging': isDragging && chosenFile === null,
        'py-5 sm:py-0': chosenFile === null,
        'selected': chosenFile !== null
      }"
      @dragover="dropDownDragOver"
      @dragleave="dropDownDragLeave"
      @drop="dropDownDrop"
  >
    <input
        id="fileInput"
        type="file"
        name="file"
        class="hidden-input"
        @change="onSelectFileInInput"
        ref="file"
        :accept="fileTypes.join(',')"
        v-if="chosenFile === null"
    />

    <label
        for="fileInput"
        class="file-label"
        v-if="chosenFile === null"
    >
      <div v-if="isDragging">Отпустите файл.</div>
      <div v-else>Перетащите файл или кликните <u>сюда</u> для загрузки.</div>
    </label>

    <div
      class="preview-container h-full w-full flex flex-col lg:flex-row justify-center items-center gap-3 py-2 relative"
      v-if="chosenFile !== null"
    >
      <img :src="previewLink ?? ''" alt="Preview" class="preview-img h-full" />
      <div class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 transition
                  p-2 rounded-md text-black font-bold shrink w-auto self-end flex
                  flex-row justify-center items-center cursor-pointer"
           @click="onRemove"
      >
        <Icon name="solar:trash-bin-trash-bold" class="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
</template>

<style scoped>

.hidden-input {
  opacity: 0;
  overflow: hidden;
  position: absolute;
  width: 1px;
  height: 1px;
}

.file-label {
  font-size: 20px;
  display: block;
  cursor: pointer;
}

.preview-container {
  display: flex;
}

.preview-img {
  border-radius: 5px;
  border: 1px solid #a2a2a2;
  background-color: #a2a2a2;
}

.dropzone-border {
  --borderColor: rgb(239 68 68);

  position: relative;
  border: 1px solid var(--borderColor);

  &.selected {
    --borderColor: #a2a2a2;
  }

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 20px;
    height: 20px;
    transition: .3s ease-in-out;
  }

  &::before {
    top: -5px;
    left: -5px;
    border-top: 1px solid var(--borderColor);
    border-left: 1px solid var(--borderColor);
  }

  &::after {
    right: -5px;
    bottom: -5px;
    border-bottom: 1px solid var(--borderColor);
    border-right: 1px solid var(--borderColor);
  }

  &.dragging::before,
  &.dragging::after {
    width: calc(100% + 9px);
    height: calc(100% + 9px);
  }
}
</style>
