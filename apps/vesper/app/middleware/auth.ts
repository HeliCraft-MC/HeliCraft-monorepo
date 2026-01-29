
export default defineNuxtRouteMiddleware((to, from) => {
    const { user } = useAuthSystem()
    if (!user.value) {
        return navigateTo({
            path: '/login',
            query: { redirect: to.fullPath }
        })
    }
})
