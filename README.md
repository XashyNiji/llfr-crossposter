# LLFR Crossposter

Application web perso de **Love Live France** : on saisit une news une seule fois,
et l'app prépare :

- le ou les **tweets** (avec le compteur officiel de X) ;
- la **légende du post Instagram** ;
- une **image de story** sur nos templates (étape b, en cours).

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
| (b) | Éditeur de story (templates, image, zones de texte, export PNG) | à venir |
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
```

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
  state/     état de l'app (signaux Preact) et sorties calculées en direct
  ui/        écrans et composants Preact
    fr.ts         TOUS les textes de l'interface (à modifier ici)
  styles.css  couleurs (variables en haut du fichier) et mise en page
test/        tests (Vitest)
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

### Choix techniques

- **TypeScript + Vite** pour le code et le build.
- **Preact + signals** pour l'interface (environ 9 Ko). C'est le plus léger qui
  reste confortable pour des formulaires avec des résultats calculés en direct ;
  les sorties sont de simples `computed()` dans `src/state/app.ts`.
- **idb** pour IndexedDB.
- **Vitest** (+ happy-dom et Testing Library) pour les tests.
- Les versions des dépendances sont **figées** dans `package.json` pour éviter les
  surprises.

### Publication

Chaque push sur `main` lance le workflow `.github/workflows/deploy.yml` : il
installe les dépendances, vérifie les types, lance les tests, construit l'app et
la publie sur GitHub Pages. Sur une pull request, il ne fait que vérifier (pas de
publication). Le suivi se fait dans l'onglet **Actions** du dépôt.

Réglage à faire une seule fois : **Settings → Pages → Source : GitHub Actions**.

L'app utilise des adresses relatives : elle fonctionne quel que soit le nom du
dépôt, sans modification du code. Attention : changer d'adresse
après que le staff a installé l'app crée une nouvelle app (il faudra la
réinstaller et réimporter la config).

## Licence

Code sous licence MIT (voir `LICENSE`).
