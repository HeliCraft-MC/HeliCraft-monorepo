
export interface User {
    uuid: string;
    nickname: string;
}

export const useAuthSystem = () => {
    const accessToken = useState<string | null>('auth:token', () => null)
    const user = useState<User | null>('auth:user', () => null)
    const loading = useState<boolean>('auth:loading', () => false)
    const initialized = useState<boolean>('auth:initialized', () => false)
    
    // Use cookie for UUID to allow SSR access and persistence
    const authUuid = useCookie<string | null>('auth:uuid', {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax'
    })

    // Proxy path prefix
    const PROXY_PREFIX = '/distant-api/auth'

    const setToken = (token: string | null) => {
        console.log('[AuthSystem] Setting token:', token ? 'PRESENT' : 'NULL')
        accessToken.value = token
    }

    const setUser = (u: User | null) => {
        console.log('[AuthSystem] Setting user:', u)
        user.value = u
    }

    const fetchUser = async () => {
        console.log('[AuthSystem] fetchUser called. Token present:', !!accessToken.value)
        if (!accessToken.value) return null
        try {
            const data = await $fetch<User>(`${PROXY_PREFIX}/me`, {
                headers: { Authorization: `Bearer ${accessToken.value}` }
            })
            console.log('[AuthSystem] fetchUser success:', data)
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
        console.log('[AuthSystem] refresh called')
        try {
            let uuid = user.value?.uuid || authUuid.value
            console.log('[AuthSystem] refresh - initial uuid:', uuid)

            // Migration from localStorage (Client-side only)
            if (!uuid && import.meta.client) {
                const localUuid = localStorage.getItem('auth:uuid')
                console.log('[AuthSystem] refresh - checking localStorage:', localUuid)
                if (localUuid) {
                    uuid = localUuid
                    authUuid.value = localUuid
                }
            }

            if (!uuid) {
                console.log('[AuthSystem] refresh - no UUID found, aborting')
                return false
            }

            // Forward cookies on SSR
            const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
            console.log('[AuthSystem] refresh - sending request with uuid:', uuid)

            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/refresh`, {
                method: 'POST',
                body: { uuid },
                headers: headers as Record<string, string>
            })

            console.log('[AuthSystem] refresh - success:', data)
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            authUuid.value = data.uuid // Ensure cookie is updated

            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid) // Keep in sync just in case
            }
            return true
        } catch (e) {
            console.error('[AuthSystem] refresh - failed:', e)
            // Refresh failed
            setToken(null)
            setUser(null)
            authUuid.value = null
            if (import.meta.client) {
                localStorage.removeItem('auth:uuid')
            }
            return false
        }
    }

    const login = async (credentials: { nickname: string, password: string }) => {
        console.log('[AuthSystem] login called for:', credentials.nickname)
        loading.value = true
        try {
            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/login`, {
                method: 'POST',
                body: credentials
            })
            console.log('[AuthSystem] login success:', data)
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            authUuid.value = data.uuid
            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid)
            }
            return true
        } catch (e) {
            console.error('[AuthSystem] login failed:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    const register = async (credentials: { nickname: string, password: string }) => {
        console.log('[AuthSystem] register called for:', credentials.nickname)
        loading.value = true
        try {
            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/register`, {
                method: 'POST',
                body: credentials
            })
            console.log('[AuthSystem] register success:', data)
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            authUuid.value = data.uuid
            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid)
            }
            return true
        } catch (e) {
            console.error('[AuthSystem] register failed:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    const logout = async () => {
        console.log('[AuthSystem] logout called')
        try {
            await $fetch(`${PROXY_PREFIX}/logout`, { method: 'POST' })
        } catch (e) {
            console.warn('[AuthSystem] logout API call failed (ignoring):', e)
        }
        setToken(null)
        setUser(null)
        authUuid.value = null
        if (import.meta.client) {
            localStorage.removeItem('auth:uuid')
        }
        
        const router = useRouter()
        router.push('/')
    }

    const init = async () => {
        console.log('[AuthSystem] init called. Initialized:', initialized.value, 'Server:', import.meta.server)
        if (initialized.value) return
        await refresh()
        initialized.value = true
        console.log('[AuthSystem] init completed')
    }

    return {
        accessToken,
        user,
        loading,
        initialized,
        login,
        register,
        logout,
        refresh,
        init,
        fetchUser
    }
}
