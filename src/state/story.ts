// État de l'éditeur de story : scène, sélection, templates, visuel importé.
// Rien de tout cela n'est mémorisé d'une story à l'autre (chaque story se règle
// au cas par cas), sauf le dernier template choisi.
import { batch, computed, signal } from '@preact/signals';
import { buildStoryText } from '../core/outputs';
import { ensureFonts } from '../story/fonts';
import { decodeNewsImage, decodeTemplate, decodeTemplatePreview, prepareTemplate, previewCopy } from '../story/images';
import { exportPng, type RenderImage } from '../story/render';
import {
  centeredImage,
  defaultScene,
  defaultZone1,
  newZone,
  type ImagePlacement,
  type Scene,
  type TextZone,
} from '../story/scene';
import {
  deleteTemplate,
  getTemplate,
  listTemplates,
  loadLastTemplateId,
  putTemplate,
  renameTemplate,
  saveLastTemplateId,
  type TemplateMeta,
} from '../storage/templates';
import { draft, ensurePersistence } from './app';

export type Selection = { kind: 'zone'; id: string } | { kind: 'image' } | null;

export interface TemplateView extends TemplateMeta {
  /** Adresse de la miniature (URL d'objet). */
  thumbUrl: string;
}

/** Visuel de la news : version complète (export) et copie réduite (aperçu). */
export interface NewsImage {
  full: ImageBitmap;
  preview: ImageBitmap;
  width: number;
  height: number;
}

export const scene = signal<Scene>(defaultScene());
export const selection = signal<Selection>(null);
export const templates = signal<TemplateView[]>([]);
export const templatesLoaded = signal(false);
export const templateId = signal<string | null>(null);
/** Template réduit pour l'aperçu (dimensions d'origine dans width/height). */
export const templatePreview = signal<RenderImage | null>(null);
export const newsImage = signal<NewsImage | null>(null);
/** Vrai pendant le décodage d'un visuel importé. */
export const imageLoading = signal(false);
export const storyError = signal<string | null>(null);
/** Zones dont le texte ne tient pas (calculé à chaque dessin de l'aperçu). */
export const overflowZones = signal<ReadonlySet<string>>(new Set());

export interface ExportResult {
  blob: Blob;
  url: string;
  fileName: string;
  /** Texte de la saisie au moment de l'export (zone 1 liée). */
  sourceText: string;
}
export const exportResult = signal<ExportResult | null>(null);
export const exporting = signal(false);

/** Vrai si l'image exportée correspond encore à ce qui est affiché. */
export const exportIsCurrent = computed(() => {
  const r = exportResult.value;
  return r !== null && r.sourceText === buildStoryText(draft.value);
});

export const selectedZone = computed<TextZone | null>(() => {
  const sel = selection.value;
  if (sel?.kind !== 'zone') return null;
  return scene.value.zones.find((z) => z.id === sel.id) ?? null;
});

/** Texte affiché par une zone : celui de la saisie pour la zone 1 liée. */
export function zoneText(zone: TextZone): string {
  return zone.linked ? buildStoryText(draft.value) : zone.text;
}

/**
 * Numéro de version de la story : augmente à chaque changement (scène,
 * template, visuel). Un export lancé avant un changement est jeté.
 */
let storyVersion = 0;

function touched(): void {
  storyVersion++;
  clearExport();
}

// Toute modification rend l'image exportée obsolète.
function setScene(next: Scene): void {
  scene.value = next;
  touched();
}

export function clearExport(): void {
  const r = exportResult.peek();
  if (r) URL.revokeObjectURL(r.url);
  exportResult.value = null;
}

/**
 * Libère une image décodée un peu plus tard : un dessin de l'aperçu déjà
 * programmé peut encore l'utiliser.
 */
function release(bitmap: ImageBitmap | null | undefined): void {
  if (bitmap) setTimeout(() => bitmap.close(), 1500);
}

// ---------------------------------------------------------------- Zones

/** Modifie une zone (sans effet si rien ne change, pour ne pas jeter l'export). */
export function updateZone(id: string, patch: Partial<TextZone>): void {
  const zone = scene.value.zones.find((z) => z.id === id);
  if (!zone || (Object.keys(patch) as (keyof TextZone)[]).every((k) => zone[k] === patch[k])) return;
  setScene({ ...scene.value, zones: scene.value.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });
}

