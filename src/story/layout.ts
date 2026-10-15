// Mise en page du texte d'une zone de story (fonctions pures, testées).
//
// La mesure de largeur est INJECTÉE (fonction `measure`) : en vrai elle vient
// du canvas, dans les tests c'est une fonction simple. Aucune normalisation du
// texte : on ne fait que le découper.
//
// Règles de retour à la ligne :
//   - les retours à la ligne saisis sont conservés (lignes vides comprises) ;
//   - texte latin : coupure aux espaces ordinaires uniquement. Les espaces
//     insécables (U+00A0, U+202F) ne coupent jamais : « texte ! » reste groupé ;
//   - japonais (et autres caractères CJK) : coupure possible entre deux
//     caractères, avec les règles japonaises (kinsoku) : jamais 、。」ー… en
//     début de ligne, jamais 「（【… en fin de ligne ;
//   - un emoji (même composé : 👨‍👩‍👧, 🇫🇷, 👍🏽) n'est jamais coupé ;
//   - un mot plus large que la zone est coupé entre deux caractères.

/** Police utilisée pour un morceau de texte : celle de la zone, ou celle des emojis. */
export type PieceKind = 'text' | 'emoji';

export type Measure = (text: string, kind: PieceKind) => number;

export interface Piece {
  text: string;
  kind: PieceKind;
  width: number;
}

export interface Line {
  pieces: Piece[];
  /** Largeur de la ligne, espaces de fin non compris. */
  width: number;
}

const graphemeSegmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' });

export function graphemes(text: string): string[] {
  return Array.from(graphemeSegmenter.segment(text), (s) => s.segment);
}

// Emoji « officiel » (séquences comprises), y compris les symboles suivis du
// sélecteur de présentation emoji U+FE0F (☀️). Un symbole seul (★, ☀) reste du texte.
const EMOJI = /^\p{RGI_Emoji}$/v;
export function isEmoji(grapheme: string): boolean {
  return EMOJI.test(grapheme);
}

// Caractères « idéographiques » : coupure possible entre chacun d'eux.
const CJK =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u{3000}-\u{303F}\u{30FB}\u{30FC}\u{FF01}-\u{FF60}\u{FFE0}-\u{FFEF}]/u;
export function isCjk(grapheme: string): boolean {
  return CJK.test(grapheme);
}

// Kinsoku : caractères interdits en début de ligne (ils restent collés à ce
// qui précède) et en fin de ligne (ils restent collés à ce qui suit).
const NO_LINE_START = new Set(
  [
    // ponctuation japonaise et pleine chasse
    '\u{3001}', '\u{3002}', '\u{FF0C}', '\u{FF0E}', '\u{FF1A}', '\u{FF1B}', '\u{FF01}', '\u{FF1F}',
    '\u{FF09}', '\u{FF3D}', '\u{FF5D}', '\u{300D}', '\u{300F}', '\u{3011}', '\u{3009}', '\u{300B}',
    '\u{3015}', '\u{3019}', '\u{3017}', '\u{301B}', '\u{301F}', '\u{30FB}', '\u{30FC}', '\u{301C}',
    '\u{FF5E}', '\u{2026}', '\u{2025}', '\u{309D}', '\u{309E}', '\u{30FD}', '\u{30FE}', '\u{3005}',
    // petits kana
    '\u{3041}', '\u{3043}', '\u{3045}', '\u{3047}', '\u{3049}', '\u{3063}', '\u{3083}', '\u{3085}',
    '\u{3087}', '\u{308E}', '\u{3095}', '\u{3096}', '\u{30A1}', '\u{30A3}', '\u{30A5}', '\u{30A7}',
    '\u{30A9}', '\u{30C3}', '\u{30E3}', '\u{30E5}', '\u{30E7}', '\u{30EE}', '\u{30F5}', '\u{30F6}',
    // ponctuation latine fermante (français : « texte ! » saisi avec une espace ordinaire)
    '!', '?', ':', ';', ',', '.', ')', ']', '}', '\u{BB}', '\u{2019}', '\u{201D}', '%',
  ],
);
const NO_LINE_END = new Set([
  '\u{FF08}', '\u{FF3B}', '\u{FF5B}', '\u{300C}', '\u{300E}', '\u{3010}', '\u{3008}', '\u{300A}',
  '\u{3014}', '\u{3018}', '\u{3016}', '\u{301A}', '\u{301D}', '(', '[', '{', '\u{AB}', '\u{2018}', '\u{201C}',
]);

/** Espaces où l'on peut couper (les insécables U+00A0, U+202F, U+2007 n'en font pas partie). */
const BREAK_SPACE = /^[ \t]$/;

interface Unit {
  text: string;
  kind: PieceKind;
  /** Vrai si l'on peut couper la ligne juste après cette unité. */
  breakAfter: boolean;
}

