// État de l'application (signaux Preact) et actions.
//
// Les sorties (tweets, légende, compteurs) sont des `computed` : elles se
// recalculent toutes seules quand la saisie ou la configuration change.
import { batch, computed, effect, signal } from '@preact/signals';
import { isBlank } from '../core/blocks';
import { moveGroup as moveGroupIn, removeGroup as removeGroupFrom, upsertGroup } from '../core/config';
import { countInstaCaption, countTweet } from '../core/count';
import { defaultConfig } from '../core/defaults';
import { toggleHashtag } from '../core/hashtags';
import type { Config, Draft, Group, Id, LinkMentionKind, LinkMentions } from '../core/model';
import { buildInstaCaption, buildTweet1, buildTweet2, selectedXHashtags } from '../core/outputs';
import {
  loadStoredConfig,
  persistenceStatus,
  requestPersistence,
  saveConfig,
  type PersistenceStatus,
} from '../storage/db';
import { clearSavedDraft, loadDraft, saveDraft } from '../storage/draft';

export function emptyDraft(groupId: Id): Draft {
  return {
    groupId,
    mainText: '',
    tweet2: '',
    instaExtra: '',
    linkMention: 'none',
    instaHashtags: [],
    xHashtagsOff: [],
    xHashtagsCustom: '',
  };
}

export const config = signal<Config>(defaultConfig());
export const draft = signal<Draft>(emptyDraft(config.value.groups[0]?.id ?? ''));
/** Vrai juste après une tentative de cocher un 6e hashtag. */
export const hashtagLimitHit = signal(false);
/** Dernière erreur de lecture ou d'enregistrement, affichée dans l'interface. */
export const saveError = signal<string | null>(null);
/** Protection du stockage contre l'effacement (navigator.storage.persist). */
export const persistence = signal<PersistenceStatus | null>(null);

export const currentGroup = computed<Group | null>(() => {
  const groups = config.value.groups;
  return groups.find((g) => g.id === draft.value.groupId) ?? groups[0] ?? null;
});

export const mainTextMissing = computed(() => isBlank(draft.value.mainText));

export const tweet1 = computed(() => {
  const g = currentGroup.value;
  return g && !mainTextMissing.value ? buildTweet1(g, draft.value.mainText, selectedXHashtags(g, draft.value)) : '';
});
export const tweet2 = computed(() => (mainTextMissing.value ? null : buildTweet2(draft.value.tweet2)));
export const tweet1Count = computed(() => countTweet(tweet1.value));
export const tweet2Count = computed(() => countTweet(tweet2.value ?? ''));

export const instaCaption = computed(() => {
  const g = currentGroup.value;
  return g ? buildInstaCaption(draft.value, g, config.value.linkMentions) : '';
});
export const instaCount = computed(() => countInstaCaption(instaCaption.value));

// ---------------------------------------------------------------- Saisie

export function updateDraft(
  patch: Partial<Pick<Draft, 'mainText' | 'tweet2' | 'instaExtra' | 'linkMention' | 'xHashtagsCustom'>>,
): void {
  draft.value = { ...draft.value, ...patch };
}

/**
 * Change de groupe : les hashtags Insta cochés sont remis à zéro et tous les
 * hashtags X du nouveau groupe sont recochés (les personnalisés sont gardés).
 */
export function selectGroup(groupId: Id): void {
  batch(() => {
    draft.value = { ...draft.value, groupId, instaHashtags: [], xHashtagsOff: [] };
    hashtagLimitHit.value = false;
  });
}

export function setLinkMention(kind: LinkMentionKind): void {
  draft.value = { ...draft.value, linkMention: kind };
}

export function toggleInstaHashtag(tag: string): void {
  const r = toggleHashtag(draft.value.instaHashtags, tag);
  batch(() => {
    draft.value = { ...draft.value, instaHashtags: r.selected };
    hashtagLimitHit.value = r.blocked;
  });
}