/** Modifie le texte d'une zone : une zone liée à la saisie s'en détache. */
export function setZoneText(id: string, text: string): void {
  updateZone(id, { text, linked: false });
}

/** Reprend le texte de la saisie (texte principal + tweet 2). */
export function relinkZone(id: string): void {
  updateZone(id, { linked: true, text: '' });
}

export function addZone(): void {
  const z = newZone();
  batch(() => {
    setScene({ ...scene.value, zones: [...scene.value.zones, z] });
    selection.value = { kind: 'zone', id: z.id };
  });
}

export function deleteZone(id: string): void {
  batch(() => {
    setScene({ ...scene.value, zones: scene.value.zones.filter((z) => z.id !== id) });
    if (selection.value?.kind === 'zone' && selection.value.id === id) selection.value = null;
  });
}

// ---------------------------------------------------------------- Visuel importé

let imageSeq = 0;

export async function importNewsImage(file: Blob): Promise<void> {
  const seq = ++imageSeq;
  storyError.value = null;
  imageLoading.value = true;
  try {
    const full = await decodeNewsImage(file);
    const preview = await previewCopy(full);
    if (seq !== imageSeq) {
      // Un autre visuel a été choisi entre-temps : celui-ci est abandonné.
      full.close();
      if (preview !== full) preview.close();
      return;
    }
    batch(() => {
      const old = newsImage.peek();
      release(old?.full);
      if (old && old.preview !== old.full) release(old.preview);
      newsImage.value = { full, preview, width: full.width, height: full.height };
      setScene({ ...scene.value, image: centeredImage(full.width, full.height) });
      selection.value = { kind: 'image' };
    });
  } catch (e) {
    if (seq === imageSeq) storyError.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (seq === imageSeq) imageLoading.value = false;
  }
}

export function updateImage(placement: ImagePlacement): void {
  const cur = scene.value.image;
  if (cur && cur.cx === placement.cx && cur.cy === placement.cy && cur.scale === placement.scale) return;
  setScene({ ...scene.value, image: placement });
}

function dropNewsImage(): void {
  imageSeq++; // annule un import en cours
  imageLoading.value = false;
  const old = newsImage.peek();
  release(old?.full);
  if (old && old.preview !== old.full) release(old.preview);
  newsImage.value = null;
}

export function removeNewsImage(): void {
  batch(() => {
    dropNewsImage();
    setScene({ ...scene.value, image: null });
    if (selection.value?.kind === 'image') selection.value = null;
  });
}

// ---------------------------------------------------------------- Réinitialisations

/**
 * « Réinitialiser la mise en page » : zone 1 seule (texte repris de la
 * saisie), visuel recentré ; on garde le visuel et le template.
 */
export function resetLayout(): void {
  const img = newsImage.value;
  batch(() => {
    setScene({ zones: [defaultZone1()], image: img ? centeredImage(img.width, img.height) : null });
    selection.value = null;
  });
}

/** « Tout effacer » : retire aussi le visuel et les zones ; le template choisi est gardé. */
export function resetStory(): void {
  batch(() => {
    dropNewsImage();
    setScene(defaultScene());
    selection.value = null;
  });
}

// ---------------------------------------------------------------- Templates

function setTemplateViews(metas: TemplateMeta[]): void {
  for (const t of templates.peek()) URL.revokeObjectURL(t.thumbUrl);
  templates.value = metas.map((m) => ({ ...m, thumbUrl: URL.createObjectURL(m.thumb) }));
}

async function refreshTemplates(): Promise<void> {
  setTemplateViews(await listTemplates());
}

/** Charge la liste des templates et sélectionne le dernier utilisé (ou le premier). */
export async function loadTemplates(): Promise<void> {
  try {
    const seqAtStart = templateSeq;
    await refreshTemplates();
    templatesLoaded.value = true;
    // Rien n'a été choisi entre-temps : on reprend le dernier template utilisé.
    if (templateId.peek() === null && seqAtStart === templateSeq) {
      const last = await loadLastTemplateId();
      const list = templates.peek();
      const id = list.find((t) => t.id === last)?.id ?? list[0]?.id ?? null;
      if (id && seqAtStart === templateSeq) await selectTemplate(id, false);
    }
  } catch (e) {
    storyError.value = `Lecture des templates impossible : ${e instanceof Error ? e.message : String(e)}`;
  }
}

