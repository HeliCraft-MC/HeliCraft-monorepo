import type { Auth } from '~/db/default/schema';
// User utilities - refactored to use Drizzle ORM via auth.repo
import bcrypt from 'bcrypt';
import { useDefaultDb } from '~/db/mysql.client';
import {
    deleteUser as deleteUserFromDb,
    findByNickname,
    findByUuid,
    nicknameExists,
    searchUsers as repoSearchUsers,
    updateNickname as updateNicknameInDb,
    updatePasswordHash,
} from '~/db/repos/auth.repo';

/* ──────────────────────────────── helpers ──────────────────────────────── */

const MIN_NICK_LEN = 3;
const MIN_PASS_LEN = 6;

// Get default database connection
function getDb() {
    return useDefaultDb();
}

function assertNicknameValid(nick: string) {
    if (nick.length < MIN_NICK_LEN) {
        throw createError({
            statusCode: 422,
            statusMessage: 'Nickname is too short',
            data: { statusMessageRu: 'Ник слишком короткий' },
        });
    }
}

function assertPasswordValid(pass: string) {
    if (pass.length < MIN_PASS_LEN) {
        throw createError({
            statusCode: 422,
            statusMessage: 'Password is too short',
            data: { statusMessageRu: 'Пароль слишком короткий' },
        });
    }
}

const strictUuidRe
    = /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i;

function normalizeUuid(raw: string): string {
    return raw.replace(/-/g, '').toLowerCase();
}

/**
 * Resolves UUID from string (either UUID or nickname)
 */
export async function resolveUuid(id: string, normalize?: boolean): Promise<string> {
    const candidate = id.trim();
    if (normalize === undefined) {
        normalize = true;
    }

    if (!candidate) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Empty id',
            data: { statusMessageRu: 'Пустой параметр id' },
        });
    }

    if (strictUuidRe.test(candidate)) {
        return normalize ? normalizeUuid(candidate) : candidate;
    }

    const user = await getUserByNickname(candidate);
    return normalize ? normalizeUuid(user.uuid!) : user.uuid!;
}

/**
 * Returns only "safe" public fields
 */
export function toPublicUser(user: Auth) {
    return {
        uuid: user.uuid,
        nickname: user.nickname,
        regDate: user.regDate,
        loginDate: user.loginDate,
    };
}

/* ────────────────────────────── main utils ─────────────────────────────── */

/**
 * Get user by UUID
 */
export async function getUserByUUID(uuid: string): Promise<Auth> {
    const db = getDb();
    const user = await findByUuid(uuid, db);

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User not found',
            data: { statusMessageRu: 'Пользователь не найден' },
        });
    }

    return user;
}

/**
 * Get user by nickname (case insensitive)
 */
export async function getUserByNickname(nickname: string): Promise<Auth> {
    const db = getDb();
    try {
        const user = await findByNickname(nickname, db);

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User not found',
                data: { statusMessageRu: 'Пользователь не найден' },
            });
        }

        return user;
    }
    catch (e: any) {
        if (e.statusCode) {
            throw e;
        }
        throw createError({
            statusCode: 500,
            statusMessage: 'Database error',
            data: { statusMessageRu: 'Ошибка базы данных', error: e.message },
        });
    }
}

/**
 * Search users by nickname pattern
 */
export async function searchUsers(query: string, startAt?: number, limit?: number): Promise<Auth[]> {
    const db = getDb();
    return repoSearchUsers(query, db, { offset: startAt, limit });
}

/**
 * Change user nickname
 */
export async function changeUserNickname(uuid: string, newNickname: string) {
    const db = getDb();
    assertNicknameValid(newNickname);

    // Check if nickname is taken by another user
    if (await nicknameExists(newNickname, db)) {
        const existingUser = await findByNickname(newNickname, db);
        if (existingUser && existingUser.uuid !== uuid && existingUser.uuidWr !== uuid) {
            throw createError({
                statusCode: 409,
                statusMessage: 'Nickname already taken',
                data: { statusMessageRu: 'Ник уже занят' },
            });
        }
    }

    await updateNicknameInDb(uuid, newNickname, db);

    return { uuid, newNickname };
}

/**
 * Change user password
 */
export async function changeUserPassword(
    uuid: string,
    oldPassword: string,
    newPassword: string,
) {
    const db = getDb();
    assertPasswordValid(newPassword);

    const user = await getUserByUUID(uuid);

    // Verify old password
    if (!(await bcrypt.compare(oldPassword, user.hash))) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid password',
            data: { statusMessageRu: 'Неверный пароль' },
        });
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await updatePasswordHash(uuid, newHash, db);
}

/**
 * Delete user account
 */
export async function deleteUser(uuid: string) {
    const db = getDb();
    const deleted = await deleteUserFromDb(uuid, db);

    if (!deleted) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User not found',
            data: { statusMessageRu: 'Пользователь не найден' },
        });
    }
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(uuid: string): Promise<boolean> {
    const db = getDb();
    const user = await findByUuid(uuid, db);

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User not found',
            data: { statusMessageRu: 'Пользователь не найден' },
        });
    }

    return user.isAdmin === 1;
}
