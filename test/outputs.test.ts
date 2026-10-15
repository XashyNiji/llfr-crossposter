import { describe, expect, it } from 'vitest';
import { isBlank, joinBlocks, trimBlock } from '../src/core/blocks';
import { defaultConfig } from '../src/core/defaults';
import type { Draft, Group } from '../src/core/model';
import {
  buildInstaCaption,
  buildStoryText,
  buildTweet1,
  buildTweet2,
  buildTweets,
} from '../src/core/outputs';

const config = defaultConfig();
const groupById = (id: string): Group => config.groups.find((g) => g.id === id)!;
const hasu = groupById('hasunosora');
const muse = groupById('muse');
const mentions = config.linkMentions;

function draft(patch: Partial<Draft> = {}): Draft {
  return {
    groupId: 'hasunosora',
    mainText: '',
    tweet2: '',
    instaExtra: '',
    linkMention: 'none',
    instaHashtags: [],
    ...patch,
  };
}

const MAIN = 'Nouveau single 「蓮ノ空」 annoncé ! 🎉✨\nInfos : https://www.lovelive-anime.jp/hasunosora/news/';

describe('joinBlocks', () => {
  it('une seule ligne vide entre blocs, blocs vides ignorés', () => {
    expect(joinBlocks(['A', '', 'B', null, undefined, '   ', 'C'])).toBe('A\n\nB\n\nC');
  });

  it('ignore les blancs ASCII de bordure mais garde l’intérieur intact', () => {
    expect(joinBlocks(['\n\n  A\n\n\nA2 \n', ' B\t'])).toBe('A\n\n\nA2\n\nB');
  });

  it('un bloc uniquement fait d’espaces japonaises ou insécables est vide', () => {
    expect(isBlank('　  \n')).toBe(true);
    expect(joinBlocks(['A', '　', 'B'])).toBe('A\n\nB');
  });

  it('ne retire pas les blancs non ASCII de bordure', () => {
    expect(trimBlock('　インデント')).toBe('　インデント');
    expect(trimBlock('Texte !')).toBe('Texte !');
  });

  it('aucun bloc → chaîne vide', () => {
    expect(joinBlocks([])).toBe('');
    expect(joinBlocks(['', ' '])).toBe('');
  });
});

describe('Tweet 1', () => {
  it('préfixe, ligne vide, texte, ligne vide, hashtags séparés par une espace', () => {
    expect(buildTweet1(hasu, MAIN)).toBe(
      '【🪷Hasunosora🪷】\n\n' + MAIN + '\n\n#lovelive #蓮ノ空',
    );
  });

  it('conserve exactement µ (U+00B5), μ (U+03BC) et ʼ (U+02BC)', () => {
    const t = buildTweet1(muse, 'Live de μ\'s !');
    expect(t).toBe('【🌺µ\'s🌺】\n\nLive de μ\'s !\n\n#lovelive #μʼs');
    expect(t.includes('μʼs')).toBe(true);
  });

  it('retour à la ligne final dans le texte : pas de ligne vide en trop', () => {
    expect(buildTweet1(hasu, 'Texte\n\n\n')).toBe('【🪷Hasunosora🪷】\n\nTexte\n\n#lovelive #蓮ノ空');
  });

  it('groupe sans hashtags X : le tweet se termine après le texte', () => {
    const g: Group = { ...hasu, xHashtags: [] };
    expect(buildTweet1(g, 'Texte')).toBe('【🪷Hasunosora🪷】\n\nTexte');
  });

  it('groupe sans préfixe : commence directement par le texte', () => {
    const g: Group = { ...hasu, prefix: '' };
    expect(buildTweet1(g, 'Texte')).toBe('Texte\n\n#lovelive #蓮ノ空');
  });
});

describe('Tweet 2 et liste des tweets', () => {
  it('tweet 2 = texte seul, sans préfixe ni hashtags', () => {
    expect(buildTweet2('Suite 🎶 https://x.com/foo')).toBe('Suite 🎶 https://x.com/foo');
  });

  it('tweet 2 vide ou blanc → absent', () => {
    expect(buildTweet2('')).toBeNull();
    expect(buildTweet2(' \n ')).toBeNull();
    expect(buildTweets(draft({ mainText: 'A', tweet2: '\n' }), hasu)).toHaveLength(1);
  });

  it('deux tweets dans l’ordre', () => {
    expect(buildTweets(draft({ mainText: 'A', tweet2: 'B' }), hasu)).toEqual([
      '【🪷Hasunosora🪷】\n\nA\n\n#lovelive #蓮ノ空',
      'B',
    ]);
  });

  it('sans texte principal : aucun tweet', () => {
    expect(buildTweets(draft({ mainText: '  ', tweet2: 'B' }), hasu)).toEqual([]);
  });
});

