// https://nuxt.com/docs/api/configuration/nuxt-config

function removeStatesRoutes(pages: any) {
  for (let i = pages.length - 1; i >= 0; i--) {
    const page = pages[i]

    if (page.children?.length) {
      removeStatesRoutes(page.children)
    }

    if (page.path === '/states' || page.path.startsWith('/states/')) {
      pages.splice(i, 1)
    }
  }
}

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

  compatibilityDate: '2025-05-15',
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
    '@sidebase/nuxt-auth',
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
      vesperCommit: process.env.NODE_COMMIT || 'unknown', //frontend software commit
    },
    turnstile: {
      // This can be overridden at runtime via the NUXT_TURNSTILE_SECRET_KEY
      // environment variable.
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA',
    },
  },
  // DISABLE /states ROUTES
  hooks: {
    'pages:extend'(pages) {
      if (process.env.VESPER_DISABLE_STATE_LOGIC ? process.env.VESPER_DISABLE_STATE_LOGIC === 'true' : true) {
        removeStatesRoutes(pages)
      }
    },
  },
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
    }
  },
  turnstile: {
    siteKey: process.env.NUXT_TURNSTILE_SITEKEY || '1x00000000000000000000AA',
    addValidateEndpoint: true
  },
  auth: {
    isEnabled: true,
    /* originEnvKey позволяет менять baseURL без ребилда */
    originEnvKey: 'NUXT_PUBLIC_BACKEND_URL',
    /* fallback на случай отсутствия env (dev-режим) */
    baseURL: `${process.env.NUXT_PUBLIC_BACKEND_URL || 'https://api.helicraft.ru'}`,
    /* автоматическое обновление access-токена */
    sessionRefresh: { enableOnWindowFocus: true, enablePeriodically: 15 * 60_000 },
    /* включать/выключать глобальную защиту на всё приложение */
    globalAppMiddleware: true,                              // точечная защита страниц

    provider: {
      type: 'local',
      /* --- эндпоинты --- */
      endpoints: {
        signIn:     { path: '/auth/login',   method: 'post' },
        signOut:    { path: '/auth/logout',  method: 'post' },
        getSession: { path: '/auth/session', method: 'get'  }, // новый роут!
        signUp: false
      },
      /* --- access token --- */
      token: {
        signInResponseTokenPointer: '/accessToken',          // backend → {accessToken,…} :contentReference[oaicite:7]{index=7}
        type: 'Bearer',
        headerName: 'Authorization',
        cookieName: 'auth.token',
        maxAgeInSeconds: 60 * 30,
        sameSiteAttribute: 'lax'
      },
      /* --- refresh token --- */
      refresh: {
        isEnabled: true,
        endpoint: { path: '/auth/refresh', method: 'post' },
        refreshOnlyToken: true,
        token: {
          signInResponseRefreshTokenPointer: '/uuid',
          refreshResponseTokenPointer: '/accessToken',
          refreshRequestTokenPointer: '/uuid',               // nuxt-auth отправит {uuid}
          cookieName: 'auth.refresh',
          maxAgeInSeconds: 60 * 60 * 24 * 7
        }
      },
      /* --- редиректы --- */
      pages: { login: '/login' },
      /* --- типы данных сессии --- */
      session: {
        dataType: {
          uuid:     'string',
          nickname: 'string'
        }
      }
    }
  },
})