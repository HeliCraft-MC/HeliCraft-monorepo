import antfu from '@antfu/eslint-config'

export default antfu({
  // Enable TypeScript support
  typescript: true,

  // Enable stylistic rules
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: false,
  },

  // Ignore patterns (only build artifacts)
  ignores: [
    'node_modules',
    '.output',
    '.nitro',
    'drizzle/migrations',
    '*.d.ts',
    '*.md',
  ],

  // Strict rules
  rules: {
    // Allow console.log in server code (this is backend)
    'no-console': 'off',
  },
})
