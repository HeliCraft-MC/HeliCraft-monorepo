<!--
Copy server address on main page
-->

<script setup lang="ts">
const props = defineProps({
  serverAddress: {
    type: String,
    required: true,
  },
});

const copySuccess = ref(false);

function copyAddress() {
  navigator.clipboard
      .writeText(props.serverAddress)
      .then(() => {
        if(!copySuccess.value) {
          copySuccess.value = true;
          setTimeout(() => (copySuccess.value = false), 2000);
        }
      })
      .catch(() => console.error('Не удалось скопировать адрес'));
}
</script>

<template>
  <div
      class="flex items-center bg-gray-800/50 rounded-md px-5 py-3 mb-6 server-address-copy"
      @click="copyAddress"
  >
    <p class="font-mono text-xl sm:text-2xl">{{ serverAddress }}</p>
    <button
        class="flex items-center justify-center p-2 rounded-full relative"
        aria-label="Скопировать адрес сервера"
    >
      <Icon
          :name="'solar:clipboard-check-bold-duotone'"
          :class="copySuccess ? 'display:none' : 'opacity-0'"
          class="w-6 h-6 text-white"
      />
      <Icon
          :name="'solar:copy-bold-duotone'"
          :class="!copySuccess ? 'opacity-100' : 'opacity-0'"
          class="w-6 h-6 text-white absolute"
      />
    </button>
  </div>
</template>

<style scoped>
.server-address-copy {
  user-select: none;
  cursor: pointer;
}
</style>