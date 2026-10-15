// Templates de post (texte) : l'utilisateur les crée lui-même depuis le
// texte principal, puis les réinsère d'un clic. Stockés dans IndexedDB (kv).
import { signal } from '@preact/signals';
import { db } from '../storage/db';
import { draft, updateDraft } from '../state/app';

interface PostTemplate {
  id: string;
  name: string;
  text: string;
}

const KEY = 'postTemplates';
const list = signal<PostTemplate[] | null>(null);
const selected = signal('');

async function load(): Promise<void> {
  const v = await (await db()).get('kv', KEY);
  list.value = Array.isArray(v) ? (v as PostTemplate[]) : [];
}

async function save(next: PostTemplate[]): Promise<void> {
  list.value = next;
  await (await db()).put('kv', next, KEY);
}

export function PostTemplates() {
  if (list.value === null) {
    void load();
    return null;
  }
  const items = list.value;
  const current = items.find((t) => t.id === selected.value);

  function onSave() {
    const text = draft.value.mainText;
    if (!text.trim()) return window.alert('Écris d’abord le texte du template dans le texte principal.');
    const name = window.prompt('Nom du template :', current?.name ?? '')?.trim();
    if (!name) return;
    const existing = items.find((t) => t.name === name);
    if (existing && !window.confirm(`Remplacer le template « ${name} » ?`)) return;
    const id = existing?.id ?? crypto.randomUUID();
    void save([...items.filter((t) => t.id !== id), { id, name, text }]);
    selected.value = id;
  }

  function onUse() {
    if (!current) return;
    if (draft.value.mainText.trim() && !window.confirm('Remplacer le texte principal par ce template ?')) return;
    updateDraft({ mainText: current.text });
  }

  function onDelete() {
    if (!current || !window.confirm(`Supprimer le template « ${current.name} » ?`)) return;
    void save(items.filter((t) => t.id !== current.id));
    selected.value = '';
  }

  return (
    <div class="field">
      <label for="post-template">Templates de post</label>
      <select
        id="post-template"
        class="input"
        value={selected.value}
        onChange={(e) => (selected.value = (e.currentTarget as HTMLSelectElement).value)}
      >
        <option value="">{items.length ? '— Choisir un template —' : '— Aucun template —'}</option>
        {items.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <div class="row">
        <button type="button" class="btn btn--primary" disabled={!current} onClick={onUse}>
          Utiliser
        </button>
        <button type="button" class="btn" onClick={onSave}>
          Enregistrer le texte actuel
        </button>
        <button type="button" class="btn btn--danger" disabled={!current} onClick={onDelete}>
          Supprimer
        </button>
      </div>
    </div>
  );
}
