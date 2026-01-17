<!-- pages/states/index.vue -->
<script setup lang="ts">
import type { IState } from '~/types/state.types'
import StateCard from "~/components/states/StateCard.vue";

definePageMeta({
  auth: false,
})

const router = useRouter()
const { data: session } = useAuth()

interface IStateWithMembers extends IState {
  members?: number;
}

const featured = ref<IStateWithMembers[]>([])

onMounted(async () => {
  try {
    //console.log('Загрузка списка государств...');
    const stateList = await $fetch<IState[]>('/distant-api/state/list/some');

    //console.log('Ответ от /distant-api/state/list:', stateList);

    if (stateList && Array.isArray(stateList) && stateList.length > 0) {
      //console.log(`Получено ${stateList.length} государств. Загрузка данных об участниках...`);

      const statesWithMembers = await Promise.all(
          stateList.map(async (s) => {
            try {
              //console.log(`Запрос участников для государства ${s.name} (UUID: ${s.uuid})`);
              const membersResponse = await $fetch<number | { count: number }>(`/distant-api/state/${s.uuid}/members-count`);
              const membersCount = typeof membersResponse === 'number' ? membersResponse : membersResponse.count;
              return { ...s, members: membersCount };
            } catch (memberError) {
              console.error(`Ошибка загрузки участников для государства ${s.name}:`, memberError);
              return { ...s, members: 0 }; // В случае ошибки ставим 0
            }
          })
      );

      //console.log('Финальный массив государств с участниками:', statesWithMembers);

      featured.value = statesWithMembers;
    } else {
      //console.log('Сервер вернул пустой список государств.');
      featured.value = [];
    }
  } catch (error) {
    console.error('Произошла глобальная ошибка при загрузке государств:', error);
  }
})

function goToCreate() {
  if (!session.value) {
    router.push('/login')
  } else {
    router.push('/states/create')
  }
}
</script>

<template>
  <main class="min-h-screen bg-black text-white flex flex-col items-center px-6 py-16 pt-24 md:pt-28">
    <!-- Заголовок -->
    <h1 class="pr2p text-red-500 text-5xl mb-4 text-center">
      Система государств
    </h1>
    <p class="text-gray-300 text-lg max-w-2xl text-center mb-12">
      Создавай своё государство, объединяйся в союзы, строй города и пиши историю вместе с друзьями на сервере HeliCraft.
      Дипломатия, экономика, войны — всё это в твоих руках!
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
      <div class="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col items-center text-center space-y-4">
        <Icon name="solar:crown-star-bold-duotone" class="w-12 h-12 text-red-500" />
        <h3 class="text-xl font-semibold">Создай государство</h3>
        <p class="text-gray-400 text-sm">Стань основателем нового мира — определи название, правила и флаг.</p>
      </div>
      <div class="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col items-center text-center space-y-4">
        <Icon name="solar:users-group-two-rounded-bold-duotone" class="w-12 h-12 text-red-500" />
        <h3 class="text-xl font-semibold">Управлять гражданами</h3>
        <p class="text-gray-400 text-sm">Приглашай друзей, назначай роли и расширяй своё влияние.</p>
      </div>
      <div class="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col items-center text-center space-y-4">
        <Icon name="solar:buildings-2-bold-duotone" class="w-12 h-12 text-red-500" />
        <h3 class="text-xl font-semibold">Развивать города</h3>
        <p class="text-gray-400 text-sm">Строй и улучшай города, контролируй ресурсы и инфраструктуру.</p>
      </div>
      <div class="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col items-center text-center space-y-4">
        <Icon name="solar:shield-minimalistic-bold-duotone" class="w-12 h-12 text-red-500" />
        <h3 class="text-xl font-semibold">Дипломатия и союзы</h3>
        <p class="text-gray-400 text-sm">Заключай мирные договоры и создавай альянсы.</p>
      </div>
      <div class="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col items-center text-center space-y-4">
        <Icon name="solar:sledgehammer-bold-duotone" class="w-12 h-12 text-red-500" />
        <h3 class="text-xl font-semibold">Войны и конфликты</h3>
        <p class="text-gray-400 text-sm">Объявляй войны и участвуй в сражениях.</p>
      </div>
      <div class="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col items-center text-center space-y-4">
        <Icon name="solar:clock-circle-bold-duotone" class="w-12 h-12 text-red-500" />
        <h3 class="text-xl font-semibold">История и хроники</h3>
        <p class="text-gray-400 text-sm">Веди летопись событий и сохраняй славные победы и достижения.</p>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 mb-16">
      <button
          @click="goToCreate"
          class="bg-red-500 hover:bg-red-600 transition py-3 px-8 rounded-md font-bold text-black"
      >
        Создать государство
      </button>
      <NuxtLink
          to="/account"
          class="bg-gray-700 hover:bg-gray-600 transition py-3 px-8 rounded-md font-bold text-white"
      >
        Мои государства
      </NuxtLink>
      <NuxtLink
          to="/states/list"
          class="bg-gray-700 hover:bg-gray-600 transition py-3 px-8 rounded-md font-bold text-white"
      >
        Список государств сервера
      </NuxtLink>
      <NuxtLink
          to="/states/alliances"
          class="bg-gray-700 hover:bg-gray-600 transition py-3 px-8 rounded-md font-bold text-white"
      >
        Список альянсов сервера
      </NuxtLink>
    </div>

    <section v-if="featured.length" class="max-w-full w-full space-y-6">
      <h2 class="text-2xl text-red-500 font-semibold pr2p text-center">Некоторые государства</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StateCard v-for="st in featured" :key="st.uuid" :state="st" :members="st.members" />
      </div>
    </section>
  </main>
</template>

<style scoped>
</style>
