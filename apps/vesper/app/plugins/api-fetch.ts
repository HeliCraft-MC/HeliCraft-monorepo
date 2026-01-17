import { defu } from 'defu'

export default defineNuxtPlugin(() => {
    const { token } = useAuth() // реактивно!
    const config = useRuntimeConfig()

    const apiFetch = $fetch.create({
        baseURL: config.public.backendURL,
        async onRequest({ options }) {
            if (token.value) {
                options.headers = defu(options.headers || {}, {
                    Authorization: `Bearer ${token.value}`
                })
            }
        }
    })

    return {
        provide: { apiFetch }
    }
})
