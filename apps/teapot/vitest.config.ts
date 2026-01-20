import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '~': resolve(__dirname, './server'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
    },
});
