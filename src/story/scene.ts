// Modèle de la story et calculs géométriques (fonctions pures, testées).
// Toutes les coordonnées sont en pixels de l'image finale (1440 × 2560).
import { DEFAULT_FONT, type FontId } from './fonts';
import { layoutText, type Line, type Measure } from './layout';

export const STORY_W = 1440;
export const STORY_H = 2560;

export type Align = 'left' | 'center' | 'right';
export type BgMode = 'none' | 'block' | 'lines';

export interface ZoneStyle {
  font: FontId;
  /** Taille du texte en px (image finale). */
  size: number;
  color: string;
  align: Align;
  /** Interlignage (multiple de la taille). */
  lineHeight: number;
  bgMode: BgMode;
  bgColor: string;
  /** Opacité du fond, de 0 à 1. */
  bgOpacity: number;
  /** Rayon des coins arrondis du fond, en px. */
  bgRadius: number;
  /** Marge interne autour du texte, en px. */
  bgPadding: number;
}

export interface TextZone extends ZoneStyle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Texte propre à la zone (ignoré tant que `linked` est vrai). */
  text: string;
  /** Zone 1 : le texte suit la saisie (texte principal + tweet 2) tant qu'on ne l'a pas modifié ici. */
  linked: boolean;
}

/** Position de l'image importée : centre et échelle. */
export interface ImagePlacement {
  cx: number;
  cy: number;
  scale: number;
}

export interface Scene {
  zones: TextZone[];
  image: ImagePlacement | null;
}

export const SIZE_MIN = 24;
export const SIZE_MAX = 240;
export const ZONE_MIN_W = 120;
export const ZONE_MIN_H = 80;

export const DEFAULT_STYLE: ZoneStyle = {
  font: DEFAULT_FONT,
  size: 72,
  color: '#ffffff',
  align: 'center',
  lineHeight: 1.25,
  bgMode: 'lines',
  bgColor: '#000000',
  bgOpacity: 1,
  bgRadius: 16,
  bgPadding: 18,
};

let zoneCounter = 0;
const newZoneId = () => `zone-${Date.now().toString(36)}-${(zoneCounter++).toString(36)}`;

/** Zone 1 : pré-remplie avec le texte de la saisie, dans le bas de la story. */
export function defaultZone1(): TextZone {
  return { ...DEFAULT_STYLE, id: newZoneId(), x: 120, y: 1450, w: 1200, h: 620, text: '', linked: true };
}

/** Nouvelle zone vide, au centre. */
export function newZone(): TextZone {
  return { ...DEFAULT_STYLE, id: newZoneId(), x: 220, y: 1130, w: 1000, h: 300, text: '', linked: false };
}

export function defaultScene(): Scene {
  return { zones: [defaultZone1()], image: null };
}

/** Échelle pour que l'image tienne entière dans la story. */
export function fitScale(width: number, height: number): number {
  return Math.min(STORY_W / width, STORY_H / height);
}

/** Image centrée, entière dans la story. */
export function centeredImage(width: number, height: number): ImagePlacement {
  return { cx: STORY_W / 2, cy: STORY_H / 2, scale: fitScale(width, height) };
}

/** Rectangle « couvrant » (le template remplit la story, proportions gardées). */
export function coverRect(width: number, height: number): { x: number; y: number; w: number; h: number } {
  const s = Math.max(STORY_W / width, STORY_H / height);
  const w = width * s;
  const h = height * s;
  return { x: (STORY_W - w) / 2, y: (STORY_H - h) / 2, w, h };
}

