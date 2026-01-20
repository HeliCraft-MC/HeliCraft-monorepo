// Integration tests for forms database
// Uses Docker Compose MySQL (teapot-mysql-dev) instead of Testcontainers

import type { Pool } from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { forms, questions } from '../../server/db/forms/schema';
import * as schema from '../../server/db/forms/schema';

// Docker Compose MySQL connection (from docker-compose.dev.yml)
const DB_CONFIG = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'devpassword',
    database: process.env.MYSQL_FORMS_DATABASE || 'forms',
};

let pool: Pool;
let db: ReturnType<typeof drizzle>;

describe('forms Integration Tests', () => {
    beforeAll(async () => {
        // Connect to Docker Compose MySQL
        pool = mysql.createPool(DB_CONFIG);
        db = drizzle(pool, { schema, mode: 'default' });

        // Drop and recreate test tables to ensure schema consistency
        // First drop questions (FK dependency), then forms
        await pool.execute(`DROP TABLE IF EXISTS questions`);
        await pool.execute(`DROP TABLE IF EXISTS forms`);

        // Create forms table with full schema
        await pool.execute(`
            CREATE TABLE forms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                uuid VARCHAR(36) NOT NULL UNIQUE,
                owner_uuid VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL DEFAULT 'Новая форма',
                description TEXT,
                status ENUM('draft', 'published', 'closed', 'archived') DEFAULT 'draft',
                theme JSON,
                settings JSON,
                public_hash VARCHAR(64) UNIQUE,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                INDEX idx_owner (owner_uuid)
            )
        `);

        // Create questions table
        await pool.execute(`
            CREATE TABLE questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                form_id INT NOT NULL,
                uuid VARCHAR(36) NOT NULL UNIQUE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                is_required BOOLEAN DEFAULT FALSE,
                order_index INT NOT NULL DEFAULT 0,
                options JSON,
                validation JSON,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
            )
        `);
    }, 30000);

    beforeEach(async () => {
        // Clean up test data (delete questions first due to FK)
        await pool.execute(`DELETE FROM questions WHERE uuid LIKE 'test-%'`);
        await pool.execute(`DELETE FROM forms WHERE uuid LIKE 'test-%'`);
    });

    afterAll(async () => {
        // Clean up test data
        await pool.execute(`DELETE FROM questions WHERE uuid LIKE 'test-%'`);
        await pool.execute(`DELETE FROM forms WHERE uuid LIKE 'test-%'`);
        await pool?.end();
    });

    it('can create a form', async () => {
        const now = Date.now();

        const result = await db.insert(forms).values({
            uuid: 'test-uuid-1',
            ownerUuid: 'owner-uuid-1',
            title: 'Test Form',
            createdAt: now,
            updatedAt: now,
        });

        expect(result[0].affectedRows).toBe(1);
    });

    it('can read a form by uuid', async () => {
        const now = Date.now();
        await db.insert(forms).values({
            uuid: 'test-uuid-read',
            ownerUuid: 'owner-uuid-1',
            title: 'Test Form Read',
            createdAt: now,
            updatedAt: now,
        });

        const result = await db.select()
            .from(forms)
            .where(eq(forms.uuid, 'test-uuid-read'));

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Test Form Read');
    });

    it('can create questions for a form', async () => {
        const now = Date.now();

        // Create form first
        await db.insert(forms).values({
            uuid: 'test-form-questions',
            ownerUuid: 'owner-uuid-1',
            title: 'Form with Questions',
            createdAt: now,
            updatedAt: now,
        });

        // Get the form id
        const [form] = await db.select({ id: forms.id })
            .from(forms)
            .where(eq(forms.uuid, 'test-form-questions'));

        // Insert question
        const result = await db.insert(questions).values({
            formId: form.id,
            uuid: 'test-question-1',
            type: 'text',
            title: 'What is your name?',
            isRequired: true,
            orderIndex: 0,
            createdAt: now,
            updatedAt: now,
        });

        expect(result[0].affectedRows).toBe(1);
    });

    it('can update a form', async () => {
        const now = Date.now();
        await db.insert(forms).values({
            uuid: 'test-uuid-update',
            ownerUuid: 'owner-uuid-1',
            title: 'Original Title',
            createdAt: now,
            updatedAt: now,
        });

        await db.update(forms)
            .set({ title: 'Updated Form Title', updatedAt: Date.now() })
            .where(eq(forms.uuid, 'test-uuid-update'));

        const [updated] = await db.select()
            .from(forms)
            .where(eq(forms.uuid, 'test-uuid-update'));

        expect(updated.title).toBe('Updated Form Title');
    });

    it('cascade deletes questions when form is deleted', async () => {
        const now = Date.now();

        // Create form
        await db.insert(forms).values({
            uuid: 'test-cascade-form',
            ownerUuid: 'owner-uuid-1',
            title: 'Cascade Test',
            createdAt: now,
            updatedAt: now,
        });

        const [form] = await db.select({ id: forms.id })
            .from(forms)
            .where(eq(forms.uuid, 'test-cascade-form'));

        // Create question
        await db.insert(questions).values({
            formId: form.id,
            uuid: 'test-cascade-question',
            type: 'text',
            title: 'Test Question',
            isRequired: false,
            orderIndex: 0,
            createdAt: now,
            updatedAt: now,
        });

        // Delete the form
        await db.delete(forms).where(eq(forms.uuid, 'test-cascade-form'));

        // Questions should be cascade deleted
        const remainingQuestions = await db.select()
            .from(questions)
            .where(eq(questions.uuid, 'test-cascade-question'));

        expect(remainingQuestions).toHaveLength(0);
    });
});
