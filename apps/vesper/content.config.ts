// content.config.ts
import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
    collections: {
        // Статические страницы (rules, privacy, etc.)
        pages: defineCollection({
            type: 'page',
            source: {
                include: 'pages/*.md',
                prefix: '/'         // убираем лишний '/pages' из URL
            }
        })
    }
})