/** Aimantation : ramène `value` sur `target` s'il en est à moins de `threshold`. */
export function snap(value: number, target: number, threshold: number): { value: number; snapped: boolean } {
  return Math.abs(value - target) <= threshold ? { value: target, snapped: true } : { value, snapped: false };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// ---------------------------------------------------------------- Mise en page d'une zone

export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface ZoneLayout {
  lines: Line[];
  /** Hauteur d'une ligne en px. */
  lineHeightPx: number;
  /** Marge intérieure effective (0 sans fond). */
  inset: number;
  /** Position x de début de chaque ligne. */
  lineX: number[];
  /** Haut de chaque ligne. */
  lineTop: number[];
  /** Fond « par ligne » : un groupe de rectangles par paragraphe (lignes vides exclues). */
  lineRects: Rect[][];
  /** Fond « bloc » : un rectangle autour du texte, ou null s'il n'y a pas de texte. */
  blockRect: Rect | null;
  /** Vrai si le texte ne tient pas dans la zone. */
  overflow: boolean;
}

/**
 * Cache des retours à la ligne : pendant un glisser, seule la position change,
 * inutile de redécouper le texte à chaque mouvement du doigt.
 */
export type WrapCache = Map<string, Line[]>;

export function layoutZone(zone: TextZone, text: string, measure: Measure, cache?: WrapCache): ZoneLayout {
  const inset = zone.bgMode === 'none' ? 0 : zone.bgPadding;
  const maxWidth = Math.max(1, zone.w - 2 * inset);
  const key = `${zone.font}\u{0}${zone.size}\u{0}${maxWidth}\u{0}${text}`;
  let lines = cache?.get(key);
  if (!lines) {
    lines = layoutText(text, maxWidth, measure);
    if (cache) {
      if (cache.size > 200) cache.clear();
      cache.set(key, lines);
    }
  }
  const lineHeightPx = zone.size * zone.lineHeight;

  const lineX = lines.map((l) =>
    zone.align === 'left'
      ? zone.x + inset
      : zone.align === 'right'
        ? zone.x + zone.w - inset - l.width
        : zone.x + (zone.w - l.width) / 2,
  );
  const lineTop = lines.map((_, i) => zone.y + inset + i * lineHeightPx);

  // Groupes de lignes non vides consécutives (une ligne vide coupe le fond).
  const lineRects: Rect[][] = [];
  let group: number[] = [];
  const closeGroup = () => {
    if (!group.length) return;
    lineRects.push(
      smoothEdges(
        group.map((i, k) => ({
          x0: lineX[i]! - inset,
          x1: lineX[i]! + lines[i]!.width + inset,
          y0: lineTop[i]! - (k === 0 ? inset : 0),
          y1: lineTop[i]! + lineHeightPx + (k === group.length - 1 ? inset : 0),
        })),
        zone.bgRadius,
      ),
    );
    group = [];
  };
  lines.forEach((l, i) => {
    if (l.width > 0) group.push(i);
    else closeGroup();
  });
  closeGroup();

  const nonEmpty = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.width > 0);
  const blockRect: Rect | null = nonEmpty.length
    ? {
        x0: Math.min(...nonEmpty.map(({ i }) => lineX[i]!)) - inset,
        x1: Math.max(...nonEmpty.map(({ l, i }) => lineX[i]! + l.width)) + inset,
        y0: zone.y,
        y1: zone.y + 2 * inset + lines.length * lineHeightPx,
      }
    : null;

  const textHeight = lines.length * lineHeightPx + 2 * inset;
  const tooWide = lines.some((l) => l.width > maxWidth + 0.5);
  const overflow = text.length > 0 && (textHeight > zone.h + 0.5 || tooWide);

  return { lines, lineHeightPx, inset, lineX, lineTop, lineRects, blockRect, overflow };
}

/**
 * Fond par ligne : deux lignes voisines de largeurs presque égales (écart
 * inférieur à deux rayons) reçoivent le même bord, sinon le contour aurait de
 * petits crans à angle presque droit. Les vraies marches gardent leurs arrondis.
 */
export function smoothEdges(rects: readonly Rect[], radius: number): Rect[] {
  const out = rects.map((r) => ({ ...r }));
  const limit = 2 * radius;
  for (let changed = true, guard = 0; changed && guard < out.length * 2; guard++) {
    changed = false;
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i]!;
      const b = out[i + 1]!;
      if (a.x1 !== b.x1 && Math.abs(a.x1 - b.x1) < limit) {
        a.x1 = b.x1 = Math.max(a.x1, b.x1);
        changed = true;
      }
      if (a.x0 !== b.x0 && Math.abs(a.x0 - b.x0) < limit) {
        a.x0 = b.x0 = Math.min(a.x0, b.x0);
        changed = true;
      }
    }
  }
  return out;
}

/** Centre du texte affiché (pour l'aimantation), ou centre de la zone si elle est vide. */
export function textCenter(zone: TextZone, layout: ZoneLayout | undefined): { dx: number; dy: number } {
  const r = layout?.blockRect;
  if (!r) return { dx: zone.w / 2, dy: zone.h / 2 };
  return { dx: (r.x0 + r.x1) / 2 - zone.x, dy: (r.y0 + r.y1) / 2 - zone.y };
}

/**
 * Contour d'un groupe de rectangles empilés (fond « par ligne » façon
 * Instagram) : suite de sommets, côté droit de haut en bas puis côté gauche
 * de bas en haut, sans sommet inutile.
 */
export function outlinePoints(rects: readonly Rect[]): [number, number][] {
  const pts: [number, number][] = [];
  for (const r of rects) pts.push([r.x1, r.y0], [r.x1, r.y1]);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i]!;
    pts.push([r.x0, r.y1], [r.x0, r.y0]);
  }
  // Retire les doublons consécutifs puis les points alignés.
  const dedup = pts.filter((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length]!;
    return !(prev[0] === p[0] && prev[1] === p[1]);
  });
  return dedup.filter((p, i, arr) => {
    const a = arr[(i - 1 + arr.length) % arr.length]!;
    const b = arr[(i + 1) % arr.length]!;
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });
}

// ---------------------------------------------------------------- Gestes

/** Nouvelle échelle et position après un pincement à deux doigts. */
export function pinch(
  start: ImagePlacement,
  startA: { x: number; y: number },
  startB: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): ImagePlacement {
  const d0 = Math.hypot(startB.x - startA.x, startB.y - startA.y) || 1;
  const d1 = Math.hypot(b.x - a.x, b.y - a.y);
  const ratio = d1 / d0;
  const m0 = { x: (startA.x + startB.x) / 2, y: (startA.y + startB.y) / 2 };
  const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // Le point de l'image sous le milieu des doigts reste sous les doigts.
  return {
    scale: start.scale * ratio,
    cx: m1.x + (start.cx - m0.x) * ratio,
    cy: m1.y + (start.cy - m0.y) * ratio,
  };
}
