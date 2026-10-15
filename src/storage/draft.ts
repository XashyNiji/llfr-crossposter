// Sauvegarde de la saisie EN COURS (une seule, pas d'historique).
//
// Sur Android, passer dans l'app X ou Instagram pour coller un texte peut
// pousser le système à fermer l'onglet ou l'app : sans cette sauvegarde, le
// texte saisi serait perdu au retour. « Tout effacer » la supprime.
import type { Draft, LinkMentionKind } from '../core/model';

const KEY = 'llfr-crossposter:draft';
const LINK_KINDS: readonly LinkMentionKind[] = ['none', 'bio', 'story'];

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Vérifie la forme d'un brouillon relu. Les chaînes sont reprises telles quelles. */
export function parseDraft(value: unknown): Draft | null {
  if (typeof value !== 'object' || value === null) return null;
  const d = value as Record<string, unknown>;
  const str = (v: unknown): v is string => typeof v === 'string';
  if (!str(d.groupId) || !str(d.mainText) || !str(d.tweet2) || !str(d.instaExtra)) return null;
  if (!LINK_KINDS.includes(d.linkMention as LinkMentionKind)) return null;
  if (!Array.isArray(d.instaHashtags) || !d.instaHashtags.every(str)) return null;
  return {
    groupId: d.groupId,
    mainText: d.mainText,
    tweet2: d.tweet2,
    instaExtra: d.instaExtra,
    linkMention: d.linkMention as LinkMentionKind,
    instaHashtags: [...d.instaHashtags],
  };
}

export function loadDraft(): Draft | null {
  try {
    const raw = storage()?.getItem(KEY);
    return raw ? parseDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Stockage indisponible (navigation privée…) : la saisie reste en mémoire.
  }
}

export function clearSavedDraft(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Rien à faire.
  }
}
