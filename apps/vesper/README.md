![Logo](https://github.com/HeliCraft-MC/Vesper/blob/master/public/cover.png)

# HeliCraft Vesper

**EN**: Frontend application for the HeliCraft Minecraft server

**RU**: Фронтенд-приложение для Minecraft-сервера HeliCraft

[Backend](https://github.com/HeliCraft-MC/Teapot/)

---

<p align="center">
  <a href="https://github.com/HeliCraft-MC/Vesper">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/HeliCraft-MC/Vesper?style=social">
  </a>
  <a href="https://github.com/HeliCraft-MC/Vesper/issues">
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/HeliCraft-MC/Vesper?style=flat-square">
  </a>
  <a href="https://github.com/HeliCraft-MC/Vesper/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/HeliCraft-MC/Vesper?style=flat-square">
  </a>
  <a href="https://beta.helicraft.ru/">
    <img alt="Live Demo" src="https://img.shields.io/website?url=https%3A%2F%2Fbeta.helicraft.ru&style=flat-square">
  </a>
</p>

---

## 🌐 Demo

[https://helicraft.ru/](https://helicraft.ru/)

---

## 🚀 Run Locally

### 1. Clone the project

```bash
git clone https://github.com/HeliCraft-MC/Vesper
```

### 2. Go to the project directory

```bash
cd Vesper
```

### 3. Install dependencies

```bash
bun i
```

### 4. Copy and configure environment variables

```bash
cp .env.example .env
nano .env
```

### 5. Start the development server

```bash
bun run dev
```

---

## 🛠️ Tech Stack

* **Bun 1.3** - высокоскоростной движок JavaScript
* **Nuxt 3** - современный фреймворк на Vue 3
* **TypeScript** - статическая типизация
* **Tailwind CSS** - утилитарный CSS

### Используемые модули Nuxt:

* `@pinia/nuxt` - управление состоянием
* `@nuxtjs/tailwindcss` - интеграция Tailwind CSS
* `@nuxt/image`, `@nuxt/fonts`, `@nuxt/icon`, `@nuxt/content` - графика и контент
* `@nuxtjs/turnstile` - защита от ботов через Cloudflare Turnstile
* `@sidebase/nuxt-auth` - авторизация и управление сессиями

---

## 🔐 Auth Features

* Поддержка local-провайдера
* Access и refresh токены
* Middleware-защита страниц
* Автоматическое обновление токена

---

## ⚙️ Dev Features

* Прокси роуты для API (`/distant-api/**`, `/plan-api/**`)
* Отображение коммита (переменная `vesperCommit`)
* Легко кастомизируемая конфигурация через `nuxt.config.ts`

---

## 📄 License

Licensed under the **EUPL-1.2-or-later**
[View full license](https://github.com/HeliCraft-MC/Vesper/blob/master/LICENSE)
