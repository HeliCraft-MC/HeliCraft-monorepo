
export default defineNuxtRouteMiddleware(async (to, from) => {
    const { user, init, initialized } = useAuthSystem()

    if (!initialized.value) {
        await init()
    }

    if (!user.value) {
        return navigateTo({
            path: '/login',
            query: { redirect: to.fullPath }
        })
    }
})
