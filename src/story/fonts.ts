// Polices de l'éditeur de story, toutes auto-hébergées (aucun CDN).
//
// - 8 polices latines libres (OFL), proches des styles de texte des stories
//   Instagram. Seuls les fichiers woff2 « latin » et « latin-ext » sont
//   utilisés (tous les accents français, Ÿ compris).
// - Noto Sans JP (normal et gras) en secours pour le japonais : ses
//   @font-face viennent de @fontsource/noto-sans-jp (importés dans
//   StoryScreen, chargés seulement quand l'éditeur s'ouvre).
// - Inter sert aussi de secours pour μ (grec) et ʼ, absents de certaines polices.
// - Emojis : police emoji du téléphone.
//
// Chaque police latine est déclarée pour toutes les graisses (100 à 900) : la
// graisse demandée au canvas ne sert qu'à choisir le japonais normal ou gras,
// sans que le navigateur ne « grossisse » artificiellement la police latine.
import antonLatin from '@fontsource/anton/files/anton-latin-400-normal.woff2?url';
import antonLatinExt from '@fontsource/anton/files/anton-latin-ext-400-normal.woff2?url';
import courierLatin from '@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2?url';
import courierLatinExt from '@fontsource/courier-prime/files/courier-prime-latin-ext-400-normal.woff2?url';
import dancingLatin from '@fontsource/dancing-script/files/dancing-script-latin-600-normal.woff2?url';
import dancingLatinExt from '@fontsource/dancing-script/files/dancing-script-latin-ext-600-normal.woff2?url';
import fredokaLatin from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2?url';
import fredokaLatinExt from '@fontsource/fredoka/files/fredoka-latin-ext-600-normal.woff2?url';
import interGreek from '@fontsource/inter/files/inter-greek-500-normal.woff2?url';
import interGreekBold from '@fontsource/inter/files/inter-greek-700-normal.woff2?url';
import interLatin from '@fontsource/inter/files/inter-latin-500-normal.woff2?url';
import interLatinBold from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import interLatinExt from '@fontsource/inter/files/inter-latin-ext-500-normal.woff2?url';
import interLatinExtBold from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2?url';
import montserratLatin from '@fontsource/montserrat/files/montserrat-latin-600-normal.woff2?url';
import montserratLatinExt from '@fontsource/montserrat/files/montserrat-latin-ext-600-normal.woff2?url';
import neonLatin from '@fontsource/neonderthaw/files/neonderthaw-latin-400-normal.woff2?url';
import neonLatinExt from '@fontsource/neonderthaw/files/neonderthaw-latin-ext-400-normal.woff2?url';
import playfairLatin from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2?url';
import playfairLatinExt from '@fontsource/playfair-display/files/playfair-display-latin-ext-400-normal.woff2?url';

// Plages Unicode des sous-ensembles Google Fonts (identiques pour toutes ces polices).
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const GREEK = 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF';

export type FontId = 'classic' | 'modern' | 'neon' | 'typewriter' | 'strong' | 'elegant' | 'signature' | 'bubble';

export interface StoryFont {
  id: FontId;
  /** Nom du style, comme dans Instagram. */
  label: string;
  /** Famille CSS de la police latine. */
  family: string;
  /** Graisse demandée : 400 = japonais normal, 700 = japonais gras. */
  weight: 400 | 700;
  /** Effet néon (halo lumineux de la couleur du texte). */
  glow?: boolean;
  /** Fichiers woff2, avec la plage de graisses qu'ils couvrent (100 à 900 par défaut). */
  files: { url: string; range: string; weights?: string }[];
}

