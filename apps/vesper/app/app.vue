<template>
  <NavbarComponent />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <FooterComponent />
</template>
<script setup lang="ts">
</script>
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
