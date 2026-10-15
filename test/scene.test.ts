import { describe, expect, it } from 'vitest';
import { graphemes, isCjk, type Measure } from '../src/story/layout';
import {
  centeredImage,
  coverRect,
  defaultScene,
  layoutZone,
  newZone,
  outlinePoints,
  pinch,
  snap,
  STORY_H,
  STORY_W,
  type TextZone,
} from '../src/story/scene';

const measure: Measure = (s, kind) =>
  graphemes(s).reduce((w, g) => w + (kind === 'emoji' ? 30 : isCjk(g) ? 20 : 10), 0);

function zone(patch: Partial<TextZone> = {}): TextZone {
  return { ...newZone(), x: 100, y: 200, w: 300, h: 200, size: 40, lineHeight: 1.5, bgPadding: 10, ...patch };
}

describe('scène par défaut', () => {
  it('une zone 1 liée à la saisie, pas d’image, style blanc sur fond noir par ligne', () => {
    const s = defaultScene();
    expect(s.image).toBeNull();
    expect(s.zones).toHaveLength(1);
    expect(s.zones[0]).toMatchObject({ linked: true, color: '#ffffff', bgMode: 'lines', bgColor: '#000000', align: 'center' });
    const z = s.zones[0]!;
    expect(z.x + z.w).toBeLessThanOrEqual(STORY_W);
    expect(z.y + z.h).toBeLessThanOrEqual(STORY_H);
  });

  it('identifiants uniques', () => {
    expect(newZone().id).not.toBe(newZone().id);
  });
});

describe('image et template', () => {
  it('image centrée et entière', () => {
    expect(centeredImage(2880, 1440)).toEqual({ cx: 720, cy: 1280, scale: 0.5 });
    expect(centeredImage(1000, 4000)).toEqual({ cx: 720, cy: 1280, scale: 0.64 });
  });

  it('template au bon format : pleine page ; sinon recadré au centre', () => {
    expect(coverRect(1440, 2560)).toEqual({ x: 0, y: 0, w: 1440, h: 2560 });
    expect(coverRect(1080, 1920)).toEqual({ x: 0, y: 0, w: 1440, h: 2560 });
    const r = coverRect(1000, 1000);
    expect(r).toEqual({ x: -560, y: 0, w: 2560, h: 2560 });
  });

  it('aimantation au centre', () => {
    expect(snap(715, 720, 10)).toEqual({ value: 720, snapped: true });
    expect(snap(700, 720, 10)).toEqual({ value: 700, snapped: false });
  });

  it('pincement : échelle proportionnelle, le point sous les doigts reste en place', () => {
    const start = { cx: 720, cy: 1280, scale: 1 };
    const r = pinch(start, { x: 620, y: 1280 }, { x: 820, y: 1280 }, { x: 520, y: 1280 }, { x: 920, y: 1280 });
    expect(r).toEqual({ cx: 720, cy: 1280, scale: 2 });
    const moved = pinch(start, { x: 620, y: 1280 }, { x: 820, y: 1280 }, { x: 670, y: 1330 }, { x: 870, y: 1330 });
    expect(moved).toEqual({ cx: 770, cy: 1330, scale: 1 });
  });
});

describe('mise en page d’une zone', () => {
  it('largeur utile = largeur moins la marge ; lignes centrées', () => {
    // largeur utile 280 → « Nouveau single annoncé » (220) tient sur une ligne
    const l = layoutZone(zone(), 'Nouveau single annoncé', measure);
    expect(l.lines).toHaveLength(1);
    expect(l.lineX[0]).toBe(100 + (300 - 220) / 2);
    expect(l.lineTop[0]).toBe(210);
    expect(l.overflow).toBe(false);
  });

  it('alignement gauche et droite', () => {
    const left = layoutZone(zone({ align: 'left' }), 'abc', measure);
    expect(left.lineX[0]).toBe(110);
    const right = layoutZone(zone({ align: 'right' }), 'abc', measure);
    expect(right.lineX[0]).toBe(100 + 300 - 10 - 30);
  });

  it('sans fond : pas de marge', () => {
    const l = layoutZone(zone({ bgMode: 'none', align: 'left' }), 'abc', measure);
    expect(l.inset).toBe(0);
    expect(l.lineX[0]).toBe(100);
  });

  it('fond par ligne : un rectangle par ligne, marge autour, groupes coupés par les lignes vides', () => {
    const l = layoutZone(zone({ align: 'left', h: 1000 }), 'ab\ncd\n\nef', measure);
    expect(l.lineRects).toHaveLength(2);
    expect(l.lineRects[0]).toEqual([
      { x0: 100, x1: 140, y0: 200, y1: 270 },
      { x0: 100, x1: 140, y0: 270, y1: 340 },
    ]);
    expect(l.lineRects[1]).toEqual([{ x0: 100, x1: 140, y0: 380, y1: 460 }]);
  });

  it('fond bloc : rectangle autour de tout le texte', () => {
    const l = layoutZone(zone({ bgMode: 'block', align: 'left', h: 1000 }), 'ab\ncdef', measure);
    expect(l.blockRect).toEqual({ x0: 100, x1: 160, y0: 200, y1: 200 + 20 + 2 * 60 });
  });

  it('débordement : trop de lignes pour la hauteur', () => {
    // 3 lignes × 60 + 20 = 200 : tient ; 4 lignes : déborde
    expect(layoutZone(zone({ align: 'left' }), 'a\nb\nc', measure).overflow).toBe(false);
    expect(layoutZone(zone({ align: 'left' }), 'a\nb\nc\nd', measure).overflow).toBe(true);
  });

  it('débordement : zone plus étroite qu’un seul caractère', () => {
    expect(layoutZone(zone({ w: 25, bgPadding: 10 }), '\u{1F338}', measure).overflow).toBe(true);
  });

  it('pas de réduction automatique de la taille', () => {
    const z = zone();
    layoutZone(z, 'a\nb\nc\nd\ne\nf', measure);
    expect(z.size).toBe(40);
  });

  it('zone vide : pas de débordement, pas de fond', () => {
    const l = layoutZone(zone(), '', measure);
    expect(l.overflow).toBe(false);
    expect(l.lineRects).toEqual([]);
    expect(l.blockRect).toBeNull();
  });
});

describe('contour du fond par ligne', () => {
  it('rectangle seul : 4 coins', () => {
    expect(outlinePoints([{ x0: 0, x1: 10, y0: 0, y1: 5 }])).toEqual([
      [10, 0],
      [10, 5],
      [0, 5],
      [0, 0],
    ]);
  });

  it('lignes centrées de largeurs différentes : marches des deux côtés', () => {
    const pts = outlinePoints([
      { x0: 10, x1: 90, y0: 0, y1: 10 },
      { x0: 0, x1: 100, y0: 10, y1: 20 },
    ]);
    expect(pts).toEqual([
      [90, 0],
      [90, 10],
      [100, 10],
      [100, 20],
      [0, 20],
      [0, 10],
      [10, 10],
      [10, 0],
    ]);
  });

  it('lignes alignées à gauche : bord gauche droit (sans sommet inutile)', () => {
    const pts = outlinePoints([
      { x0: 0, x1: 50, y0: 0, y1: 10 },
      { x0: 0, x1: 80, y0: 10, y1: 20 },
    ]);
    expect(pts).toEqual([
      [50, 0],
      [50, 10],
      [80, 10],
      [80, 20],
      [0, 20],
      [0, 0],
    ]);
  });
});
