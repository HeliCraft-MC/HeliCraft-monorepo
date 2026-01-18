# =====================================================================
# СТАДИЯ 1 — BUILDER
# =====================================================================
FROM oven/bun:debian AS builder

# 1. Системные пакеты, нужные для node-gyp, Nuxt-сборки и tini
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential python3 git tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Устанавливаем все зависимости строго по lock-файлу
COPY package*.json ./
RUN bun install

# 3. Копируем исходники и собираем Nuxt
COPY . .

ARG NODE_COMMIT=unknown
ENV NODE_COMMIT=${NODE_COMMIT}

ARG ENVIR
RUN echo "$ENV" > /app/.env
# Build the application
# We accept NUXT_PUBLIC_VESPER_COMMIT as a build argument to pass the git hash
ARG NUXT_PUBLIC_VESPER_COMMIT=unknown
ENV NUXT_PUBLIC_VESPER_COMMIT=${NUXT_PUBLIC_VESPER_COMMIT}

ENV NODE_ENV=production

# api urls
ARG NUXT_PUBLIC_BACKEND_URL="https://api.helicraft.ru"
ARG NUXT_PLAN_UPSTREAM_URL="https://analytics.helicraft.ru"

ENV NUXT_PUBLIC_BACKEND_URL=${NUXT_PUBLIC_BACKEND_URL}
ENV NUXT_PLAN_UPSTREAM_URL=${NUXT_PLAN_UPSTREAM_URL}

RUN bun run build

# =====================================================================
# СТАДИЯ 2 — RUNNER
# =====================================================================
FROM oven/bun:debian AS runner

WORKDIR /app
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

# 6. Production-зависимости и артефакты
COPY --from=builder /app/.output        ./.output
COPY --from=builder /app/public         ./public


EXPOSE 3000
CMD ["bun", "run", "./output/server/index.mjs"]
