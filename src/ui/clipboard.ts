/** Copie un texte dans le presse-papiers, tel quel. Renvoie false en cas d'échec. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // On tente la méthode de repli ci-dessous.
  }
  // Repli : on fournit le texte directement à l'événement « copy ». (Passer par
  // un <textarea> modifierait les fins de ligne \r\n.)
  const onCopy = (e: ClipboardEvent) => {
    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
  };
  document.addEventListener('copy', onCopy);
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.removeEventListener('copy', onCopy);
  }
}
