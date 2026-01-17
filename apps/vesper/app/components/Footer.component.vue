<template>
  <footer class="bg-[#2a0000] mt-auto py-8 px-6">
    <div class="max-w-7xl mx-auto text-center text-gray-400 space-y-4">
      <div class="flex items-center justify-center space-x-6">
        <a href="#" class="transition hover:text-red-500 font-medium">Discord</a>
        <NuxtLink href="https://t.me/helicraft" class="transition hover:text-red-500 font-medium">Telegram</NuxtLink>
        <NuxtLink href="https://github.com/HeliCraft-MC" class="transition hover:text-red-500 font-medium">GitHub</NuxtLink>
      </div>
      <div class="flex items-center justify-center space-x-6">
        <NuxtLink to="/rules" class="transition hover:text-red-500 font-medium">Правила / Rules / TOS</NuxtLink>
        <NuxtLink to="/privacy" class="transition hover:text-red-500 font-medium">Политика конфиденциальности / Privacy Policy / GDPR</NuxtLink>
      </div>
      <p class="text-sm">© 2020-{{currentYear}} HeliCraft.</p>
      <p class="text-sm">NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.</p>

      <p class="text-sm">
        Running under
        <NuxtLink class="text-sm" :to="'https://github.com/HeliCraft-MC/Vesper/commit/' + vesperCommit"> Vesper@{{ vesperCommitShort }} </NuxtLink>
        and
        <NuxtLink class="text-sm" :to="'https://github.com/HeliCraft-MC/Teapot/commit/' + teapotCommit"> Teapot@{{ teapotCommitShort }} </NuxtLink>
      </p>


      <p class="text-sm">Site software developed by ms0ur. Licensed under <NuxtLink to="https://eupl.eu/1.2/en/" class="underline">EUPL-1.2-or-later</NuxtLink></p>
    </div>
  </footer>
</template>

<script setup>
const config = useRuntimeConfig()


const currentYear = new Date().getFullYear();

const vesperCommit = config.public.vesperCommit || 'unknown';
const vesperCommitShort = vesperCommit.toString().slice(0, 7);

// получить json по /distant-api/ и из json взять строку commit
const res = await $fetch('/distant-api');
const teapotCommit = res.commit || 'unknown';
const teapotCommitShort = teapotCommit.toString().slice(0, 7);
</script>
