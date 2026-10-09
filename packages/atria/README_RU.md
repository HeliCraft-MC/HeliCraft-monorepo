[English](README.md) | [HeliCraft](../../README_RU.md)

# Atria

**Дать всем интерфейсам HeliCraft единый визуальный язык и правила взаимодействия.**

React · TypeScript · SCSS Modules · Base UI · Storybook

Приватный UI-пакет с экспортом исходников для Vega и будущего Altair. `Button` оборачивает доступный примитив Base UI: стили primary/quiet, disabled и управление клавиатурой. Все стили написаны на SCSS: `button.module.scss` изолирует классы компонента, а `@helicraft/atria/styles.scss` содержит общие цветовые токены и базовые стили. Vite компилирует SCSS и SCSS-модули через dev-зависимость `sass`, без дополнительного плагина. React остаётся peer dependency.

```sh
bun run dev:atria
bun run build:atria
bun run test:atria
bun run storybook
bun run build:storybook
```

Storybook на localhost:6006 содержит состояния primary, quiet и disabled, документацию и проверки доступности. Vitest/Testing Library проверяет клавиатуру и disabled. Импортируйте компоненты из `@helicraft/atria`, стили из `@helicraft/atria/styles.scss`. В `dist/` — ESM и декларации; внутри workspace используется исходный код для HMR Vite. Отдельного сервиса и Compose у Atria нет: библиотека входит в сборку потребителя. Будущие примитивы: формы, окна, таблицы, состояния и правила анимации.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/setup-research_RU.md).

## Название

Атриа — α Южного Треугольника, звезда в созвездии Южного Треугольника. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).

## Web foundation UI

Общие токены: тёплые поверхности, текст, primary/accent, feedback, focus, spacing/radii/motion. Хост загружает локальный Onest и IBM Plex Mono. Компоненты работают с SCSS Modules, клавиатурой, именованными полями и reduced-motion. Storybook показывает состояния форм, feedback, Markdown и overlays; модульные тесты проверяют пароль, fallback аватара и Escape диалога.

`Button`, `IconButton`, `TextField`, `PasswordField`, `FormField`, `Textarea`, `Select`, `Checkbox`, `Card`, `Badge`, `Alert`, `ToastProvider`/`useToast`, `Dialog`, `DropdownMenu`, `Tabs`, `Tooltip`, `Skeleton`, `Spinner`, `EmptyState`, `Avatar`, `MinecraftAvatar`, `Table`, `Pagination`, `Breadcrumbs`, `MarkdownContent`, `PageContainer`.

MarkdownContent принимает только очищенный HTML Антареса. MinecraftAvatar принимает URL головы, а не полную текстуру. Не добавляйте предметную логику приложения в Атрия.
