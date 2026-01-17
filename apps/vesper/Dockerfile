# Use the official Bun image
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies
# Copy package.json and bun.lock to cache dependencies
COPY package.json bun.lock* ./

# use ignore-scripts to avoid building node modules like better-sqlite3
RUN bun install --frozen-lockfile --ignore-scripts

# Copy the rest of the application code
COPY . .

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

# Run the build script
# НЕ ИСПОЛЬЗОВАТЬ ФЛАГ --bun ИНАЧЕ БУДЕТ УТЕЧКА
RUN bun run build

# Use the same base image for production to ensure compatibility of native modules (glibc vs musl)
# Switching from alpine to debian-based bun image avoids issues with sharp/better-sqlite3
FROM oven/bun:1 AS production
WORKDIR /app

# Set environment variables
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

# Only `.output` folder is needed from the build stage
COPY --from=build /app/.output /app

# For bun
ENV NODE_PATH=/app/server/node_modules

# run the app
EXPOSE 3000
ENTRYPOINT [ "bun", "--bun", "run", "server/index.mjs" ]
