# LLFR Crossposter

Application web perso de **Love Live France** : on saisit une news une seule fois,
et l'app prépare :

- le ou les **tweets** (avec le compteur officiel de X) ;
- la **légende du post Instagram** ;
- une **image de story** (PNG 1440 × 2560) sur nos templates.

C'est une PWA : elle s'utilise dans Chrome sur Android et pourra s'installer comme
une app. Tout se passe dans le téléphone : pas de serveur, pas de compte, pas d'IA,
rien de payant.

> **Confidentialité.** Le dépôt est public : il ne contient **aucun** template ni
> réglage perso. Les groupes, hashtags et templates sont stockés dans le
> navigateur de chaque téléphone (IndexedDB) et se partagent par export/import
> d'un fichier de config (étape d).

## Avancement

| Étape | Contenu | État |
|---|---|---|
| (a) | Saisie, sorties X et Insta, réglages des groupes et du lien | ✅ |
| (b) | Éditeur de story (templates, image, zones de texte, export PNG) | ✅ |
| (c) | Hors-ligne et installation Android | à venir |
| (d) | Export / import de la config | à venir |

## Utilisation

1. **Saisie** : choisis le groupe (« Love Live » si la news concerne plusieurs
   groupes), écris le texte principal, et si besoin le texte du tweet 2, le
   complément Insta, la mention du lien et jusqu'à 5 hashtags Insta.
2. Les sorties se mettent à jour en direct sous le formulaire. Chaque sortie a son
   compteur et son bouton **Copier**. Au-delà de la limite (280 pour X, 2 200 pour
   Instagram), le compteur passe au rouge, mais le texte reste copiable.
3. La saisie en cours est gardée dans le téléphone : si Android ferme l'app pendant
   que tu colles le tweet dans X, tu la retrouves en revenant. Il n'y a pas
   d'historique, seulement la saisie du moment.
4. **Hashtags X** : les hashtags X du groupe sont cochés par défaut. Décoche-les
   pour gagner des caractères, ou ajoute des hashtags personnalisés pour ce tweet
   (champ « Autres hashtags X »). La légende Insta n'est pas concernée.
5. **Tout effacer** vide les textes, la mention et les hashtags cochés (et la
   saisie gardée). Le groupe choisi est conservé.
6. **Réglages** : ajoute, modifie, supprime ou réordonne les groupes (↑ / ↓), et
   change les formulations « Lien en bio » / « Lien en story ».

### Story Instagram

1. Dans **Réglages → Templates de story**, importe tes PNG (1440 × 2560). Ils
   restent dans le téléphone. Un template d'une autre taille est accepté, mais
   recadré pour remplir le format.
2. Dans l'onglet **Story**, choisis le template en haut (le dernier utilisé est
   retenu), puis **Importer le visuel** depuis la galerie. Le visuel est centré
   et tient entier dans la story.
3. **Le visuel** : touche-le pour le sélectionner, glisse-le au doigt, pince à
   deux doigts ou utilise le curseur « Taille du visuel » pour le redimensionner
   (proportions conservées).
4. **Les zones de texte** : la zone 1 reprend le texte principal + le texte du
   tweet 2 (sans préfixe ni hashtags) et suit la saisie tant que tu ne modifies
   pas son texte dans l'éditeur. **Ajouter une zone de texte** crée une zone vide.
   Touche une zone pour la régler : texte, police, taille, couleur, alignement,
   interlignage, largeur, hauteur, fond (aucun, bloc, ou par ligne façon Insta,
   avec couleur, opacité, coins arrondis et marge interne). Glisse-la au doigt ;
   les poignées rondes changent sa largeur et sa hauteur.
5. Des repères bleus apparaissent quand une zone ou le visuel est centré
   horizontalement ou verticalement (aimantation).
6. Si le texte ne tient pas, la zone a un **contour rouge** et l'alerte « Texte
   trop long » s'affiche : réduis la taille, agrandis la zone ou utilise une
   deuxième zone. La police n'est jamais réduite automatiquement.
