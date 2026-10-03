import { defineConfig } from 'drizzle-kit';

// Select one database at a time; pushing schemas from different databases
// into the same connection would create tables in the wrong database.
const target = process.env.DRIZZLE_DATABASE === 'forms' ? 'forms' : 'default';
const prefix = `NITRO_DATABASE_${target.toUpperCase()}_OPTIONS_`;

export default defineConfig({
    dialect: 'mysql',
    out: './drizzle/migrations',
    schema: `./server/db/${target}/schema.ts`,

    // Connection for drizzle-kit commands (generate, push, studio)
    dbCredentials: {
        host: process.env[`${prefix}HOST`] || '127.0.0.1',
        port: Number(process.env[`${prefix}PORT`] || 3306),
        user: process.env[`${prefix}USER`] || 'root',
        password: process.env[`${prefix}PASSWORD`] || 'devpassword',
        database: process.env[`${prefix}DATABASE`] || (target === 'forms' ? 'forms' : 'mydb'),
    },
});
