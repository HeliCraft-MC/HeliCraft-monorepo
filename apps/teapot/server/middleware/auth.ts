// server/middleware/auth.ts

/* ---------- правила исключений ---------- */
interface ExcludeRule {
    pattern: RegExp;
    methods?: string[]; // UPPER-case
}
const exclude: ExcludeRule[] = [
    { pattern: /^\/auth\/login(?:\?.*)?$/ },
    { pattern: /^\/auth\/register(?:\?.*)?$/ },
    { pattern: /^\/auth\/refresh$/ },
    { pattern: /^\/auth\/logout$/ },
    { pattern: /^\/user\/[^/]+\/skin(?:\/head)?(?:\.png)?$/, methods: ['GET', 'HEAD'] },
    { pattern: /^\/user\/[^/]$/, methods: ['GET'] },
    { pattern: /^\/$/ },
    { pattern: /^\/_scalar$/ },
    { pattern: /^\/_swagger$/ },
    { pattern: /^\/_openapi\.json$/ },
    { pattern: /^\/state\/list$/ },
    { pattern: /^\/state\/search(\/.*)$/ },
    { pattern: /^\/server\/status$/ },
    { pattern: /^\/flags(\/.*)?$/ },
    { pattern: /^\/state\/[^/]+$/, methods: ['GET'] },
    { pattern: /^\/state\/[^/]+\/some$/, methods: ['GET'] },
    { pattern: /^\/user\/[^/]+$/, methods: ['GET'] },
    { pattern: /^\/order\/list(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/warrant\/list(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/history\/list(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/state\/[^/]+\/members-count$/, methods: ['GET'] },
    { pattern: /^\/alliances\/list(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/alliances\/[^/]+\/members(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/alliances\/[0-9a-fA-F-]+$/, methods: ['GET'] },
    { pattern: /^\/user\/[^/]+\/(?:head|skin(?:\/head)?)(?:\.png)?$/, methods: ['GET', 'HEAD'] },
    { pattern: /^\/banlist(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/banlist\/check(?:\?.*)?$/, methods: ['GET'] },
    // Gallery public routes
    { pattern: /^\/gallery(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/gallery\/ids(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/gallery\/categories(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/gallery\/seasons(?:\?.*)?$/, methods: ['GET'] },
    { pattern: /^\/gallery\/[0-9a-fA-F-]+$/, methods: ['GET'] },
    { pattern: /^\/gallery\/[0-9a-fA-F-]+\/image$/, methods: ['GET'] },
    // Forms public routes
    { pattern: /^\/forms\/user\/[^/]+$/, methods: ['GET'] },
    // Dev routes (only available in non-production anyway)
    { pattern: /^\/dev\/.*$/, methods: ['GET'] },
];

/**
 * Try to extract and validate token, returns UUID if valid, null otherwise.
 * Does NOT throw errors.
 */
async function tryExtractAuth(event: any): Promise<string | null> {
    const stripBearerPrefix = (token: string): string => {
        if (token.startsWith('Bearer ')) {
            return stripBearerPrefix(token.slice(7));
        }
        return token;
    };

    const authHeader = getHeader(event, 'authorization');
    let accessToken: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
        accessToken = stripBearerPrefix(authHeader);
    }

    if (!accessToken && (event.method === 'GET' || event.method === 'HEAD')) {
        const cookies = parseCookies(event);
        accessToken = cookies.refreshToken;
    }

    if (!accessToken) {
        return null;
    }

    try {
        const payload = await verifyToken(accessToken);
        const uuid = (payload as any)?.uuid || (payload as any)?.UUID;
        if (!uuid)
            return null;

        await checkAuth(uuid, accessToken);
        return uuid;
    }
    catch {
        return null;
    }
}

export default defineEventHandler(async (event) => {
    const url = event.path || event.node.req.url || '/';
    const method = (event.method || event.node.req.method || 'GET').toUpperCase();

    // Check if route is excluded from mandatory auth
    let isExcluded = false;
    for (const rule of exclude) {
        if (rule.pattern.test(url)
            && (!rule.methods || rule.methods.includes(method))) {
            isExcluded = true;
            break;
        }
    }

    // ALWAYS try to populate auth context if token is present
    const uuid = await tryExtractAuth(event);
    if (uuid) {
        event.context.auth = { uuid };
    }

    // For excluded routes, we're done (don't throw if no auth)
    if (isExcluded) {
        return;
    }

    // For protected routes, require auth
    if (!uuid) {
        throw createError({ statusCode: 401, statusMessage: 'Missing or invalid authentication (MW-level)' });
    }
});
