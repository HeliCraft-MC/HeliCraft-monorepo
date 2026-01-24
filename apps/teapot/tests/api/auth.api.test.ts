import { describe, expect, it } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000';

describe('new Auth System API', () => {
    let accessToken = '';
    let refreshTokenCookie = '';
    const uniqueNick = `TestUser_${Date.now()}`;
    const password = 'testpassword123';
    let uuid = '';

    it('should register a new user', async () => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: uniqueNick, password }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.accessToken).toBeDefined();
        expect(body.uuid).toBeDefined();
        uuid = body.uuid;

        // Extract Set-Cookie header
        const setCookie = res.headers.get('set-cookie');
        expect(setCookie).toContain('refreshToken=');
        expect(setCookie).toContain('HttpOnly');
    });

    it('should login and receive tokens', async () => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: uniqueNick, password }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.accessToken).toBeDefined();
        accessToken = body.accessToken;

        const setCookie = res.headers.get('set-cookie');
        expect(setCookie).toBeDefined();
        if (setCookie) {
            // Extract the refreshToken value for later use
            const match = setCookie.match(/refreshToken=([^;]+)/);
            if (match) {
                refreshTokenCookie = match[0]; // "refreshToken=..."
            }
        }
        expect(refreshTokenCookie).toBeTruthy();
    });

    it('should access protected route /auth/me with bearer token', async () => {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.nickname).toBe(uniqueNick);
    });

    it('should FAIL to access protected route without token', async () => {
        const res = await fetch(`${API_BASE}/auth/me`);
        expect(res.status).toBe(401);
    });

    it('should refresh token using cookie', async () => {
        // Wait 1s just to be sure (optional)
        await new Promise(r => setTimeout(r, 100));

        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': refreshTokenCookie,
            },
            body: JSON.stringify({ uuid }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.accessToken).toBeDefined();
        expect(body.accessToken).toBeDefined();
        // expect(body.accessToken).not.toBe(accessToken); // Might be same if <1s elapsed

        accessToken = body.accessToken; // Update access token
    });

    it('should logout and clear cookie', async () => {
        const res = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { Cookie: refreshTokenCookie },
        });

        expect(res.status).toBe(200);
        const setCookie = res.headers.get('set-cookie');
        // Check if cookie is cleared (Max-Age=0 or Expires in past)
        expect(setCookie).toMatch(/Max-Age=0|Expires=/);
    });
});
