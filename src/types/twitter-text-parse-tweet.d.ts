// twitter-text 3.1.0 : le build ESM n'expose qu'un export par défaut, alors que
// @types/twitter-text décrit des exports nommés. On importe donc directement
// parseTweet (plus léger) en réutilisant les types officiels.
// ⚠️ Ne pas écrire `import { parseTweet } from 'twitter-text'` (le build casse)
// ni `import * as t from 'twitter-text'` (t.parseTweet vaut undefined).
declare module 'twitter-text/dist/esm/parseTweet' {
  import type { parseTweet } from 'twitter-text';
  const fn: typeof parseTweet;
  export default fn;
}
