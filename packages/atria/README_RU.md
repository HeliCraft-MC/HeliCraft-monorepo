[English](README.md) | [HeliCraft](../../README_RU.md)

# Atria

**Дать всем интерфейсам HeliCraft единый визуальный язык и правила взаимодействия.**

React · TypeScript · SCSS Modules · Base UI · Storybook

Приватный UI-пакет с экспортом исходников для Vega и будущего Altair. `Button` оборачивает доступный примитив Base UI: стили primary/quiet, disabled и управление клавиатурой. Все стили написаны на SCSS: `components/Button/button.module.scss` изолирует классы компонента, а `@helicraft/atria/styles.scss` содержит общие цветовые токены и базовые стили. Vite компилирует SCSS и SCSS-модули через dev-зависимость `sass`, без дополнительного плагина. React остаётся peer dependency.

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

## Gallery foundation

Публичные `/gallery` и `/gallery/:id` используют SSR; `/app/gallery/new` — существующую сессию и CSR. Галерея проходит через Alhena к отдельному домену Antares и private S3/PostgreSQL. [Архитектура галереи](../../docs/architecture/gallery_RU.md). В Atria добавлены StateCard, GalleryTile, PhotoCarousel и ActionLink; каждый компонент расположен в собственной папке `src/components`.

`CompanyCard` показывает изображение компании, декоративный логотип, отрасль, описание и именованные факты в той же раскладке, что и `StateCard`. Тексты передаёт приложение; компонент не запрашивает и не создаёт данные компаний. В Storybook есть обычное состояние, длинное название и английский вариант.

`FileDropzone` — доступная с клавиатуры зона выбора и перетаскивания файла с именем выбранного файла и состоянием блокировки. Проверка формата и размера, URL предпросмотра и запрос загрузки принадлежат приложению. Компонент принимает один файл за раз. Storybook содержит пустое, заполненное, заблокированное и англоязычное состояния.

`Dialog` поддерживает необязательный trigger или управляемые свойства `open` / `onOpenChange` для асинхронного предпросмотра и подтверждений. Передавайте `closeLabel` на языке интерфейса. Закрытие с клавиатуры и управление фокусом обеспечивает Base UI. В Storybook есть состояния с trigger и с внешним управлением. Для предпросмотра документов используйте `size="fullscreen"`; размер по умолчанию подходит для подтверждений.

`StateCard.flag` принимает URL изображения или готовый флаг (`ReactNode`) от приложения. Такой флаг занимает основную визуальную область карточки реального государства; приложение передаёт доступное название и данные домена. В Storybook есть `CustomFlagArtwork`.

`MarkdownEditor` — управляемый текстовый редактор с визуальным режимом и исходным Markdown: заголовки, выделение, списки/отступы, цитаты, отмена/повтор и подстановки от приложения. Он сохраняет Markdown, запускает TipTap только в браузере и оставляет безопасный предпросмотр Антаресу. Исходник сохраняет пробелы; Escape, затем Tab выводит из режима отступов. Подписи локализует приложение. В Storybook есть документ с обоими режимами.

`PlayerNickname` объединяет декоративную голову Minecraft и читаемый ник. Приложение передаёт URL головы и размер; при ошибке изображения ник остаётся видимым. Обёртка Веги принимает UUID/ник/редакцию скина и строит публичный URL аватара. Компонент также используется для авторов карточек галереи и фотокарусели. В Storybook есть загруженная голова, fallback и длинный ник.

`PlayerNickname.href` создаёт доступную ссылку, в названии которой остаётся только ник. Вега по умолчанию ведёт на неизменяемый UUID игрока; в кнопках выбора и подписях чекбоксов используется `linked={false}`. В карточке галереи ссылка автора расположена отдельно от ссылки изображения/названия, а `PhotoCarousel` принимает `authorHref`. В Storybook есть `ProfileLink`.