describe('Légende Instagram', () => {
  it('tous les blocs, dans l’ordre, séparés par une ligne vide', () => {
    const caption = buildInstaCaption(
      draft({
        mainText: MAIN,
        tweet2: 'Précommandes ouvertes 🛒',
        instaExtra: 'Sortie le 1er janvier.',
        linkMention: 'bio',
        instaHashtags: ['#蓮ノ空', '#lovelive'],
      }),
      hasu,
      mentions,
    );
    expect(caption).toBe(
      [
        '【🪷Hasunosora🪷】',
        MAIN,
        'Précommandes ouvertes 🛒',
        'Sortie le 1er janvier.',
        'Lien en bio',
        // ordre de la réserve, pas l'ordre de sélection
        '#lovelive #蓮ノ空',
      ].join('\n\n'),
    );
  });

  it('blocs optionnels vides : jamais de ligne vide en double', () => {
    const base = { mainText: 'Texte' };
    const cases: Array<[Partial<Draft>, string]> = [
      [{}, '【🪷Hasunosora🪷】\n\nTexte'],
      [{ tweet2: 'T2' }, '【🪷Hasunosora🪷】\n\nTexte\n\nT2'],
      [{ instaExtra: 'Plus' }, '【🪷Hasunosora🪷】\n\nTexte\n\nPlus'],
      [{ linkMention: 'story' }, '【🪷Hasunosora🪷】\n\nTexte\n\nLien en story'],
      [{ instaHashtags: ['#lovelive'] }, '【🪷Hasunosora🪷】\n\nTexte\n\n#lovelive'],
      [
        { tweet2: ' ', instaExtra: '\n', linkMention: 'none', instaHashtags: [] },
        '【🪷Hasunosora🪷】\n\nTexte',
      ],
      [{ tweet2: 'T2', linkMention: 'bio' }, '【🪷Hasunosora🪷】\n\nTexte\n\nT2\n\nLien en bio'],
    ];
    for (const [patch, expected] of cases) {
      const caption = buildInstaCaption(draft({ ...base, ...patch }), hasu, mentions);
      expect(caption).toBe(expected);
      expect(caption).not.toMatch(/\n\n\n/);
    }
  });

  it('formulation de lien vide → bloc ignoré', () => {
    const c = buildInstaCaption(draft({ mainText: 'T', linkMention: 'bio' }), hasu, { bio: '', story: 'x' });
    expect(c).toBe('【🪷Hasunosora🪷】\n\nT');
  });

  it('hashtags cochés absents de la réserve ignorés, doublons retirés', () => {
    const g: Group = { ...hasu, instaHashtags: ['#a', '#b', '#a'] };
    const c = buildInstaCaption(draft({ mainText: 'T', instaHashtags: ['#a', '#zzz'] }), g, mentions);
    expect(c).toBe('【🪷Hasunosora🪷】\n\nT\n\n#a');
  });

  it('sans texte principal : légende vide', () => {
    expect(buildInstaCaption(draft({ tweet2: 'B' }), hasu, mentions)).toBe('');
  });

  it('conserve le texte japonais et les emojis à l’identique', () => {
    const text = 'ラブライブ！蓮ノ空女学院スクールアイドルクラブ 🪷👨‍👩‍👧 « citation »';
    expect(buildInstaCaption(draft({ mainText: text }), hasu, mentions)).toBe(
      '【🪷Hasunosora🪷】\n\n' + text,
    );
  });
});

describe('Texte de la zone 1 de la story', () => {
  it('texte principal + tweet 2, sans préfixe ni hashtags', () => {
    expect(buildStoryText(draft({ mainText: 'A\n', tweet2: 'B' }))).toBe('A\n\nB');
    expect(buildStoryText(draft({ mainText: 'A' }))).toBe('A');
  });
});
