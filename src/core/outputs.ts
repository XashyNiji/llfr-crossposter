// Mise en forme des sorties X et Instagram (fonctions pures, testées).
import { isBlank, joinBlocks } from './blocks';
import { orderedSelection } from './hashtags';
import type { Draft, Group, LinkMentions } from './model';

/**
 * Tweet 1 : préfixe, ligne vide, texte principal, ligne vide, hashtags X
 * séparés par une espace. Un bloc vide (ex. groupe sans hashtags) est omis
 * sans laisser de ligne vide en trop.
 */
export function buildTweet1(group: Group, mainText: string): string {
  return joinBlocks([group.prefix, mainText, group.xHashtags.join(' ')]);
}

/** Tweet 2 : le texte seul, sans préfixe ni hashtags. Null s'il est vide. */
export function buildTweet2(tweet2: string): string | null {
  return isBlank(tweet2) ? null : joinBlocks([tweet2]);
}

/** Tous les tweets à publier, dans l'ordre. Vide si le texte principal manque. */
export function buildTweets(draft: Draft, group: Group): string[] {
  if (isBlank(draft.mainText)) return [];
  const tweets = [buildTweet1(group, draft.mainText)];
  const t2 = buildTweet2(draft.tweet2);
  if (t2 !== null) tweets.push(t2);
  return tweets;
}

/** Texte de la mention de lien choisie, ou chaîne vide. */
export function linkMentionText(draft: Draft, mentions: LinkMentions): string {
  switch (draft.linkMention) {
    case 'bio':
      return mentions.bio;
    case 'story':
      return mentions.story;
    default:
      return '';
  }
}

/**
 * Légende Instagram : préfixe, texte principal, tweet 2, complément Insta,
 * mention du lien, hashtags cochés (5 max, ordre de la réserve), séparés par
 * une ligne vide. Les blocs vides sont omis. Vide si le texte principal manque.
 */
export function buildInstaCaption(draft: Draft, group: Group, mentions: LinkMentions): string {
  if (isBlank(draft.mainText)) return '';
  return joinBlocks([
    group.prefix,
    draft.mainText,
    draft.tweet2,
    draft.instaExtra,
    linkMentionText(draft, mentions),
    orderedSelection(group.instaHashtags, draft.instaHashtags).join(' '),
  ]);
}

/** Texte pré-rempli de la zone 1 de la story : texte principal + tweet 2. */
export function buildStoryText(draft: Draft): string {
  return joinBlocks([draft.mainText, draft.tweet2]);
}
