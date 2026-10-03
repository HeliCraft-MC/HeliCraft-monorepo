[English](README.md) | [HeliCraft](../../README_RU.md)

# Atria

**Дать всем интерфейсам HeliCraft единый визуальный язык и правила взаимодействия.**

React · TypeScript · Tailwind CSS 4 · Base UI · Storybook

Приватный UI-пакет с экспортом исходников для Vega и будущего Altair. `Button` оборачивает доступный примитив Base UI: стили primary/quiet, disabled и управление клавиатурой. `@helicraft/atria/styles.css` подключает Tailwind CSS 4, общие токены и явное сканирование исходников библиотеки. Потребители подключают Tailwind Vite plugin; React остаётся peer dependency.

```sh
bun run dev:atria
bun run build:atria
bun run test:atria
bun run storybook
bun run build:storybook
```

Storybook на localhost:6006 содержит состояния primary, quiet и disabled, документацию и проверки доступности. Vitest/Testing Library проверяет клавиатуру и disabled. Импортируйте компоненты из `@helicraft/atria`, стили из `@helicraft/atria/styles.css`. В `dist/` — ESM и декларации; внутри workspace используется исходный код для HMR Vite. Отдельного сервиса и Compose у Atria нет: библиотека входит в сборку потребителя. Будущие примитивы: формы, окна, таблицы, состояния и правила анимации.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/setup-research_RU.md).

## Название

Атриа — α Южного Треугольника, звезда в созвездии Южного Треугольника. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
