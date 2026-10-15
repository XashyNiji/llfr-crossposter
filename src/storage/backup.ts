// Lecture / écriture de la sauvegarde complète (réglages + templates).
import {
  base64ToBytes,
  BACKUP_APP,
  BACKUP_VERSION,
  bytesToBase64,
  type BackupFile,
} from '../core/backup';
import type { Config } from '../core/model';
import { db } from './db';

/** Fabrique le fichier JSON de sauvegarde (templates inclus, en base64). */
export async function buildBackup(config: Config, now = new Date()): Promise<Blob> {
  const templates = await (await db()).getAll('templates');
  const backup: BackupFile = {
    app: BACKUP_APP,
    backupVersion: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    config,
    templates: await Promise.all(
      templates.map(async (t) => ({
        id: t.id,
        name: t.name,
        width: t.width,
        height: t.height,
        createdAt: t.createdAt,
        png: bytesToBase64(new Uint8Array(await t.blob.arrayBuffer())),
        thumb: bytesToBase64(new Uint8Array(await t.thumb.arrayBuffer())),
      })),
    ),
  };
  return new Blob([JSON.stringify(backup)], { type: 'application/json' });
}

/** Remplace TOUS les templates par ceux de la sauvegarde (déjà validée). */
export async function restoreTemplates(backup: BackupFile): Promise<void> {
  const database = await db();
  const tx = database.transaction('templates', 'readwrite');
  await tx.store.clear();
  for (const t of backup.templates) {
    await tx.store.put({
      id: t.id,
      name: t.name,
      width: t.width,
      height: t.height,
      createdAt: t.createdAt,
      blob: new Blob([base64ToBytes(t.png)], { type: 'image/png' }),
      thumb: new Blob([base64ToBytes(t.thumb)], { type: 'image/jpeg' }),
    });
  }
  await tx.done;
}
