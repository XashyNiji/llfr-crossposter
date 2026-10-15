import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout (navigateur réel) : export de la story.
// Lancer : npm run build && npm run test:e2e
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4174/',
    locale: 'fr-FR',
    acceptDownloads: true,
  },
  webServer: {
    command: 'npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
