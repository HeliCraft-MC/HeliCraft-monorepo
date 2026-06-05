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

### Development

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Build for production |
| `bun run preview` | Run production build locally |

### Database

| Script | Description |
|--------|-------------|
| `bun run db:dev` | Start MySQL in Docker |
| `bun run db:dev:down` | Stop MySQL container |
| `bun run db:push` | Sync Drizzle schema to database |
| `bun run db:generate` | Generate migration files |
| `bun run db:studio` | Open Drizzle Studio GUI |

### Testing

| Script | Description |
|--------|-------------|
| `bun run test` | Run unit tests |
| `bun run test:watch` | Unit tests in watch mode |
| `bun run test:integration` | Integration tests (needs MySQL) |
| `bun run test:api` | API tests (needs dev server) |
| `bun run test:all` | **Full test suite** with auto-setup |

### Code Quality

| Script | Description |
|--------|-------------|
| `bun run lint` | Run ESLint |
| `bun run lint:fix` | Auto-fix lint issues |

## Database Architecture

| Connection | Type | Database | Description |
|------------|------|----------|-------------|
| `default` | MySQL | `mydb` | User auth (AUTH table) |
| `forms` | MySQL | `forms` | Forms, questions, responses |
| `banlist` | MySQL | `bans` | LiteBans bans |
| `states` | MySQL | `states` | (deprecated) |
| SQLite | bun:sqlite | `data/sqlite.db` | Skins, gallery, file refs |

## Using Drizzle ORM

```typescript
// Get typed database clients
import { useDefaultDb, useFormsDb } from '~/db/mysql.client';
import { forms } from '~/db/forms/schema';
import { eq } from 'drizzle-orm';

// Query
const db = useFormsDb();
const allForms = await db.select().from(forms);

// Insert
await db.insert(forms).values({
    uuid: 'unique-id',
    ownerUuid: 'user-uuid',
    title: 'My Form',
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

// Update
await db.update(forms)
    .set({ title: 'Updated Title' })
    .where(eq(forms.id, 1));
```

## Auth Repository (Drizzle)

The auth module uses a pure repository layer:

```typescript
import { findByNickname, createUser } from '~/db/repos/auth.repo';
import { useDefaultDb } from '~/db/mysql.client';

const db = useDefaultDb();

// Find user
const user = await findByNickname('nickname', db);

// Create user
const newUser = await createUser({
    nickname: 'Player',
    lowercaseNickname: 'player',
    hash: await bcrypt.hash('password', 10),
    uuid: uuid(),
    regDate: Date.now(),
}, db);
```

## Testing

```bash
# Run all tests with one command
bun run test:all
```

This will:
1. Start Docker MySQL
2. Push schema
3. Start dev server (if needed)
4. Run unit → integration → API tests
5. Cleanup

See [tests.md](./tests.md) for detailed testing guide.

## Environment Variables

Copy `.env.docker` to `.env` for local development. Key variables:

| Variable | Description |
|----------|-------------|
| `NITRO_DATABASE_DEFAULT_OPTIONS_*` | MySQL auth connection |
| `NITRO_DATABASE_FORMS_OPTIONS_*` | MySQL forms connection |
| `NITRO_SQLITE_SKIN_PATH` | SQLite database path |
| `NITRO_JWT_SECRET` | JWT signing secret |
| `NITRO_UPLOAD_DIR` | File upload directory |

## Docker Compose

The `docker-compose.dev.yml` starts a MySQL 8.0 container with:

- Container name: `teapot-mysql-dev`
- Port: `3306`
- Root password: `devpassword`
- Init scripts: `.dev/docker-init/`
- Data volume: `teapot_mysql_data`

```bash
# Start
docker-compose -f docker-compose.dev.yml up -d

# Stop
docker-compose -f docker-compose.dev.yml down

# View logs
docker logs teapot-mysql-dev
```
