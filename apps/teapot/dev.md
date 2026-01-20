# Development Setup

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [Docker](https://www.docker.com/) for local MySQL

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Setup environment
cp .env.docker .env

# 3. Start MySQL container
bun run db:dev

# 4. Push database schema
bun run db:push

# 5. Start development server
bun run dev
```

Server runs at `http://localhost:3000`

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Build for production |
| `bun run db:dev` | Start MySQL in Docker |
| `bun run db:dev:down` | Stop MySQL container |
| `bun run db:push` | Sync schema to database |
| `bun run db:generate` | Generate migration files |
| `bun run db:studio` | Open Drizzle Studio GUI |
| `bun run test` | Run unit tests |
| `bun run test:integration` | Run integration tests |

## Database Architecture

| Connection | Type | Database |
|------------|------|----------|
| `default` | MySQL | User auth (AUTH table) |
| `forms` | MySQL | Forms, questions, responses |
| `banlist` | MySQL | LiteBans bans |
| `states` | MySQL | (deprecated) |
| SQLite | bun:sqlite | Skins, gallery, files |

## Using Drizzle ORM

```typescript
import { useFormsDb } from '~/db'
import { forms } from '~/db/forms/schema'
import { eq } from 'drizzle-orm'

// Query
const allForms = await useFormsDb().select().from(forms)

// Insert
await useFormsDb().insert(forms).values({ ... })

// Update
await useFormsDb().update(forms).set({ title: 'New' }).where(eq(forms.id, 1))
```

## Testing

```bash
# Unit tests (no Docker needed)
bun run test

# Integration tests (requires Docker)
bun run test:integration
```

Integration tests use [Testcontainers](https://testcontainers.com/) to spin up isolated MySQL instances.

## Environment Variables

See `.env.example` for all available options. Key variables:

- `NITRO_DATABASE_*` — MySQL connection settings
- `NITRO_SQLITE_SKIN_PATH` — SQLite database path
- `NITRO_JWT_SECRET` — JWT signing secret
- `NITRO_UPLOAD_DIR` — File upload directory
