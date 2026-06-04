# Testing Guide

## Overview

This project uses **Vitest** for testing with **Docker Compose MySQL** for database integration tests.

## Test Types

| Type | Directory | Description |
|------|-----------|-------------|
| Unit | `server/**/*.test.ts`, `tests/db/schema.test.ts` | Schema validation, mocked dependencies |
| Repository Integration | `tests/db/*.integration.test.ts` | Drizzle + Docker Compose MySQL |
| API Integration | `tests/api/*.api.test.ts` | Full HTTP requests against running server |

## Running Tests

```bash
# All tests with one command (recommended)
bun run test:all

# Unit tests only (fast, no Docker needed)
bun run test

# Integration tests (requires Docker MySQL running)
bun run test:integration

# API tests (requires running dev server)
bun run test:api

# Watch mode for development
bun run test:watch
```

## Test Scripts

| Script | Description |
|--------|-------------|
| `bun run test` | Run unit tests only |
| `bun run test:watch` | Watch mode for unit tests |
| `bun run test:integration` | Integration tests (needs `bun run db:dev`) |
| `bun run test:api` | API tests (needs `bun run dev`) |
| `bun run test:all` | **Full test suite** — starts Docker, server, runs all tests |

## Prerequisites

- **Docker** — Required for MySQL container
- **Bun** — Runtime + package manager

## How `test:all` Works

The `scripts/test-all.mjs` runner orchestrates the full test suite:

1. Starts Docker MySQL (`docker-compose -f docker-compose.dev.yml up -d`)
2. Pushes database schema (`drizzle-kit push`)
3. Starts dev server if not already running
4. Runs unit tests → integration tests → API tests
5. Cleans up (stops server if it was started by the script)

## Writing Tests

### Unit Tests (Schema/Mocked)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { forms } from '../server/db/forms/schema';

// Mock Nitro plugins if needed
vi.mock('~/plugins/skinSqlite', () => ({
    useSkinSQLite: vi.fn(() => ({ query: vi.fn(), run: vi.fn() })),
}));

describe('Forms Schema', () => {
    it('has required columns', () => {
        const columns = getTableColumns(forms);
        expect(columns.uuid).toBeDefined();
    });
});
```

### Repository Integration Tests

Integration tests connect to Docker Compose MySQL and recreate tables:

```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DB_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'devpassword',
    database: 'mydb',
};

describe('Auth Repository', () => {
    let pool, db;

    beforeAll(async () => {
        pool = mysql.createPool(DB_CONFIG);
        db = drizzle(pool, { schema, mode: 'default' });
        // Recreate tables if needed
    }, 30000);

    afterAll(async () => {
        await pool?.end();
    });

    it('creates user', async () => {
        const user = await createUser({ ... }, db);
        expect(user).not.toBeNull();
    });
});
```

### API Integration Tests

API tests use `fetch` against the running dev server:

```typescript
const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000';

describe('Auth API', () => {
    it('registers user', async () => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: 'TestUser', password: '123456' }),
        });
        expect(res.status).toBe(200);
    });
});
```

## Test Files Summary

| File | Tests | Type |
|------|-------|------|
| `server/utils/file.service.test.ts` | 3 | Unit |
| `tests/db/schema.test.ts` | 12 | Unit |
| `tests/db/auth.repo.integration.test.ts` | 9 | Integration |
| `tests/db/forms.integration.test.ts` | 5 | Integration |
| `tests/api/auth.api.test.ts` | 11 | API |

**Total: 40 tests**

## Tips

- Integration tests use Docker Compose MySQL (`teapot-mysql-dev`)
- Pass `db` parameter to repo functions for test isolation
- API tests require running dev server (`bun run dev` or use `test:all`)
- Use `vi.mock()` to mock Nitro plugins in unit tests
