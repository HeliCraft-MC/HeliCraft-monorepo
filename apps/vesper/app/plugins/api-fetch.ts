import { defu } from 'defu'
// @ts-ignore
import { useAuthSystem } from '../composables/useAuthSystem'

export default defineNuxtPlugin(() => {
    const { accessToken } = useAuthSystem()
    const config = useRuntimeConfig()

    const apiFetch = $fetch.create({
        baseURL: config.public.backendURL,
        async onRequest({ options }) {
            if (accessToken.value) {
                options.headers = defu(options.headers || {}, {
                    Authorization: `Bearer ${accessToken.value}`
                })
            }
        }
    })

    return {
        provide: { apiFetch }
    }
})
