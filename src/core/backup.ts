// Export / import de toute la configuration (groupes, formulations, templates)
// dans un fichier JSON : sauvegarde, et partage des réglages avec le staff.
// Les chaînes sont copiées telles quelles (aucune normalisation).
import { parseConfig } from './config';
import type { Config } from './model';

export const BACKUP_APP = 'llfr-crossposter';
export const BACKUP_VERSION = 1;

export interface BackupTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  /** PNG d'origine, en base64. */
  png: string;
  /** Miniature JPEG, en base64. */
  thumb: string;
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  backupVersion: number;
  exportedAt: string;
  config: Config;
  templates: BackupTemplate[];
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Vérifie un fichier de sauvegarde EN ENTIER avant tout changement. Renvoie
 * le contenu validé, ou un message d'erreur en français.
 */
export function parseBackup(raw: unknown): { ok: true; backup: BackupFile } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Fichier illisible.' };
  const b = raw as Record<string, unknown>;
  if (b.app !== BACKUP_APP) return { ok: false, error: 'Ce fichier n’est pas une sauvegarde LLFR Crossposter.' };
  if (b.backupVersion !== BACKUP_VERSION) {
    return { ok: false, error: 'Sauvegarde d’une version inconnue de l’app : mets l’app à jour.' };
  }
  const config = parseConfig(b.config);
  if (!config) return { ok: false, error: 'Les réglages du fichier sont invalides.' };
  if (!Array.isArray(b.templates)) return { ok: false, error: 'La liste des templates est invalide.' };
  const templates: BackupTemplate[] = [];
  for (const t of b.templates as unknown[]) {
    const x = t as Record<string, unknown>;
    if (
      typeof t !== 'object' || t === null ||
      !isStr(x.id) || !isStr(x.name) || !isNum(x.width) || !isNum(x.height) ||
      !isNum(x.createdAt) || !isStr(x.png) || !isStr(x.thumb)
    ) {
      return { ok: false, error: 'Un template du fichier est invalide.' };
    }
    templates.push({ id: x.id, name: x.name, width: x.width, height: x.height, createdAt: x.createdAt, png: x.png, thumb: x.thumb });
  }
  return { ok: true, backup: { app: BACKUP_APP, backupVersion: BACKUP_VERSION, exportedAt: isStr(b.exportedAt) ? b.exportedAt : '', config, templates } };
}
