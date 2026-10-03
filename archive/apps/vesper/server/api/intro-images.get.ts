// server/api/intro-images.get.ts
import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { resolve } from 'pathe'

export default defineEventHandler(async () => {
    const dir = resolve(process.cwd(), 'public/introImg')
    let files: Dirent[]
    try {
        files = await readdir(dir, { withFileTypes: true })
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw error
    }
    return files
        .filter(file => file.isFile() && /\.(png|jpe?g|webp|gif)$/i.test(file.name))
        .map(file => `/introImg/${encodeURIComponent(file.name)}`)
})
