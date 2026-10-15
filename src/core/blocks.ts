// Assemblage de blocs de texte séparés par une ligne vide.
//
// Seule « tolérance » appliquée au texte saisi : au moment d'assembler, on
// ignore les espaces, tabulations et retours à la ligne ASCII au début et à la
// fin de chaque bloc. Le texte saisi n'est jamais modifié, et l'intérieur des
// blocs est restitué à l'identique (y compris les lignes vides internes).
// Aucun autre caractère n'est retiré : une espace insécable ou une espace
// japonaise (U+3000) en bordure de bloc est conservée.

const EDGE_WHITESPACE = /^[ \t\r\n]+|[ \t\r\n]+$/g;

/** Retire les blancs ASCII de bordure, sans rien changer d'autre. */
export function trimBlock(text: string): string {
  return text.replace(EDGE_WHITESPACE, '');
}

/** Vrai si le bloc ne contient que des blancs (y compris U+3000, insécables…). */
export function isBlank(text: string | null | undefined): boolean {
  return text == null || /^\s*$/u.test(text);
}

/**
 * Assemble les blocs non vides avec exactement une ligne vide entre eux.
 * Les blocs vides (ou uniquement blancs) sont ignorés : jamais de ligne vide
 * en double.
 */
export function joinBlocks(blocks: ReadonlyArray<string | null | undefined>): string {
  return blocks
    .filter((b): b is string => !isBlank(b))
    .map(trimBlock)
    .join('\n\n');
}