/** Découpe un paragraphe (sans \n) en unités insécables. */
function units(paragraph: string): Unit[] {
  const out: Unit[] = [];
  let word = ''; // mot latin en cours (avec ses espaces de fin)
  const flushWord = () => {
    if (word) out.push({ text: word, kind: 'text', breakAfter: true });
    word = '';
  };
  for (const g of graphemes(paragraph)) {
    if (isEmoji(g)) {
      flushWord();
      out.push({ text: g, kind: 'emoji', breakAfter: true });
    } else if (isCjk(g)) {
      flushWord();
      out.push({ text: g, kind: 'text', breakAfter: true });
    } else if (BREAK_SPACE.test(g)) {
      word += g;
    } else {
      // Un caractère après des espaces commence un nouveau mot.
      if (/[ \t]$/.test(word)) flushWord();
      word += g;
    }
  }
  flushWord();

  // Collage (kinsoku, ponctuation, insécables).
  for (let i = 0; i < out.length - 1; i++) {
    const cur = out[i]!;
    const next = out[i + 1]!;
    const lastOfCur = graphemes(cur.text.replace(/[ \t]+$/, '')).at(-1) ?? '';
    const firstOfNext = graphemes(next.text)[0] ?? '';
    // Sans espace entre deux mots latins (ex. « texte » suivi d'un emoji collé),
    // on autorise quand même la coupure, sauf règles ci-dessous.
    if (NO_LINE_START.has(firstOfNext) || NO_LINE_END.has(lastOfCur)) cur.breakAfter = false;
    // Espace insécable en fin d'unité : colle à la suivante.
    if (/[\u{A0}\u{202F}\u{2007}\u{2060}]$/u.test(cur.text)) cur.breakAfter = false;
  }
  return out;
}

/** Retire les espaces de fin d'une unité (pour mesurer la fin de ligne). */
const trimEnd = (s: string) => s.replace(/[ \t]+$/, '');

/**
 * Coupe le texte en lignes dans la largeur `maxWidth`. Chaque ligne est une
 * suite de morceaux (texte ou emoji) avec leur largeur mesurée.
 */
export function layoutText(text: string, maxWidth: number, measure: Measure): Line[] {
  const cache = new Map<string, number>();
  const m = (s: string, kind: PieceKind) => {
    if (s === '') return 0;
    const key = `${kind}\u{0}${s}`;
    let w = cache.get(key);
    if (w === undefined) {
      w = measure(s, kind);
      cache.set(key, w);
    }
    return w;
  };

  const lines: Line[] = [];
  for (const paragraph of text.split('\n')) {
    const us = units(paragraph);
    if (us.length === 0) {
      lines.push({ pieces: [], width: 0 });
      continue;
    }
    // Regroupe les unités collées en « blocs » insécables.
    const chunks: Unit[][] = [];
    let chunk: Unit[] = [];
    for (const u of us) {
      chunk.push(u);
      if (u.breakAfter) {
        chunks.push(chunk);
        chunk = [];
      }
    }
    if (chunk.length) chunks.push(chunk);

    let line: Unit[] = [];
    const lineWidth = (ls: Unit[]) => widthOf(ls, m);
    const pushLine = () => {
      lines.push(toLine(line, m));
      line = [];
    };

    for (const c of chunks) {
      if (lineWidth([...line, ...c]) <= maxWidth) {
        line.push(...c);
        continue;
      }
      if (line.length) pushLine();
      if (lineWidth(c) <= maxWidth) {
        line.push(...c);
        continue;
      }
      // Bloc trop large même seul : on le coupe entre ses unités, et entre
      // deux caractères pour une unité elle-même trop large.
      for (const piece of splitChunk(c, (u) => lineWidth([u]) > maxWidth)) {
        if (line.length && lineWidth([...line, piece]) > maxWidth) pushLine();
        line.push(piece);
      }
    }
    pushLine();
  }
  return lines;
}

/** Découpe un bloc trop large : unités entières, ou caractères si l'unité est trop large. */
function splitChunk(chunk: Unit[], tooWide: (u: Unit) => boolean): Unit[] {
  const out: Unit[] = [];
  for (const u of chunk) {
    if (u.kind === 'emoji' || !tooWide(u)) out.push(u);
    else for (const g of graphemes(u.text)) out.push({ text: g, kind: 'text', breakAfter: true });
  }
  return out;
}

/** Largeur d'une suite d'unités, espaces de fin de la dernière non compris. */
function widthOf(us: Unit[], m: (s: string, kind: PieceKind) => number): number {
  return toPieces(us).reduce((sum, p, i, all) => sum + m(i === all.length - 1 ? trimEnd(p.text) : p.text, p.kind), 0);
}

/** Fusionne les unités consécutives de même type en morceaux. */
function toPieces(us: Unit[]): { text: string; kind: PieceKind }[] {
  const pieces: { text: string; kind: PieceKind }[] = [];
  for (const u of us) {
    const last = pieces.at(-1);
    if (last && last.kind === u.kind) last.text += u.text;
    else pieces.push({ text: u.text, kind: u.kind });
  }
  return pieces;
}

function toLine(us: Unit[], m: (s: string, kind: PieceKind) => number): Line {
  const raw = toPieces(us);
  const last = raw.at(-1);
  if (last) last.text = trimEnd(last.text);
  const pieces = raw.filter((p) => p.text !== '').map((p) => ({ ...p, width: m(p.text, p.kind) }));
  return { pieces, width: pieces.reduce((s, p) => s + p.width, 0) };
}

/** Texte brut d'une ligne (utile pour les tests). */
export function lineText(line: Line): string {
  return line.pieces.map((p) => p.text).join('');
}
