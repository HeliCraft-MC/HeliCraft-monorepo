// composables/useApiFetch.ts
import { defu } from 'defu'
import type { UseFetchOptions } from '#app';
// @ts-ignore
import { useAuthSystem } from './useAuthSystem';

const removeLeadingSlash = (path: string) => {
    const config = useRuntimeConfig()
    const backendURL = config.public.backendURL
    const pathWithoutHost = backendURL && path.startsWith(backendURL) ? path.slice(backendURL.length) : path
    return pathWithoutHost.replace(/^\//, '')
}

export const addApiPrefix = (path: string) => `/distant-api/${removeLeadingSlash(path)}`

/**
 * Composable for reactive API calls with automatic auth token injection.
 * Use this for data fetching in components (reactive, with loading states).
 */
export function useApiFetch<T = any>(
    path: string,
    options: UseFetchOptions<T> = {}
) {
    const { accessToken, refresh, logout } = useAuthSystem()

    // Check if body is FormData
    const isFormData = options.body instanceof FormData

    const defaults: UseFetchOptions<T> = {
        baseURL: '/', // Use relative URL - distant-api proxy is on frontend
        credentials: 'include',
        headers: computed(() => {
            const h: Record<string, string> = {}
            if (accessToken.value) {
                // @ts-ignore
                h.Authorization = `Bearer ${accessToken.value}`
            }
            return h
        }),
        watch: [accessToken], // Auto-refetch on token change
        onResponseError: async ({ response }) => {
            if (response.status === 401) {
                // Try refresh
                const success = await refresh()
                if (!success) {
                    logout()
                }
                // If success, 'accessToken' updates -> 'watch' triggers refetch
            }
        }
    }

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (isFormData && options.headers) {
        const mergedHeaders = {
            ...defaults.headers,
            ...options.headers
        }
        delete (mergedHeaders as Record<string, any>)['Content-Type']
        options.headers = mergedHeaders
    }

    return useFetch(addApiPrefix(path), defu(options, defaults))
}

/**
 * Non-reactive $fetch wrapper with auth token.
 * Use this for imperative API calls (mutations, file uploads, etc).
 * 
 * @example
 * const $api = use$apiFetch()
 * await $api('/gallery', { method: 'POST', body: formData })
 */
export function use$apiFetch() {
    const { accessToken, refresh, logout } = useAuthSystem()

    return async <T = any>(
        path: string,
        options: {
            method?: string
            body?: any
            query?: Record<string, any>
            headers?: Record<string, string>
            retry?: number
        } = {}
    ): Promise<T> => {
        const isFormData = options.body instanceof FormData
        const url = addApiPrefix(path)

        const makeRequest = async (token: string | null) => {
            const headers: Record<string, string> = {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }

            if (!isFormData && options.body && typeof options.body === 'object') {
                headers['Content-Type'] = 'application/json'
            }
            if (isFormData) {
                delete headers['Content-Type']
            }

            return $fetch<T>(url, {
                baseURL: '/',
                method: (options.method || 'GET') as any,
                body: options.body,
                query: options.query,
                headers,
                credentials: 'include',
                onResponseError: async ({ response }) => {
                    if (response.status === 401) {
                        const success = await refresh()
                        if (!success) {
                            logout()
                        }
                    }
                }
            })
        }

        try {
            return await makeRequest(accessToken.value)
        } catch (error: any) {
            // Manual retry logic for 401
            if (error?.response?.status === 401) {
                if (accessToken.value) {
                    return await makeRequest(accessToken.value)
                }
            }
            throw error
        }
    }
}
