
export default defineNuxtRouteMiddleware(async (to, from) => {
    const { user, init, initialized } = useAuthSystem()
    const authUuid = useCookie('auth:uuid')

    console.log('[AuthMiddleware] Checking auth for:', to.path)
    console.log('[AuthMiddleware] State - User:', !!user.value, 'Initialized:', initialized.value, 'Cookie:', authUuid.value)

    // If we have a UUID cookie but no user loaded, try to init
    if (authUuid.value && !user.value && !initialized.value) {
        console.log('[AuthMiddleware] Attempting init...')
        await init()
        console.log('[AuthMiddleware] Init finished. User present:', !!user.value)
    }

    // If after init we still don't have a user, redirect
    if (!user.value) {
        // Double check if we really don't have a session potential
        if (!authUuid.value) {
             console.log('[AuthMiddleware] No cookie, redirecting to login')
             return navigateTo({
                path: '/login',
                query: { redirect: to.fullPath }
            })
        }
        // If we have authUuid but no user, it means refresh failed or is pending?
        // If initialized is true and no user, then refresh failed.
        if (initialized.value) {
             console.log('[AuthMiddleware] Initialized but no user (refresh failed?), redirecting to login')
             return navigateTo({
                path: '/login',
                query: { redirect: to.fullPath }
            })
        }
    }
    console.log('[AuthMiddleware] Access granted')
})
