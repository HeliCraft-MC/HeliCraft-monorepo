<script setup lang="ts">
import { useAuth } from '#imports'
import PlayerCard from "~/components/account/PlayerCard.vue";
import SkinCard from "~/components/account/SkinCard.vue";
import StatsCard from "~/components/account/StatsCard.vue";
import NationsCard from "~/components/account/NationsCard.vue";
import GalleryCard from "~/components/account/GalleryCard.vue";

definePageMeta({ auth: true })

const { signOut }: { signOut: () => void } = useAuth()

const signOutPage = async () => {
  try {
    signOut()
    window.location.href = '/'
  } catch (error) {
    console.error('Ошибка при выходе:', error)
  }
}

const isStatesDisabled = useRuntimeConfig().public.statesDisabled
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col items-center pt-24 md:pt-28 px-4 pb-20">
    <section class="w-full max-w-3xl space-y-12">
      <PlayerCard />
      <SkinCard />
      <StatsCard />
      <GalleryCard />
      <NationsCard v-if="!isStatesDisabled" />

      <!-- Выход -->
      <div class="text-center">
        <button @click="signOutPage"
                class="bg-gray-700 hover:bg-gray-600 transition px-6 py-3 rounded-md">
          Выйти из аккаунта
        </button>
      </div>
    </section>
  </main>
</template>
