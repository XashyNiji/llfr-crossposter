// État de l'application (signaux Preact) et actions.
//
// Les sorties (tweets, légende, compteurs) sont des `computed` : elles se
// recalculent toutes seules quand la saisie ou la configuration change.
import { batch, computed, signal } from '@preact/signals';
import { removeGroup as removeGroupFrom, moveGroup as moveGroupIn, upsertGroup } from '../core/config';
import { countInstaCaption, countTweet } from '../core/count';
import { defaultConfig } from '../core/defaults';
import { toggleHashtag } from '../core/hashtags';
import type { Config, Draft, Group, Id, LinkMentionKind, LinkMentions } from '../core/model';
import { buildInstaCaption, buildTweet1, buildTweet2 } from '../core/outputs';
import { isBlank } from '../core/blocks';
import { loadConfig, saveConfig } from '../storage/db';

export function emptyDraft(groupId: Id): Draft {
  return { groupId, mainText: '', tweet2: '', instaExtra: '', linkMention: 'none', instaHashtags: [] };
}

export const config = signal<Config>(defaultConfig());
export const draft = signal<Draft>(emptyDraft(config.value.groups[0]?.id ?? ''));
/** Vrai juste après une tentative de cocher un 6e hashtag. */
export const hashtagLimitHit = signal(false);
/** Dernière erreur d'enregistrement, affichée dans l'interface. */
export const saveError = signal<string | null>(null);

export const currentGroup = computed<Group | null>(() => {
  const groups = config.value.groups;
  return groups.find((g) => g.id === draft.value.groupId) ?? groups[0] ?? null;
});

export const mainTextMissing = computed(() => isBlank(draft.value.mainText));

export const tweet1 = computed(() => {
  const g = currentGroup.value;
  return g && !mainTextMissing.value ? buildTweet1(g, draft.value.mainText) : '';
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

export function updateDraft(patch: Partial<Omit<Draft, 'groupId' | 'instaHashtags'>>): void {
  draft.value = { ...draft.value, ...patch };
}

/** Change de groupe : les hashtags Insta cochés sont remis à zéro. */
export function selectGroup(groupId: Id): void {
  batch(() => {
    draft.value = { ...draft.value, groupId, instaHashtags: [] };
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

/** « Tout effacer » : vide les textes, la mention et les hashtags ; garde le groupe. */
export function clearDraft(): void {
  batch(() => {
    draft.value = emptyDraft(currentGroup.value?.id ?? '');
    hashtagLimitHit.value = false;
  });
}

// ---------------------------------------------------------------- Réglages

async function persist(next: Config): Promise<void> {
  try {
    await saveConfig(next);
    saveError.value = null;
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
    } else if (group.id !== d.groupId) {
      draft.value = { ...d, groupId: group.id, instaHashtags: [] };
    } else {
      // Retire les hashtags cochés qui ne sont plus dans la réserve.
      const kept = d.instaHashtags.filter((t) => group.instaHashtags.includes(t));
      if (kept.length !== d.instaHashtags.length) draft.value = { ...d, instaHashtags: kept };
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

/** Chargement initial depuis IndexedDB (les valeurs par défaut restent sinon). */
export async function initState(): Promise<void> {
  try {
    const stored = await loadConfig();
    if (stored) applyConfig(stored);
  } catch (e) {
    saveError.value = `Lecture des réglages impossible : ${e instanceof Error ? e.message : String(e)}`;
  }
}
