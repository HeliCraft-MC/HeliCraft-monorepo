FROM oven/bun:1.4.2 AS build
WORKDIR /workspace
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build:packages && bun run build:vega

FROM oven/bun:1.4.2 AS runtime
WORKDIR /workspace
COPY --from=build /workspace/package.json /workspace/bun.lock /workspace/bunfig.toml ./
COPY --from=build /workspace/apps ./apps
COPY --from=build /workspace/packages ./packages
RUN bun install --production --frozen-lockfile
COPY infra/serve-vega.ts ./infra/serve-vega.ts
WORKDIR /workspace/apps/vega
USER bun
EXPOSE 8080
CMD ["bun", "../../infra/serve-vega.ts"]
