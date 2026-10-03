[English](README.md) | [HeliCraft](../../README_RU.md)

# Altair

**Сделать вход и повседневное использование удобнее; всегда необязателен.**

Planned: Tauri 2 · Rust · React · Vite · Atria · Alhena

**Только план. Приложение, package.json, Rust crate, скрипты сборки и Compose не созданы.**

Планируемый стек: Tauri 2 + Rust + React + Vite, Atria для интерфейса и Alhena для API Antares. При реализации нужно сверить официальные [требования Tauri](https://v2.tauri.app/start/prerequisites/) и [интеграцию Vite](https://v2.tauri.app/start/frontend/vite/), используя Bun для frontend-зависимостей и скриптов. Rust и нативные зависимости ОС остаются отдельными.

Altair сможет отвечать за вход в HeliCraft, запуск Minecraft, управление Java, QoL-моды, resource packs, новости, состояние сервера, уведомления, безопасность устройств, переходы в Vega и диагностику. Загрузка Minecraft, вход и обновления пока не настроены.

Лаунчер всегда необязателен: игрок может открыть привычный Minecraft launcher, подключиться и играть. Altair предлагает более удобный путь, но не единственный. Перед реализацией запуска и установки нужно выбрать платформы, desktop permissions/capabilities, подпись и распространение.

## Название

Альтаир — α Орла, звезда в созвездии Орла. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
