import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/defaults';
import { closeDb, DB_NAME, loadConfig, saveConfig } from '../src/storage/db';

afterEach(async () => {
  await closeDb();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

describe('stockage IndexedDB', () => {
  it('rien d’enregistré → null', async () => {
    expect(await loadConfig()).toBeNull();
  });

  it('aller-retour sans altérer les caractères', async () => {
    const c = defaultConfig();
    c.groups[0]!.prefix = '【🌺µ\'s🌺】 　「テスト」 é';
    await saveConfig(c);
    await closeDb();
    const loaded = await loadConfig();
    expect(loaded).toEqual(c);
    expect(loaded!.groups[0]!.prefix).toBe('【🌺µ\'s🌺】 　「テスト」 é');
  });
});
