
export interface User {
    uuid: string;
    nickname: string;
}

export const useAuthSystem = () => {
    const accessToken = useState<string | null>('auth:token', () => null)
    const user = useState<User | null>('auth:user', () => null)
    const loading = useState<boolean>('auth:loading', () => false)

    // Proxy path prefix
    const PROXY_PREFIX = '/distant-api/auth'

    const setToken = (token: string | null) => {
        console.log('[AuthSystem] setToken', token ? '***' : 'null')
        accessToken.value = token
    }

    const setUser = (u: User | null) => {
        console.log('[AuthSystem] setUser', u)
        user.value = u
    }

    const fetchUser = async () => {
        console.log('[AuthSystem] fetchUser')
        if (!accessToken.value) {
            console.log('[AuthSystem] fetchUser: no access token')
            return null
        }
        try {
            const data = await $fetch<User>(`${PROXY_PREFIX}/me`, {
                headers: { Authorization: `Bearer ${accessToken.value}` }
            })
            console.log('[AuthSystem] fetchUser success', data)
            setUser(data)
            return data
        } catch (e) {
            console.error('[AuthSystem] Failed to fetch user', e)
            setToken(null)
            setUser(null)
            return null
        }
    }

    const refresh = async () => {
        console.log('[AuthSystem] refresh')
        // Refresh token is in HttpOnly cookie, automatically sent by browser to same-origin (proxy)
        try {
            // We need to pass a UUID in body if backend requires it.
            // Backend `refresh.post.ts` expects `uuid`.
            // If we don't have user.uuid (e.g. page reload), we can't refresh?
            // Wait, implementation plan/backend check: `refresh.post.ts` requires `uuid`.
            // If page reloads, `user` state is lost (unless persisted).
            // We need to store UUID in localStorage or rely on the fact that refresh token *should* identify user (backend improvement).
            // BUT, current backend requires UUID.
            // So we MUST store UUID in localStorage or cookie (public).
            // nuxt-auth used to store session data.
            // I'll add localStorage for UUID.

            let uuid = user.value?.uuid
            if (!uuid && import.meta.client) {
                uuid = localStorage.getItem('auth:uuid') || undefined
            }

            if (!uuid) {
                console.log('[AuthSystem] refresh: no uuid found')
                return false
            }

            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/refresh`, {
                method: 'POST',
                body: { uuid } // Backend expects { uuid }
            })

            console.log('[AuthSystem] refresh success', data)
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })

            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid)
            }
            return true
        } catch (e) {
            console.error('[AuthSystem] refresh failed', e)
            // Refresh failed
            setToken(null)
            setUser(null)
            if (import.meta.client) {
                localStorage.removeItem('auth:uuid')
            }
            return false
        }
    }

    const login = async (credentials: { nickname: string, password: string }) => {
        console.log('[AuthSystem] login', credentials.nickname)
        loading.value = true
        try {
            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/login`, {
                method: 'POST',
                body: credentials
            })
            console.log('[AuthSystem] login success', data)
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid)
            }
            return true
        } catch (e) {
            console.error('[AuthSystem] login failed', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    const register = async (credentials: { nickname: string, password: string }) => {
        console.log('[AuthSystem] register', credentials.nickname)
        loading.value = true
        try {
            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/register`, {
                method: 'POST',
                body: credentials
            })
            console.log('[AuthSystem] register success', data)
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid)
            }
            return true
        } catch (e) {
            console.error('[AuthSystem] register failed', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    const logout = async () => {
        console.log('[AuthSystem] logout')
        try {
            await $fetch(`${PROXY_PREFIX}/logout`, { method: 'POST' })
            console.log('[AuthSystem] logout success')
        } catch (e) {
            console.error('[AuthSystem] logout failed (ignoring)', e)
            // validation fail? ignore
        }
        setToken(null)
        setUser(null)
        if (import.meta.client) {
            localStorage.removeItem('auth:uuid')
        }
        // Redirect to home or login? User choice.
        const router = useRouter()
        router.push('/')
    }

    const init = async () => {
        console.log('[AuthSystem] init')
        if (accessToken.value) {
            console.log('[AuthSystem] init: already has token')
            return // already init
        }
        await refresh()
    }

    return {
        accessToken,
        user,
        loading,
        login,
        register,
        logout,
        refresh,
        init,
        fetchUser
    }
}
