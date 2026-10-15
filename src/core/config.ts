// Validation et manipulation de la configuration (fonctions pures).
import { CONFIG_SCHEMA_VERSION, type Config, type Group, type Id } from './model';

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isGroup(v: unknown): v is Group {
  if (typeof v !== 'object' || v === null) return false;
  const g = v as Record<string, unknown>;
  return (
    isString(g.id) &&
    g.id.length > 0 &&
    isString(g.name) &&
    isString(g.prefix) &&
    isStringArray(g.xHashtags) &&
    isStringArray(g.instaHashtags)
  );
}

/**
 * Vérifie qu'une valeur inconnue (IndexedDB, fichier importé) est une
 * configuration valide de la version actuelle. Renvoie une copie propre
 * (sans champ inconnu) ou null. Les chaînes sont copiées telles quelles.
 */
export function parseConfig(value: unknown): Config | null {
  if (typeof value !== 'object' || value === null) return null;
  const c = value as Record<string, unknown>;
  if (c.schemaVersion !== CONFIG_SCHEMA_VERSION) return null;
  if (!Array.isArray(c.groups) || !c.groups.every(isGroup)) return null;
  const ids = new Set(c.groups.map((g) => g.id));
  if (ids.size !== c.groups.length) return null;
  const lm = c.linkMentions as Record<string, unknown> | null | undefined;
  if (typeof lm !== 'object' || lm === null || !isString(lm.bio) || !isString(lm.story)) return null;
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    groups: c.groups.map((g) => ({
      id: g.id,
      name: g.name,
      prefix: g.prefix,
      xHashtags: [...g.xHashtags],
      instaHashtags: [...g.instaHashtags],
    })),
    linkMentions: { bio: lm.bio, story: lm.story },
  };
}

/** Déplace le groupe d'indice `index` de `delta` positions (bornes respectées). */
export function moveGroup(groups: readonly Group[], index: number, delta: number): Group[] {
  const target = index + delta;
  if (index < 0 || index >= groups.length || target < 0 || target >= groups.length) {
    return [...groups];
  }
  const out = [...groups];
  const [moved] = out.splice(index, 1);
  out.splice(target, 0, moved!);
  return out;
}

export function upsertGroup(groups: readonly Group[], group: Group): Group[] {
  const i = groups.findIndex((g) => g.id === group.id);
  if (i === -1) return [...groups, group];
  const out = [...groups];
  out[i] = group;
  return out;
}

export function removeGroup(groups: readonly Group[], id: Id): Group[] {
  return groups.filter((g) => g.id !== id);
}

export function newGroupId(): Id {
  return `g-${crypto.randomUUID()}`;
}

export function emptyGroup(): Group {
  return { id: newGroupId(), name: '', prefix: '', xHashtags: [], instaHashtags: [] };
}
