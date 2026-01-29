
export default defineNuxtRouteMiddleware(async (to, from) => {
    const { user, init, initialized } = useAuthSystem()
    const authUuid = useCookie('auth:uuid')

    // If we have a UUID cookie but no user loaded, try to init
    if (authUuid.value && !user.value && !initialized.value) {
        await init()
    }

    // If after init we still don't have a user, redirect
    if (!user.value) {
        // Double check if we really don't have a session potential
        if (!authUuid.value) {
             return navigateTo({
                path: '/login',
                query: { redirect: to.fullPath }
            })
        }
        // If we have authUuid but no user, it means refresh failed or is pending?
        // If initialized is true and no user, then refresh failed.
        if (initialized.value) {
             return navigateTo({
                path: '/login',
                query: { redirect: to.fullPath }
            })
        }
    }
})
