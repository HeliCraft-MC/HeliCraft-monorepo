FROM oven/bun:1.4.2 AS build
WORKDIR /workspace
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build:antares

FROM oven/bun:1.4.2 AS runtime
WORKDIR /workspace
COPY --from=build /workspace/package.json /workspace/bun.lock /workspace/bunfig.toml ./
COPY --from=build /workspace/apps ./apps
COPY --from=build /workspace/packages ./packages
RUN bun install --production --frozen-lockfile
WORKDIR /workspace/apps/antares
USER bun
EXPOSE 3000
CMD ["bun", "dist/index.js"]
