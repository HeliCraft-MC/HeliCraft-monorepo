// server/api/intro-images.get.ts
import { readdir } from 'fs/promises'
import { resolve } from 'pathe'

export default defineEventHandler(async (event) => {
    const dir = resolve(process.cwd(), 'public/introImg')
    const files = await readdir(dir)
    // const headers = getRequestHeaders(event)
    // const { host } = headers
    const res = files
        .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f))
        .map(f => `/introImg/${f}`)
    // console.log(res)
    return res
})
