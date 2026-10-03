<script setup lang="ts">
import ErrorModal from "~/components/ui/ErrorModal.vue";

const eventBus = useAppEventBus();

const hideHeaderAndFooter = ref(false);

// Состояние для ErrorModal
const showErrorModal = ref(false);
const errorModalTitle = ref('Ошибка');
const errorModalMessage = ref('');

eventBus.on("showHeaderAndFooter", () => {
  hideHeaderAndFooter.value = false;
});

eventBus.on("hideHeaderAndFooter", () => {
  hideHeaderAndFooter.value = true;
});

// Слушаем событие show-error
eventBus.on('show-error', (payload) => {
  errorModalTitle.value = payload.title || 'Ошибка';
  errorModalMessage.value = payload.message;
  showErrorModal.value = true;
});

</script>
<template>
  <NavbarComponent v-if="!hideHeaderAndFooter" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <FooterComponent v-if="!hideHeaderAndFooter" />

  <!-- Глобальное модальное окно ошибки -->
  <ErrorModal
      :is-open="showErrorModal"
      :title="errorModalTitle"
      :message="errorModalMessage"
      @close="showErrorModal = false"
  />
</template>
<style>
.pr2p{
  font-family: "Press Start 2P", system-ui;
  font-weight: 400;
  font-style: normal;
}
.code {
  font-family: "Source Code Pro", monospace;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
}
h1, h2, h3, h4, h5, h6 {
  font-family: "Press Start 2P", system-ui;
  font-weight: 400;
  color: #f87171; /* red-400 */
}
</style>
