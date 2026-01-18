# === STAGE 1: BUILD (Node.js) ===
FROM node:20-slim AS build
WORKDIR /app

# Install Bun for dependency resolution
RUN npm install -g bun

# Copy package.json and specifically bun.lock
COPY package.json bun.lock ./

# Install dependencies (Sharp works because of Node environment)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# --- BUILD OPTIMIZATIONS ---

# Disable server minification to prevent hanging
ENV NITRO_MINIFY=false
ENV NITRO_SOURCEMAP=false

# Externalize heavy libs
ENV NITRO_EXTERNALS_TRACE=false

# Set presets for Bun compatibility
ENV NITRO_PRESET=bun
ENV NUXT_PRESET=bun

# 1. Capture commit hash during BUILD phase
ARG NUXT_PUBLIC_VESPER_COMMIT=unknown
ENV NUXT_PUBLIC_VESPER_COMMIT=${NUXT_PUBLIC_VESPER_COMMIT}

ENV NODE_ENV=production

# Define URLs for build time
ARG NUXT_PUBLIC_BACKEND_URL="https://api.helicraft.ru"
ARG NUXT_PLAN_UPSTREAM_URL="https://analytics.helicraft.ru"
ENV NUXT_PUBLIC_BACKEND_URL=${NUXT_PUBLIC_BACKEND_URL}
ENV NUXT_PLAN_UPSTREAM_URL=${NUXT_PLAN_UPSTREAM_URL}

# Run build using Node.js to avoid memory issues
RUN npm run build

# === STAGE 2: PRODUCTION (Bun) ===
FROM oven/bun:1 AS production
WORKDIR /app

# Runtime env vars
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

# 2. IMPORTANT: Re-declare ARG and ENV for Runtime
# Without this, the variable is lost after Stage 1
ARG NUXT_PUBLIC_VESPER_COMMIT=unknown
ENV NUXT_PUBLIC_VESPER_COMMIT=${NUXT_PUBLIC_VESPER_COMMIT}

# Copy build artifacts
COPY --from=build /app/.output /app

EXPOSE 3000

# Start server
ENTRYPOINT [ "bun", "run", "server/index.mjs" ]
