import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: '/counting-app/',
  plugins: [svelte()],
  test: {
    environment: 'node',
    globals: true,
  },
});
