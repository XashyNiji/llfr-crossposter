import { defineConfig } from 'vitest/config';

// Adresses relatives ('./') : l'app fonctionne quel que soit le chemin de
// publication (https://<compte>.github.io/<dépôt>/), donc renommer le dépôt ne
// casse rien. La navigation se fait par « # », toutes les pages sont donc
// servies par le même index.html. BASE_PATH permet de forcer un chemin absolu.
const base = process.env.BASE_PATH ?? './';

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
