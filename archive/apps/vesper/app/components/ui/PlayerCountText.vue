<!--
Inline component to resolve player count on a specific server
-->

<script setup lang="ts">
import {useIntervalFn} from '@vueuse/core';
import {onMounted} from "vue";

const props = defineProps({
  serverIp: String,
});

const isServerOnline = ref(true);
const serverOnlinePlayers = ref(-1);
const serverMaxPlayers = ref(-1);
const url = `https://api.mcstatus.io/v2/status/java/${props.serverIp}?query=false`;

async function fetchPlayerCount() {
  const res = await fetch(url, {
    method: 'GET',
  });

  if (res.status !== 200) {
    isServerOnline.value = false;
    return;
  }
  const json = await res.json();
  const jsonIsServerOnline = json.online;

  if (jsonIsServerOnline) {
    serverOnlinePlayers.value = json.players.online;
    serverMaxPlayers.value = json.players.max;
    isServerOnline.value = true;
  } else {
    isServerOnline.value = false;
  }
}

onMounted(() => {
  fetchPlayerCount();

  // Такой интервал(61с) выбран, т.к. https://mcstatus.io кеширует свой ответ на 1 минуту(60с)
  // и при слишком частых запросах отдаёт одно и то же
  useIntervalFn(fetchPlayerCount, 61_000);
});

</script>

<template>
  <p v-if="isServerOnline">
    Онлайн игроков: <span class="font-semibold">{{ serverOnlinePlayers }}/{{ serverMaxPlayers }}</span>
  </p>
  <p v-else>
    Сервер недоступен
  </p>
</template>

<style scoped>

</style>