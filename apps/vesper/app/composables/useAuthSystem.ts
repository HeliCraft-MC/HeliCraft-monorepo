
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
        accessToken.value = token
    }

    const setUser = (u: User | null) => {
        user.value = u
    }

    const fetchUser = async () => {
        if (!accessToken.value) return null
        try {
            const data = await $fetch<User>(`${PROXY_PREFIX}/me`, {
                headers: { Authorization: `Bearer ${accessToken.value}` }
            })
            setUser(data)
            return data
        } catch (e) {
            console.error('Failed to fetch user', e)
            setToken(null)
            setUser(null)
            return null
        }
    }

    const refresh = async () => {
        try {
            let uuid = user.value?.uuid || authUuid.value

            // Migration from localStorage (Client-side only)
            if (!uuid && import.meta.client) {
                const localUuid = localStorage.getItem('auth:uuid')
                if (localUuid) {
                    uuid = localUuid
                    authUuid.value = localUuid
                }
            }

            if (!uuid) return false

            // Forward cookies on SSR
            const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/refresh`, {
                method: 'POST',
                body: { uuid },
                headers: headers as Record<string, string>
            })

            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            authUuid.value = data.uuid // Ensure cookie is updated

            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid) // Keep in sync just in case
            }
            return true
        } catch (e) {
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
        loading.value = true
        try {
            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/login`, {
                method: 'POST',
                body: credentials
            })
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            authUuid.value = data.uuid
            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid)
            }
            return true
        } catch (e) {
            throw e
        } finally {
            loading.value = false
        }
    }

    const register = async (credentials: { nickname: string, password: string }) => {
        loading.value = true
        try {
            const data = await $fetch<{ accessToken: string, uuid: string, nickname: string }>(`${PROXY_PREFIX}/register`, {
                method: 'POST',
                body: credentials
            })
            setToken(data.accessToken)
            setUser({ uuid: data.uuid, nickname: data.nickname })
            authUuid.value = data.uuid
            if (import.meta.client) {
                localStorage.setItem('auth:uuid', data.uuid)
            }
            return true
        } catch (e) {
            throw e
        } finally {
            loading.value = false
        }
    }

    const logout = async () => {
        try {
            await $fetch(`${PROXY_PREFIX}/logout`, { method: 'POST' })
        } catch (e) {
            // validation fail? ignore
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
        if (initialized.value) return
        if (import.meta.server) return
        await refresh()
        initialized.value = true
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
