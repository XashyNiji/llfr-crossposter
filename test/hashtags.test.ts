import { describe, expect, it } from 'vitest';
import {
  formatHashtagList,
  hashtagWarnings,
  orderedSelection,
  parseHashtagList,
  toggleHashtag,
} from '../src/core/hashtags';

describe('parseHashtagList', () => {
  it('sépare sur tout blanc, y compris U+3000 et insécable', () => {
    expect(parseHashtagList('#a #b\n#c　#d #e\t#f  \n\n')).toEqual(['#a', '#b', '#c', '#d', '#e', '#f']);
  });

  it('conserve les caractères exacts', () => {
    expect(parseHashtagList('#μʼs #虹ヶ咲')).toEqual(['#μʼs', '#虹ヶ咲']);
  });

  it('aller-retour avec formatHashtagList', () => {
    const tags = ['#lovelive', '#μʼs', '#イキヅライブ'];
    expect(parseHashtagList(formatHashtagList(tags))).toEqual(tags);
  });

  it('liste vide', () => {
    expect(parseHashtagList('   \n')).toEqual([]);
  });
});

describe('hashtagWarnings', () => {
  it('signale les « # » manquants et les doublons sans rien corriger', () => {
    expect(hashtagWarnings(['#a', 'b', '#a', '#c', 'b'])).toEqual({ missingHash: ['b', 'b'], duplicates: ['#a', 'b'] });
    expect(hashtagWarnings(['#a', '#b'])).toEqual({ missingHash: [], duplicates: [] });
  });
});

describe('toggleHashtag (5 maximum)', () => {
  it('coche puis décoche', () => {
    const on = toggleHashtag([], '#a');
    expect(on).toEqual({ selected: ['#a'], blocked: false });
    expect(toggleHashtag(on.selected, '#a')).toEqual({ selected: [], blocked: false });
  });

  it('le 6e est refusé, la sélection ne change pas', () => {
    const five = ['#1', '#2', '#3', '#4', '#5'];
    expect(toggleHashtag(five, '#6')).toEqual({ selected: five, blocked: true });
  });

  it('on peut toujours décocher quand on est à 5', () => {
    const five = ['#1', '#2', '#3', '#4', '#5'];
    expect(toggleHashtag(five, '#3')).toEqual({ selected: ['#1', '#2', '#4', '#5'], blocked: false });
  });
});

describe('orderedSelection', () => {
  it('ordre de la réserve, sans doublon, en ignorant ce qui n’y est plus', () => {
    expect(orderedSelection(['#a', '#b', '#c', '#a'], ['#c', '#a', '#x'])).toEqual(['#a', '#c']);
  });
});
