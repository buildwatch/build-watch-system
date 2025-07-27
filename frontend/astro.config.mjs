import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'http://localhost:4321',
  base: '/',
  outDir: './dist',
  publicDir: './public',
  srcDir: './src',
  build: {
    assets: 'assets',
  },
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
  integrations: [tailwind(), react()],
}); 