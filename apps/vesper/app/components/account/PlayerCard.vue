<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '#imports'

const { data } = useAuth()
const nickname = computed(() => data.value?.nickname ?? '')
const uuid     = computed(() => data.value?.uuid ?? '')

/* ----- ник ----- */
const editMode = ref(false)
const newNick  = ref(nickname.value)
async function saveNick () {
  /* TODO: PATCH /user/{uuid}/nickname */
  editMode.value = false
}

/* ----- пароль ----- */
const passOld = ref('')
const passNew = ref('')
async function changePassword () {
  /* TODO: PATCH /user/{uuid}/password */
  passOld.value = passNew.value = ''
}
</script>

<template>
  <div class="bg-gray-900/60 backdrop-blur-lg rounded-lg p-8">
    <h2 class="pr2p text-2xl text-red-500 mb-6">Игрок</h2>

    <div class="flex flex-col sm:flex-row sm:items-center gap-8">
      <img :src="`/distant-api/user/${nickname}/skin/head`"
           alt="Avatar" class="w-32 h-32 rounded-lg border-4 border-gray-800" />

      <div class="flex-1 space-y-6">
        <!-- Никнейм -->
        <div>
          <label class="block mb-1 text-sm text-gray-400">Никнейм</label>

          <!-- режим просмотра -->
          <div v-if="!editMode" class="flex items-center gap-2">
            <span class="font-mono text-lg">{{ nickname }}</span>
            <button @click="() => { newNick = nickname; editMode = true }"
                    class="text-gray-300 hover:text-red-400 transition">
              <Icon name="ic:baseline-edit" class="w-5 h-5" />
            </button>
          </div>

          <!-- режим редактирования -->
          <div v-else class="flex gap-2">
            <input v-model="newNick"
                   class="flex-1 bg-gray-800/70 rounded-md px-4 py-2 outline-none" />
            <button @click="saveNick"
                    class="bg-red-500 hover:bg-red-600 transition px-4 py-2 rounded-md text-black font-bold">
              ОК
            </button>
            <button @click="() => (editMode = false)"
                    class="bg-gray-700 hover:bg-gray-600 transition px-4 py-2 rounded-md">
              Отмена
            </button>
          </div>
        </div>

        <!-- Пароль -->
        <div class="space-y-2">
          <h3 class="pr2p text-xl text-red-400">Смена пароля</h3>

          <div class="grid sm:grid-cols-2 gap-2">
            <input v-model="passOld" type="password" placeholder="Старый пароль"
                   class="bg-gray-800/70 rounded-md px-4 py-2 outline-none" />
            <input v-model="passNew" type="password" placeholder="Новый пароль"
                   class="bg-gray-800/70 rounded-md px-4 py-2 outline-none" />
            <button @click="changePassword"
                    class="sm:col-span-2 bg-red-500 hover:bg-red-600 transition
                           px-4 py-2 rounded-md text-black font-bold w-full">
              Обновить пароль
            </button>
          </div>
        </div>

        <p class="text-gray-400 text-xs break-all">UUID: {{ uuid }}</p>
      </div>
    </div>
  </div>
</template>
