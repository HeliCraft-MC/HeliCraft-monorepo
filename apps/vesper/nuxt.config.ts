// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({

  app: {
    head: {
      htmlAttrs: {
        lang: 'ru'
      },
      title: 'HeliCraft',
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        { name: 'description', content: 'Helicraft - майнкрафт сервер' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  compatibilityDate: '2026-01-06',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/content',
    '@nuxtjs/turnstile',
    '@nuxt/icon',

    '@vueuse/nuxt',
  ],
  css: ['~/assets/css/fonts.css'],
  runtimeConfig: {
    planUpstreamURL: process.env.PLAN_UPSTREAM_URL || 'https://analytics.helicraft.ru',
    public: {
      backendURL: process.env.NUXT_PUBLIC_BACKEND_URL || 'https://api.helicraft.ru',
      planApiURL: '/plan-api',
      statesDisabled: process.env.VESPER_DISABLE_STATE_LOGIC ? process.env.VESPER_DISABLE_STATE_LOGIC === 'true' : true,
      banlistEnabled: process.env.NUXT_PUBLIC_BANLIST_ENABLED !== 'false',
      launcherDownloadEnabled: process.env.VESPER_LAUNCHER_DOWNLOAD_ENABLED === 'true',
      vesperCommit: process.env.NUXT_PUBLIC_VESPER_COMMIT || 'unknown', //frontend software commit
    },
    turnstile: {
      // This can be overridden at runtime via the NUXT_TURNSTILE_SECRET_KEY
      // environment variable.
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA',
    },
  },

  // DISABLE /states ROUTES
  // ^^^ moved to nitro middleware

  icon: {
    mode: 'css',
    cssLayer: 'base'
  },
  fonts: {
    provider: "google",
  },
  nitro: {
    routeRules: {
      '/distant-api/**': { proxy: `${process.env.NUXT_PUBLIC_BACKEND_URL || 'https://api.helicraft.ru'}/**` },
      '/plan-api/**': { proxy: `${process.env.NUXT_PUBLIC_PLAN_API_URL || 'https://analytics.helicraft.ru'}/**` }
    },
    preset: "bun",
    externals: {
      inline: ['vue', 'vue-router', '@vue/server-renderer', 'sharp']
    },

    // TODO: убрать это после обновления на nuxt >4.2.2(4.2.3, и выше).
    //  Фикс из: https://github.com/nuxt/nuxt/issues/33748
    devProxy: {
      '/sw.js': { target: '/sw.js' }
    },
    logLevel: 3,
    debug: false
  },
  sourcemap: {
    server: false,
    client: false
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lodash')) return 'vendor-lodash';
              if (id.includes('chart.js')) return 'vendor-charts';
              return 'vendor';
            }
          }
        }
      },
      minify: 'esbuild',
    }
  },
  turnstile: {
    siteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    addValidateEndpoint: true
  },

})