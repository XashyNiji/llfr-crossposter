// Tous les textes de l'interface, en un seul endroit pour les retrouver
// et les modifier facilement.

const nf = new Intl.NumberFormat('fr-FR');
export const formatNumber = (n: number): string => nf.format(n);

export const fr = {
  appName: 'LLFR Crossposter',
  nav: {
    input: 'Saisie',
    story: 'Story',
    settings: 'Réglages',
  },
  input: {
    group: 'Groupe',
    noGroup: 'Aucun groupe : ajoute-en un dans Réglages.',
    mainText: 'Texte principal',
    required: 'obligatoire',
    mainTextMissing: 'Le texte principal est obligatoire.',
    tweet2: 'Texte tweet 2',
    tweet2Hint: 'optionnel, pour les news en 2 tweets',
    instaExtra: 'Complément Insta',
    instaExtraHint: 'optionnel, uniquement dans la légende Insta',
    linkMention: 'Mention du lien (post Insta)',
    linkNone: 'Aucune',
    instaHashtags: 'Hashtags Insta',
    instaHashtagsHint: (n: number, max: number) => `${n} / ${max} cochés`,
    instaHashtagsEmpty: 'La réserve de ce groupe est vide (à remplir dans Réglages).',
    hashtagLimit: (max: number) => `${max} hashtags maximum : décoche-en un pour en choisir un autre.`,
    clearAll: 'Tout effacer',
    clearConfirm: 'Tout effacer ? Les textes, la mention de lien et les hashtags cochés seront vidés.',
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
    tweetTooLong: (excess: number) =>
      `Trop long pour X : ${formatNumber(excess)} caractère${excess > 1 ? 's' : ''} en trop.`,
    captionTooLong: (excess: number) =>
      `Trop long pour Instagram : ${formatNumber(excess)} caractère${excess > 1 ? 's' : ''} en trop.`,
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
    deleteConfirm: (name: string) => `Supprimer le groupe « ${name} » ?`,
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
    missingHash: (tags: string[]) => `Sans « # » : ${tags.join(' ')}`,
    duplicates: (tags: string[]) => `En double : ${tags.join(' ')}`,
    save: 'Enregistrer',
    cancel: 'Annuler',
    linkTitle: 'Mention du lien',
    linkBio: 'Formulation « lien en bio »',
    linkStory: 'Formulation « lien en story »',
    storageTitle: 'Stockage',
    storageGranted: 'Données protégées contre l’effacement automatique du navigateur.',
    storageDenied:
      'Protection contre l’effacement non accordée par le navigateur (elle l’est en général une fois l’app installée). Pense à exporter ta config régulièrement.',
    storageUnsupported: 'Ce navigateur ne permet pas de protéger les données contre l’effacement.',
  },
} as const;
