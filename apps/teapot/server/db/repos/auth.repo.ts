// Auth Repository - Drizzle ORM queries for AUTH table
// PURE MODULE: No Nitro dependencies, requires db parameter
// This makes the repository fully testable without mocking Nitro

import type { MySql2Database } from 'drizzle-orm/mysql2';
import type * as schema from '../default/schema';
import { eq, like, or } from 'drizzle-orm';
import { auth } from '../default/schema';

export type AuthDb = MySql2Database<typeof schema>;

export interface CreateUserData {
    nickname: string;
    lowercaseNickname: string;
    hash: string;
    uuid: string;
    regDate: number;
}

/**
 * Find user by lowercase nickname
 */
export async function findByNickname(nickname: string, db: AuthDb) {
    const [user] = await db
        .select()
        .from(auth)
        .where(eq(auth.lowercaseNickname, nickname.toLowerCase()))
        .limit(1);

    return user ?? null;
}

/**
 * Find user by UUID (checks both UUID and UUID_WR columns)
 */
export async function findByUuid(uuid: string, db: AuthDb) {
    const [user] = await db
        .select()
        .from(auth)
        .where(or(eq(auth.uuid, uuid), eq(auth.uuidWr, uuid)))
        .limit(1);

    return user ?? null;
}

/**
 * Check if nickname already exists
 */
export async function nicknameExists(nickname: string, db: AuthDb): Promise<boolean> {
    const [result] = await db
        .select({ count: auth.lowercaseNickname })
        .from(auth)
        .where(eq(auth.lowercaseNickname, nickname.toLowerCase()))
        .limit(1);

    return !!result;
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserData, db: AuthDb) {
    await db.insert(auth).values({
        nickname: data.nickname,
        lowercaseNickname: data.lowercaseNickname,
        hash: data.hash,
        uuid: data.uuid,
        regDate: data.regDate,
    });

    // Return the created user
    return findByUuid(data.uuid, db);
}

/**
 * Update user password hash
 */
export async function updatePasswordHash(uuid: string, newHash: string, db: AuthDb) {
    await db
        .update(auth)
        .set({ hash: newHash })
        .where(or(eq(auth.uuid, uuid), eq(auth.uuidWr, uuid)));
}

/**
 * Update user nickname
 */
export async function updateNickname(uuid: string, newNickname: string, db: AuthDb) {
    await db
        .update(auth)
        .set({
            nickname: newNickname,
            lowercaseNickname: newNickname.toLowerCase(),
        })
        .where(or(eq(auth.uuid, uuid), eq(auth.uuidWr, uuid)));
}

/**
 * Delete user by UUID
 */
export async function deleteUser(uuid: string, db: AuthDb) {
    const result = await db
        .delete(auth)
        .where(or(eq(auth.uuid, uuid), eq(auth.uuidWr, uuid)));

    return result[0].affectedRows > 0;
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(uuid: string, db: AuthDb): Promise<boolean> {
    const user = await findByUuid(uuid, db);
    return user?.isAdmin === 1;
}

/**
 * Search users by nickname pattern (LIKE query)
 */
export async function searchUsers(
    query: string,
    db: AuthDb,
    options?: { offset?: number; limit?: number },
) {
    const { offset: startAt = 0, limit = 20 } = options ?? {};

    const users = await db
        .select()
        .from(auth)
        .where(like(auth.lowercaseNickname, `%${query.toLowerCase()}%`))
        .limit(limit)
        .offset(startAt);

    return users;
}
