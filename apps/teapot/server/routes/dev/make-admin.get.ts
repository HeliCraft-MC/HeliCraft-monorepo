// Dev-only route to make a user admin
// GET /dev/make-admin?nickname=<nickname>
// Only works when NODE_ENV !== 'production'

import { eq } from 'drizzle-orm';
import { auth } from '~/db/default/schema';
import { useDefaultDb } from '~/db/mysql.client';

defineRouteMeta({
    openAPI: {
        tags: ['dev'],
        description: '[DEV ONLY] Make a user admin by nickname. Does not require authentication.',
        parameters: [
            { name: 'nickname', in: 'query', required: true, description: 'Nickname of user to make admin', schema: { type: 'string' } },
        ],
        responses: {
            200: { description: 'User made admin' },
            400: { description: 'Nickname required' },
            403: { description: 'Only available in development mode' },
            404: { description: 'User not found' },
        },
    },
});

export default defineEventHandler(async (event) => {
    // Only allow in development mode
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev) {
        throw createError({
            statusCode: 403,
            statusMessage: 'This endpoint is only available in development mode',
        });
    }

    const query = getQuery(event);
    const nickname = query.nickname as string;

    if (!nickname) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Nickname is required',
        });
    }

    const db = useDefaultDb();

    // Find user by nickname (case-insensitive)
    const user = await db
        .select()
        .from(auth)
        .where(eq(auth.lowercaseNickname, nickname.toLowerCase()))
        .limit(1)
        .then(rows => rows[0]);

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: `User "${nickname}" not found`,
        });
    }

    // Update user to be admin
    await db
        .update(auth)
        .set({ isAdmin: true })
        .where(eq(auth.lowercaseNickname, nickname.toLowerCase()));

    return {
        ok: true,
        message: `User "${user.nickname}" is now an admin`,
        uuid: user.uuid,
    };
});
