import { useEffect, useRef, useState } from 'preact/hooks';
import { emptyGroup } from '../core/config';
import { formatHashtagList, hashtagWarnings, parseHashtagList } from '../core/hashtags';
import type { Group } from '../core/model';
import { isBlank } from '../core/blocks';
import { config, deleteGroup, moveGroup, persistence, saveError, saveGroup, setLinkMentions } from '../state/app';
import {
  importTemplates,
  loadTemplates,
  removeTemplate,
  renameTemplateById,
  templates,
  templatesLoaded,
  type TemplateView,
} from '../state/story';
import { isStoryFormat } from '../story/images';
import { parseBackup } from '../core/backup';
import { buildBackup, restoreTemplates } from '../storage/backup';
import { setConfig } from '../state/app';
import { reloadTemplatesAfterImport } from '../state/story';
import { downloadBlob } from './story/share';
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
  const fields = [
    { kind: 'bio' as const, label: fr.settings.linkBio },
    { kind: 'story' as const, label: fr.settings.linkStory },
  ];
  return (
    <section class="card form" aria-labelledby="link-title">
      <h2 id="link-title">{fr.settings.linkTitle}</h2>
      {fields.map(({ kind, label }) => (
        <div class="field" key={kind}>
          <label for={`link-${kind}`}>{label}</label>
          <input
            id={`link-${kind}`}
            class="input"
            type="text"
            value={lm[kind]}
            onInput={(e) => setLinkMentions({ ...config.value.linkMentions, [kind]: value(e) })}
            {...RAW_INPUT}
          />
          {isBlank(lm[kind]) && <p class="warning">{fr.settings.linkEmptyWarning}</p>}
        </div>
      ))}
    </section>
  );
}

function TemplateItem({ t }: { t: TemplateView }) {
  async function onRename(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    // Un nom vide n'est pas enregistré : on remet l'ancien.
    if (isBlank(input.value)) input.value = t.name;
    else if (input.value !== t.name) await renameTemplateById(t.id, input.value);
  }
  async function onDelete() {
    if (window.confirm(fr.settings.templateDeleteConfirm(t.name))) await removeTemplate(t.id);
  }
  return (
    <li class="template-item">
      <img class="template-item__thumb" src={t.thumbUrl} alt="" width={54} height={96} />
      <div class="template-item__body">
        <input
          class="input"
          type="text"
          defaultValue={t.name}
          aria-label={fr.settings.templateName(t.name)}
          onChange={onRename}
          {...RAW_INPUT}
        />
        {!isStoryFormat(t.width, t.height) && <p class="warning">{fr.settings.templateWrongSize(t.width, t.height)}</p>}
        <button type="button" class="btn btn--danger" onClick={onDelete}>
          {fr.settings.delete}
        </button>
      </div>
    </li>
  );
}

function TemplatesSection() {
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    if (!templatesLoaded.value) void loadTemplates();
  }, []);

  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length) return;
    setBusy(true);
    const report = await importTemplates(files);
    setBusy(false);
    setMessages([
      ...(report.imported.length ? [fr.settings.templatesImported(report.imported.length)] : []),
      ...report.errors,
    ]);
  }

  return (
    <section class="card" aria-labelledby="templates-title">
      <h2 id="templates-title">{fr.settings.templatesTitle}</h2>
      <p class="hint">{fr.settings.templatesHint}</p>
      {templates.value.length === 0 ? (
        <p>{fr.settings.templatesEmpty}</p>
      ) : (
        <ul class="template-list">
          {templates.value.map((t) => (
            <TemplateItem key={`${t.id}:${t.name}`} t={t} />
          ))}
        </ul>
      )}
      {messages.map((m) => (
        <p key={m} class="notice" role="status">
          {m}
        </p>
      ))}
      <label class={`btn btn--primary btn--block file-button${busy ? ' is-busy' : ''}`}>
        <input type="file" accept="image/png" multiple class="visually-hidden" onChange={onFiles} disabled={busy} />
        {busy ? fr.settings.templatesImporting : fr.settings.templatesImport}
      </label>
    </section>
  );
}

function BackupSection() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onExport() {
    setBusy(true);
    setMessage(null);
    try {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      downloadBlob(await buildBackup(config.value, d), `llfr-config-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`);
    } catch (e) {
      setMessage(fr.backup.failed(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setMessage(null);
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setMessage(fr.backup.failed('fichier JSON illisible.'));
      return;
    }
    const parsed = parseBackup(raw);
    if (!parsed.ok) {
      setMessage(fr.backup.failed(parsed.error));
      return;
    }
    const { backup } = parsed;
    if (!window.confirm(fr.backup.confirm(backup.config.groups.length, backup.templates.length))) return;
    setBusy(true);
    try {
      await restoreTemplates(backup);
      await setConfig(backup.config);
      await reloadTemplatesAfterImport();
      setMessage(fr.backup.done);
    } catch (err) {
      setMessage(fr.backup.failed(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section class="card form" aria-labelledby="backup-title">
      <h2 id="backup-title">{fr.backup.title}</h2>
      <p class="hint">{fr.backup.hint}</p>
      <button type="button" class="btn btn--primary btn--block" onClick={onExport} disabled={busy}>
        {busy ? fr.backup.exporting : fr.backup.export}
      </button>
      <label class={`btn btn--block file-button${busy ? ' is-busy' : ''}`}>
        <input type="file" accept="application/json,.json" class="visually-hidden" onChange={onImport} disabled={busy} />
        {fr.backup.import}
      </label>
      {message && (
        <p class="notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function StorageSection() {
  const status = persistence.value;
  if (status === null) return null;
  const text = {
    granted: fr.settings.storageGranted,
    prompt: fr.settings.storagePrompt,
    denied: fr.settings.storageDenied,
    unsupported: fr.settings.storageUnsupported,
  }[status];
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
      <TemplatesSection />
      <BackupSection />
      <StorageSection />
      <p class="hint licenses-link">
        <a class="link" href="./LICENSES.txt" target="_blank" rel="noopener">
          {fr.licenses}
        </a>
      </p>
    </div>
  );
}
