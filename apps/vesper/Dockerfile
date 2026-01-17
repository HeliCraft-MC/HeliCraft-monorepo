# Created with Gemini and ChatGPT
# =====================================================================
# СТАДИЯ 1 — BUILDER
# =====================================================================
FROM node:20-bookworm-slim AS builder

# 1. Системные пакеты, нужные для node-gyp, Nuxt-сборки и tini
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential python3 git tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Устанавливаем все зависимости строго по lock-файлу
COPY package*.json ./
RUN npm install

# 3. Копируем исходники и собираем Nuxt
COPY . .

ARG NODE_COMMIT=unknown
ENV NODE_COMMIT=${NODE_COMMIT}

ARG ENVIR
RUN echo "$ENVIR" > /app/.env

RUN npm run build

# 4. После сборки удаляем dev-пакеты, чтобы сузить node_modules
RUN npm prune --omit=dev

# =====================================================================
# СТАДИЯ 2 — RUNNER
# =====================================================================
FROM node:20-bookworm-slim AS runner

# 5. Лёгкий набор runtime-lib’ов:
#    libvips42 — pre-built backend для sharp; tini — корректный PID 1
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libvips42 tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# 6. Production-зависимости и артефакты
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/.output        ./.output
COPY --from=builder /app/public         ./public
COPY ecosystem.config.cjs package*.json ./

# 7. PM2-Runtime — рекомендованный способ работы PM2 в Docker
RUN npm install -g pm2@latest


EXPOSE 3000
CMD ["pm2-runtime", "ecosystem.config.cjs"]

