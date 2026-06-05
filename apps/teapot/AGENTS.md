# Backend Context (HeliCraft Teapot)

> **CHECK** ROOT AGENT.md (in git repo root) before check this file!

> **AUTHORITY NOTE**: This file overrides global rules specifically for the `apps/teapot` directory.

## 1. Project Overview
**Teapot** is a high-performance REST API backend built with **Nitro (Bun)**.
It uses **auto-imports** extensively.

## 2. File Structure & Architecture
Based on the current project structure (`server/`), adhere to these layers:

- **`server/routes/**` (Handlers)**:
    - Entry points for API requests.
    - **Responsibilities**: Validate inputs, call Utils/Services, return Responses.
    - **MUST** include `defineRouteMeta` for OpenAPI.
- **`server/utils/**` (Services & Repositories)**:
    - Contains business logic and database queries.
    - **Naming**: `*.service.ts` for logic or `*.utils.ts` for helpers.
    - **Goal**: Keep logic isolated here to facilitate future Go migration.
- **`server/interfaces/**` (Types)**:
    - TypeScript interfaces for State, DB entities, and DTOs.
- **`server/plugins/**`**:
    - Database connections and startup logic (e.g., `mysql.ts`, `skinsSqlite.ts`).

## 3. The "Go Migration" Protocol ⚠️
**CRITICAL**: This project will be rewritten in **Go**.
- **Logic Isolation**: Handlers (`routes`) must be "thin". They should only call functions from `utils`.
- **Type Safety**: Do not use `any`. Define interfaces in `server/interfaces`.
- **No Magic**: Prefer explicit, imperative code over complex functional chains.

## 4. Coding Standards (Nitro Specific)

### 4.1. Auto-Imports
- **DO NOT** manually import Nitro/H3 primitives.
- **Available globals**: `defineEventHandler`, `readBody`, `getQuery`, `setCookie`, `createError`, `useRuntimeConfig`, etc.
- **Utils**: Functions exported in `server/utils` are automatically available everywhere.

### 4.2. OpenAPI / Swagger (Mandatory)
Every route **MUST** use `defineRouteMeta` to define OpenAPI documentation.
Follow this strict pattern:

```typescript
defineRouteMeta({
  openAPI: {
    tags: ['category'],
    description: 'Description of the endpoint',
    requestBody: { ... }, // If applicable
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                // Define fields explicitly
                field: { type: 'string', example: 'value' }
              }
            }
          }
        }
      },
      500: { ... } // any other response codes if needed
    }
  }
})
```

### 4.3. Database Access
- **Config**: Use `useRuntimeConfig()` to access DB credentials.
  ```typescript
  const config = useRuntimeConfig()
  // access config.database.default.options.host
  ```
- **Connections**:
    - `default`: Main MySQL gameplay data.
    - `states`: MySQL metadata.
    - `banlist`: MySQL punishments.
    - `sqlite`: Local data (skins) via `better-sqlite3`.
- **Schema**: Refer to `.dev/dbs/*.sql` snapshots to understand the table structure.

## 5. Security & Auth
- **Middleware**: `server/middleware/auth.ts` handles generic checks.
- **Flow**:
    - Login -> Returns `accessToken` + sets `refreshToken` (HttpOnly Cookie).
    - Access Token is used in Authorization header.

## 6. Development Rules
1.  **Bun**: Run commands using `bun` (e.g., `bun run dev`).
2.  **Environment**: Never use `process.env` in runtime code; use `useRuntimeConfig().property`.