# HeliCraft Context & Guidelines

## 1. Project Overview
This repository is a monorepo for the **HeliCraft Minecraft Server** ecosystem.

## 2. Structure
- **Root**: Workspace management only. No shared business logic here.
- **Frontend (`apps/vesper`)**: Project **Vesper**. A Nuxt application.
- **Backend (`apps/teapot`)**: Project **Teapot**. A Nitro / Node.js application.

> **NOTE (Backend)**: The backend (`Teapot`) is slated for migration to **Go** in the future. All backend logic must be strictly modular, type-safe, and decoupled to facilitate this future transition.

### Frontend (Vesper)
- **Framework**: Nuxt 4 (Vue 3, Composition API).
- **Language**: TypeScript (Strict Mode).
- **Styling**: Tailwind CSS. Prefer utility classes over `<style scoped>`.
- **Auth**: `@sidebase/nuxt-auth` (Local provider).
- **UI/Content**: `@nuxt/icon`, `@nuxt/image`. (Check `package.json` for other modules).

### Backend (Teapot)
- **Framework**: Nitro.
- **Language**: TypeScript.
- **Database**: MySQL 2 / Better SQLite 3.

## 3. Monorepo Boundaries & Constraints
1. **Strict Isolation**: 
    - **NEVER** import code across application boundaries (e.g., no importing backend files into frontend).
    - Communication must occur strictly via REST API.
2. **Database Access**: 
    - Only the Backend (`Teapot`) is allowed to access the database directly. The Frontend (`Vesper`) must fetch data via the Backend API.

## 4. Request Boundaries & Instruction Hierarchy
1. **Rule Hierarchy**: 
    - Generally, this root `AGENTS.md` is the **SUPREME AUTHORITY**.
    - **EXCEPTION (Naming & Style)**: For **Naming Conventions** and **Code Style**, the **LOCAL** `AGENTS.md` (in subdirectories) takes precedence over the root file.
        - *Reasoning*: Different frameworks (e.g., Go vs. Vue) have unique style requirements that must be respected locally.
    - **Conflict Resolution (Other)**: For architecture and boundaries, the **ROOT rule takes precedence**.
2. **Scope Limit**: DO NOT modify **multiple** applications per one user request (e.g., do NOT create routes on the backend and pages on the frontend in a single turn).
3. **Cross-Verification**: You **MUST READ** code from the other application to ensure compatibility.
    - *Example*: When working on the Frontend, check the Backend route definitions.
    - **Breaking Change Protocol**: If a breaking change to the API contract is unavoidable or explicitly requested:
        - You **MUST** explicitly warn the user.
        - You **MUST** use a highlighted warning block (e.g., `> [!WARNING]`) to explain exactly what will break in the other application.

## 5. Coding Standards

### General TypeScript (Fallback)
> *Note: Apply these rules unless overridden by a local `AGENTS.md`.*

- **No `any`**: Use explicit interfaces and types.
- **DTOs**: Define clear Data Transfer Objects for API communication.
- **Naming**: 
    - Variables/Functions: `camelCase`
    - Components/Classes: `PascalCase`
    - Files: `kebab-case` (except Vue components).

## 6. AI Interaction Rules
1. **Context Awareness**: Always verify which directory (`apps/vesper` or `apps/teapot`) you are working in before suggesting file paths.
2. **Conciseness**: Provide code solutions directly. Minimal explanation unless requested.
3. **Language**: 
    - Code comments: **English**.
    - Chat responses: **Russian** (if the user speaks Russian), otherwise English.