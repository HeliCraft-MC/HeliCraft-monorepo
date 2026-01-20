# Testing Guide

## Overview

This project uses **Vitest** for testing with **Testcontainers** for database integration tests.

## Test Types

| Type | Directory | Description |
|------|-----------|-------------|
| Unit | `tests/db/*.test.ts` | Schema validation, no DB |
| Repository Integration | `tests/db/*.integration.test.ts` | Drizzle + MySQL (Testcontainers) |
| API Integration | `tests/api/*.api.test.ts` | Full HTTP requests |

## Running Tests

```bash
# All unit tests (fast, no Docker needed)
bun run test

# Integration tests (requires Docker)
bun run test:integration

# Specific test file
bun run test tests/db/schema.test.ts

# Watch mode
bun run test:watch
```

## Prerequisites

- **Docker** - Required for Testcontainers
- First run may take longer (pulls MySQL image)

## Test Scripts

| Script | Description |
|--------|-------------|
| `bun run test` | Run all unit tests |
| `bun run test:watch` | Watch mode |
| `bun run test:integration` | Integration tests only |
| `bun run test:api` | API tests (requires running server) |
| `bun run test:all` | **Run everything** (migrations, server, all tests) |

## Writing Tests

### Unit Tests (Schema)
```typescript
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { forms } from '../server/db/forms/schema';

describe('Forms Schema', () => {
    it('has required columns', () => {
        const columns = getTableColumns(forms);
        expect(columns.uuid).toBeDefined();
    });
});
```

### Repository Integration Tests
```typescript
import { MySqlContainer } from '@testcontainers/mysql';
import { drizzle } from 'drizzle-orm/mysql2';

describe('Auth Repository', () => {
    let container, db;

    beforeAll(async () => {
        container = await new MySqlContainer().start();
        // ... setup db
    }, 60000);

    afterAll(async () => {
        await container?.stop();
    });

    it('creates user', async () => {
        const user = await createUser({ ... }, db);
        expect(user).not.toBeNull();
    });
});
```

### API Integration Tests

```typescript
describe('Auth API', () => {
    it('registers user', async () => {
        const res = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            body: JSON.stringify({ nickname: 'Test', password: '123456' }),
        });
        expect(res.status).toBe(200);
    });
});
```

## Test Files

| File | Tests |
|------|-------|
| `schema.test.ts` | 12 schema validation tests |
| `auth.repo.integration.test.ts` | 9 repository tests |
| `forms.integration.test.ts` | 5 forms CRUD tests |
| `auth.api.test.ts` | 11 API endpoint tests |

## Tips

- Integration tests have 60s timeout for container startup
- Use `db` parameter in repo functions for test isolation
- API tests require running dev server (`bun run dev`)
