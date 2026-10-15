import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64, parseBackup } from '../src/core/backup';
import { defaultConfig } from '../src/core/defaults';
import { buildBackup, restoreTemplates } from '../src/storage/backup';
import { closeDb, DB_NAME } from '../src/storage/db';
import { getTemplate, listTemplates, putTemplate } from '../src/storage/templates';

afterEach(async () => {
  await closeDb();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

describe('sauvegarde de la config', () => {
  it('base64 : aller-retour octet pour octet', () => {
    const bytes = new Uint8Array(70_000).map((_, i) => (i * 7) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('export puis import : réglages et templates identiques, caractères intacts', async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 255]);
    await putTemplate({
      id: 'tpl-1',
      name: 'Hasunosora \u{1FAB7}',
      blob: new Blob([png], { type: 'image/png' }),
      thumb: new Blob([new Uint8Array([9, 9])], { type: 'image/jpeg' }),
      width: 1440,
      height: 2560,
      createdAt: 5,
    });
    const config = defaultConfig();
    const blob = await buildBackup(config, new Date('2026-10-15T12:00:00Z'));
    const parsed = parseBackup(JSON.parse(await blob.text()));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.config).toEqual(config);
    expect(parsed.backup.config.groups[1]!.prefix).toBe('\u{3010}\u{1F33A}\u{B5}\'s\u{1F33A}\u{3011}');

    // Un autre téléphone avec un autre template : tout est remplacé.
    await putTemplate({ id: 'autre', name: 'x', blob: new Blob([]), thumb: new Blob([]), width: 1, height: 1, createdAt: 1 });
    await restoreTemplates(parsed.backup);
    expect((await listTemplates()).map((t) => t.id)).toEqual(['tpl-1']);
    const t = await getTemplate('tpl-1');
    expect(t!.name).toBe('Hasunosora \u{1FAB7}');
    expect(new Uint8Array(await t!.blob.arrayBuffer())).toEqual(png);
  });

  it.each([
    ['pas un objet', 'x'],
    ['autre app', { app: 'autre', backupVersion: 1 }],
    ['version inconnue', { app: 'llfr-crossposter', backupVersion: 99 }],
    ['réglages invalides', { app: 'llfr-crossposter', backupVersion: 1, config: {}, templates: [] }],
    ['template invalide', { app: 'llfr-crossposter', backupVersion: 1, config: defaultConfig(), templates: [{ id: 1 }] }],
  ])('fichier refusé : %s', (_l, raw) => {
    expect(parseBackup(raw).ok).toBe(false);
  });
});
