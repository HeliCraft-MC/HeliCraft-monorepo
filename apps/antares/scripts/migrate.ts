import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/db';

const url = process.env.DATABASE_URL;
if (url === undefined || url.length === 0) {
  throw new Error('DATABASE_URL is required; target database must be helicraft');
}
const { pool, db } = createDatabase(url);
try {
  await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
} finally {
  await pool.end();
}
