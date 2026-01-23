// composables/useApiFetch.ts
import { defu } from 'defu'
import type { UseFetchOptions } from '#app';

const removeLeadingSlash = (path: string) => {
    const config = useRuntimeConfig()
    const backendURL = config.public.backendURL
    const pathWithoutHost = backendURL && path.startsWith(backendURL) ? path.slice(backendURL.length) : path
    return pathWithoutHost.replace(/^\//, '')
}

const addApiPrefix = (path: string) => `/distant-api/${removeLeadingSlash(path)}`

/**
 * Composable for reactive API calls with automatic auth token injection.
 * Use this for data fetching in components (reactive, with loading states).
 */
export function useApiFetch<T = any>(
    path: string,
    options: UseFetchOptions<T> = {}
) {
    const config = useRuntimeConfig()
    const { token } = useAuth()

    // Check if body is FormData
    const isFormData = options.body instanceof FormData

    const defaults: UseFetchOptions<T> = {
        baseURL: '/', // Use relative URL - distant-api proxy is on frontend
        credentials: 'include',               // для куки refreshToken
        headers: token.value
            ? { Authorization: `Bearer ${token.value}` }
            : {},
        watch: false
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

    console.log('useApiFetch', addApiPrefix(path))

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
    const config = useRuntimeConfig()
    const { token } = useAuth()

    return async <T = any>(
        path: string,
        options: {
            method?: string
            body?: any
            query?: Record<string, any>
            headers?: Record<string, string>
        } = {}
    ): Promise<T> => {
        const isFormData = options.body instanceof FormData

        const headers: Record<string, string> = {
            ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
            ...(options.headers || {})
        }

        // Only set Content-Type for non-FormData JSON bodies
        if (!isFormData && options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json'
        }

        // Remove Content-Type for FormData (browser sets it with boundary)
        if (isFormData) {
            delete headers['Content-Type']
        }

        console.log('use$apiFetch', addApiPrefix(path))

        return $fetch(addApiPrefix(path), {
            baseURL: '/',
            method: (options.method || 'GET') as any,
            body: options.body,
            query: options.query,
            headers,
            credentials: 'include',
        }) as unknown as Promise<T>
    }
}
