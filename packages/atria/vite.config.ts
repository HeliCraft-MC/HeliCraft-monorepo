import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rolldownOptions: { external: [/^react(?:$|\/)/u, /^react-dom(?:$|\/)/u, /^@base-ui\//u] },
  },
});
