// Test setup for Testcontainers
// Provides shared MySQL container for integration tests

import type { StartedMySqlContainer } from '@testcontainers/mysql';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { MySqlContainer } from '@testcontainers/mysql';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as formsSchema from '../server/db/forms/schema';

let container: StartedMySqlContainer | null = null;
let pool: mysql.Pool | null = null;

/**
 * Start a MySQL container for testing
 * Call this in beforeAll()
 */
export async function startMySqlContainer(): Promise<StartedMySqlContainer> {
  if (container)
    return container;

  container = await new MySqlContainer('mysql:8.0')
    .withDatabase('test_forms')
    .withUsername('test')
    .withUserPassword('test')
    .start();

  return container;
}

/**
 * Get a MySQL pool connected to the test container
 */
export async function getTestPool(): Promise<mysql.Pool> {
  if (pool)
    return pool;
  if (!container)
    throw new Error('Container not started. Call startMySqlContainer() first.');

  pool = mysql.createPool({
    host: container.getHost(),
    port: container.getMappedPort(3306),
    user: container.getUsername(),
    password: container.getUserPassword(),
    database: container.getDatabase(),
  });

  return pool;
}

/**
 * Get a Drizzle client for the test database
 */
export async function getTestFormsDb(): Promise<MySql2Database<typeof formsSchema>> {
  const testPool = await getTestPool();
  return drizzle(testPool, { schema: formsSchema, mode: 'default' });
}

/**
 * Run migrations/create tables for testing
 */
export async function setupTestDatabase(): Promise<void> {
  const testPool = await getTestPool();

  // Create tables (simplified version of forms.sql)
  await testPool.execute(`
    CREATE TABLE IF NOT EXISTS forms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(36) NOT NULL UNIQUE,
      owner_uuid VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('draft', 'published', 'closed', 'archived') NOT NULL DEFAULT 'draft',
      theme JSON,
      settings JSON,
      public_hash VARCHAR(64) UNIQUE,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);

  await testPool.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_id INT NOT NULL,
      uuid VARCHAR(36) NOT NULL UNIQUE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      is_required BOOLEAN NOT NULL DEFAULT 0,
      options JSON,
      validation JSON,
      order_index INT NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    )
  `);

  await testPool.execute(`
    CREATE TABLE IF NOT EXISTS responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_id INT NOT NULL,
      respondent_uuid VARCHAR(36) NOT NULL,
      submitted_at BIGINT NOT NULL,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    )
  `);

  await testPool.execute(`
    CREATE TABLE IF NOT EXISTS answers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      response_id INT NOT NULL,
      question_id INT NOT NULL,
      value TEXT,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);
}

/**
 * Clean up test container
 * Call this in afterAll()
 */
export async function stopMySqlContainer(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}
