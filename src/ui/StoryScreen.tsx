import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { fr } from './fr';

// L'éditeur (et ses polices, dont le japonais) n'est chargé qu'à l'ouverture
// de l'onglet Story : l'écran de saisie reste léger.
let loaded: ComponentType | null = null;

export function StoryScreen() {
  const [Editor, setEditor] = useState<ComponentType | null>(() => loaded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Editor) return;
    import('./story/StoryEditor')
      .then((m) => {
        loaded = m.StoryEditor;
        setEditor(() => m.StoryEditor);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (Editor) return <Editor />;
  return (
    <div class="screen">
      <section class="card">
        <h2>{fr.story.title}</h2>
        {error ? (
          <p class="alert" role="alert">
            {error}
          </p>
        ) : (
          <p>{fr.story.loading}</p>
        )}
      </section>
    </div>
  );
}
