// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { draft, emptyDraft, updateDraft } from '../src/state/app';
import {
  addZone,
  deleteZone,
  relinkZone,
  resetLayout,
  resetStory,
  scene,
  selection,
  setZoneText,
  updateImage,
  updateZone,
  zoneText,
} from '../src/state/story';
import { defaultScene } from '../src/story/scene';

beforeEach(() => {
  draft.value = emptyDraft('love-live');
  scene.value = defaultScene();
  selection.value = null;
});

describe('zone 1 liée à la saisie', () => {
  it('affiche texte principal + tweet 2, sans préfixe ni hashtags', () => {
    updateDraft({ mainText: 'Annonce \u{1F338}', tweet2: 'Suite' });
    const z1 = scene.value.zones[0]!;
    expect(zoneText(z1)).toBe('Annonce \u{1F338}\n\nSuite');
  });

  it('suit la saisie tant qu’on ne la modifie pas dans l’éditeur', () => {
    updateDraft({ mainText: 'A' });
    const id = scene.value.zones[0]!.id;
    setZoneText(id, 'Texte perso');
    updateDraft({ mainText: 'B' });
    expect(zoneText(scene.value.zones[0]!)).toBe('Texte perso');
    relinkZone(id);
    expect(zoneText(scene.value.zones[0]!)).toBe('B');
  });
});

describe('zones', () => {
  it('ajout (sélectionnée, vide) et suppression', () => {
    addZone();
    expect(scene.value.zones).toHaveLength(2);
    const added = scene.value.zones[1]!;
    expect(added.text).toBe('');
    expect(added.linked).toBe(false);
    expect(selection.value).toEqual({ kind: 'zone', id: added.id });
    deleteZone(added.id);
    expect(scene.value.zones).toHaveLength(1);
    expect(selection.value).toBeNull();
  });

  it('réglages par zone', () => {
    const id = scene.value.zones[0]!.id;
    updateZone(id, { size: 96, color: '#ffd400', align: 'left', bgMode: 'block', bgOpacity: 0.5 });
    expect(scene.value.zones[0]).toMatchObject({ size: 96, color: '#ffd400', align: 'left', bgMode: 'block', bgOpacity: 0.5 });
  });
});

describe('réinitialisations', () => {
  it('« Réinitialiser la mise en page » : une seule zone 1 liée, réglages par défaut', () => {
    const id = scene.value.zones[0]!.id;
    updateZone(id, { size: 200, x: 0 });
    setZoneText(id, 'perso');
    addZone();
    resetLayout();
    expect(scene.value.zones).toHaveLength(1);
    expect(scene.value.zones[0]).toMatchObject({ linked: true, size: 72, x: 120 });
  });

  it('« Tout effacer » vide aussi la story', () => {
    addZone();
    updateImage({ cx: 1, cy: 2, scale: 3 });
    resetStory();
    expect(scene.value.zones).toHaveLength(1);
    expect(scene.value.image).toBeNull();
  });
});
