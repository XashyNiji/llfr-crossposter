// Éditeur de story (chargé à la demande avec ses polices japonaises).
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/700.css';
import { useEffect, useState } from 'preact/hooks';
import { fitScale } from '../../story/scene';
import { preloadFonts, registerFonts } from '../../story/fonts';
import {
  addZone,
  createExport,
  exporting,
  exportIsCurrent,
  exportResult,
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
import { shareOrDownload, downloadBlob } from './share';
import { StoryCanvas } from './StoryCanvas';
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
  return (
    <label class="btn file-button">
      <input type="file" accept="image/*" class="visually-hidden" onChange={onFile} />
      {label}
    </label>
  );
}

function ImagePanel() {
  const img = newsImage.value;
  const placement = scene.value.image;
  if (!img || !placement) return null;
  const fit = fitScale(img.width, img.height);
  const percent = Math.round((placement.scale / fit) * 100);
  return (
    <section class="card form" aria-label={fr.story.imageLabel}>
      <h3>{fr.story.imageLabel}</h3>
      <div class="field slider">
        <label for="image-scale">
          {fr.story.imageSize} <span class="slider__value">{percent}{'\u{A0}'}%</span>
        </label>
        <input
          id="image-scale"
          type="range"
          min={10}
          max={400}
          value={Math.min(400, Math.max(10, percent))}
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

  return (
    <section class="card form" aria-label={fr.story.export}>
      <button type="button" class="btn btn--primary btn--block" disabled={exporting.value} onClick={() => { setMessage(null); void createExport(); }}>
        {exporting.value ? fr.story.exporting : fr.story.export}
      </button>
      {result && !current && <p class="notice">{fr.story.exportStale}</p>}
      {result && current && (
        <>
          <img class="export-preview" src={result.url} alt={fr.story.exportPreviewAlt} />
          <div class="row">
            <button type="button" class="btn btn--primary" onClick={onShare}>
              {fr.story.share}
            </button>
            <button type="button" class="btn" onClick={() => downloadBlob(result.blob, result.fileName)}>
              {fr.story.download}
            </button>
          </div>
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

      {zone ? <ZonePanel key={zone.id} zone={zone} /> : sel?.kind === 'image' ? <ImagePanel /> : <p class="hint">{fr.story.hintSelect}</p>}

      <ExportPanel />
    </div>
  );
}
