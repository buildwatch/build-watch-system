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
  integrations: [tailwind(), react()],
}); 