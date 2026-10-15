import { defineConfig } from 'vitest/config';

// Chemin de publication sur GitHub Pages (https://<compte>.github.io/<dépôt>/).
// En CI, le workflow le fournit via BASE_PATH (déduit du nom du dépôt),
// donc renommer le dépôt ne demande aucune modification ici.
const base = process.env.BASE_PATH ?? '/llfr-crossposter/';

export default defineConfig({
  base,
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