/** Coche ou décoche un hashtag X du groupe pour ce tweet. */
export function toggleXHashtag(tag: string): void {
  const off = draft.value.xHashtagsOff;
  draft.value = {
    ...draft.value,
    xHashtagsOff: off.includes(tag) ? off.filter((t) => t !== tag) : [...off, tag],
  };
}

/** « Tout effacer » : vide les textes, la mention et les hashtags ; garde le groupe. */
export function clearDraft(): void {
  batch(() => {
    draft.value = emptyDraft(currentGroup.value?.id ?? '');
    hashtagLimitHit.value = false;
  });
  clearSavedDraft();
}

// ---------------------------------------------------------------- Réglages

async function persist(next: Config): Promise<void> {
  try {
    await saveConfig(next);
    saveError.value = null;
    persistence.value = await requestPersistence();
  } catch (e) {
    saveError.value = `Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** Remplace la configuration en mémoire en gardant la saisie cohérente. */
function applyConfig(next: Config): void {
  batch(() => {
    config.value = next;
    const d = draft.value;
    const group = next.groups.find((g) => g.id === d.groupId) ?? next.groups[0];
    if (!group) {
      draft.value = { ...d, groupId: '', instaHashtags: [] };
      hashtagLimitHit.value = false;
    } else if (group.id !== d.groupId) {
      draft.value = { ...d, groupId: group.id, instaHashtags: [], xHashtagsOff: [] };
      hashtagLimitHit.value = false;
    } else {
      // Retire les hashtags cochés qui ne sont plus dans la réserve.
      const kept = d.instaHashtags.filter((t) => group.instaHashtags.includes(t));
      if (kept.length !== d.instaHashtags.length) {
        draft.value = { ...d, instaHashtags: kept };
        hashtagLimitHit.value = false;
      }
    }
  });
}

/** Remplace la configuration et l'enregistre. */
export function setConfig(next: Config): Promise<void> {
  applyConfig(next);
  return persist(next);
}

export function saveGroup(group: Group): Promise<void> {
  return setConfig({ ...config.value, groups: upsertGroup(config.value.groups, group) });
}

export function deleteGroup(id: Id): Promise<void> {
  return setConfig({ ...config.value, groups: removeGroupFrom(config.value.groups, id) });
}

export function moveGroup(index: number, delta: number): Promise<void> {
  return setConfig({ ...config.value, groups: moveGroupIn(config.value.groups, index, delta) });
}

export function setLinkMentions(linkMentions: LinkMentions): Promise<void> {
  return setConfig({ ...config.value, linkMentions });
}

// ---------------------------------------------------------------- Démarrage

/**
 * Chargement initial, à attendre AVANT d'afficher l'app : la config enregistrée
 * (sinon les valeurs par défaut) et la saisie en cours éventuelle.
 */
export async function initState(): Promise<void> {
  try {
    const stored = await loadStoredConfig();
    if (stored.status === 'ok') {
      config.value = stored.config;
    } else if (stored.status === 'unreadable') {
      saveError.value =
        'Les réglages enregistrés sont illisibles : les réglages par défaut sont utilisés. Une copie des anciens a été gardée.';
    }
  } catch (e) {
    saveError.value = `Lecture des réglages impossible : ${e instanceof Error ? e.message : String(e)}`;
  }

  // Par défaut : le premier groupe dans l'ordre choisi dans les réglages.
  const first = config.value.groups[0]?.id ?? '';
  const saved = loadDraft();
  draft.value = saved ?? emptyDraft(first);
  applyConfig(config.value);

  persistence.value = await persistenceStatus();

  // Sauvegarde de la saisie en cours à chaque modification.
  effect(() => {
    const d = draft.value;
    const empty =
      isBlank(d.mainText) &&
      isBlank(d.tweet2) &&
      isBlank(d.instaExtra) &&
      isBlank(d.xHashtagsCustom) &&
      d.linkMention === 'none' &&
      d.instaHashtags.length === 0 &&
      d.xHashtagsOff.length === 0;
    if (empty) clearSavedDraft();
    else saveDraft(d);
  });
}
