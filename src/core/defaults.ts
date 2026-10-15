import { CONFIG_SCHEMA_VERSION, type Config, type Group } from './model';

// Donnees initiales, reprises caractere par caractere du cahier des charges.
//
// Ce fichier est volontairement 100 % ASCII en dehors des commentaires : tous
// les caracteres speciaux sont ecrits en sequences \u{...}, pour qu'aucun
// editeur ni outil ne puisse les "corriger" en silence (normalisation Unicode,
// apostrophes typographiques...). Points d'attention :
//   - le prefixe de μ's utilise le SIGNE MICRO (U+00B5) et l'apostrophe ASCII ' ;
//   - le nom du groupe utilise la lettre grecque mu (U+03BC) et l'apostrophe ASCII ;
//   - le hashtag #μʼs utilise mu (U+03BC) et l'apostrophe modificative (U+02BC).
// Ces differences sont voulues. test/defaults.test.ts verifie chaque point de
// code (ecrit en hexadecimal) et que ce fichier reste ASCII hors commentaires.

const L = '\u{3010}'; // 【
const R = '\u{3011}'; // 】
const HIBISCUS = '\u{1F33A}'; // 🌺
const SUNRISE = '\u{1F305}'; // 🌅
const WOLF = '\u{1F43A}'; // 🐺
const RAINBOW = '\u{1F308}'; // 🌈
const DIZZY = '\u{1F4AB}'; // 💫
const NOTE = '\u{1F3B5}'; // 🎵
const LOTUS = '\u{1FAB7}'; // 🪷
const BIRD = '\u{1F426}'; // 🐦

const GREEK_MU = '\u{3BC}'; // μ (lettre grecque)
const MICRO_SIGN = '\u{B5}'; // µ (signe micro)
const MODIFIER_APOSTROPHE = '\u{2BC}'; // ʼ (apostrophe modificative)

function group(id: string, name: string, prefix: string, xHashtags: string): Group {
  const tags = xHashtags.split(' ');
  // La reserve Insta est initialisee avec les hashtags X (a completer dans l'app).
  return { id, name, prefix, xHashtags: tags, instaHashtags: [...tags] };
}

export function defaultGroups(): Group[] {
  return [
    group('love-live', 'Love Live', `${L}${HIBISCUS}Love Live${HIBISCUS}${R}`, '#lovelive'),
    group(
      'muse',
      `${GREEK_MU}'s`,
      `${L}${HIBISCUS}${MICRO_SIGN}'s${HIBISCUS}${R}`,
      `#lovelive #${GREEK_MU}${MODIFIER_APOSTROPHE}s`,
    ),
    group('aqours', 'Aqours', `${L}${SUNRISE}Aqours${SUNRISE}${R}`, '#lovelive #Aqours'),
    group(
      'yohane',
      'Genjitsu no Yohane',
      `${L}${WOLF}Genjitsu no Yohane${WOLF}${R}`,
      '#lovelive #Aqours #yohane',
    ),
    group(
      'nijigasaki',
      'Nijigasaki',
      `${L}${RAINBOW}NijiGaku${RAINBOW}${R}`,
      '#lovelive #\u{8679}\u{30F6}\u{54B2}', // #虹ヶ咲
    ),
    group('liella', 'Liella!', `${L}${DIZZY} Liella!${DIZZY} ${R}`, '#lovelive #Liella'),
    group(
      'sim',
      'School Idol Musical',
      `${L}${NOTE}School Idol Musical${NOTE}${R}`,
      '#lovelive #SIM #\u{30B9}\u{30AF}\u{30DF}\u{30E5}', // #スクミュ
    ),
    group(
      'hasunosora',
      'Hasunosora',
      `${L}${LOTUS}Hasunosora${LOTUS}${R}`,
      '#lovelive #\u{84EE}\u{30CE}\u{7A7A}', // #蓮ノ空
    ),
    group(
      'bluebird',
      'BLUEBIRD',
      `${L}${BIRD}BLUEBIRD${BIRD}${R}`,
      // #イキヅライブ #いきづらい部
      '#lovelive #\u{30A4}\u{30AD}\u{30C5}\u{30E9}\u{30A4}\u{30D6} #\u{3044}\u{304D}\u{3065}\u{3089}\u{3044}\u{90E8}',
    ),
  ];
}

export function defaultLinkMentions(): Config['linkMentions'] {
  return { bio: 'Lien en bio', story: 'Lien en story' };
}

export function defaultConfig(): Config {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    groups: defaultGroups(),
    linkMentions: defaultLinkMentions(),
  };
}
