FROM oven/bun:1.4.2 AS build
WORKDIR /workspace
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build:packages && bun run build:vega

FROM oven/bun:1.4.2 AS runtime
WORKDIR /app
COPY --from=build /workspace/apps/vega/dist ./dist
COPY infra/serve-vega.ts ./server.ts
USER bun
EXPOSE 8080
CMD ["bun", "server.ts"]
