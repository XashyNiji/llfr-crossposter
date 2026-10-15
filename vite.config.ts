import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Adresses relatives ('./') : l'app fonctionne quel que soit le chemin de
// publication (https://<compte>.github.io/<dépôt>/), donc renommer le dépôt ne
// casse rien. La navigation se fait par « # », toutes les pages sont donc
// servies par le même index.html. BASE_PATH permet de forcer un chemin absolu.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  build: { target: 'es2024' },
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  plugins: [
    VitePWA({
      // Mise à jour proposée par un bandeau (jamais de rechargement surprise
      // qui effacerait une story en cours).
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: './',
        name: 'LLFR Crossposter',
        short_name: 'LLFR',
        description: 'Un texte → tweets, légende Instagram et story, pour Love Live France.',
        lang: 'fr',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f3f5',
        theme_color: '#e4007f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // TOUT est mis en cache à la première ouverture, polices comprises
        // (les .woff, doublons inutiles des .woff2, sont exclus).
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest,txt}'],
        globIgnores: ['**/*.woff'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
