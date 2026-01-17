<script setup lang="ts">
const route = useRoute()
const path = '/' + (
    Array.isArray(route.params.slug)
        ? route.params.slug.join('/')
        : (route.params.slug ?? '')
)
const { data: page, error } = await useAsyncData(`page:${path}`, () =>
    queryCollection('pages').path(path).first()
)

if (!page.value) {
  setResponseStatus(404, 'Not Found')
  throw createError({ statusCode: 404, statusMessage: 'Страница не найдена' })
}

if (error.value) {
  setResponseStatus(500, 'Internal Error')
  throw createError({
    statusCode: 500,
    statusMessage: 'Внутренняя ошибка сервера',
    message: error.value.message,
  })
}

useSeoMeta({ title: page.value?.title ?? 'Страница' })
definePageMeta({ auth: false }) // публичная

</script>

<template>
  <main class="min-h-screen  overflow-x-hidden bg-black text-white flex flex-col pt-24 md:pt-28">
    <section
        class="prose prose-invert text-lg max-w-full mx-auto px-4 py-16 flex-1"
    >
      <h1
          v-if="page?.title"
          class="mb-6 text-red-500 text-4xl font-bold"
          style="font-family:'Press Start 2P',system-ui"
      >
        {{ page.title }}
      </h1>

      <ContentRenderer v-if="page" :value="page" />
      <template v-else>
        <div class="flex-grow flex flex-col items-center justify-center space-y-6">
          <h1
              class="text-red-500 text-6xl md:text-8xl font-bold"
              style="font-family:'Press Start 2P',system-ui"
          >
            404
          </h1>
          <p class="text-gray-400 text-xl md:text-2xl">
            Упс! Такой страницы не существует.
          </p>
          <client-only>
            <a
                href="/"
                class="inline-block px-8 py-4 bg-red-500 text-black font-mono uppercase rounded-md
                     hover:bg-red-600 transition-colors duration-300"
            >
              Вернуться на главную
            </a>
          </client-only>
        </div>
      </template>
    </section>
  </main>
</template>

<style lang="postcss" scoped>
/* ————— фирменные заголовки ————— */
:deep(h1) {
  font-family: "Press Start 2P", system-ui;
  font-size: 24px;
  padding-top: 1em;
  font-weight: 400;
  color: #f87171; /* red-400 */
}
:deep(h2, h3, h4, h5, h6) {
  font-family: "Press Start 2P", system-ui;
  font-weight: 400;
  color: #f87171;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
}

/* ————— базовая типографика ————— */
.prose {
  font-size: 1.125rem;  /* text-lg */
  line-height: 1.85;
}




/* ————— нумерованные списки ————— */
.prose :deep(ol)          { counter-reset: li; padding-left: 0; }
.prose :deep(ol > li)     { counter-increment: li; display: table-row; margin-bottom: .8em; }
.prose :deep(ol ol)       { counter-reset: li; }
.prose :deep(ol > li::before) {
  content: counters(li, ".") ".";
  display: table-cell;
  padding-right: .6em;
  text-align: right;
  font: inherit;
}
.prose :deep(> ol > li)        { margin-bottom: 1.25em; }
.prose :deep(> ol > li::before){
  font-family: "Press Start 2P", system-ui;
  color: #f87171;
  font-size: 1.25rem;
  font-weight: 400;
}

/* ————— маркеры списков ————— */
.prose :deep(ul)              { @apply list-disc pl-5 space-y-2; }
.prose :deep(ul > li::marker) { color: #f87171; font-weight: 400; }

/* ---------- таблицы ---------- */
.prose :deep(table) {
  /* блочный контейнер для прокрутки и тач-скроллинга */
  display: block;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-collapse: collapse;
  margin-bottom: 1.5rem; /* mb-6 */
  text-align: left;
}

/* кастомная высота и вид скроллбара (опционально) */
.prose :deep(table::-webkit-scrollbar) {
  height: 0.5rem; /* h-2 */
}
.prose :deep(table::-webkit-scrollbar-thumb) {
  background-color: #374151; /* bg-gray-700 */
  border-radius: 0.25rem;
}

/* заголовок */
.prose :deep(thead) {
  background-color: #111827; /* bg-gray-950 */
}
.prose :deep(thead th) {
  padding: 0.5rem 0.75rem; /* px-3 py-2 */
  border: 1px solid #374151; /* border-gray-700 */
  color: #f87171;           /* text-red-400 */
  white-space: nowrap;      /* не переносить текст */
}

/* ячейки */
.prose :deep(tbody td) {
  padding: 0.5rem 0.75rem; /* px-3 py-2 */
  border: 1px solid #374151; /* border-gray-700 */
  white-space: nowrap;      /* не переносить текст */
}

/* полосатость строк и hover */
.prose :deep(tbody tr:nth-child(odd)) {
  background-color: #1f2937; /* bg-gray-800 */
}
.prose :deep(tbody tr:hover) {
  background-color: rgba(55,65,81,0.5); /* bg-gray-700/50 */
}

/* от md и выше: обычная таблица, ограниченная по ширине 80% и центрированная */
@media (min-width: 768px) {
  .prose :deep(table) {
    display: table;
    overflow: visible;
    max-width: 90%;
    margin-left: auto;
    margin-right: auto;
  }
  .prose :deep(thead th) {
    white-space: normal; /* переносить текст */
  }
  .prose :deep(tbody td) {
    white-space: normal; /* переносить текст */
  }
}



/* ---------- blockquote ---------- */
.prose :deep(blockquote) {
  @apply border-l-4 border-red-400 bg-gray-900/50 italic pl-6 py-4 my-6;
}
.prose :deep(blockquote p) { @apply my-0 text-gray-200; }

/* ————— подчёркивание ссылок ————— */
.prose :deep(a) { @apply underline decoration-dotted underline-offset-4; }
</style>
