import { defineConfig } from 'drizzle-kit'

// Drizzle Kit configuration
// Note: This config uses environment variables for database connection
// For local dev, use: bun run db:push (with docker-compose running)
export default defineConfig({
  dialect: 'mysql',
  out: './drizzle/migrations',
  schema: './server/db/*/schema.ts',

  // Connection for drizzle-kit commands (generate, push, studio)
  dbCredentials: {
    host: process.env.NITRO_DATABASE_DEFAULT_OPTIONS_HOST || '127.0.0.1',
    port: Number(process.env.NITRO_DATABASE_DEFAULT_OPTIONS_PORT || 3306),
    user: process.env.NITRO_DATABASE_DEFAULT_OPTIONS_USER || 'root',
    password: process.env.NITRO_DATABASE_DEFAULT_OPTIONS_PASSWORD || 'devpassword',
    database: process.env.NITRO_DATABASE_DEFAULT_OPTIONS_DATABASE || 'mydb',
  },
})
