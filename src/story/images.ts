// Décodage des images (visuel de la news, templates) et miniatures.
import { coverRect, STORY_H, STORY_W } from './scene';

/** Plus grand côté gardé pour le visuel importé (économise la mémoire du téléphone). */
export const IMAGE_MAX_EDGE = 2880;

export class UnsupportedImageError extends Error {}

/** Décode une image en respectant l'orientation de l'appareil photo (EXIF). */
async function decode(blob: Blob, options?: ImageBitmapOptions): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image', ...options });
  } catch {
    throw new UnsupportedImageError(
      'Format d’image non pris en charge (HEIC ?). Choisis une image JPEG, PNG ou WebP.',
    );
  }
}

/** Décode le visuel de la news, réduit si son plus grand côté dépasse IMAGE_MAX_EDGE. */
export async function decodeNewsImage(blob: Blob): Promise<ImageBitmap> {
  const full = await decode(blob);
  const longEdge = Math.max(full.width, full.height);
  if (longEdge <= IMAGE_MAX_EDGE) return full;
  const k = IMAGE_MAX_EDGE / longEdge;
  try {
    return await createImageBitmap(full, {
      resizeWidth: Math.round(full.width * k),
      resizeHeight: Math.round(full.height * k),
      resizeQuality: 'high',
    });
  } finally {
    full.close();
  }
}

/** Template complet (pour l'export). */
export function decodeTemplate(blob: Blob): Promise<ImageBitmap> {
  return decode(blob);
}

/** Template réduit pour l'aperçu (moins de mémoire, dessin plus rapide). */
export function decodeTemplatePreview(blob: Blob, width: number, height: number): Promise<ImageBitmap> {
  const k = Math.min(1, 720 / Math.max(1, width));
  return decode(blob, {
    resizeWidth: Math.max(1, Math.round(width * k)),
    resizeHeight: Math.max(1, Math.round(height * k)),
    resizeQuality: 'high',
  });
}

/** Lit les dimensions d'un PNG et fabrique sa miniature (180 × 320). */
export async function prepareTemplate(blob: Blob): Promise<{ width: number; height: number; thumb: Blob }> {
  const bitmap = await decode(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const r = coverRect(bitmap.width, bitmap.height);
    const k = canvas.width / STORY_W;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, r.x * k, r.y * k, r.w * k, r.h * k);
    const thumb = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Miniature impossible'))), 'image/jpeg', 0.85),
    );
    return { width: bitmap.width, height: bitmap.height, thumb };
  } finally {
    bitmap.close();
  }
}

/** Vrai si le template a exactement le format des stories (1440 × 2560). */
export function isStoryFormat(width: number, height: number): boolean {
  return width === STORY_W && height === STORY_H;
}
