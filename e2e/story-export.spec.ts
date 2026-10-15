// Test de l'export de la story dans un vrai navigateur (Chromium) :
// texte japonais + emojis, vérification du PNG final.
import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';
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

// Zone 1 par défaut (x 120–1320, y 1450–2070) : on analyse un peu plus large.
const ZONE = { x0: 100, x1: 1340, y0: 1400, y1: 2100 };

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

async function prepareStory(page: Page, template: string) {
  await page.goto('./#/reglages');
  await page.locator('input[type=file][accept="image/png"]').setInputFiles(template);
  await expect(page.getByText(/1 template importé/)).toBeVisible();

  await page.goto('./#/');
  await page.locator('#group').selectOption('nijigasaki');
  await page.locator('#main-text').fill(TEXT);

  await page.getByRole('link', { name: /Story/ }).click();
  await expect(page.locator('.story-preview__canvas')).toBeVisible();
}

/** « Créer l'image » puis « Télécharger » : renvoie le PNG exporté. */
async function exportStory(page: Page, testInfo: TestInfo, name: string): Promise<PNG> {
  await page.getByRole('button', { name: 'Créer l’image' }).click();
  await expect(page.locator('.export-preview')).toBeVisible({ timeout: 20_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^llfr-story-\d{8}-\d{4}\.png$/);
  // Enregistré AVANT les vérifications : visible dans les résultats même en cas d'échec.
  const file = testInfo.outputPath(name);
  await download.saveAs(file);
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
  return PNG.sync.read(readFileSync(file));
}

/** Export fait dans un navigateur où Noto Sans JP ne peut pas se charger (témoin). */
async function exportWithoutNotoJp(browser: Browser, template: string, testInfo: TestInfo): Promise<PNG> {
  const context = await browser.newContext({ ...testInfo.project.use });
  try {
    const page = await context.newPage();
    await page.route(/noto-sans-jp/, (route) => route.abort());
    await prepareStory(page, template);
    return await exportStory(page, testInfo, 'export-sans-noto-jp.png');
  } finally {
    await context.close();
  }
}

function pixel(png: PNG, x: number, y: number): [number, number, number] {
  const i = (y * png.width + x) * 4;
  return [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
}

test('export de la story : 1440 × 2560, japonais en Noto Sans JP, emojis en couleur, aucun repère', async ({
  page,
  browser,
}, testInfo) => {
  const dir = mkdtempSync(join(tmpdir(), 'llfr-e2e-'));
  const template = makeTemplate(dir);
  await prepareStory(page, template);

  // Rend la zone trop petite : l'aperçu affiche le contour rouge et l'alerte
  // « Texte trop long »… qui ne doivent PAS se retrouver dans l'export.
  await page.locator('.zone-box').first().click(); // toucher = sélectionner
  await expect(page.getByText('Zone de texte 1 sélectionnée')).toBeVisible();
  await page.getByText('Dimensions de la zone').click();
  await page.getByLabel(/^Hauteur/).fill('120');
  await expect(page.locator('.zone-box--overflow')).toHaveCount(1);
  await expect(page.getByText('Texte trop long', { exact: true })).toBeVisible();

  const png = await exportStory(page, testInfo, 'export.png');
  expect([png.width, png.height]).toEqual([W, H]);

  // Noto Sans JP (police de l'app) est bien chargée par la page.
  const notoLoaded = await page.evaluate(() =>
    [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Noto Sans JP' && f.status === 'loaded'),
  );
  expect(notoLoaded).toBe(true);

  let red = 0; // contour « trop long » de l'aperçu (#ff2d2d)
  let colored = 0; // pixels vivement colorés : emojis
  let white = 0; // texte blanc
  for (let y = ZONE.y0; y < ZONE.y1; y++) {
    for (let x = ZONE.x0; x < ZONE.x1; x++) {
      const [r, g, b] = pixel(png, x, y);
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

  // Témoin : le même export sans Noto Sans JP (police de secours du système)
  // doit donner un rendu différent. Si l'export n'utilisait pas Noto Sans JP,
  // les deux images seraient identiques.
  const fallback = await exportWithoutNotoJp(browser, template, testInfo);
  let differing = 0;
  for (let y = ZONE.y0; y < ZONE.y1; y++) {
    for (let x = ZONE.x0; x < ZONE.x1; x++) {
      const a = pixel(png, x, y);
      const b = pixel(fallback, x, y);
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 96) differing++;
    }
  }
  expect(differing).toBeGreaterThan(2000);
});

test('partage indisponible : repli sur le téléchargement', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'llfr-e2e-'));
  await prepareStory(page, makeTemplate(dir));
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

test('un simple toucher sélectionne sans déplacer ni jeter l’image créée', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'llfr-e2e-'));
  await prepareStory(page, makeTemplate(dir));
  await page.getByRole('button', { name: 'Créer l’image' }).click();
  await expect(page.locator('.export-preview')).toBeVisible({ timeout: 20_000 });

  const zone = page.locator('.zone-box').first();
  const before = await zone.boundingBox();
  // Toucher avec un léger tremblement du doigt (2 px).
  const box = before!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2 + 1);
  await page.mouse.up();

  await expect(page.getByText('Zone de texte 1 sélectionnée')).toBeVisible();
  expect(await zone.boundingBox()).toEqual(before);
  await expect(page.locator('.export-preview')).toBeVisible();
});
