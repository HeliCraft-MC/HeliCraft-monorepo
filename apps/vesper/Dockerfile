# === ЭТАП 1: СБОРКА (На чистом Node.js, чтобы не вис Bun) ===
FROM node:20-slim AS build
WORKDIR /app

# 1. Устанавливаем Bun внутри Node-образа (чтобы поставить зависимости)
# Node.js стабильнее для сборки тяжелых Nuxt проектов
RUN npm install -g bun

# 2. Копируем файлы зависимостей
COPY package.json bun.lock* ./

# 3. Устанавливаем зависимости
# ВАЖНО: Убрали --ignore-scripts! Sharp должен собраться!
# ВАЖНО: --frozen-lockfile чтобы не ломать версии
RUN bun install --frozen-lockfile

# Копируем код
COPY . .

# --- НАСТРОЙКИ NITRO ПРОТИВ ЗАВИСАНИЯ ---

# 1. Отключаем минификацию сервера.
# Это сэкономит 90% времени и памяти. Файл будет весить 2мб вместо 1мб
ENV NITRO_MINIFY=false
ENV NITRO_SOURCEMAP=false

# 2. Выкидываем тяжелые либы из бандла.
# Nitro не будет пытаться их анализировать, а просто оставит require('sharp')
ENV NITRO_EXTERNALS_TRACE=false

# 4. Явно говорим, что собираем под Bun
ENV NITRO_PRESET=bun
ENV NUXT_PRESET=bun

# Твои переменные
ARG NUXT_PUBLIC_VESPER_COMMIT=unknown
ENV NUXT_PUBLIC_VESPER_COMMIT=${NUXT_PUBLIC_VESPER_COMMIT}
ENV NODE_ENV=production
ARG NUXT_PUBLIC_BACKEND_URL="https://api.helicraft.ru"
ARG NUXT_PLAN_UPSTREAM_URL="https://analytics.helicraft.ru"
ENV NUXT_PUBLIC_BACKEND_URL=${NUXT_PUBLIC_BACKEND_URL}
ENV NUXT_PLAN_UPSTREAM_URL=${NUXT_PLAN_UPSTREAM_URL}

# ЗАПУСК СБОРКИ (Теперь это настоящий Node, он не зависнет)
RUN npm run build

# === ЭТАП 2: ПРОДАКШЕН (На Bun) ===
FROM oven/bun:1 AS production
WORKDIR /app

# Настройки для рантайма
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

# Копируем только то, что собрал Node
COPY --from=build /app/.output /app

EXPOSE 3000

# Запускаем через быстрый Bun
ENTRYPOINT [ "bun", "run", "server/index.mjs" ]
