// Types de données de l'application.
//
// Règle d'or : les chaînes saisies (préfixes, hashtags, textes) sont stockées
// et restituées EXACTEMENT telles quelles. Aucune normalisation Unicode, aucun
// remplacement d'apostrophe, aucun trim des valeurs stockées.

export type Id = string;

export interface Group {
  id: Id;
  name: string;
  /** Préfixe placé en tête du tweet 1 et de la légende Insta, ex. 【🌺Love Live🌺】 */
  prefix: string;
  /** Hashtags X, chacun avec son « # », dans l'ordre d'affichage. */
  xHashtags: string[];
  /** Réserve de hashtags Insta proposés en puces à cocher. */
  instaHashtags: string[];
}

export type LinkMentionKind = 'none' | 'bio' | 'story';

/** Formulations de la mention de lien, modifiables dans les réglages. */
export interface LinkMentions {
  bio: string;
  story: string;
}

export interface Config {
  schemaVersion: number;
  groups: Group[];
  linkMentions: LinkMentions;
}

/** Saisie en cours (jamais enregistrée : l'usage est jetable). */
export interface Draft {
  groupId: Id;
  mainText: string;
  tweet2: string;
  instaExtra: string;
  linkMention: LinkMentionKind;
  /** Hashtags Insta cochés (valeurs exactes de la réserve). */
  instaHashtags: string[];
  /**
   * Hashtags X du groupe DÉCOCHÉS pour ce tweet (par défaut aucun : tous les
   * hashtags X du groupe sont utilisés, y compris ceux ajoutés plus tard).
   */
  xHashtagsOff: string[];
  /** Hashtags X personnalisés pour ce tweet, saisis tels quels (séparés par des espaces). */
  xHashtagsCustom: string;
}

export const CONFIG_SCHEMA_VERSION = 1;
export const TWEET_MAX = 280;
export const INSTA_CAPTION_MAX = 2200;
export const INSTA_HASHTAGS_MAX = 5;
