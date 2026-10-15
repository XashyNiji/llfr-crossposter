import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ensureFonts } from '../../story/fonts';
import { clearMeasureCache, renderScene } from '../../story/render';
import {
  clamp,
  pinch,
  snap,
  STORY_H,
  STORY_W,
  ZONE_MIN_H,
  ZONE_MIN_W,
  type ImagePlacement,
  type TextZone,
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

type Gesture =
  | { kind: 'zone-move'; id: string; start: Point; zone: TextZone }
  | { kind: 'zone-resize'; id: string; handle: Handle; start: Point; zone: TextZone }
  | { kind: 'image-move'; start: Point; image: ImagePlacement }
  | { kind: 'pinch'; a: number; b: number; startA: Point; startB: Point; image: ImagePlacement };

/** Distance d'aimantation, en pixels d'écran. */
const SNAP_SCREEN_PX = 12;
const SCALE_MIN = 0.02;
const SCALE_MAX = 20;

/**
 * Aperçu de la story : le canvas (mis à l'échelle de l'écran) et, par-dessus,
 * une couche HTML pour les contours, poignées et repères (jamais exportés).
 */
export function StoryCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cssW, setCssW] = useState(0);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [fontsVersion, setFontsVersion] = useState(0);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);

  const s = scene.value;
  const tpl = templatePreview.value;
  const img = newsImage.value;
  // Lecture des textes ici pour que l'aperçu suive la saisie (zone 1 liée).
  const texts = s.zones.map((z) => zoneText(z));
  const k = cssW / STORY_W; // pixels d'écran par pixel de story

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
        const layouts = renderScene(ctx, s, { template: tpl, image: img }, zoneText);
        const over = new Set([...layouts].filter(([, l]) => l.overflow).map(([id]) => id));
        const prev = overflowZones.peek();
        if (over.size !== prev.size || [...over].some((id) => !prev.has(id))) overflowZones.value = over;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [s, tpl, img, cssW, fontsVersion, texts.join('\u{0}')]);

  // ------------------------------------------------------------ Gestes

  const toStory = (e: PointerEvent): Point => {
    const r = overlayRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  function onPointerDown(e: PointerEvent) {
    if (k === 0) return;
    const p = toStory(e);
    overlayRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, p);
    const current = scene.value;

    // Deux doigts : zoom du visuel.
    if (pointers.current.size === 2 && current.image) {
      const [[a, pa], [b, pb]] = [...pointers.current.entries()] as [[number, Point], [number, Point]];
      gesture.current = { kind: 'pinch', a, b, startA: pa, startB: pb, image: current.image };
      selection.value = { kind: 'image' };
      return;
    }
    if (pointers.current.size > 1) return;

    const target = e.target as HTMLElement;
    const zoneEl = target.closest<HTMLElement>('[data-zone-id]');
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle | undefined;
    const zone = zoneEl ? current.zones.find((z) => z.id === zoneEl.dataset.zoneId) : undefined;
    if (zone) {
      selection.value = { kind: 'zone', id: zone.id };
      gesture.current = handle
        ? { kind: 'zone-resize', id: zone.id, handle, start: p, zone }
        : { kind: 'zone-move', id: zone.id, start: p, zone };
    } else if (current.image) {
      selection.value = { kind: 'image' };
      gesture.current = { kind: 'image-move', start: p, image: current.image };
    } else {
      selection.value = null;
      gesture.current = null;
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toStory(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    const threshold = SNAP_SCREEN_PX / k;

    if (g.kind === 'pinch') {
      const a = pointers.current.get(g.a);
      const b = pointers.current.get(g.b);
      if (!a || !b) return;
      const next = pinch(g.image, g.startA, g.startB, a, b);
      updateImage({ ...next, scale: clamp(next.scale, SCALE_MIN, SCALE_MAX) });
      return;
    }
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;

    if (g.kind === 'zone-move') {
      const z = g.zone;
      const sx = snap(z.x + dx + z.w / 2, STORY_W / 2, threshold);
      const sy = snap(z.y + dy + z.h / 2, STORY_H / 2, threshold);
      setGuides({ v: sx.snapped, h: sy.snapped });
      updateZone(z.id, {
        x: clamp(sx.value - z.w / 2, -z.w + 60, STORY_W - 60),
        y: clamp(sy.value - z.h / 2, -z.h + 60, STORY_H - 60),
      });
    } else if (g.kind === 'zone-resize') {
      const z = g.zone;
      const patch: Partial<TextZone> = {};
      if (g.handle !== 's') patch.w = clamp(z.w + dx, ZONE_MIN_W, STORY_W * 1.5);
      if (g.handle !== 'e') patch.h = clamp(z.h + dy, ZONE_MIN_H, STORY_H * 1.5);
      updateZone(z.id, patch);
    } else if (g.kind === 'image-move') {
      const sx = snap(g.image.cx + dx, STORY_W / 2, threshold);
      const sy = snap(g.image.cy + dy, STORY_H / 2, threshold);
      setGuides({ v: sx.snapped, h: sy.snapped });
      updateImage({ ...g.image, cx: sx.value, cy: sy.value });
    }
  }

  function onPointerEnd(e: PointerEvent) {
    pointers.current.delete(e.pointerId);
    // On termine le geste dès qu'un doigt se lève (évite un saut au prochain mouvement).
    gesture.current = null;
    setGuides({ v: false, h: false });
  }

  const sel = selection.value;
  const height = (cssW * STORY_H) / STORY_W;

  return (
    <div class="story-preview" ref={wrapRef}>
      <div class="story-preview__frame" style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} class="story-preview__canvas" aria-label={fr.story.canvasLabel} role="img" />
        <div
          ref={overlayRef}
          class="story-overlay"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {guides.v && <div class="story-guide story-guide--v" />}
          {guides.h && <div class="story-guide story-guide--h" />}
          {s.zones.map((z, i) => {
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
  );
}
