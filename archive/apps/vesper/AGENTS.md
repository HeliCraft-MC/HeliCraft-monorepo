# Vesper local guidance

- Nuxt 4, Vue 3 Composition API, TypeScript. Prefer `<script setup lang="ts">` and existing composables.
- Use Tailwind utilities for new UI styling. Preserve established component conventions where changes are unrelated.
- API requests go through `/distant-api/**` via `useApiFetch`, `use$apiFetch`, or `useAuthSystem`; analytics goes through `/plan-api/**`.
- Do not access Teapot databases or import Teapot source. Check route names, response shape, and authorization in Teapot before changing callers.
- Keep public runtime config free of secrets. Validate SSR behavior and auth cookie forwarding when changing requests.
- Run `bun run build` and `bunx nuxt typecheck` for relevant changes.
