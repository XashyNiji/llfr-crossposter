// Tous les textes de l'interface, en un seul endroit pour les retrouver
// et les modifier facilement.
//
// Typographie française : espace insécable avant « : » (NB) et espace fine
// insécable avant « ? ! ; » et à l'intérieur des guillemets (FINE), pour que le
// navigateur ne coupe jamais la ligne à ces endroits. Ces règles ne concernent
// que les textes de l'interface, jamais le texte saisi.

const NB = '\u{A0}';
const FINE = '\u{202F}';
const q = (s: string) => `«${FINE}${s}${FINE}»`;

const nf = new Intl.NumberFormat('fr-FR');
export const formatNumber = (n: number): string => nf.format(n);

const plural = (n: number, word: string) => `${formatNumber(n)} ${word}${n > 1 ? 's' : ''}`;

export const fr = {
  appName: 'LLFR Crossposter',
  nav: {
    label: 'Navigation',
    input: 'Saisie',
    story: 'Story',
    settings: 'Réglages',
  },
  input: {
    group: 'Groupe',
    noGroup: `Aucun groupe${NB}: ajoute-en un dans Réglages.`,
    mainText: 'Texte principal',
    required: 'obligatoire',
    mainTextMissing: 'Le texte principal est obligatoire.',
    tweet2: 'Texte tweet 2',
    tweet2Hint: 'optionnel, pour les news en 2 tweets',
    instaExtra: 'Complément Insta',
    instaExtraHint: 'optionnel, uniquement dans la légende Insta',
    linkMention: 'Mention du lien (post Insta)',
    linkNone: 'Aucune',
    linkEmpty: (kind: 'bio' | 'story') =>
      `${kind === 'bio' ? 'Lien en bio' : 'Lien en story'} (formulation vide)`,
    instaHashtags: 'Hashtags Insta',
    instaHashtagsHint: (n: number, max: number) => `${n} / ${max} cochés`,
    instaHashtagsEmpty: 'La réserve de ce groupe est vide (à remplir dans Réglages).',
    hashtagLimit: (max: number) => `${max} hashtags maximum${NB}: décoche-en un pour en choisir un autre.`,
    liveCounter: (label: string) => `${label}${NB}:`,
    clearAll: 'Tout effacer',
    clearConfirm: `Tout effacer${FINE}? Les textes, la mention de lien et les hashtags cochés seront vidés.`,
  },
  outputs: {
    xTitle: 'X (Twitter)',
    tweet: (n: number) => `Tweet ${n}`,
    instaTitle: 'Post Instagram',
    caption: 'Légende',
    empty: 'Saisis le texte principal pour voir le résultat.',
    copy: 'Copier',
    copied: 'Copié ✓',
    copyFailed: 'Échec de la copie',
    counter: (n: number, max: number) => `${formatNumber(n)} / ${formatNumber(max)}`,
    counterLabel: (n: number, max: number) => `${plural(n, 'caractère')} sur ${formatNumber(max)}`,
    tweetTooLong: (excess: number) => `Trop long pour X${NB}: ${plural(excess, 'caractère')} en trop.`,
    captionTooLong: (excess: number) => `Trop long pour Instagram${NB}: ${plural(excess, 'caractère')} en trop.`,
  },
  story: {
    title: 'Story Instagram',
    comingSoon: "L'éditeur de story arrive à l'étape (b).",
  },
  settings: {
    groupsTitle: 'Groupes',
    addGroup: 'Ajouter un groupe',
    edit: 'Modifier',
    delete: 'Supprimer',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    deleteConfirm: (name: string) => `Supprimer le groupe ${q(name)}${FINE}?`,
    lastGroup: 'Il faut garder au moins un groupe.',
    unnamed: '(sans nom)',
    editTitle: 'Modifier le groupe',
    newTitle: 'Nouveau groupe',
    name: 'Nom',
    nameRequired: 'Le nom est obligatoire.',
    prefix: 'Préfixe',
    prefixHint: 'Repris tel quel, caractère par caractère.',
    xHashtags: 'Hashtags X',
    instaHashtags: 'Réserve de hashtags Insta',
    hashtagsHint: 'Un hashtag par ligne (ou séparés par des espaces).',
    missingHash: (tags: string[]) => `Sans ${q('#')}${NB}: ${tags.join(' ')}`,
    duplicates: (tags: string[]) => `En double${NB}: ${tags.join(' ')}`,
    save: 'Enregistrer',
    cancel: 'Annuler',
    linkTitle: 'Mention du lien',
    linkBio: `Formulation ${q('lien en bio')}`,
    linkStory: `Formulation ${q('lien en story')}`,
    linkEmptyWarning: `Formulation vide${NB}: rien ne sera ajouté à la légende si elle est choisie.`,
    storageTitle: 'Stockage',
    storageGranted: 'Données protégées contre l’effacement automatique du navigateur.',
    storagePrompt: 'La protection contre l’effacement sera demandée au navigateur au premier enregistrement.',
    storageDenied:
      'Protection contre l’effacement non accordée par le navigateur (elle l’est en général une fois l’app installée).',
    storageUnsupported: 'Ce navigateur ne permet pas de protéger les données contre l’effacement.',
  },
} as const;