export const STORY_FONTS: readonly StoryFont[] = [
  {
    id: 'classic',
    label: 'Classic',
    family: 'Inter',
    weight: 400,
    // Inter sert aussi de secours (μ, ʼ) aux autres styles : version grasse
    // pour les styles gras, pour que μ ne paraisse pas plus maigre.
    files: [
      { url: interLatin, range: LATIN, weights: '100 599' },
      { url: interLatinExt, range: LATIN_EXT, weights: '100 599' },
      { url: interGreek, range: GREEK, weights: '100 599' },
      { url: interLatinBold, range: LATIN, weights: '600 900' },
      { url: interLatinExtBold, range: LATIN_EXT, weights: '600 900' },
      { url: interGreekBold, range: GREEK, weights: '600 900' },
    ],
  },
  {
    id: 'modern',
    label: 'Modern',
    family: 'Montserrat',
    weight: 700,
    files: [
      { url: montserratLatin, range: LATIN },
      { url: montserratLatinExt, range: LATIN_EXT },
    ],
  },
  {
    id: 'neon',
    label: 'Neon',
    family: 'Neonderthaw',
    weight: 400,
    glow: true,
    files: [
      { url: neonLatin, range: LATIN },
      { url: neonLatinExt, range: LATIN_EXT },
    ],
  },
  {
    id: 'typewriter',
    label: 'Typewriter',
    family: 'Courier Prime',
    weight: 400,
    files: [
      { url: courierLatin, range: LATIN },
      { url: courierLatinExt, range: LATIN_EXT },
    ],
  },
  {
    id: 'strong',
    label: 'Strong',
    family: 'Anton',
    weight: 700,
    files: [
      { url: antonLatin, range: LATIN },
      { url: antonLatinExt, range: LATIN_EXT },
    ],
  },
  {
    id: 'elegant',
    label: 'Elegant',
    family: 'Playfair Display',
    weight: 400,
    files: [
      { url: playfairLatin, range: LATIN },
      { url: playfairLatinExt, range: LATIN_EXT },
    ],
  },
  {
    id: 'signature',
    label: 'Signature',
    family: 'Dancing Script',
    weight: 400,
    files: [
      { url: dancingLatin, range: LATIN },
      { url: dancingLatinExt, range: LATIN_EXT },
    ],
  },
  {
    id: 'bubble',
    label: 'Bubble',
    family: 'Fredoka',
    weight: 700,
    files: [
      { url: fredokaLatin, range: LATIN },
      { url: fredokaLatinExt, range: LATIN_EXT },
    ],
  },
];

export const DEFAULT_FONT: FontId = 'classic';

export function storyFont(id: FontId): StoryFont {
  return STORY_FONTS.find((f) => f.id === id) ?? STORY_FONTS[0]!;
}

const JAPANESE_FAMILY = 'Noto Sans JP';
const EMOJI_FAMILIES = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"';

/**
 * Police CSS du texte d'une zone : la police choisie, puis Inter (μ, ʼ),
 * Noto Sans JP (japonais), puis la police emoji du téléphone.
 */
export function textFont(id: FontId, sizePx: number): string {
  const f = storyFont(id);
  return `${f.weight} ${sizePx}px "${f.family}", "Inter", "${JAPANESE_FAMILY}", ${EMOJI_FAMILIES}, sans-serif`;
}

/** Police CSS des emojis (dessinés à part pour être toujours en couleur). */
export function emojiFont(sizePx: number): string {
  return `${sizePx}px ${EMOJI_FAMILIES}, sans-serif`;
}

let registered = false;

/** Déclare les polices latines auprès du navigateur (une seule fois). */
export function registerFonts(): void {
  if (registered || typeof FontFace === 'undefined' || !globalThis.document?.fonts) return;
  registered = true;
  for (const f of STORY_FONTS) {
    for (const file of f.files) {
      const face = new FontFace(f.family, `url(${file.url}) format('woff2')`, {
        weight: file.weights ?? '100 900',
        style: 'normal',
        unicodeRange: file.range,
        display: 'block',
      });
      document.fonts.add(face);
    }
  }
}

/**
 * Attend que les polices nécessaires à ces textes soient chargées. Il FAUT
 * passer le vrai texte : le navigateur ne télécharge que les morceaux de police
 * qui couvrent les caractères demandés (japonais compris). Sans cette attente,
 * le canvas dessinerait avec une police de remplacement, sans prévenir.
 */
const alreadyLoaded = new Set<string>();

export async function ensureFonts(items: readonly { font: FontId; text: string }[]): Promise<void> {
  if (!globalThis.document?.fonts) return;
  registerFonts();
  // Un même texte dans une même police n'est demandé qu'une fois (pendant un
  // glisser, l'aperçu est redessiné à chaque mouvement du doigt).
  const todo = items.filter(({ font, text }) => !alreadyLoaded.has(`${font}\u{0}${text}`));
  if (!todo.length) return;
  await Promise.all(
    todo.map(async ({ font, text }) => {
      try {
        // Taille arbitraire : seules la famille et la graisse comptent pour le chargement.
        await document.fonts.load(textFont(font, 48), text || 'A');
        if (alreadyLoaded.size > 500) alreadyLoaded.clear();
        alreadyLoaded.add(`${font}\u{0}${text}`);
      } catch {
        // Police indisponible : le navigateur utilisera la suivante de la liste.
      }
    }),
  );
}

/** Précharge chaque police (lettres de base) à l'ouverture de l'éditeur. */
export function preloadFonts(): Promise<void> {
  return ensureFonts(STORY_FONTS.map((f) => ({ font: f.id, text: 'Aa\u{E9}\u{3042}\u{4E9C}' })));
}
