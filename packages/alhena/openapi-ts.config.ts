import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../../apps/antares/openapi.json',
  output: 'src/generated',
  plugins: ['@hey-api/typescript', '@hey-api/sdk', { name: '@hey-api/client-fetch', bundle: true }],
});
