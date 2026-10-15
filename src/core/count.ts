// Compteurs de caractères. C'est le SEUL fichier qui dépend de twitter-text :
// pour changer de bibliothèque un jour, il suffit de modifier ce module.
import parseTweet from 'twitter-text/dist/esm/parseTweet';
import { INSTA_CAPTION_MAX, TWEET_MAX } from './model';

export interface Count {
  /** Longueur comptée. */
  length: number;
  /** Limite de la plateforme. */
  max: number;
  /** Caractères restants (négatif si dépassement). */
  remaining: number;
  /** Vrai si la limite est dépassée. */
  over: boolean;
}

function makeCount(length: number, max: number): Count {
  return { length, max, remaining: max - length, over: length > max };
}

/**
 * Comptage pondéré officiel de X (twitter-text, parseTweet → weightedLength) :
 * un lien compte 23, un caractère japonais ou un emoji compte 2.
 *
 * Limite connue : les emojis plus récents que la base de twemoji-parser 14
 * (Unicode 15.1+, ex. 🐦‍🔥) sont surcomptés. L'alerte arrive donc un peu trop
 * tôt, jamais trop tard.
 *
 * Remarque : parseTweet normalise une copie interne pour compter ; le texte
 * passé en argument n'est jamais modifié.
 */
export function countTweet(text: string): Count {
  // On n'utilise pas `valid` de twitter-text : il vaut false pour un texte vide.
  return makeCount(parseTweet(text).weightedLength, TWEET_MAX);
}

/**
 * Comptage prudent pour Instagram (qui ne documente pas sa méthode) : on compte
 * les unités UTF-16, donc un emoji compte 2 ou plus, un caractère japonais 1.
 */
export function countInstaCaption(text: string): Count {
  return makeCount(text.length, INSTA_CAPTION_MAX);
}
