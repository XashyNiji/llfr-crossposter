import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ensureFonts } from '../../story/fonts';
import { clearMeasureCache, renderScene, type RenderImage } from '../../story/render';
import {
  clamp,
  fitScale,
  pinch,
  snap,
  STORY_H,
  STORY_W,
  textCenter,
  ZONE_MIN_H,
  ZONE_MIN_W,
  type ImagePlacement,
  type TextZone,
  type ZoneLayout,
} from '../../story/scene';
import {
  newsImage,
  overflowZones,
  scene,
  selection,
  templatePreview,
  updateImage,
  updateZone,
  zoneText,
} from '../../state/story';
import { fr } from '../fr';

type Point = { x: number; y: number };
type Handle = 'e' | 's' | 'se';

/** Toucher en cours, pas encore assez bougé pour être un glisser. */
interface Pending {
  pointerId: number;
  start: Point;
  startClient: Point;
  zoneId: string | null;
  handle: Handle | null;
}

type Gesture =
  | { kind: 'zone-move'; start: Point; zone: TextZone }
  | { kind: 'zone-resize'; handle: Handle; start: Point; zone: TextZone }
  | { kind: 'image-move'; start: Point; image: ImagePlacement }
  | { kind: 'pinch'; a: number; b: number; startA: Point; startB: Point; image: ImagePlacement };

/** Mouvement minimal (px d'écran) avant de déplacer quoi que ce soit : un simple toucher ne bouge rien. */
const DRAG_SLOP = 6;
/** Distance d'aimantation, en pixels d'écran. */
const SNAP_SCREEN_PX = 12;
/** Limites de taille du visuel, identiques au curseur (10 % à 400 % de la taille « entière »). */
export const IMAGE_SCALE_MIN = 0.1;
export const IMAGE_SCALE_MAX = 4;

/**
 * Aperçu de la story : le canvas (mis à l'échelle de l'écran) et, par-dessus,
 * une couche HTML pour les contours, poignées et repères (jamais exportés).
 *
 * Gestes : toucher = sélectionner (une zone, le visuel, ou rien) ; glisser =
 * déplacer l'élément DÉJÀ sélectionné ; deux doigts = zoomer le visuel
 * sélectionné. Ailleurs, un glissement vertical fait défiler la page.
 */
