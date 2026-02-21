// Integration tests for auth repository
// Uses Docker Compose MySQL (teapot-mysql-dev) instead of Testcontainers

import type { Pool } from 'mysql2/promise';
import { like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../server/db/default/schema';
import { auth } from '../../server/db/default/schema';
import {
    createUser,
    deleteUser,
    findByNickname,
    findByUuid,
    isUserAdmin,
    nicknameExists,
    updateNickname,
    updatePasswordHash,
} from '../../server/db/repos/auth.repo';

// Docker Compose MySQL connection (from docker-compose.dev.yml)
const DB_CONFIG = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'devpassword',
    database: process.env.MYSQL_DATABASE || 'mydb',
};

let pool: Pool;
let db: ReturnType<typeof drizzle>;

describe('auth Repository', () => {
    beforeAll(async () => {
        // Connect to Docker Compose MySQL
        pool = mysql.createPool(DB_CONFIG);

        // Create Drizzle client
        db = drizzle(pool, { schema, mode: 'default' });

        // Ensure AUTH table exists (should already exist from db:push)
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS AUTH (
        NICKNAME varchar(255) NOT NULL,
        LOWERCASENICKNAME varchar(255) NOT NULL PRIMARY KEY,
        HASH varchar(255) NOT NULL,
        IP varchar(255) DEFAULT NULL,
        isAdmin tinyint(1) NOT NULL DEFAULT 0,
        TOTPTOKEN varchar(255) DEFAULT NULL,
        REGDATE bigint(20) DEFAULT NULL,
        UUID varchar(255) DEFAULT NULL,
        UUID_WR varchar(255) DEFAULT NULL,
        PREMIUMUUID varchar(255) DEFAULT NULL,
        LOGINIP varchar(255) DEFAULT NULL,
        LOGINDATE bigint(20) DEFAULT NULL,
        ISSUEDTIME bigint(20) DEFAULT NULL,
        accessToken char(32) DEFAULT NULL,
        serverID varchar(41) DEFAULT NULL,
        hwidId bigint(20) DEFAULT NULL,
        UNIQUE KEY UUID_WR (UUID_WR)
      )
    `);
    }, 30000);

    beforeEach(async () => {
        // Clean up test data before each test
        await db.delete(auth).where(
            like(schema.auth.lowercaseNickname, 'test%'),
        );
    });

    afterAll(async () => {
        // Clean up test data
        await db.delete(auth).where(
            like(schema.auth.lowercaseNickname, 'test%'),
        );
        await pool?.end();
    });

    it('should create a user', async () => {
        const user = await createUser({
            nickname: 'TestUser',
            lowercaseNickname: 'testuser',
            hash: '$2a$10$hashedpassword',
            uuid: 'test-uuid-001',
            regDate: Date.now(),
        }, db);

        expect(user).not.toBeNull();
        expect(user?.nickname).toBe('TestUser');
        expect(user?.uuid).toBe('test-uuid-001');
    });

    it('should find user by nickname', async () => {
        await createUser({
            nickname: 'TestFind',
            lowercaseNickname: 'testfind',
            hash: '$2a$10$hash',
            uuid: 'test-uuid-find',
            regDate: Date.now(),
        }, db);

        const user = await findByNickname('TestFind', db);

        expect(user).not.toBeNull();
        expect(user?.nickname).toBe('TestFind');
    });

    it('should find user by UUID', async () => {
        await createUser({
            nickname: 'TestUuid',
            lowercaseNickname: 'testuuid',
            hash: '$2a$10$hash',
            uuid: 'test-uuid-find-by-uuid',
            regDate: Date.now(),
        }, db);

        const user = await findByUuid('test-uuid-find-by-uuid', db);

        expect(user).not.toBeNull();
        expect(user?.nickname).toBe('TestUuid');
    });

    it('should check if nickname exists', async () => {
        await createUser({
            nickname: 'TestExists',
            lowercaseNickname: 'testexists',
            hash: '$2a$10$hash',
            uuid: 'test-uuid-exists',
            regDate: Date.now(),
        }, db);

        const exists = await nicknameExists('TestExists', db);
        const notExists = await nicknameExists('NonExistent', db);

        expect(exists).toBe(true);
        expect(notExists).toBe(false);
    });

    it('should update password hash', async () => {
        await createUser({
            nickname: 'TestPassword',
            lowercaseNickname: 'testpassword',
            hash: '$2a$10$oldhash',
            uuid: 'test-uuid-password',
            regDate: Date.now(),
        }, db);

        await updatePasswordHash('test-uuid-password', '$2a$10$newhashedpassword', db);

        const user = await findByUuid('test-uuid-password', db);
        expect(user?.hash).toBe('$2a$10$newhashedpassword');
    });

    it('should update nickname', async () => {
        await createUser({
            nickname: 'TestNickChange',
            lowercaseNickname: 'testnickchange',
            hash: '$2a$10$hash',
            uuid: 'test-uuid-nickchange',
            regDate: Date.now(),
        }, db);

        await updateNickname('test-uuid-nickchange', 'TestNewNick', db);

        const user = await findByUuid('test-uuid-nickchange', db);
        expect(user?.nickname).toBe('TestNewNick');
        expect(user?.lowercaseNickname).toBe('testnewnick');
    });

    it('should check admin status', async () => {
        await createUser({
            nickname: 'TestAdmin',
            lowercaseNickname: 'testadmin',
            hash: '$2a$10$hash',
            uuid: 'test-uuid-admin',
            regDate: Date.now(),
        }, db);

        const isAdmin = await isUserAdmin('test-uuid-admin', db);
        expect(isAdmin).toBe(false);
    });

    it('should delete user', async () => {
        await createUser({
            nickname: 'TestDelete',
            lowercaseNickname: 'testdelete',
            hash: '$2a$10$hash',
            uuid: 'test-uuid-delete',
            regDate: Date.now(),
        }, db);

        const deleted = await deleteUser('test-uuid-delete', db);
        expect(deleted).toBe(true);

        const user = await findByUuid('test-uuid-delete', db);
        expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
        const user = await findByNickname('NonExistentUser', db);
        expect(user).toBeNull();
    });
});
