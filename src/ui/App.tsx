import { signal } from '@preact/signals';
import { fr } from './fr';
import { InputScreen } from './InputScreen';
import { SettingsScreen } from './SettingsScreen';
import { StoryScreen } from './StoryScreen';
import { UpdateBanner } from './UpdateBanner';

// Navigation par « # » dans l'adresse (#/, #/story, #/reglages) :
// GitHub Pages ne sait pas servir d'autres chemins qu'index.html.
export type Route = 'input' | 'story' | 'settings';

const ROUTES: Record<Route, string> = { input: '#/', story: '#/story', settings: '#/reglages' };

export function routeFromHash(hash: string): Route {
  if (hash.startsWith('#/story')) return 'story';
  if (hash.startsWith('#/reglages')) return 'settings';
  return 'input';
}

const route = signal<Route>(routeFromHash(globalThis.location?.hash ?? ''));
globalThis.addEventListener?.('hashchange', () => {
  route.value = routeFromHash(location.hash);
  window.scrollTo(0, 0);
});

const TABS: { route: Route; label: string; icon: string }[] = [
  { route: 'input', label: fr.nav.input, icon: '✏️' },
  { route: 'story', label: fr.nav.story, icon: '🖼️' },
  { route: 'settings', label: fr.nav.settings, icon: '⚙️' },
];

export function App() {
  const current = route.value;
  return (
    <>
      <header class="topbar">
        <h1>{fr.appName}</h1>
      </header>
      <UpdateBanner />
      <main>
        {current === 'input' && <InputScreen />}
        {current === 'story' && <StoryScreen />}
        {current === 'settings' && <SettingsScreen />}
      </main>
      <nav class="tabbar" aria-label={fr.nav.label}>
        {TABS.map((t) => (
          <a
            key={t.route}
            href={ROUTES[t.route]}
            class={`tab${current === t.route ? ' tab--on' : ''}`}
            aria-current={current === t.route ? 'page' : undefined}
          >
            <span class="tab__icon" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </a>
        ))}
      </nav>
    </>
  );
}
