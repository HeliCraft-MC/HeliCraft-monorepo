// Token utilities - JWT generation and verification
import type { Auth } from '~/db/default/schema';
import jsonwebtoken from 'jsonwebtoken';

// Type for user data needed for token generation
export interface TokenUser {
    uuid: string | null;
    uuidWr?: string | null;
    nickname: string;
    lowercaseNickname: string;
    regDate?: number | null;
}

/**
 * Generates an access token for the provided user.
 */
export function generateAccessToken(user: TokenUser) {
    if (!user || !user.uuid) {
        throw new Error('Invalid user object (Must contain uuid at least)');
    }
    const { jwtSecret } = useRuntimeConfig();
    return jsonwebtoken.sign({
        uuid: user.uuid,
        uuidWr: user.uuidWr,
        nickname: user.nickname,
        lowercaseNickname: user.lowercaseNickname,
        regDate: user.regDate,
    }, jwtSecret, { expiresIn: '1h' });
}

/**
 * Generates a refresh token for the provided user.
 */
export function generateRefreshToken(user: TokenUser) {
    if (!user || !user.uuid) {
        throw new Error('Invalid user object (Must contain uuid at least)');
    }
    const { jwtSecret } = useRuntimeConfig();
    return jsonwebtoken.sign({
        uuid: user.uuid,
        uuidWr: user.uuidWr,
        nickname: user.nickname,
        lowercaseNickname: user.lowercaseNickname,
        regDate: user.regDate,
    }, jwtSecret, { expiresIn: '7d' });
}

/**
 * Verifies the provided JWT token using the secret key.
 */
export function verifyToken(token: string) {
    const { jwtSecret } = useRuntimeConfig();
    return jsonwebtoken.verify(token, jwtSecret);
}

/**
 * Verifies a given token against a user's credentials.
 */
export async function verifyTokenWithCredentials(token: string, user: TokenUser) {
    try {
        const { jwtSecret } = useRuntimeConfig();
        const decoded = jsonwebtoken.verify(token, jwtSecret) as { uuid?: string };
        return decoded && decoded.uuid === user.uuid;
    }
    catch {
        return false;
    }
}

/**
 * Generates access and refresh tokens for the given user.
 */
export function generateTokens(user: TokenUser | Auth) {
    // Support both new camelCase format and Auth type from Drizzle
    const tokenUser: TokenUser = {
        uuid: user.uuid,
        uuidWr: user.uuidWr,
        nickname: user.nickname,
        lowercaseNickname: user.lowercaseNickname,
        regDate: user.regDate,
    };
    const accessToken = generateAccessToken(tokenUser);
    const refreshToken = generateRefreshToken(tokenUser);
    return { accessToken, refreshToken };
}
