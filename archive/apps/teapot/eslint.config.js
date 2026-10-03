import antfu from '@antfu/eslint-config';

export default antfu({
    // Enable TypeScript support
    typescript: true,

    // Enable stylistic rules
    stylistic: {
        indent: 4,
        quotes: 'single',
        semi: true,
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
        'no-console': 'off',
        // Bun exposes these globals in ESM; requiring them is not appropriate here.
        'node/prefer-global/buffer': 'off',
        'node/prefer-global/process': 'off',
        // Cyrillic ranges are intentional in player and state name validation.
        'regexp/no-obscure-range': 'off',
        // YAML's four-space indentation places three spaces after list markers.
        'style/no-multi-spaces': 'off',
    },
});