export function StoryCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cssW, setCssW] = useState(0);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [fontsVersion, setFontsVersion] = useState(0);
  const pointers = useRef(new Map<number, Point>());
  const pending = useRef<Pending | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const layoutsRef = useRef<Map<string, ZoneLayout>>(new Map());

  const s = scene.value;
  const tpl = templatePreview.value;
  const news = newsImage.value;
  // Lecture des textes ici pour que l'aperçu suive la saisie (zone 1 liée).
  const texts = s.zones.map((z) => zoneText(z));
  const k = cssW / STORY_W; // pixels d'écran par pixel de story
  const sel = selection.value;

  // Largeur disponible (l'aperçu garde le format 9:16).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setCssW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Une police vient de finir de charger : on remesure et on redessine.
  useEffect(() => {
    const onDone = () => {
      clearMeasureCache();
      setFontsVersion((v) => v + 1);
    };
    document.fonts?.addEventListener('loadingdone', onDone);
    return () => document.fonts?.removeEventListener('loadingdone', onDone);
  }, []);

  // Dessin (après chargement des polices nécessaires aux textes affichés).
  const drawSeq = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssW === 0) return;
    const seq = ++drawSeq.current;
    let frame = 0;
    const image: RenderImage | null = news ? { source: news.preview, width: news.width, height: news.height } : null;
    void ensureFonts(s.zones.map((z, i) => ({ font: z.font, text: texts[i]! }))).then(() => {
      if (seq !== drawSeq.current) return;
      frame = requestAnimationFrame(() => {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const w = Math.round(cssW * dpr);
        const h = Math.round((cssW * STORY_H * dpr) / STORY_W);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(w / STORY_W, 0, 0, h / STORY_H, 0, 0);
        try {
          const layouts = renderScene(ctx, s, { template: tpl, image }, zoneText);
          layoutsRef.current = layouts;
          const over = new Set([...layouts].filter(([, l]) => l.overflow).map(([id]) => id));
          const prev = overflowZones.peek();
          if (over.size !== prev.size || [...over].some((id) => !prev.has(id))) overflowZones.value = over;
        } catch {
          // Image libérée entre-temps (changement de visuel) : le dessin suivant la remplace.
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [s, tpl, news, cssW, fontsVersion, texts.join('\u{0}')]);

  // ------------------------------------------------------------ Gestes

  const toStory = (e: PointerEvent): Point => {
    const r = overlayRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  const imageSelected = sel?.kind === 'image' && !!s.image;

  function onPointerDown(e: PointerEvent) {
    if (k === 0) return;
    const p = toStory(e);
    pointers.current.set(e.pointerId, p);
    const current = scene.value;

    // Deux doigts sur le visuel sélectionné : zoom.
    if (pointers.current.size === 2 && selection.peek()?.kind === 'image' && current.image) {
      const [[a, pa], [b, pb]] = [...pointers.current.entries()] as [[number, Point], [number, Point]];
      pending.current = null;
      gesture.current = { kind: 'pinch', a, b, startA: pa, startB: pb, image: current.image };
      overlayRef.current?.setPointerCapture(a);
      overlayRef.current?.setPointerCapture(b);
      return;
    }
    if (pointers.current.size > 1) return;

    const target = e.target as HTMLElement;
    pending.current = {
      pointerId: e.pointerId,
      start: p,
      startClient: { x: e.clientX, y: e.clientY },
      zoneId: target.closest<HTMLElement>('[data-zone-id]')?.dataset.zoneId ?? null,
      handle: (target.closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle | undefined) ?? null,
    };
    gesture.current = null;
  }

  /** Démarre le glisser une fois le seuil dépassé (seulement sur l'élément déjà sélectionné). */
  function startGesture(pd: Pending): Gesture | null {
    const current = scene.value;
    const selected = selection.peek();
    const zone = pd.zoneId ? current.zones.find((z) => z.id === pd.zoneId) : undefined;
    if (zone && selected?.kind === 'zone' && selected.id === zone.id) {
      return pd.handle
        ? { kind: 'zone-resize', handle: pd.handle, start: pd.start, zone }
        : { kind: 'zone-move', start: pd.start, zone };
    }
    if (!zone && selected?.kind === 'image' && current.image) {
      return { kind: 'image-move', start: pd.start, image: current.image };
    }
    return null;
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toStory(e);
    pointers.current.set(e.pointerId, p);

    const pd = pending.current;
    if (pd && pd.pointerId === e.pointerId && !gesture.current) {
      if (Math.hypot(e.clientX - pd.startClient.x, e.clientY - pd.startClient.y) < DRAG_SLOP) return;
      gesture.current = startGesture(pd);
      pending.current = null;
      if (gesture.current) overlayRef.current?.setPointerCapture(e.pointerId);
    }
    const g = gesture.current;
    if (!g) return;
    const threshold = SNAP_SCREEN_PX / k;

    if (g.kind === 'pinch') {
      const a = pointers.current.get(g.a);
      const b = pointers.current.get(g.b);
      const img = newsImage.peek();
      if (!a || !b || !img) return;
      const next = pinch(g.image, g.startA, g.startB, a, b);
      const fit = fitScale(img.width, img.height);
      updateImage({ ...next, scale: clamp(next.scale, fit * IMAGE_SCALE_MIN, fit * IMAGE_SCALE_MAX) });
      return;
    }
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;

    if (g.kind === 'zone-move') {
      const z = g.zone;
      // On aimante le centre du TEXTE affiché (pas celui de la zone).
      const c = textCenter(z, layoutsRef.current.get(z.id));
      const sx = snap(z.x + dx + c.dx, STORY_W / 2, threshold);
      const sy = snap(z.y + dy + c.dy, STORY_H / 2, threshold);
      setGuides({ v: sx.snapped, h: sy.snapped });
      updateZone(z.id, {
        x: clamp(sx.value - c.dx, 0, STORY_W - z.w),
        y: clamp(sy.value - c.dy, 0, STORY_H - z.h),
      });
    } else if (g.kind === 'zone-resize') {
      const z = g.zone;
      const patch: Partial<TextZone> = {};
      if (g.handle !== 's') patch.w = clamp(z.w + dx, ZONE_MIN_W, STORY_W - z.x);
      if (g.handle !== 'e') patch.h = clamp(z.h + dy, ZONE_MIN_H, STORY_H - z.y);
      updateZone(z.id, patch);
    } else if (g.kind === 'image-move') {
      const sx = snap(g.image.cx + dx, STORY_W / 2, threshold);
      const sy = snap(g.image.cy + dy, STORY_H / 2, threshold);
      setGuides({ v: sx.snapped, h: sy.snapped });
      updateImage({ ...g.image, cx: sx.value, cy: sy.value });
    }
  }

  /** Simple toucher : sélectionne la zone touchée, le visuel, ou rien. */
  function tap(pd: Pending) {
    const current = scene.value;
    if (pd.zoneId) {
      selection.value = { kind: 'zone', id: pd.zoneId };
      return;
    }
    const img = newsImage.peek();
    if (img && current.image) {
      const halfW = (img.width * current.image.scale) / 2;
      const halfH = (img.height * current.image.scale) / 2;
      if (Math.abs(pd.start.x - current.image.cx) <= halfW && Math.abs(pd.start.y - current.image.cy) <= halfH) {
        selection.value = { kind: 'image' };
        return;
      }
    }
    selection.value = null;
  }

  function onPointerUp(e: PointerEvent) {
    const pd = pending.current;
    if (pd && pd.pointerId === e.pointerId && !gesture.current) tap(pd);
    end(e);
  }

  function end(e: PointerEvent) {
    pointers.current.delete(e.pointerId);
    pending.current = null;
    // On termine le geste dès qu'un doigt se lève (évite un saut au prochain mouvement).
    gesture.current = null;
    setGuides({ v: false, h: false });
  }

  const height = (cssW * STORY_H) / STORY_W;
  // La zone sélectionnée est dessinée en dernier : ses poignées passent au-dessus des autres zones.
  const ordered = [...s.zones.map((z, i) => ({ z, i }))].sort(
    (a, b) => Number(sel?.kind === 'zone' && sel.id === a.z.id) - Number(sel?.kind === 'zone' && sel.id === b.z.id),
  );

  return (
    <div class="story-sticky">
    <div class="story-preview" ref={wrapRef}>
      <div class="story-preview__frame" style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} class="story-preview__canvas" aria-label={fr.story.canvasLabel} role="img" />
        <div
          ref={overlayRef}
          class={`story-overlay${imageSelected ? ' story-overlay--image' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={end}
        >
          {guides.v && <div class="story-guide story-guide--v" />}
          {guides.h && <div class="story-guide story-guide--h" />}
          {ordered.map(({ z, i }) => {
            const selected = sel?.kind === 'zone' && sel.id === z.id;
            const overflow = overflowZones.value.has(z.id);
            return (
              <div
                key={z.id}
                data-zone-id={z.id}
                class={`zone-box${selected ? ' zone-box--selected' : ''}${overflow ? ' zone-box--overflow' : ''}`}
                style={{ left: `${z.x * k}px`, top: `${z.y * k}px`, width: `${z.w * k}px`, height: `${z.h * k}px` }}
                aria-label={fr.story.zoneLabel(i + 1)}
              >
                {overflow && <span class="zone-box__badge">{fr.story.overflow}</span>}
                {selected && (
                  <>
                    <span class="zone-handle zone-handle--e" data-handle="e" aria-label={fr.story.resizeWidth} />
                    <span class="zone-handle zone-handle--s" data-handle="s" aria-label={fr.story.resizeHeight} />
                    <span class="zone-handle zone-handle--se" data-handle="se" aria-label={fr.story.resizeBoth} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}
