<template>
  <!-- Весь блок кликабелен -->
  <NuxtLink
      :to="`/states/alliances/${alliance.uuid}`"
      class="alliance-card group flex items-center gap-4"
  >
    <!-- Флаг: 2 (h) к 1 (w) -->
    <img
        :src="alliance.flag_link"
        :alt="`Флаг ${alliance.name}`"
        class="flag-img flex-shrink-0 border-2 rounded-lg object-cover"
        :style="{ borderColor: alliance.color_hex }"
    />

    <!-- Текстовая часть -->
    <div class="flex-1 min-w-0">
      <h3
          class="font-semibold leading-snug break-words group-hover:underline text-base md:text-lg"
          :style="{ color: alliance.color_hex }"
      >
        {{ alliance.name }}
      </h3>

      <p class="text-sm text-gray-400">
        Цель: {{ purposeText(alliance.purpose) }}
      </p>

      <p v-if="members !== null" class="text-xs text-gray-500">
        Участников: {{ members }}
      </p>
    </div>

    <!-- Статус -->
    <span
        v-if="alliance.status === AllianceStatus.DISSOLVED"
        class="status-pill bg-red-600/30 text-red-300"
    >
      Распущен
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { type IAlliance, AlliencePurpose, AllianceStatus } from '~/types/diplomacy.types'

const props = defineProps<{
  alliance: IAlliance
  /** Кол-во участников; null — если не загружено */
  members: number | null
}>()

/** Лейблы для целей */
function purposeText (purpose: string) {
  const map: Record<string, string> = {
    [AlliencePurpose.ECONOMIC]: 'Экономический',
    [AlliencePurpose.MILITARY]: 'Военный',
    [AlliencePurpose.DIPLOMATIC]: 'Дипломатический',
    [AlliencePurpose.GENERAL]: 'Общий',
    [AlliencePurpose.OTHER]: 'Другое'
  }
  return map[purpose] ?? 'Не указана'
}
</script>

<style scoped>
/* Карточка */
.alliance-card {
  @apply bg-gray-800/70 p-4 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-1;
}

/* Флаг с фиксированным соотношением 2:1 (h:w) */
.flag-img {
  /* 56 × 112 px на мобильных, 64 × 128 px на ≥ md */
  width: 56px;
  height: 112px; /* 2 × width */
}

@media (min-width: 768px) {
  .flag-img {
    width: 64px;
    height: 128px;
  }
}

/* Пилл статуса */
.status-pill {
  @apply px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap;
}
</style>
