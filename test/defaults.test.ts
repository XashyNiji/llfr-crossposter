import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/defaults';

// Ce test est écrit pour résister à un éditeur qui « normaliserait » le texte :
// les valeurs attendues sont construites à partir de points de code écrits en
// hexadécimal (texte ASCII), jamais à partir de caractères spéciaux littéraux.

/** Construit une chaîne à partir de points de code hexadécimaux. */
const u = (...hex: string[]) => hex.map((h) => String.fromCodePoint(parseInt(h, 16))).join('');
/** Points de code en hexadécimal, pour comparer caractère par caractère. */
const cps = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16).toUpperCase());

const OPEN = u('3010'); // lenticular bracket
const CLOSE = u('3011');

// [id, nom, préfixe, hashtags X] attendus (tableau du cahier des charges).
const EXPECTED: Array<[string, string, string, string]> = [
  ['love-live', 'Love Live', OPEN + u('1F33A') + 'Love Live' + u('1F33A') + CLOSE, '#lovelive'],
  [
    'muse',
    u('3BC') + "'s",
    OPEN + u('1F33A', 'B5') + "'s" + u('1F33A') + CLOSE,
    '#lovelive #' + u('3BC', '2BC') + 's',
  ],
  ['aqours', 'Aqours', OPEN + u('1F305') + 'Aqours' + u('1F305') + CLOSE, '#lovelive #Aqours'],
  [
    'yohane',
    'Genjitsu no Yohane',
    OPEN + u('1F43A') + 'Genjitsu no Yohane' + u('1F43A') + CLOSE,
    '#lovelive #Aqours #yohane',
  ],
  [
    'nijigasaki',
    'Nijigasaki',
    OPEN + u('1F308') + 'NijiGaku' + u('1F308') + CLOSE,
    '#lovelive #' + u('8679', '30F6', '54B2'),
  ],
  ['liella', 'Liella!', OPEN + u('1F4AB') + ' Liella!' + u('1F4AB') + ' ' + CLOSE, '#lovelive #Liella'],
  [
    'sim',
    'School Idol Musical',
    OPEN + u('1F3B5') + 'School Idol Musical' + u('1F3B5') + CLOSE,
    '#lovelive #SIM #' + u('30B9', '30AF', '30DF', '30E5'),
  ],
  [
    'hasunosora',
    'Hasunosora',
    OPEN + u('1FAB7') + 'Hasunosora' + u('1FAB7') + CLOSE,
    '#lovelive #' + u('84EE', '30CE', '7A7A'),
  ],
  [
    'bluebird',
    'BLUEBIRD',
    OPEN + u('1F426') + 'BLUEBIRD' + u('1F426') + CLOSE,
    '#lovelive #' + u('30A4', '30AD', '30C5', '30E9', '30A4', '30D6') + ' #' + u('3044', '304D', '3065', '3089', '3044', '90E8'),
  ],
];

// Le même tableau, recopié tel quel depuis le cahier des charges (caractères
// littéraux). Double contrôle : si ce fichier était normalisé, la comparaison
// en hexadécimal ci-dessus échouerait quand même.
const SPEC_LITERAL: Array<[name: string, prefix: string, xHashtags: string]> = [
  ['Love Live', '【🌺Love Live🌺】', '#lovelive'],
  ["μ's", "【🌺µ's🌺】", '#lovelive #μʼs'],
  ['Aqours', '【🌅Aqours🌅】', '#lovelive #Aqours'],
  ['Genjitsu no Yohane', '【🐺Genjitsu no Yohane🐺】', '#lovelive #Aqours #yohane'],
  ['Nijigasaki', '【🌈NijiGaku🌈】', '#lovelive #虹ヶ咲'],
  ['Liella!', '【💫 Liella!💫 】', '#lovelive #Liella'],
  ['School Idol Musical', '【🎵School Idol Musical🎵】', '#lovelive #SIM #スクミュ'],
  ['Hasunosora', '【🪷Hasunosora🪷】', '#lovelive #蓮ノ空'],
  ['BLUEBIRD', '【🐦BLUEBIRD🐦】', '#lovelive #イキヅライブ #いきづらい部'],
];

const config = defaultConfig();

describe('données initiales', () => {
  it('9 groupes dans l’ordre du cahier des charges', () => {
    expect(config.groups.map((g) => g.id)).toEqual(EXPECTED.map(([id]) => id));
  });

  it.each(EXPECTED)('%s : nom, préfixe et hashtags identiques point de code par point de code', (id, name, prefix, x) => {
    const g = config.groups.find((gr) => gr.id === id)!;
    expect(cps(g.name)).toEqual(cps(name));
    expect(cps(g.prefix)).toEqual(cps(prefix));
    expect(cps(g.xHashtags.join(' '))).toEqual(cps(x));
    // Réserve Insta initialisée avec les hashtags X.
    expect(g.instaHashtags).toEqual(g.xHashtags);
  });

  it.each(SPEC_LITERAL)('%s : identique au texte littéral du cahier des charges', (name, prefix, x) => {
    const g = config.groups.find((gr) => gr.name === name)!;
    expect(cps(g.prefix)).toEqual(cps(prefix));
    expect(cps(g.xHashtags.join(' '))).toEqual(cps(x));
  });

  it('μ’s : signe micro dans le préfixe, mu grec et apostrophe modificative dans le hashtag', () => {
    const g = config.groups[1]!;
    expect(cps(g.prefix)).toEqual(['3010', '1F33A', 'B5', '27', '73', '1F33A', '3011']);
    expect(cps(g.name)).toEqual(['3BC', '27', '73']);
    expect(cps(g.xHashtags[1]!)).toEqual(['23', '3BC', '2BC', '73']);
  });

  it('aucun caractère invisible ou de variation dans les données', () => {
    const invisible = /[\u{FE0E}\u{FE0F}\u{200B}-\u{200D}\u{2060}\u{FEFF}]/u;
    expect(invisible.test(u('FE0F'))).toBe(true); // le contrôle lui-même fonctionne
    for (const g of config.groups) {
      for (const s of [g.name, g.prefix, ...g.xHashtags]) expect(invisible.test(s)).toBe(false);
    }
  });

  it('formulations de lien par défaut', () => {
    expect(config.linkMentions).toEqual({ bio: 'Lien en bio', story: 'Lien en story' });
  });

  it('identifiants uniques', () => {
    expect(new Set(config.groups.map((g) => g.id)).size).toBe(config.groups.length);
  });
});

describe('règle « jamais de normalisation Unicode »', () => {
  const srcDir = fileURLToPath(new URL('../src', import.meta.url));

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  }

  it('aucun appel à .normalize( dans src/', () => {
    const offenders = files(srcDir)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /\.normalize\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('src/core/defaults.ts reste en ASCII hors commentaires (caractères spéciaux en \\u{…})', () => {
    const code = readFileSync(join(srcDir, 'core', 'defaults.ts'), 'utf8')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).toMatch(/^[\x00-\x7F]*$/);
  });
});