let templateSeq = 0;

/** Choisit le template ; si deux choix se chevauchent, le dernier touché l'emporte. */
export async function selectTemplate(id: string | null, remember = true): Promise<void> {
  const seq = ++templateSeq;
  storyError.value = null;
  try {
    const t = id ? await getTemplate(id) : undefined;
    const bitmap = t ? await decodeTemplatePreview(t.blob, t.width, t.height) : null;
    if (seq !== templateSeq) {
      bitmap?.close();
      return;
    }
    batch(() => {
      release(templatePreview.peek()?.source as ImageBitmap | undefined);
      templatePreview.value = t && bitmap ? { source: bitmap, width: t.width, height: t.height } : null;
      templateId.value = t ? t.id : null;
      touched();
    });
    if (remember) await saveLastTemplateId(t ? t.id : null);
  } catch (e) {
    if (seq === templateSeq) storyError.value = e instanceof Error ? e.message : String(e);
  }
}

export interface ImportReport {
  imported: TemplateMeta[];
  errors: string[];
}

/** Importe des PNG comme templates (le fichier est gardé tel quel). */
export async function importTemplates(files: readonly File[]): Promise<ImportReport> {
  const report: ImportReport = { imported: [], errors: [] };
  for (const file of files) {
    if (file.type !== 'image/png') {
      report.errors.push(`${file.name} : ce n’est pas un PNG.`);
      continue;
    }
    try {
      const { width, height, thumb } = await prepareTemplate(file);
      const meta = {
        id: `tpl-${crypto.randomUUID()}`,
        name: file.name.replace(/\.png$/i, ''),
        width,
        height,
        thumb,
        createdAt: Date.now() + report.imported.length,
      };
      await putTemplate({ ...meta, blob: file });
      report.imported.push(meta);
    } catch (e) {
      report.errors.push(`${file.name} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  await refreshTemplates();
  if (report.imported.length) {
    void ensurePersistence();
    if (templateId.peek() === null) await selectTemplate(report.imported[0]!.id);
  }
  return report;
}

export async function renameTemplateById(id: string, name: string): Promise<void> {
  await renameTemplate(id, name);
  await refreshTemplates();
}

export async function removeTemplate(id: string): Promise<void> {
  await deleteTemplate(id);
  await refreshTemplates();
  if (templateId.peek() === id) await selectTemplate(templates.peek()[0]?.id ?? null, false);
}

// ---------------------------------------------------------------- Export

function exportFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `llfr-story-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.png`;
}

/**
 * Crée le PNG 1440 × 2560 (polices chargées d'abord, template et visuel en
 * pleine résolution). Si la story change pendant la création, le résultat
 * est jeté : l'image affichée correspond toujours à l'aperçu.
 */
export async function createExport(): Promise<ExportResult | null> {
  // Tout est lu AVANT la première attente.
  const version = storyVersion;
  const s = scene.value;
  const id = templateId.value;
  const img = newsImage.value;
  const sourceText = buildStoryText(draft.value);
  const texts = new Map(s.zones.map((z) => [z.id, zoneText(z)]));
  const textOf = (z: TextZone) => texts.get(z.id) ?? zoneText(z);

  exporting.value = true;
  storyError.value = null;
  let fullTemplate: ImageBitmap | null = null;
  try {
    await ensureFonts(s.zones.map((z) => ({ font: z.font, text: textOf(z) })));
    const t = id ? await getTemplate(id) : undefined;
    fullTemplate = t ? await decodeTemplate(t.blob) : null;
    const blob = await exportPng(
      s,
      {
        template: fullTemplate && t ? { source: fullTemplate, width: t.width, height: t.height } : null,
        image: img ? { source: img.full, width: img.width, height: img.height } : null,
      },
      textOf,
    );
    if (version !== storyVersion) return null;
    clearExport();
    const result = { blob, url: URL.createObjectURL(blob), fileName: exportFileName(), sourceText };
    exportResult.value = result;
    return result;
  } catch (e) {
    // Une erreur due à un changement pendant la création (visuel retiré…) est ignorée.
    if (version === storyVersion) {
      storyError.value = `Création de l’image impossible : ${e instanceof Error ? e.message : String(e)}`;
    }
    return null;
  } finally {
    fullTemplate?.close();
    exporting.value = false;
  }
}
