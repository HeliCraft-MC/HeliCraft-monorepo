export default defineNuxtPlugin(async (nuxtApp) => {
    const { init } = useAuthSystem()
    await init()
})
