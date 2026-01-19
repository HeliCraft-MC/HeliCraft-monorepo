// server/middleware/auth.ts

/* ---------- правила исключений ---------- */
interface ExcludeRule {
    pattern: RegExp
    methods?: string[]        // UPPER-case
}
const exclude: ExcludeRule[] = [
    { pattern: /^\/auth\/login(?:\?.*)?$/ },
    { pattern: /^\/auth\/register(?:\?.*)?$/ },
    { pattern: /^\/auth\/refresh$/ },
    { pattern: /^\/auth\/logout$/ },
    { pattern: /^\/user\/[^/]+\/skin(?:\/head)?(?:\.png)?$/, methods: ['GET', 'HEAD'] },
    { pattern: /^\/user\/[^/]$/, methods: ['GET'] }, // /user/UUID
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
    { pattern: /^\/user\/[^/]+$/, methods: ['GET'] }, // /user/UUID
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
    { pattern: /^\/forms\/user\/[^/]+$/, methods: ['GET'] }
]

/**
 * Try to extract and validate token, returns UUID if valid, null otherwise.
 * Does NOT throw errors.
 */
async function tryExtractAuth(event: any): Promise<string | null> {
    const url = event.path || event.node.req.url || '/'
    console.log(`[tryExtractAuth] Starting for ${url}`)

    // Рекурсивная функция для удаления всех дублей "Bearer "
    const stripBearerPrefix = (token: string): string => {
        if (token.startsWith('Bearer ')) {
            return stripBearerPrefix(token.slice(7))
        }
        return token
    }

    // Сначала пробуем получить токен из заголовка авторизации
    const authHeader = getHeader(event, 'authorization')
    let accessToken: string | undefined

    if (authHeader?.startsWith('Bearer ')) {
        accessToken = stripBearerPrefix(authHeader)
        console.log(`[tryExtractAuth] Token from header: ${accessToken?.substring(0, 20)}...`)
    }

    // Если не найден в заголовке, пробуем cookies
    if (!accessToken) {
        const cookies = parseCookies(event)
        accessToken = cookies['auth.token']
        if (accessToken) {
            console.log(`[tryExtractAuth] Token from cookie: ${accessToken?.substring(0, 20)}...`)
        } else {
            console.log(`[tryExtractAuth] No token in cookies. Available cookies: ${Object.keys(cookies).join(', ')}`)
        }
    }

    if (!accessToken) {
        console.log(`[tryExtractAuth] No token found at all`)
        return null
    }

    try {
        const payload = await verifyToken(accessToken)
        const UUID = (payload as any)?.UUID
        if (!UUID) {
            console.log(`[tryExtractAuth] No UUID in payload`)
            return null
        }

        await checkAuth(UUID, accessToken)
        console.log(`[tryExtractAuth] Auth successful, UUID: ${UUID}`)
        return UUID
    } catch (e) {
        console.log(`[tryExtractAuth] Auth failed:`, e)
        return null
    }
}

export default defineEventHandler(async (event) => {
    const url = event.path || event.node.req.url || '/'
    const method = (event.method || event.node.req.method || 'GET').toUpperCase()

    // Check if route is excluded from mandatory auth
    let isExcluded = false
    for (const rule of exclude) {
        if (rule.pattern.test(url) &&
            (!rule.methods || rule.methods.includes(method))) {
            isExcluded = true
            break
        }
    }

    // ALWAYS try to populate auth context if token is present
    const uuid = await tryExtractAuth(event)
    if (uuid) {
        event.context.auth = { uuid }
    }

    // For excluded routes, we're done (don't throw if no auth)
    if (isExcluded) {
        return
    }

    // For protected routes, require auth
    if (!uuid) {
        throw createError({ statusCode: 401, statusMessage: 'Missing or invalid authentication' })
    }
})
