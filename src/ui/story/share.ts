// Partage du PNG (Web Share API) avec repli sur le téléchargement.

/** Télécharge un fichier (lien <a download>). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Laisse au navigateur le temps de lire le fichier avant de libérer l'adresse.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export type ShareOutcome = 'shared' | 'cancelled' | 'retry' | 'downloaded';

/**
 * Partage le PNG (pour l'envoyer directement dans Instagram). Le fichier doit
 * être PRÊT avant le toucher : Android n'autorise le partage que quelques
 * secondes après le geste de l'utilisateur.
 */
export async function shareOrDownload(blob: Blob, fileName: string): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const data: ShareData = { files: [file] };
  if (typeof navigator.share === 'function' && navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'AbortError') return 'cancelled'; // feuille de partage fermée
      if (name === 'NotAllowedError') return 'retry'; // geste trop ancien : retoucher
      // Autre échec : on télécharge plutôt que de ne rien faire.
    }
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}
