import { describe, expect, it } from 'vitest';
import { emptyGroup, moveGroup, parseConfig, removeGroup, upsertGroup } from '../src/core/config';
import { defaultConfig } from '../src/core/defaults';

describe('parseConfig', () => {
  it('accepte la config par défaut et la copie à l’identique', () => {
    const c = defaultConfig();
    const parsed = parseConfig(JSON.parse(JSON.stringify(c)));
    expect(parsed).toEqual(c);
  });

  it('retire les champs inconnus', () => {
    const c = { ...defaultConfig(), extra: 1 };
    expect(parseConfig(c)).not.toHaveProperty('extra');
  });

  it.each([
    ['null', null],
    ['texte', 'x'],
    ['mauvaise version', { ...defaultConfig(), schemaVersion: 99 }],
    ['groupes absents', { ...defaultConfig(), groups: undefined }],
    ['groupe invalide', { ...defaultConfig(), groups: [{ id: 'a', name: 'A' }] }],
    ['hashtags non textuels', { ...defaultConfig(), groups: [{ id: 'a', name: 'A', prefix: '', xHashtags: [1], instaHashtags: [] }] }],
    ['identifiants en double', { ...defaultConfig(), groups: [defaultConfig().groups[0], defaultConfig().groups[0]] }],
    ['mentions absentes', { ...defaultConfig(), linkMentions: null }],
  ])('rejette : %s', (_label, value) => {
    expect(parseConfig(value)).toBeNull();
  });
});

describe('opérations sur les groupes', () => {
  const groups = defaultConfig().groups.slice(0, 3);
  const names = (gs: { name: string }[]) => gs.map((g) => g.name);

  it('monter / descendre', () => {
    expect(names(moveGroup(groups, 1, -1))).toEqual(["μ's", 'Love Live', 'Aqours']);
    expect(names(moveGroup(groups, 1, 1))).toEqual(['Love Live', 'Aqours', "μ's"]);
  });

  it('ne sort pas des bornes', () => {
    expect(names(moveGroup(groups, 0, -1))).toEqual(names(groups));
    expect(names(moveGroup(groups, 2, 1))).toEqual(names(groups));
  });

  it('ajout, modification, suppression', () => {
    const g = { ...emptyGroup(), name: 'Nouveau' };
    const added = upsertGroup(groups, g);
    expect(names(added)).toEqual(['Love Live', "μ's", 'Aqours', 'Nouveau']);
    const edited = upsertGroup(added, { ...g, name: 'Renommé' });
    expect(names(edited)).toEqual(['Love Live', "μ's", 'Aqours', 'Renommé']);
    expect(names(removeGroup(edited, g.id))).toEqual(names(groups));
  });

  it('nouveaux identifiants uniques', () => {
    expect(emptyGroup().id).not.toBe(emptyGroup().id);
  });
});
