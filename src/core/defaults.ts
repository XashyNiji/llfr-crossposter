import { CONFIG_SCHEMA_VERSION, type Config, type Group } from './model';

// Données initiales, reprises caractère par caractère du cahier des charges.
//
// Les caractères non ASCII sont écrits en séquences \u… pour qu'aucun éditeur
// ni outil ne puisse les « corriger » en silence. Points d'attention :
//   - le préfixe de μ's utilise le SIGNE MICRO µ (U+00B5) et l'apostrophe ASCII ' ;
//   - le nom du groupe utilise la lettre grecque μ (U+03BC) et l'apostrophe ASCII ;
//   - le hashtag #μʼs utilise μ (U+03BC) et l'apostrophe modificative ʼ (U+02BC).
// Ces différences sont voulues. Un test (test/defaults.test.ts) vérifie chaque
// point de code.

const L = '【'; // 【
const R = '】'; // 】
const HIBISCUS = '\u{1F33A}'; // 🌺
const SUNRISE = '\u{1F305}'; // 🌅
const WOLF = '\u{1F43A}'; // 🐺
const RAINBOW = '\u{1F308}'; // 🌈
const DIZZY = '\u{1F4AB}'; // 💫
const NOTE = '\u{1F3B5}'; // 🎵
const LOTUS = '\u{1FAB7}'; // 🪷
const BIRD = '\u{1F426}'; // 🐦

const GREEK_MU = 'μ'; // μ
const MICRO_SIGN = 'µ'; // µ
const MODIFIER_APOSTROPHE = 'ʼ'; // ʼ

function group(id: string, name: string, prefix: string, xHashtags: string): Group {
  const tags = xHashtags.split(' ');
  // La réserve Insta est initialisée avec les hashtags X (à compléter dans l'app).
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
      '#lovelive #虹ヶ咲', // #虹ヶ咲
    ),
    group('liella', 'Liella!', `${L}${DIZZY} Liella!${DIZZY} ${R}`, '#lovelive #Liella'),
    group(
      'sim',
      'School Idol Musical',
      `${L}${NOTE}School Idol Musical${NOTE}${R}`,
      '#lovelive #SIM #スクミュ', // #スクミュ
    ),
    group(
      'hasunosora',
      'Hasunosora',
      `${L}${LOTUS}Hasunosora${LOTUS}${R}`,
      '#lovelive #蓮ノ空', // #蓮ノ空
    ),
    group(
      'bluebird',
      'BLUEBIRD',
      `${L}${BIRD}BLUEBIRD${BIRD}${R}`,
      // #イキヅライブ #いきづらい部
      '#lovelive #イキヅライブ #いきづらい部',
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
