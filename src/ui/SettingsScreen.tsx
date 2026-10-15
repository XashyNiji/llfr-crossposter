import { useEffect, useRef, useState } from 'preact/hooks';
import { emptyGroup } from '../core/config';
import { formatHashtagList, hashtagWarnings, parseHashtagList } from '../core/hashtags';
import type { Group } from '../core/model';
import { config, deleteGroup, moveGroup, saveError, saveGroup, setLinkMentions } from '../state/app';
import { persistenceStatus, type PersistenceStatus } from '../storage/db';
import { fr } from './fr';

// Attributs pour que le clavier (Gboard…) ne « corrige » pas les préfixes et
// hashtags : pas de majuscule auto, pas de correction, pas de suggestions.
const RAW_INPUT = {
  autocomplete: 'off',
  autocorrect: 'off',
  autocapitalize: 'off',
  spellcheck: false,
} as const;

function value(e: Event): string {
  return (e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
}

function HashtagWarnings({ raw }: { raw: string }) {
  const w = hashtagWarnings(parseHashtagList(raw));
  if (w.missingHash.length === 0 && w.duplicates.length === 0) return null;
  return (
    <div class="warnings">
      {w.missingHash.length > 0 && <p class="warning">{fr.settings.missingHash(w.missingHash)}</p>}
      {w.duplicates.length > 0 && <p class="warning">{fr.settings.duplicates(w.duplicates)}</p>}
    </div>
  );
}

interface EditorProps {
  initial: Group;
  isNew: boolean;
  onDone: () => void;
}

function GroupEditor({ initial, isNew, onDone }: EditorProps) {
  const [name, setName] = useState(initial.name);
  const [prefix, setPrefix] = useState(initial.prefix);
  // Les listes restent en texte brut pendant la saisie et ne sont découpées
  // qu'à l'enregistrement (sinon l'espace tapée disparaîtrait aussitôt).
  const [xRaw, setXRaw] = useState(formatHashtagList(initial.xHashtags));
  const [instaRaw, setInstaRaw] = useState(formatHashtagList(initial.instaHashtags));
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => formRef.current?.scrollIntoView?.({ block: 'start' }), []);

  async function onSave(e: Event) {
    e.preventDefault();
    if (/^\s*$/u.test(name)) {
      setError(fr.settings.nameRequired);
      return;
    }
    await saveGroup({
      id: initial.id,
      name,
      prefix,
      xHashtags: parseHashtagList(xRaw),
      instaHashtags: parseHashtagList(instaRaw),
    });
    onDone();
  }

  const id = (field: string) => `${initial.id}-${field}`;

  return (
    <form ref={formRef} class="card form editor" onSubmit={onSave} aria-label={isNew ? fr.settings.newTitle : fr.settings.editTitle}>
      <h3>{isNew ? fr.settings.newTitle : fr.settings.editTitle}</h3>
      <div class="field">
        <label for={id('name')}>{fr.settings.name}</label>
        <input id={id('name')} class="input" type="text" value={name} onInput={(e) => setName(value(e))} {...RAW_INPUT} />
        {error && (
          <p class="alert" role="alert">
            {error}
          </p>
        )}
      </div>
      <div class="field">
        <label for={id('prefix')}>{fr.settings.prefix}</label>
        <input
          id={id('prefix')}
          class="input"
          type="text"
          value={prefix}
          onInput={(e) => setPrefix(value(e))}
          {...RAW_INPUT}
        />
        <p class="hint">{fr.settings.prefixHint}</p>
      </div>
      <div class="field">
        <label for={id('x')}>{fr.settings.xHashtags}</label>
        <textarea id={id('x')} class="input" rows={3} value={xRaw} onInput={(e) => setXRaw(value(e))} {...RAW_INPUT} />
        <p class="hint">{fr.settings.hashtagsHint}</p>
        <HashtagWarnings raw={xRaw} />
      </div>
      <div class="field">
        <label for={id('insta')}>{fr.settings.instaHashtags}</label>
        <textarea
          id={id('insta')}
          class="input"
          rows={5}
          value={instaRaw}
          onInput={(e) => setInstaRaw(value(e))}
          {...RAW_INPUT}
        />
        <p class="hint">{fr.settings.hashtagsHint}</p>
        <HashtagWarnings raw={instaRaw} />
      </div>
      <div class="row">
        <button type="button" class="btn" onClick={onDone}>
          {fr.settings.cancel}
        </button>
        <button type="submit" class="btn btn--primary">
          {fr.settings.save}
        </button>
      </div>
    </form>
  );
}

