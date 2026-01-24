
export default defineNuxtRouteMiddleware((to, from) => {
    const { user } = useAuthSystem()
    if (!user.value) {
        return navigateTo('/login')
    }
})
