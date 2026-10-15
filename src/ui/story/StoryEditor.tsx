// Éditeur de story (chargé à la demande avec ses polices japonaises).
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/700.css';
import { useEffect, useState } from 'preact/hooks';
import { preloadFonts, registerFonts } from '../../story/fonts';
import { fitScale } from '../../story/scene';
import {
  addZone,
  createExport,
  exporting,
  exportIsCurrent,
  exportResult,
  imageLoading,
  importNewsImage,
  loadTemplates,
  newsImage,
  removeNewsImage,
  resetLayout,
  scene,
  selectedZone,
  selection,
  selectTemplate,
  storyError,
  templateId,
  templates,
  templatesLoaded,
  updateImage,
} from '../../state/story';
import { fr } from '../fr';
import { downloadBlob, shareOrDownload } from './share';
import { IMAGE_SCALE_MAX, IMAGE_SCALE_MIN, StoryCanvas } from './StoryCanvas';
import { ZonePanel } from './ZonePanel';

function TemplatePicker() {
  if (!templatesLoaded.value) return null;
  if (templates.value.length === 0) {
    return (
      <div class="notice">
        {fr.story.noTemplate}{' '}
        <a href="#/reglages" class="link">
          {fr.story.goToSettings}
        </a>
      </div>
    );
  }
  return (
    <div class="template-strip" role="group" aria-label={fr.story.templates}>
      {templates.value.map((t) => {
        const on = templateId.value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            class={`template-thumb${on ? ' template-thumb--on' : ''}`}
            aria-pressed={on}
            aria-label={t.name}
            title={t.name}
            onClick={() => void selectTemplate(t.id)}
          >
            <img src={t.thumbUrl} alt="" width={45} height={80} />
          </button>
        );
      })}
    </div>
  );
}

function ImageFileButton({ label }: { label: string }) {
  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await importNewsImage(file);
  }
  const busy = imageLoading.value;
  return (
    <label class={`btn file-button${busy ? ' is-busy' : ''}`}>
      <input type="file" accept="image/*" class="visually-hidden" onChange={onFile} disabled={busy} />
      {busy ? fr.story.imageLoading : label}
    </label>
  );
}

function ImagePanel() {
  const img = newsImage.value;
  const placement = scene.value.image;
  if (!img || !placement) return null;
  const fit = fitScale(img.width, img.height);
  const percent = Math.round((placement.scale / fit) * 100);
  const [min, max] = [IMAGE_SCALE_MIN * 100, IMAGE_SCALE_MAX * 100];
  return (
    <section class="card form" aria-label={fr.story.imageLabel}>
      <div class="field slider">
        <label for="image-scale">
          {fr.story.imageSize} <span class="slider__value">{percent}{'\u{A0}'}%</span>
        </label>
        <input
          id="image-scale"
          type="range"
          min={min}
          max={max}
          value={Math.min(max, Math.max(min, percent))}
          onInput={(e) => updateImage({ ...placement, scale: (fit * Number((e.currentTarget as HTMLInputElement).value)) / 100 })}
        />
      </div>
      <div class="row">
        <ImageFileButton label={fr.story.replaceImage} />
        <button type="button" class="btn btn--danger" onClick={removeNewsImage}>
          {fr.story.removeImage}
        </button>
      </div>
    </section>
  );
}

function ExportPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const result = exportResult.value;
  const current = exportIsCurrent.value;

  async function onShare() {
    if (!result) return;
    const outcome = await shareOrDownload(result.blob, result.fileName);
    setMessage(outcome === 'retry' ? fr.story.shareRetry : outcome === 'downloaded' ? fr.story.shareUnavailable : null);
  }

  function onCreate() {
    setMessage(null);
    void createExport();
  }

  return (
    <section class="card form export-panel" aria-label={fr.story.export}>
      {result && current ? (
        <div class="export-result">
          <img class="export-preview" src={result.url} alt={fr.story.exportPreviewAlt} />
          <div class="export-actions">
            <button type="button" class="btn btn--primary btn--block" onClick={onShare}>
              {fr.story.share}
            </button>
            <button type="button" class="btn btn--block" onClick={() => downloadBlob(result.blob, result.fileName)}>
              {fr.story.download}
            </button>
          </div>
        </div>
      ) : (
        <>
          {result && <p class="notice">{fr.story.exportStale}</p>}
          <button type="button" class="btn btn--primary btn--block" disabled={exporting.value} onClick={onCreate}>
            {exporting.value ? fr.story.exporting : fr.story.export}
          </button>
        </>
      )}
      {message && (
        <p class="notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

/** Bandeau sous l'aperçu : ce qui est sélectionné, et « Terminé » pour désélectionner. */
function SelectionBar() {
  const sel = selection.value;
  const zones = scene.value.zones;
  if (!sel) return <p class="hint selection-hint">{fr.story.hintSelect}</p>;
  const label =
    sel.kind === 'image' ? fr.story.selectedImage : fr.story.selectedZone(zones.findIndex((z) => z.id === sel.id) + 1);
  return (
    <div class="selection-bar" role="status">
      <strong>{label}</strong>
      <button type="button" class="btn" onClick={() => (selection.value = null)}>
        {fr.story.deselect}
      </button>
    </div>
  );
}

export function StoryEditor() {
  useEffect(() => {
    registerFonts();
    void preloadFonts();
    if (!templatesLoaded.value) void loadTemplates();
  }, []);

  function onReset() {
    if (window.confirm(fr.story.resetConfirm)) resetLayout();
  }

  const zone = selectedZone.value;
  const sel = selection.value;

  return (
    <div class="screen story-screen">
      <TemplatePicker />
      {storyError.value && (
        <p class="alert" role="alert">
          {storyError.value}
        </p>
      )}

      {/* L'aperçu reste visible en haut pendant qu'on fait défiler les réglages. */}
      <StoryCanvas />

      <div class="story-toolbar">
        {!newsImage.value && <ImageFileButton label={fr.story.importImage} />}
        <button type="button" class="btn" onClick={addZone}>
          {fr.story.addZone}
        </button>
        <button type="button" class="btn" onClick={onReset}>
          {fr.story.resetLayout}
        </button>
      </div>

      <ExportPanel />
      <SelectionBar />

      {zone ? <ZonePanel key={zone.id} zone={zone} /> : sel?.kind === 'image' ? <ImagePanel /> : null}
    </div>
  );
}
