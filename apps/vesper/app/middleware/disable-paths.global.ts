export default defineNuxtRouteMiddleware((to) => {
    const nuxtApp = useNuxtApp()
    const disabledPaths = []

    if (nuxtApp.$config.public.statesDisabled)
        disabledPaths.push("/states");

    if (disabledPaths.some(p => to.path.startsWith(p))) {
        return abortNavigation(
            createError({
                statusCode: 404,
                statusMessage: 'Page not found'
            })
        )
    }
})