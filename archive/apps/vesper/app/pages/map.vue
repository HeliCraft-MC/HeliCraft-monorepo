<script setup lang="ts">
definePageMeta({
  auth: false,
  scrollToTop: true
});

const eventBus = useAppEventBus();

onMounted(() => {
  eventBus.emit("hideHeaderAndFooter");
});

onBeforeUnmount(() => {
  eventBus.emit("showHeaderAndFooter");
});
</script>

<template>
  <div class="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-start relative">
    <!--  <h1 class="font-extrabold text-red-500 mb-4 text-2xl">Карта сервера</h1>-->
    <iframe
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
        src="https://map.helicraft.ru/"
        class="w-full lg:h-full h-[95%] flex-auto absolute top-0 left-0 z-0"
    >

    </iframe>

    <NuxtLink
      to="/"
      class="absolute left-0 bottom-0 lg:left-2 lg:bottom-2 w-screen lg:w-auto z-1 flex-1 sm:flex-initial bg-red-500 hover:bg-red-600 transition-all px-6 py-3 lg:rounded-lg font-bold text-black text-lg flex items-center justify-center gap-2"
      >
      <Icon name="solar:home-2-bold-duotone" class="w-5 h-5" />
      Вернуться
    </NuxtLink>
  </div>
</template>

<style scoped>

</style>