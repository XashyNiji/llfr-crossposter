// Dessin de la story sur un canvas. La MÊME fonction sert à l'aperçu (mis à
// l'échelle) et à l'export en 1440 × 2560 : ce qui est exporté est exactement
// ce qui est affiché. Les repères, contours et poignées de l'éditeur sont des
// éléments HTML posés par-dessus l'aperçu : ils ne peuvent donc jamais se
// retrouver dans l'image exportée.
import { emojiFont, storyFont, textFont } from './fonts';
import type { Measure, PieceKind } from './layout';
import {
  coverRect,
  layoutZone,
  outlinePoints,
  STORY_H,
  STORY_W,
  type Rect,
  type Scene,
  type TextZone,
  type WrapCache,
  type ZoneLayout,
} from './scene';

/**
 * Image à dessiner. `width`/`height` sont les dimensions d'ORIGINE : l'aperçu
 * peut fournir une version réduite (`source`) sans changer la mise en page.
 */
export interface RenderImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface RenderAssets {
  /** Template (fond). */
  template: RenderImage | null;
  /** Visuel de la news. */
  image: RenderImage | null;
}

const wrapCache: WrapCache = new Map();

type Ctx = CanvasRenderingContext2D;

const widthCache = new Map<string, number>();

/** Fonction de mesure du canvas pour une zone (avec cache). */
export function canvasMeasure(ctx: Ctx, zone: Pick<TextZone, 'font' | 'size'>): Measure {
  return (text: string, kind: PieceKind) => {
    const font = kind === 'emoji' ? emojiFont(zone.size) : textFont(zone.font, zone.size);
    const key = `${font}\u{0}${text}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(text).width;
      if (widthCache.size > 20000) widthCache.clear();
      widthCache.set(key, w);
    }
    return w;
  };
}

/** Vide le cache des largeurs (à appeler quand une police finit de charger). */
export function clearMeasureCache(): void {
  widthCache.clear();
  wrapCache.clear();
}

/**
 * Position de la ligne de base dans une ligne de texte : une seule pour le
 * latin, le japonais et les emojis (sinon chaque police se centre à sa façon
 * et les caractères « sautent » d'un morceau à l'autre). Le centre visuel
 * d'un texte se trouve à environ 0,34 em au-dessus de sa ligne de base.
 */
const BASELINE_FROM_CENTER = 0.34;

function roundedOutline(ctx: Ctx, rects: readonly Rect[], radius: number): void {
  const p = outlinePoints(rects);
  const n = p.length;
  if (n < 3) return;
  const d = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const last = p[n - 1]!;
  const first = p[0]!;
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n]!;
    const v = p[i]!;
    const b = p[(i + 1) % n]!;
    ctx.arcTo(v[0], v[1], b[0], b[1], Math.max(0, Math.min(radius, d(a, v) / 2, d(v, b) / 2)));
  }
  ctx.closePath();
}

function drawBackground(ctx: Ctx, zone: TextZone, layout: ZoneLayout): void {
  if (zone.bgMode === 'none' || zone.bgOpacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, zone.bgOpacity));
  ctx.fillStyle = zone.bgColor;
  ctx.beginPath();
  if (zone.bgMode === 'block') {
    const r = layout.blockRect;
    if (r) {
      const radius = Math.min(zone.bgRadius, (r.x1 - r.x0) / 2, (r.y1 - r.y0) / 2);
      ctx.roundRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, Math.max(0, radius));
    }
  } else {
    // Tous les groupes dans un seul chemin, remplis une seule fois : pas de
    // zone plus foncée là où deux lignes se touchent.
    for (const group of layout.lineRects) roundedOutline(ctx, group, zone.bgRadius);
  }
  ctx.fill();
  ctx.restore();
}

function drawText(ctx: Ctx, zone: TextZone, layout: ZoneLayout): void {
  const font = storyFont(zone.font);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = zone.color;
  // Le flou des ombres ne suit pas la mise à l'échelle du canvas : on le
  // corrige pour que l'aperçu ait le même halo que l'export.
  const t = ctx.getTransform();
  const scale = Math.hypot(t.a, t.b) || 1;
  const passes = font.glow ? 2 : 1;
  for (let pass = 0; pass < passes; pass++) {
    if (font.glow) {
      ctx.shadowColor = zone.color;
      ctx.shadowBlur = zone.size * (pass === 0 ? 0.6 : 0.25) * scale;
    }
    layout.lines.forEach((line, i) => {
      let x = layout.lineX[i]!;
      const y = layout.lineTop[i]! + layout.lineHeightPx / 2 + zone.size * BASELINE_FROM_CENTER;
      for (const piece of line.pieces) {
        ctx.font = piece.kind === 'emoji' ? emojiFont(zone.size) : textFont(zone.font, zone.size);
        ctx.fillText(piece.text, x, y);
        x += piece.width;
      }
    });
  }
  ctx.restore();
}

/** Texte affiché par une zone (zone 1 liée : texte de la saisie). */
export type ZoneTextResolver = (zone: TextZone) => string;

/**
 * Dessine la story dans le repère 1440 × 2560. Pour l'aperçu, appliquer avant
 * une transformation d'échelle (ctx.setTransform). Renvoie la mise en page de
 * chaque zone (débordement compris).
 */
export function renderScene(
  ctx: Ctx,
  scene: Scene,
  assets: RenderAssets,
  zoneText: ZoneTextResolver,
): Map<string, ZoneLayout> {
  // Fond noir sous le template (zones transparentes éventuelles).
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  if (assets.template) {
    const r = coverRect(assets.template.width, assets.template.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(assets.template.source, r.x, r.y, r.w, r.h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, STORY_H);
    g.addColorStop(0, '#3a1030');
    g.addColorStop(1, '#120914');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }

  if (assets.image && scene.image) {
    const { cx, cy, scale } = scene.image;
    const w = assets.image.width * scale;
    const h = assets.image.height * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(assets.image.source, cx - w / 2, cy - h / 2, w, h);
  }

  const layouts = new Map<string, ZoneLayout>();
  for (const zone of scene.zones) {
    const layout = layoutZone(zone, zoneText(zone), canvasMeasure(ctx, zone), wrapCache);
    layouts.set(zone.id, layout);
    drawBackground(ctx, zone, layout);
    drawText(ctx, zone, layout);
  }
  return layouts;
}

/** Calcule la mise en page des zones sans rien dessiner (débordements). */
export function measureScene(ctx: Ctx, scene: Scene, zoneText: ZoneTextResolver): Map<string, ZoneLayout> {
  const layouts = new Map<string, ZoneLayout>();
  for (const zone of scene.zones) layouts.set(zone.id, layoutZone(zone, zoneText(zone), canvasMeasure(ctx, zone), wrapCache));
  return layouts;
}

/**
 * Export PNG en pleine résolution. Les images fournies doivent être les
 * versions complètes (pas les copies réduites de l'aperçu).
 */
export async function exportPng(scene: Scene, assets: RenderAssets, zoneText: ZoneTextResolver): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    renderScene(ctx, scene, assets, zoneText);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export PNG impossible'))), 'image/png'),
    );
  } finally {
    // Libère tout de suite la mémoire du grand canvas (important sur téléphone).
    canvas.width = 0;
    canvas.height = 0;
  }
}
