<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <header>
      <h1 class="pr2p text-3xl md:text-4xl text-red-500 mb-2">Панель администратора</h1>
      <p class="text-gray-400">Добро пожаловать в админ-панель HeliCraft</p>
    </header>

    <!-- Quick Actions -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        to="/admin/gallery"
        class="group bg-gray-800/60 hover:bg-gray-800 border border-white/5 hover:border-red-500/30 rounded-xl p-6 transition-all"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition">
            <Icon name="ph:images-bold" class="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 class="font-bold text-white group-hover:text-red-400 transition">Галерея</h3>
            <p class="text-sm text-gray-500">Модерация изображений</p>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink
        to="/admin/forms"
        class="group bg-gray-800/60 hover:bg-gray-800 border border-white/5 hover:border-red-500/30 rounded-xl p-6 transition-all"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition">
            <Icon name="ph:clipboard-text-bold" class="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 class="font-bold text-white group-hover:text-blue-400 transition">Формы</h3>
            <p class="text-sm text-gray-500">Управление формами</p>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink
        to="/admin/states"
        class="group bg-gray-800/60 hover:bg-gray-800 border border-white/5 hover:border-red-500/30 rounded-xl p-6 transition-all"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition">
            <Icon name="ph:flag-bold" class="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 class="font-bold text-white group-hover:text-green-400 transition">Государства</h3>
            <p class="text-sm text-gray-500">Управление государствами</p>
          </div>
        </div>
      </NuxtLink>
    </section>

    <!-- Info Cards -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-gray-800/40 border border-white/5 rounded-xl p-6">
        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="ph:info" class="w-5 h-5 text-blue-400" />
          Быстрые действия
        </h3>
        <ul class="space-y-2 text-sm text-gray-400">
          <li class="flex items-center gap-2">
            <Icon name="ph:check-circle" class="w-4 h-4 text-green-400" />
            Проверьте новые изображения в галерее
          </li>
          <li class="flex items-center gap-2">
            <Icon name="ph:clipboard" class="w-4 h-4 text-blue-400" />
            Создайте новую форму для сбора данных
          </li>
          <li class="flex items-center gap-2">
            <Icon name="ph:flag" class="w-4 h-4 text-yellow-400" />
            Управляйте государствами и альянсами
          </li>
        </ul>
      </div>

      <div class="bg-gray-800/40 border border-white/5 rounded-xl p-6">
        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="ph:warning" class="w-5 h-5 text-yellow-400" />
          Напоминания
        </h3>
        <ul class="space-y-2 text-sm text-gray-400">
          <li class="flex items-center gap-2">
            <Icon name="ph:clock" class="w-4 h-4 text-gray-500" />
            Регулярно проверяйте очередь модерации
          </li>
          <li class="flex items-center gap-2">
            <Icon name="ph:shield" class="w-4 h-4 text-gray-500" />
            Следите за соблюдением правил сервера
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
