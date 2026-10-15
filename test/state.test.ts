// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../src/core/defaults';

const DB = 'llfr-crossposter';

async function writeRawConfig(value: unknown) {
  const db = await openDB(DB, 1, {
    upgrade(d) {
      d.createObjectStore('kv');
      d.createObjectStore('templates', { keyPath: 'id' });
    },
  });
  await db.put('kv', value, 'config');
  db.close();
}

async function readRaw(key: string) {
  const db = await openDB(DB, 1);
  const v = await db.get('kv', key);
  db.close();
  return v;
}

/** Recharge les modules de l'app : état neuf, comme une ouverture de l'app. */
async function freshApp() {
  vi.resetModules();
  const app = await import('../src/state/app');
  const db = await import('../src/storage/db');
  return { app, db };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  const { closeDb } = await import('../src/storage/db');
  await closeDb();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

describe('démarrage (initState)', () => {
  it('sans réglages enregistrés : valeurs par défaut, premier groupe sélectionné', async () => {
    const { app, db } = await freshApp();
    await app.initState();
    expect(app.config.value).toEqual(defaultConfig());
    expect(app.draft.value.groupId).toBe('love-live');
    await db.closeDb();
  });

  it('sélectionne le premier groupe dans l’ordre choisi par l’utilisateur', async () => {
    const c = defaultConfig();
    c.groups.reverse();
    await writeRawConfig(c);
    const { app, db } = await freshApp();
    await app.initState();
    expect(app.config.value.groups[0]!.id).toBe('bluebird');
    expect(app.draft.value.groupId).toBe('bluebird');
    await db.closeDb();
  });

  it('réglages illisibles : copie de sauvegarde, message, valeurs par défaut', async () => {
    const broken = { schemaVersion: 99, groups: 'oups' };
    await writeRawConfig(broken);
    const { app, db } = await freshApp();
    await app.initState();
    expect(app.saveError.value).toMatch(/illisibles/);
    expect(app.config.value).toEqual(defaultConfig());
    await db.closeDb();
    expect(await readRaw(db.UNREADABLE_BACKUP_KEY)).toEqual(broken);
  });
});

describe('saisie en cours conservée (fermeture de l’onglet par Android)', () => {
  it('est restaurée à la réouverture, puis effacée par « Tout effacer »', async () => {
    let { app, db } = await freshApp();
    await app.initState();
    app.selectGroup('aqours');
    app.updateDraft({ mainText: 'Texte en cours 「テスト」 \u{1F338}', instaExtra: 'Plus' });
    app.toggleInstaHashtag('#Aqours');
    await db.closeDb();

    ({ app, db } = await freshApp());
    await app.initState();
    expect(app.draft.value).toMatchObject({
      groupId: 'aqours',
      mainText: 'Texte en cours 「テスト」 \u{1F338}',
      instaExtra: 'Plus',
      instaHashtags: ['#Aqours'],
    });

    app.clearDraft();
    expect(localStorage.getItem('llfr-crossposter:draft')).toBeNull();
    await db.closeDb();

    ({ app, db } = await freshApp());
    await app.initState();
    expect(app.draft.value.mainText).toBe('');
    await db.closeDb();
  });

  it('brouillon d’un groupe supprimé depuis : bascule sur le premier groupe', async () => {
    localStorage.setItem(
      'llfr-crossposter:draft',
      JSON.stringify({ groupId: 'disparu', mainText: 'T', tweet2: '', instaExtra: '', linkMention: 'bio', instaHashtags: ['#x'] }),
    );
    const { app, db } = await freshApp();
    await app.initState();
    expect(app.draft.value).toMatchObject({ groupId: 'love-live', mainText: 'T', linkMention: 'bio', instaHashtags: [] });
    await db.closeDb();
  });

  it('brouillon invalide ignoré', async () => {
    localStorage.setItem('llfr-crossposter:draft', '{"mainText": 3}');
    const { app, db } = await freshApp();
    await app.initState();
    expect(app.draft.value.mainText).toBe('');
    await db.closeDb();
  });
});

describe('limite de hashtags', () => {
  it('le message « 5 maximum » disparaît quand les réglages réduisent la sélection', async () => {
    const { app, db } = await freshApp();
    await app.initState();
    const tags = ['#a', '#b', '#c', '#d', '#e', '#f'];
    await app.setConfig({
      ...app.config.value,
      groups: app.config.value.groups.map((g, i) => (i === 0 ? { ...g, instaHashtags: tags } : g)),
    });
    for (const t of tags) app.toggleInstaHashtag(t);
    expect(app.hashtagLimitHit.value).toBe(true);
    await app.setConfig({
      ...app.config.value,
      groups: app.config.value.groups.map((g, i) => (i === 0 ? { ...g, instaHashtags: ['#a'] } : g)),
    });
    expect(app.draft.value.instaHashtags).toEqual(['#a']);
    expect(app.hashtagLimitHit.value).toBe(false);
    await db.closeDb();
  });
});
