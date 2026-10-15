import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDb, DB_NAME } from '../src/storage/db';
import {
  deleteTemplate,
  getTemplate,
  listTemplates,
  loadLastTemplateId,
  putTemplate,
  renameTemplate,
  saveLastTemplateId,
  type StoredTemplate,
} from '../src/storage/templates';

afterEach(async () => {
  await closeDb();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

function template(id: string, createdAt: number, bytes = [137, 80, 78, 71]): StoredTemplate {
  return {
    id,
    name: `Template ${id}`,
    blob: new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
    width: 1440,
    height: 2560,
    thumb: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
    createdAt,
  };
}

describe('templates dans IndexedDB', () => {
  it('liste dans l’ordre d’import, sans le PNG complet', async () => {
    await putTemplate(template('b', 2));
    await putTemplate(template('a', 1));
    const list = await listTemplates();
    expect(list.map((t) => t.id)).toEqual(['a', 'b']);
    expect(list[0]).not.toHaveProperty('blob');
    expect(list[0]!.thumb).toBeInstanceOf(Blob);
  });

  it('le PNG est conservé octet pour octet', async () => {
    const bytes = [137, 80, 78, 71, 13, 10, 26, 10, 0, 255];
    await putTemplate(template('a', 1, bytes));
    const t = await getTemplate('a');
    expect(new Uint8Array(await t!.blob.arrayBuffer())).toEqual(new Uint8Array(bytes));
    expect(t!.blob.type).toBe('image/png');
  });

  it('renommer sans altérer les caractères', async () => {
    await putTemplate(template('a', 1));
    await renameTemplate('a', 'Hasunosora \u{1FAB7} \u{84EE}\u{30CE}\u{7A7A}');
    expect((await getTemplate('a'))!.name).toBe('Hasunosora \u{1FAB7} \u{84EE}\u{30CE}\u{7A7A}');
  });

  it('supprimer efface aussi le « dernier template » s’il s’agit de celui-ci', async () => {
    await putTemplate(template('a', 1));
    await saveLastTemplateId('a');
    expect(await loadLastTemplateId()).toBe('a');
    await deleteTemplate('a');
    expect(await getTemplate('a')).toBeUndefined();
    expect(await loadLastTemplateId()).toBeNull();
  });
});
