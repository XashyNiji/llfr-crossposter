// Stockage local dans IndexedDB (bibliothèque idb).
//
// Le nom de la base est préfixé par l'app : toutes les pages GitHub Pages d'un
// même compte partagent l'origine https://<compte>.github.io et donc le
// stockage du navigateur.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { parseConfig } from '../core/config';
import type { Config } from '../core/model';

export const DB_NAME = 'llfr-crossposter';
const DB_VERSION = 1;
const CONFIG_KEY = 'config';

interface CrossposterDB extends DBSchema {
  /** Réglages (clé → valeur). */
  kv: { key: string; value: unknown };
  /** Templates de story (étape b). */
  templates: { key: string; value: { id: string; name: string; blob: Blob; width: number; height: number } };
}

let dbPromise: Promise<IDBPDatabase<CrossposterDB>> | null = null;

function db(): Promise<IDBPDatabase<CrossposterDB>> {
  dbPromise ??= openDB<CrossposterDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('kv')) database.createObjectStore('kv');
      if (!database.objectStoreNames.contains('templates')) {
        database.createObjectStore('templates', { keyPath: 'id' });
      }
    },
  });
  return dbPromise;
}

/** Ferme la connexion (utile pour les tests). */
export async function closeDb(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

/** Charge la configuration enregistrée, ou null si absente ou illisible. */
export async function loadConfig(): Promise<Config | null> {
  return parseConfig(await (await db()).get('kv', CONFIG_KEY));
}

export async function saveConfig(config: Config): Promise<void> {
  await (await db()).put('kv', config, CONFIG_KEY);
  void requestPersistence();
}

export type PersistenceStatus = 'granted' | 'denied' | 'unsupported';

let persistRequested = false;

/**
 * Demande au navigateur de ne pas effacer les données en cas de manque de
 * place (navigator.storage.persist). Chrome Android décide seul, sans
 * afficher de question, selon l'usage du site (app installée, visites…).
 */
export async function requestPersistence(): Promise<PersistenceStatus> {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'granted';
    if (persistRequested) return 'denied';
    persistRequested = true;
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function persistenceStatus(): Promise<PersistenceStatus> {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persisted) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
