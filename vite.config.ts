import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Account_Book/',
  build: {
    // Top-level await (used for the mobile/desktop dynamic entry split) needs
    // a target that supports it; the esbuild default does not.
    target: 'es2022',
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '记账',
        short_name: '记账',
        description: '本地存储的极简记账应用',
        theme_color: '#10b981',
        background_color: '#f8f8f7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Account_Book/',
        start_url: '/Account_Book/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
});