7. **Créer l'image** produit le PNG en pleine résolution, puis **Partager**
   (pour l'envoyer directement dans Instagram) ou **Télécharger**. Si le partage
   de fichiers n'est pas possible, l'image est téléchargée.
8. **Réinitialiser la mise en page** revient à la zone 1 seule, visuel recentré.
   Rien n'est mémorisé d'une story à l'autre, sauf le template choisi.

Les contours, poignées et repères ne sont jamais dans l'image exportée.

#### Polices

| Style Instagram | Police libre utilisée |
|---|---|
| Classic | Inter |
| Modern | Montserrat |
| Neon | Neonderthaw (avec halo lumineux) |
| Typewriter | Courier Prime |
| Strong | Anton |
| Elegant | Playfair Display |
| Signature | Dancing Script |
| Bubble | Fredoka |

Toutes gèrent les accents français. Le japonais est affiché avec **Noto Sans
JP** (normal ou gras selon le style), en secours de chaque police : jamais de
carrés. Les emojis utilisent la police emoji du téléphone (leur dessin peut donc
varier d'un téléphone à l'autre). Toutes les polices sont incluses dans l'app
(aucun CDN) et sous licence libre OFL.

### Règles de mise en forme

- **Tweet 1** : préfixe, ligne vide, texte principal, ligne vide, hashtags X
  choisis (ceux du groupe restés cochés, puis les personnalisés) séparés par une
  espace. Sans hashtag, le tweet s'arrête après le texte.
- **Tweet 2** : le texte seul.
- **Légende Insta** : préfixe, texte principal, tweet 2, complément Insta, mention
  du lien, hashtags cochés (dans l'ordre de la réserve), avec une ligne vide entre
  chaque bloc. Un bloc vide est simplement omis.
- Les espaces et retours à la ligne au **début et à la fin** de chaque bloc sont
  ignorés à l'assemblage (sinon un retour à la ligne final créerait une ligne vide
  en trop). Rien d'autre n'est touché.

### Règle d'or : aucun « nettoyage » du texte

Les textes, préfixes et hashtags sont restitués **caractère par caractère**. L'app
ne fait jamais de normalisation Unicode (NFC/NFKC), ne remplace pas les apostrophes
et ne corrige rien. Exemples voulus dans les données initiales :

- le préfixe de μ's s'écrit avec le **signe micro** `µ` (U+00B5) et l'apostrophe `'` ;
- le hashtag `#μʼs` utilise la lettre grecque `μ` (U+03BC) et l'apostrophe
  modificative `ʼ` (U+02BC). Avec une apostrophe ordinaire, X ne reconnaîtrait que
  `#μ`.

Pour que rien ne puisse les « corriger » en silence, `src/core/defaults.ts` écrit
tous les caractères spéciaux sous forme de codes `\u{…}`, et les tests comparent
chaque caractère à son code écrit en hexadécimal. D'autres tests font traverser
des caractères sensibles (é décomposé, ヅ, µ, ﬁ…) dans toutes les sorties, et un
test échoue si `.normalize(` apparaît dans le code.

### Compteur X

Le compteur utilise la bibliothèque officielle **twitter-text** (`parseTweet` →
`weightedLength`) : un lien compte 23, un caractère japonais ou un emoji compte 2.

Limite connue : cette bibliothèque n'est plus mise à jour depuis 2020. Les emojis
très récents (Unicode 15.1 et plus, par exemple 🐦‍🔥) sont comptés trop cher.
L'alerte arrive donc un peu trop tôt, jamais trop tard. Pour réduire le problème,
`package.json` force une version plus récente de son composant emoji
(`"overrides": { "twemoji-parser": "14.0.0" }`).

Le compteur Instagram, lui, compte prudemment (un emoji compte 2 ou plus), car
Instagram ne documente pas sa méthode.

## Faire évoluer l'app

### Prérequis

- [Node.js](https://nodejs.org/) 22 (ou plus récent).
- Un éditeur de code, par exemple VS Code.

```bash
npm install        # installe les dépendances (une fois)
npm run dev        # lance l'app en local : ouvre l'adresse affichée
npm test           # lance tous les tests
npm run typecheck  # vérifie les types TypeScript
npm run build      # construit la version publiée dans dist/
npm run test:e2e   # teste l'export de la story dans Chromium (après npm run build)
```

Pour `test:e2e` sur ta machine, installe d'abord le navigateur de test :
`npx playwright install chromium`.

### Organisation du code

```
src/
  core/      logique pure, sans interface, entièrement testée
    model.ts      types et limites (280, 2 200, 5 hashtags)
    defaults.ts   données initiales (9 groupes), écrites en codes \u{…}
    blocks.ts     assemblage des blocs séparés par une ligne vide
    outputs.ts    tweets, légende Insta, texte de la story
    count.ts      compteurs (seul fichier qui utilise twitter-text)
    hashtags.ts   découpage, avertissements, limite de 5
    config.ts     validation de la config, opérations sur les groupes
  storage/   IndexedDB (base « llfr-crossposter »), navigator.storage.persist(),
             saisie en cours (localStorage)
  story/     éditeur de story, sans interface
    layout.ts     retour à la ligne (japonais, insécables, emojis), testé
    scene.ts      modèle de la story (zones, visuel), géométrie, testé
    fonts.ts      liste des polices et chargement (document.fonts.load)
    render.ts     dessin sur canvas, identique pour l'aperçu et l'export
    images.ts     décodage des images, miniatures
  storage/   IndexedDB (base « llfr-crossposter ») : réglages, templates ;
             navigator.storage.persist() ; saisie en cours (localStorage)
  state/     état de l'app (signaux Preact) et sorties calculées en direct
    app.ts        saisie, réglages, sorties X et Insta
    story.ts      éditeur de story (scène, templates, export)
  ui/        écrans et composants Preact
    fr.ts         TOUS les textes de l'interface (à modifier ici)
    story/        écran de l'éditeur (chargé seulement à l'ouverture de l'onglet)
  styles.css  couleurs (variables en haut du fichier) et mise en page
test/        tests unitaires (Vitest)
e2e/         test de l'export de la story dans un vrai navigateur (Playwright)
```

### Recettes

- **Changer un texte de l'interface** : `src/ui/fr.ts`.
- **Changer les couleurs** : les variables en haut de `src/styles.css` (il y a un
  bloc pour le mode clair et un pour le mode sombre).
- **Ajouter ou modifier un groupe** : directement dans l'app (Réglages). Les
  données initiales de `src/core/defaults.ts` ne servent qu'au tout premier
  lancement.
- **Changer une limite** (280, 2 200, 5 hashtags) : `src/core/model.ts`, puis
  adapter les tests.
- **Changer le style par défaut des zones de texte** (taille, couleur, fond…) :
  `DEFAULT_STYLE` dans `src/story/scene.ts`.
- **Ajouter ou changer une police de story** : installe-la depuis npm
  (`npm install --save-exact @fontsource/<nom>`), puis ajoute une entrée dans
  `STORY_FONTS` de `src/story/fonts.ts` (fichiers woff2 « latin » et
  « latin-ext »). Vérifie qu'elle gère les accents français.

### Choix techniques

- **TypeScript + Vite** pour le code et le build.
- **Preact + signals** pour l'interface (environ 9 Ko). C'est le plus léger qui
  reste confortable pour des formulaires avec des résultats calculés en direct ;
  les sorties sont de simples `computed()` dans `src/state/app.ts`.
- **idb** pour IndexedDB.
- **Canvas 2D** pour la story : `Intl.Segmenter` découpe le texte (y compris le
  japonais, qui n'a pas d'espaces) ; les polices sont chargées avec
  `document.fonts.load` avant chaque dessin.
- **Vitest** (+ happy-dom et Testing Library) pour les tests unitaires,
  **Playwright** pour le test de l'export dans Chromium.
- Les versions des dépendances sont **figées** dans `package.json` pour éviter les
  surprises.

### Publication

Chaque push sur `main` lance le workflow `.github/workflows/deploy.yml` : il
installe les dépendances, vérifie les types, lance les tests unitaires, construit
l'app, teste l'export de la story dans Chromium et la publie sur GitHub Pages. Sur une pull request, il ne fait que vérifier (pas de
publication). Le suivi se fait dans l'onglet **Actions** du dépôt.

Réglage à faire une seule fois : **Settings → Pages → Source : GitHub Actions**.

L'app utilise des adresses relatives : elle fonctionne quel que soit le nom du
dépôt, sans modification du code. Attention : changer d'adresse
après que le staff a installé l'app crée une nouvelle app (il faudra la
réinstaller et réimporter la config).

## Licence

Code sous licence MIT (voir `LICENSE`).