function GroupsSection() {
  const groups = config.value.groups;
  const [editing, setEditing] = useState<{ group: Group; isNew: boolean } | null>(null);

  async function onDelete(g: Group) {
    if (window.confirm(fr.settings.deleteConfirm(g.name || fr.settings.unnamed))) await deleteGroup(g.id);
  }

  if (editing) {
    return <GroupEditor initial={editing.group} isNew={editing.isNew} onDone={() => setEditing(null)} />;
  }

  return (
    <section class="card" aria-labelledby="groups-title">
      <h2 id="groups-title">{fr.settings.groupsTitle}</h2>
      <ul class="group-list">
        {groups.map((g, i) => (
          <li key={g.id} class="group-item">
            <div class="group-item__text">
              <strong>{g.name || fr.settings.unnamed}</strong>
              <span class="group-item__prefix">{g.prefix}</span>
            </div>
            <div class="group-item__actions">
              <button
                type="button"
                class="btn btn--icon"
                aria-label={`${fr.settings.moveUp} ${g.name}`}
                disabled={i === 0}
                onClick={() => moveGroup(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                class="btn btn--icon"
                aria-label={`${fr.settings.moveDown} ${g.name}`}
                disabled={i === groups.length - 1}
                onClick={() => moveGroup(i, 1)}
              >
                ↓
              </button>
              <button type="button" class="btn" onClick={() => setEditing({ group: g, isNew: false })}>
                {fr.settings.edit}
              </button>
              <button
                type="button"
                class="btn btn--danger"
                disabled={groups.length <= 1}
                title={groups.length <= 1 ? fr.settings.lastGroup : undefined}
                onClick={() => onDelete(g)}
              >
                {fr.settings.delete}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        class="btn btn--primary btn--block"
        onClick={() => setEditing({ group: emptyGroup(), isNew: true })}
      >
        {fr.settings.addGroup}
      </button>
    </section>
  );
}

function LinkSection() {
  const lm = config.value.linkMentions;
  return (
    <section class="card form" aria-labelledby="link-title">
      <h2 id="link-title">{fr.settings.linkTitle}</h2>
      <div class="field">
        <label for="link-bio">{fr.settings.linkBio}</label>
        <input
          id="link-bio"
          class="input"
          type="text"
          value={lm.bio}
          onInput={(e) => setLinkMentions({ ...lm, bio: value(e) })}
        />
      </div>
      <div class="field">
        <label for="link-story">{fr.settings.linkStory}</label>
        <input
          id="link-story"
          class="input"
          type="text"
          value={lm.story}
          onInput={(e) => setLinkMentions({ ...lm, story: value(e) })}
        />
      </div>
    </section>
  );
}

function StorageSection() {
  const [status, setStatus] = useState<PersistenceStatus | null>(null);
  useEffect(() => {
    void persistenceStatus().then(setStatus);
  }, [config.value]);
  if (status === null) return null;
  const text =
    status === 'granted'
      ? fr.settings.storageGranted
      : status === 'denied'
        ? fr.settings.storageDenied
        : fr.settings.storageUnsupported;
  return (
    <section class="card" aria-labelledby="storage-title">
      <h2 id="storage-title">{fr.settings.storageTitle}</h2>
      <p>{text}</p>
    </section>
  );
}

export function SettingsScreen() {
  return (
    <div class="screen">
      {saveError.value && (
        <p class="alert" role="alert">
          {saveError.value}
        </p>
      )}
      <GroupsSection />
      <LinkSection />
      <StorageSection />
    </div>
  );
}
