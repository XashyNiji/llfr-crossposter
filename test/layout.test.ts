import { describe, expect, it } from 'vitest';
import { graphemes, isCjk, isEmoji, layoutText, lineText, type Measure } from '../src/story/layout';

// Mesure fictive : 10 par caractère latin, 20 par caractère japonais, 30 par emoji.
const measure: Measure = (s, kind) =>
  graphemes(s).reduce((w, g) => w + (kind === 'emoji' ? 30 : isCjk(g) ? 20 : 10), 0);

const wrap = (text: string, width: number) => layoutText(text, width, measure).map(lineText);

describe('classement des caractères', () => {
  it('emojis, y compris composés ; symboles texte exclus', () => {
    for (const e of ['\u{1F338}', '\u{1F44D}\u{1F3FD}', '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}', '\u{1F1EB}\u{1F1F7}', '\u{2600}\u{FE0F}', '\u{1FAB7}']) {
      expect(isEmoji(e)).toBe(true);
    }
    for (const t of ['\u{2605}', '\u{2600}', 'a', '\u{3042}', '#']) expect(isEmoji(t)).toBe(false);
  });

  it('japonais', () => {
    for (const c of ['\u{3042}', '\u{30A2}', '\u{8679}', '\u{3002}', '\u{FF01}', '\u{30FC}']) expect(isCjk(c)).toBe(true);
    for (const c of ['a', '\u{E9}', '!']) expect(isCjk(c)).toBe(false);
  });
});

describe('retour à la ligne', () => {
  it('texte latin : coupure aux espaces, espaces de fin ignorées', () => {
    expect(wrap('Nouveau single annoncé', 100)).toEqual(['Nouveau', 'single', 'annoncé']);
    expect(wrap('Nouveau single annoncé', 140)).toEqual(['Nouveau single', 'annoncé']);
    const lines = layoutText('ab cd', 30, measure);
    expect(lines.map((l) => l.width)).toEqual([20, 20]);
  });

  it('retours à la ligne saisis et lignes vides conservés', () => {
    expect(wrap('Ligne 1\n\nLigne 3\n', 1000)).toEqual(['Ligne 1', '', 'Ligne 3', '']);
  });

  it('japonais sans espaces : coupure entre deux caractères', () => {
    // 5 caractères de 20 = 100 par ligne
    expect(wrap('\u{3042}\u{3044}\u{3046}\u{3048}\u{304A}\u{304B}\u{304D}', 100)).toEqual([
      '\u{3042}\u{3044}\u{3046}\u{3048}\u{304A}',
      '\u{304B}\u{304D}',
    ]);
  });

  it('kinsoku : 。 et 」 jamais en début de ligne, 「 jamais en fin de ligne', () => {
    // 「蓮ノ空」が好き。 avec 3 caractères (60) par ligne
    const text = '\u{300C}\u{84EE}\u{30CE}\u{7A7A}\u{300D}\u{304C}\u{597D}\u{304D}\u{3002}';
    const lines = wrap(text, 60);
    for (const l of lines) {
      const first = graphemes(l)[0];
      const last = graphemes(l).at(-1);
      expect(['\u{3002}', '\u{300D}', '\u{3001}']).not.toContain(first);
      expect(last).not.toBe('\u{300C}');
    }
    expect(lines.join('')).toBe(text);
  });

  it('petits kana et allongement jamais en début de ligne', () => {
    // ライブ : ラ イ ブ — avec 2 caractères par ligne, « ー » ne commence pas une ligne
    const lines = wrap('\u{30E9}\u{30FC}\u{30E1}\u{30F3}', 40);
    for (const l of lines) expect(graphemes(l)[0]).not.toBe('\u{30FC}');
  });

  it('espace insécable française : « texte ! » jamais coupé', () => {
    const text = 'Le single est sorti\u{202F}!';
    // « sorti !» ne doit jamais être séparé
    for (const width of [70, 80, 100, 150, 200]) {
      const lines = wrap(text, width);
      expect(lines.some((l) => l.endsWith('sorti\u{202F}!'))).toBe(true);
      expect(lines.join(' ').replace(/ /g, '')).toBe(text.replace(/ /g, ''));
    }
  });

  it('ponctuation après une espace ordinaire : jamais seule en début de ligne', () => {
    // Sans la règle, « Le Bravo » tiendrait sur 80 et « ! » serait seul.
    expect(wrap('Le Bravo !', 80)).toEqual(['Le', 'Bravo !']);
  });

  it('emojis jamais coupés, même composés', () => {
    const family = '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}';
    const lines = layoutText(`${family}${family}${family}`, 60, measure);
    expect(lines.map(lineText)).toEqual([`${family}${family}`, family]);
    expect(lines[0]!.pieces).toEqual([{ text: `${family}${family}`, kind: 'emoji', width: 60 }]);
  });

  it('morceaux texte / emoji séparés pour choisir la police', () => {
    const [line] = layoutText('Live \u{1F338} !', 1000, measure);
    expect(line!.pieces.map((p) => [p.text, p.kind])).toEqual([
      ['Live ', 'text'],
      ['\u{1F338}', 'emoji'],
      [' !', 'text'],
    ]);
  });

  it('mot plus large que la zone : coupé entre deux caractères', () => {
    expect(wrap('https://lovelive', 50)).toEqual(['https', '://lo', 'velive'.slice(0, 5), 'e']);
  });

  it('latin et japonais mélangés', () => {
    const lines = wrap('Hasunosora \u{84EE}\u{30CE}\u{7A7A}\u{5973}\u{5B66}\u{9662}', 120);
    expect(lines[0]).toBe('Hasunosora');
    expect(lines.join('')).toBe('Hasunosora\u{84EE}\u{30CE}\u{7A7A}\u{5973}\u{5B66}\u{9662}');
  });

  it('ne modifie aucun caractère (pas de normalisation)', () => {
    const text = 'e\u{301} \u{30C4}\u{3099} \u{B5}\u{2BC} \u{FB01}';
    expect(wrap(text, 1000)).toEqual([text]);
  });

  it('texte vide : une ligne vide', () => {
    expect(wrap('', 100)).toEqual(['']);
  });
});
