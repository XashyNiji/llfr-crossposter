// Templates de story dans IndexedDB. Les PNG ne quittent jamais le téléphone
// (le dépôt est public) ; ils se partagent avec le staff par l'export de la
// configuration (étape d).
import { db, type StoredTemplate } from './db';

export type { StoredTemplate };

/** Informations d'un template, sans le PNG complet. */
export type TemplateMeta = Omit<StoredTemplate, 'blob'>;

const LAST_TEMPLATE_KEY = 'lastTemplateId';

/** Liste des templates, du plus ancien au plus récent (sans les PNG complets). */
export async function listTemplates(): Promise<TemplateMeta[]> {
  const all = await (await db()).getAll('templates');
  return all
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(({ blob: _blob, ...meta }) => meta);
}

export async function getTemplate(id: string): Promise<StoredTemplate | undefined> {
  return (await db()).get('templates', id);
}

export async function putTemplate(template: StoredTemplate): Promise<void> {
  await (await db()).put('templates', template);
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  const database = await db();
  const tx = database.transaction('templates', 'readwrite');
  const t = await tx.store.get(id);
  if (t) await tx.store.put({ ...t, name });
  await tx.done;
}

export async function deleteTemplate(id: string): Promise<void> {
  const database = await db();
  await database.delete('templates', id);
  if ((await database.get('kv', LAST_TEMPLATE_KEY)) === id) await database.delete('kv', LAST_TEMPLATE_KEY);
}

/** Dernier template choisi dans l'éditeur (seul réglage retenu d'une story à l'autre). */
export async function loadLastTemplateId(): Promise<string | null> {
  const v = await (await db()).get('kv', LAST_TEMPLATE_KEY);
  return typeof v === 'string' ? v : null;
}

export async function saveLastTemplateId(id: string | null): Promise<void> {
  const database = await db();
  if (id === null) await database.delete('kv', LAST_TEMPLATE_KEY);
  else await database.put('kv', id, LAST_TEMPLATE_KEY);
}
