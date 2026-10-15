import { INSTA_HASHTAGS_MAX } from './model';

/**
 * Découpe une liste saisie dans un champ texte : séparation sur tout blanc
 * (espace, retour à la ligne, espace insécable, espace japonaise U+3000…).
 * Chaque hashtag est conservé caractère par caractère, sans « correction ».
 */
export function parseHashtagList(raw: string): string[] {
  return raw.split(/\s+/u).filter((t) => t.length > 0);
}

/** Affichage dans le champ de saisie des réglages : un hashtag par ligne. */
export function formatHashtagList(tags: readonly string[]): string {
  return tags.join('\n');
}

export interface HashtagWarnings {
  /** Hashtags qui ne commencent pas par « # ». */
  missingHash: string[];
  /** Hashtags présents plusieurs fois. */
  duplicates: string[];
}

/** Avertissements (jamais de correction automatique). */
export function hashtagWarnings(tags: readonly string[]): HashtagWarnings {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const t of tags) {
    if (seen.has(t)) duplicates.add(t);
    seen.add(t);
  }
  return {
    missingHash: tags.filter((t) => !t.startsWith('#')),
    duplicates: [...duplicates],
  };
}

export interface ToggleResult {
  selected: string[];
  /** Vrai si l'ajout a été refusé parce que la limite est atteinte. */
  blocked: boolean;
}

/**
 * Coche ou décoche un hashtag Insta. Au-delà de `max` (5), l'ajout est refusé
 * et la sélection reste inchangée.
 */
export function toggleHashtag(
  selected: readonly string[],
  tag: string,
  max: number = INSTA_HASHTAGS_MAX,
): ToggleResult {
  if (selected.includes(tag)) {
    return { selected: selected.filter((t) => t !== tag), blocked: false };
  }
  if (selected.length >= max) {
    return { selected: [...selected], blocked: true };
  }
  return { selected: [...selected, tag], blocked: false };
}

/**
 * Hashtags cochés, dans l'ordre de la réserve, sans doublon. Les hashtags
 * cochés qui ne sont plus dans la réserve sont ignorés.
 */
export function orderedSelection(reserve: readonly string[], selected: readonly string[]): string[] {
  const chosen = new Set(selected);
  const out: string[] = [];
  for (const t of reserve) {
    if (chosen.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}
