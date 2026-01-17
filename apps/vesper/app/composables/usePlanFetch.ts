import { ofetch, type FetchOptions } from 'ofetch'

type PlanError = Error & { status?: number; cause?: unknown }

// Мы работаем только с JSON
type PlanFetchOptions = Omit<FetchOptions<'json'>, 'responseType'> & { responseType?: 'json' }

let _client: ReturnType<typeof ofetch.create> | null = null
let _baseURL: string | null = null

export function usePlanFetch() {
    // ВАЖНО: runtime config читаем ВНУТРИ setup (тут ok),
    // и создаём клиент здесь же, чтобы дальше в кликах не дергать Nuxt composables.
    const { public: { planApiURL } } = useRuntimeConfig()

    // Если хочешь реально использовать прокси — лучше '/plan-api'
    // (у тебя он в nitro.routeRules есть)
    const baseURL = planApiURL || '/plan-api'

    if (!_client || _baseURL !== baseURL) {
        _baseURL = baseURL

        _client = ofetch.create({
            baseURL,
            credentials: 'include',
            responseType: 'json',

            onResponse({ response }) {
                const ct = response.headers.get('content-type') || ''

                // Если вместо JSON пришёл HTML/редирект — значит Plan отправил на UI логина
                if (response.redirected || ct.includes('text/html') || response.status === 301 || response.status === 302) {
                    const err: PlanError = new Error('PLAN_REDIRECT_OR_HTML')
                    err.name = 'PlanAuthRequired'
                    err.status = response.status !== 200 ? response.status : 401
                    throw err
                }
            },

            onResponseError({ response }) {
                const ct = response?.headers?.get?.('content-type') || ''

                if (response?.status === 401 || response?.status === 403 || ct.includes('text/html')) {
                    const err: PlanError = new Error('PLAN_UNAUTHORIZED_OR_HTML')
                    err.name = 'PlanAuthRequired'
                    err.status = response?.status || 401
                    throw err
                }
            },

            onRequestError({ error }) {
                const err: PlanError = new Error('PLAN_NETWORK_ERROR')
                err.name = 'PlanNetworkError'
                err.cause = error
                err.status = 0
                throw err
            },
        })
    }

    const client = _client

    // Возвращаем обычную функцию-запрос, без Nuxt composables внутри.
    return <T = any>(endpoint: string, opts: PlanFetchOptions = {}) => client<T>(endpoint, opts)
}
