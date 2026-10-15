// Test de l'export de la story dans un vrai navigateur (Chromium) :
// texte japonais + emojis, vérification du PNG final.
import { expect, test, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const W = 1440;
const H = 2560;
// Texte de test : grec, ʼ, accents rares, guillemets, japonais, emojis (dont
// ☀️ = symbole + sélecteur emoji, et 👍🏽 = emoji + teinte de peau).
const TEXT =
  '\u{3BC}\u{2BC}s \u{178} \u{153} \u{AB} \u{BB} \u{30E9}\u{30D6}\u{30E9}\u{30A4}\u{30D6}\u{FF01}\u{8679}\u{30F6}\u{54B2} \u{2600}\u{FE0F}\u{1F44D}\u{1F3FD}';
const KANJI = '\u{8679}\u{30F6}\u{54B2}\u{5B66}\u{5712}';

/** Template synthétique (aucun template réel dans le dépôt public). */
function makeTemplate(dir: string): string {
  const png = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      png.data[i] = 40;
      png.data[i + 1] = 60 + Math.round((120 * y) / H);
      png.data[i + 2] = 90;
      png.data[i + 3] = 255;
    }
  }
  const file = join(dir, 'template-test.png');
  writeFileSync(file, PNG.sync.write(png));
  return file;
}

async function prepareStory(page: Page, dir: string) {
  await page.goto('./#/reglages');
  await page.locator('input[type=file][accept="image/png"]').setInputFiles(makeTemplate(dir));
  await expect(page.getByText(/1 template importé/)).toBeVisible();

  await page.goto('./#/');
  await page.locator('#group').selectOption('nijigasaki');
  await page.locator('#main-text').fill(TEXT);

  await page.getByRole('link', { name: /Story/ }).click();
  await expect(page.locator('.story-preview__canvas')).toBeVisible();
}

test('export de la story : 1440 × 2560, japonais et emojis rendus, aucun repère', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'llfr-e2e-'));
  await prepareStory(page, dir);

  // Le texte japonais est bien dessiné avec Noto Sans JP (pas de carrés ni de
  // police de remplacement) : on compare le rendu avec la pile de polices de
  // l'app et avec Noto Sans JP seule.
  const sameAsNotoJp = await page.evaluate(async (kanji) => {
    await document.fonts.load('400 80px "Noto Sans JP"', kanji);
    const draw = (font: string) => {
      const c = document.createElement('canvas');
      c.width = 500;
      c.height = 120;
      const ctx = c.getContext('2d')!;
      ctx.font = font;
      ctx.fillText(kanji, 10, 90);
      return Array.from(ctx.getImageData(0, 0, c.width, c.height).data);
    };
    const app = draw('400 80px "Inter", "Noto Sans JP", "Noto Color Emoji", sans-serif');
    const ref = draw('400 80px "Noto Sans JP"');
    const inked = ref.filter((v, i) => i % 4 === 3 && v > 0).length;
    return {
      loaded: document.fonts.check('400 80px "Noto Sans JP"', kanji),
      identical: app.every((v, i) => v === ref[i]),
      inked,
    };
  }, KANJI);
  expect(sameAsNotoJp.loaded).toBe(true);
  expect(sameAsNotoJp.inked).toBeGreaterThan(1000);
  expect(sameAsNotoJp.identical).toBe(true);

  // Rend la zone trop petite pour que l'aperçu affiche le contour rouge
  // « Texte trop long » : il ne doit PAS se retrouver dans l'export.
  await page.locator('.zone-box').first().click();
  await page.getByLabel(/^Hauteur/).fill('120');
  await expect(page.locator('.zone-box--overflow')).toHaveCount(1);
  await expect(page.getByText('Texte trop long', { exact: true })).toBeVisible();
  // Remet une hauteur suffisante pour la suite.
  await page.getByLabel(/^Hauteur/).fill('620');
  await expect(page.locator('.zone-box--overflow')).toHaveCount(0);
  await page.getByLabel(/^Hauteur/).fill('120');

  await page.getByRole('button', { name: 'Créer l’image' }).click();
  await expect(page.locator('.export-preview')).toBeVisible({ timeout: 20_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^llfr-story-\d{8}-\d{4}\.png$/);
  const file = join(dir, 'export.png');
  await download.saveAs(file);
  await test.info().attach('export.png', { path: file, contentType: 'image/png' });

  const png = PNG.sync.read(readFileSync(file));
  expect([png.width, png.height]).toEqual([W, H]);

  // Analyse des pixels de la zone 1 (x 120–1320, y 1450–2070 par défaut).
  let red = 0; // contour « trop long » de l'aperçu (#ff2d2d)
  let colored = 0; // pixels vivement colorés : emojis
  let white = 0; // texte blanc
  for (let y = 1400; y < 2100; y++) {
    for (let x = 100; x < 1340; x++) {
      const i = (y * W + x) * 4;
      const [r, g, b] = [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
      if (r === 0xff && g === 0x2d && b === 0x2d) red++;
      if (r > 240 && g > 240 && b > 240) white++;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Le template de test est un dégradé vert-bleu peu saturé : un pixel
      // très saturé et clair vient forcément d'un emoji (soleil, main).
      if (max > 150 && max - min > 120 && r > b) colored++;
    }
  }
  expect(red).toBe(0);
  expect(white).toBeGreaterThan(5000);
  expect(colored).toBeGreaterThan(500);
});

test('partage indisponible : repli sur le téléchargement', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'llfr-e2e-'));
  await prepareStory(page, dir);
  // Chromium sans interface n'a pas navigator.share : « Partager » doit télécharger.
  expect(await page.evaluate(() => typeof navigator.share)).toBe('undefined');
  await page.getByRole('button', { name: 'Créer l’image' }).click();
  await expect(page.locator('.export-preview')).toBeVisible({ timeout: 20_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Partager' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await expect(page.getByText(/Partage indisponible sur cet appareil/)).toBeVisible();
});
