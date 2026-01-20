// Auth utilities - refactored to use Drizzle ORM via auth.repo
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { useDefaultDb } from '~/db/mysql.client';
import {
    createUser,
    findByNickname,
    findByUuid,
    nicknameExists,
} from '~/db/repos/auth.repo';
import {
    generateTokens,
    verifyTokenWithCredentials,
} from './token.utils';

// Get default database connection
function getDb() {
    return useDefaultDb();
}

/**
 * Logs in a user by validating the provided nickname and password.
 */
export async function loginUser(nickname: string, password: string) {
    const db = getDb();
    const user = await findByNickname(nickname, db);

    if (!user || !user.hash || !user.nickname || !user.uuid) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User not found',
            data: {
                statusMessageRu: 'Пользователь не найден',
            },
        });
    }

    if (!(await bcrypt.compare(password, user.hash))) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid password',
            data: {
                statusMessageRu: 'Неверный пароль',
            },
        });
    }

    const tokens = generateTokens(user);

    return { tokens, uuid: user.uuid, nickname: user.nickname };
}

/**
 * Registers a new user by creating an account with the provided nickname and password.
 */
export async function registerUser(nickname: string, password: string) {
    const db = getDb();

    // Validate nickname length
    if (!nickname || nickname.trim().length < 3) {
        throw createError({
            statusCode: 422,
            statusMessage: 'Nickname is too short (minimum 3 characters)',
            data: {
                statusMessageRu: 'Ник слишком короткий (минимум 3 символа)',
            },
        });
    }

    // Validate password length
    if (!password || password.length < 6) {
        throw createError({
            statusCode: 422,
            statusMessage: 'Password is too short (minimum 6 characters)',
            data: {
                statusMessageRu: 'Пароль слишком короткий (минимум 6 символов)',
            },
        });
    }

    // Check if nickname already exists
    if (await nicknameExists(nickname, db)) {
        throw createError({
            statusCode: 409,
            statusMessage: 'Nickname already taken',
            data: {
                statusMessageRu: 'Никнейм уже занят',
            },
        });
    }

    // Generate UUID and hash password
    const uuid = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    const regDate = Date.now();

    // Insert new user
    const user = await createUser({
        nickname,
        lowercaseNickname: nickname.toLowerCase(),
        hash,
        uuid,
        regDate,
    }, db);

    if (!user) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create user',
        });
    }

    const tokens = generateTokens(user);

    return { tokens, uuid: user.uuid, nickname: user.nickname };
}

/**
 * Refreshes the user data by validating the provided refresh token.
 */
export async function refreshUser(uuid: string, refreshToken: string) {
    const db = getDb();
    const user = await findByUuid(uuid, db);

    if (!user || !user.hash || !user.nickname || !user.uuid) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User not found',
            data: {
                statusMessageRu: 'Пользователь не найден',
            },
        });
    }

    if (await verifyTokenWithCredentials(refreshToken, user)) {
        const tokens = generateTokens(user);
        return { tokens, uuid: user.uuid, nickname: user.nickname };
    }
    else {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid refresh token',
            data: {
                statusMessageRu: 'Неверный токен обновления',
            },
        });
    }
}

/**
 * Checks if user is authenticated with valid access token.
 */
export async function checkAuth(uuid: string, accessToken: string) {
    const db = getDb();
    const user = await findByUuid(uuid, db);

    if (!user || !user.hash || !user.nickname || !user.uuid) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Not authorized',
            data: {
                statusMessageRu: 'Не авторизован',
            },
        });
    }

    const isValid = await verifyTokenWithCredentials(accessToken, user);

    console.log('[checkAuth] Token verification result:', isValid, 'for UUID:', uuid);

    if (isValid) {
        return true;
    }
    else {
        console.log('[checkAuth] Token verification failed for UUID:', uuid);
        throw createError({
            statusCode: 401,
            statusMessage: 'Not authorized',
            data: {
                statusMessageRu: 'Не авторизован',
            },
        });
    }
}
