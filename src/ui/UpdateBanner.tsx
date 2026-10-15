import { signal } from '@preact/signals';
import { fr } from './fr';

// Service worker (hors-ligne) : enregistré au démarrage. Quand une nouvelle
// version est en ligne, un bandeau propose de recharger (jamais automatiquement).
const needRefresh = signal(false);
const offlineReady = signal(false);
let update: ((reload?: boolean) => Promise<void>) | null = null;

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const { registerSW } = await import('virtual:pwa-register');
  update = registerSW({
    onNeedRefresh: () => (needRefresh.value = true),
    onOfflineReady: () => (offlineReady.value = true),
  });
}

export function UpdateBanner() {
  if (needRefresh.value) {
    return (
      <div class="update-banner" role="status">
        <span>{fr.pwa.newVersion}</span>
        <button type="button" class="btn btn--primary" onClick={() => void update?.(true)}>
          {fr.pwa.reload}
        </button>
      </div>
    );
  }
  if (offlineReady.value) {
    return (
      <div class="update-banner" role="status">
        <span>{fr.pwa.offlineReady}</span>
        <button type="button" class="btn" onClick={() => (offlineReady.value = false)}>
          {fr.pwa.ok}
        </button>
      </div>
    );
  }
  return null;
}
