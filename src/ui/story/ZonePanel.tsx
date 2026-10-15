import { STORY_FONTS } from '../../story/fonts';
import { SIZE_MAX, SIZE_MIN, STORY_H, STORY_W, ZONE_MIN_H, ZONE_MIN_W, type Align, type BgMode, type TextZone } from '../../story/scene';
import { deleteZone, overflowZones, relinkZone, scene, setZoneText, updateZone, zoneText } from '../../state/story';
import { fr } from '../fr';

const NBSP = '\u{A0}';
const TEXT_SWATCHES = ['#ffffff', '#000000', '#e4007f', '#ffd400', '#00b7ff', '#ff6b35'];
const BG_SWATCHES = ['#000000', '#ffffff', '#e4007f', '#ffd400', '#1d1a1c', '#00b7ff'];

function num(e: Event): number {
  return Number((e.currentTarget as HTMLInputElement).value);
}

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onInput: (v: number) => void;
}

function Slider({ id, label, value, min, max, step = 1, display, onInput }: SliderProps) {
  return (
    <div class="field slider">
      <label for={id}>
        {label} <span class="slider__value">{display ?? Math.round(value)}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onInput={(e) => onInput(num(e))} />
    </div>
  );
}

function ColorPicker({ id, label, value, swatches, onPick }: { id: string; label: string; value: string; swatches: string[]; onPick: (c: string) => void }) {
  return (
    <fieldset class="field">
      <legend>{label}</legend>
      <div class="swatches">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            class={`swatch${value.toLowerCase() === c ? ' swatch--on' : ''}`}
            style={{ background: c }}
            aria-label={c}
            aria-pressed={value.toLowerCase() === c}
            onClick={() => onPick(c)}
          />
        ))}
        <input id={id} class="swatch swatch--custom" type="color" value={value} aria-label={label} onInput={(e) => onPick((e.currentTarget as HTMLInputElement).value)} />
      </div>
    </fieldset>
  );
}

function Segmented<T extends string>({ label, value, options, onPick }: { label: string; value: T; options: { value: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <fieldset class="field">
      <legend>{label}</legend>
      <div class="chips">
        {options.map((o) => (
          <button key={o.value} type="button" class={`chip${value === o.value ? ' chip--on' : ''}`} aria-pressed={value === o.value} onClick={() => onPick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Réglages de la zone de texte sélectionnée. */
export function ZonePanel({ zone }: { zone: TextZone }) {
  const index = scene.value.zones.findIndex((z) => z.id === zone.id);
  const set = (patch: Partial<TextZone>) => updateZone(zone.id, patch);
  const overflow = overflowZones.value.has(zone.id);
  const id = (f: string) => `${zone.id}-${f}`;

  function onDelete() {
    if (window.confirm(fr.story.deleteZoneConfirm)) deleteZone(zone.id);
  }

  return (
    <section class="card form zone-panel" aria-label={fr.story.zoneTitle(index + 1)}>
      {overflow && (
        <p class="alert" role="status">
          {fr.story.overflowHelp}
        </p>
      )}

      <details class="panel-section" open>
        <summary>{fr.story.sectionText}</summary>
      <div class="field">
        <label for={id('text')} class="visually-hidden">
          {fr.story.zoneText}
        </label>
        <textarea
          id={id('text')}
          class="input"
          rows={4}
          placeholder={fr.story.zonePlaceholder}
          value={zoneText(zone)}
          onInput={(e) => setZoneText(zone.id, (e.currentTarget as HTMLTextAreaElement).value)}
        />
        {zone.linked ? (
          <p class="hint">{fr.story.zoneLinked}</p>
        ) : (
          index === 0 && (
            <button type="button" class="btn" onClick={() => relinkZone(zone.id)}>
              {fr.story.zoneRelink}
            </button>
          )
        )}
      </div>
      </details>

      <details class="panel-section" open>
        <summary>{fr.story.sectionFont}</summary>
      <fieldset class="field">
        <legend>{fr.story.font}</legend>
        <div class="font-grid">
          {STORY_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              class={`chip font-chip${zone.font === f.id ? ' chip--on' : ''}`}
              style={{ fontFamily: `"${f.family}", "Inter", "Noto Sans JP", sans-serif`, fontWeight: f.weight }}
              aria-pressed={zone.font === f.id}
              onClick={() => set({ font: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <Slider id={id('size')} label={fr.story.size} value={zone.size} min={SIZE_MIN} max={SIZE_MAX} display={`${zone.size}${NBSP}px`} onInput={(v) => set({ size: v })} />
      <Slider id={id('lh')} label={fr.story.lineHeight} value={zone.lineHeight} min={0.8} max={2.5} step={0.05} display={zone.lineHeight.toFixed(2)} onInput={(v) => set({ lineHeight: v })} />
      </details>

      <details class="panel-section">
        <summary>{fr.story.sectionColor}</summary>
      <ColorPicker id={id('color')} label={fr.story.color} value={zone.color} swatches={TEXT_SWATCHES} onPick={(c) => set({ color: c })} />

      <Segmented<Align>
        label={fr.story.align}
        value={zone.align}
        options={[
          { value: 'left', label: fr.story.alignLeft },
          { value: 'center', label: fr.story.alignCenter },
          { value: 'right', label: fr.story.alignRight },
        ]}
        onPick={(v) => set({ align: v })}
      />
      </details>

      <details class="panel-section">
        <summary>{fr.story.sectionSize}</summary>
      {/* La zone reste dans la story : largeur et hauteur limitées par sa position. */}
      <Slider id={id('w')} label={fr.story.width} value={zone.w} min={ZONE_MIN_W} max={Math.max(ZONE_MIN_W, STORY_W - zone.x)} display={`${Math.round(zone.w)}${NBSP}px`} onInput={(v) => set({ w: v })} />
      <Slider id={id('h')} label={fr.story.height} value={zone.h} min={ZONE_MIN_H} max={Math.max(ZONE_MIN_H, STORY_H - zone.y)} display={`${Math.round(zone.h)}${NBSP}px`} onInput={(v) => set({ h: v })} />
      </details>

      <details class="panel-section" open={zone.bgMode !== 'none'}>
        <summary>{fr.story.sectionBackground}</summary>
      <Segmented<BgMode>
        label={fr.story.background}
        value={zone.bgMode}
        options={[
          { value: 'none', label: fr.story.bgNone },
          { value: 'block', label: fr.story.bgBlock },
          { value: 'lines', label: fr.story.bgLines },
        ]}
        onPick={(v) => set({ bgMode: v })}
      />

      {zone.bgMode !== 'none' && (
        <>
          <ColorPicker id={id('bg')} label={fr.story.bgColor} value={zone.bgColor} swatches={BG_SWATCHES} onPick={(c) => set({ bgColor: c })} />
          <Slider id={id('op')} label={fr.story.bgOpacity} value={Math.round(zone.bgOpacity * 100)} min={0} max={100} display={`${Math.round(zone.bgOpacity * 100)}${NBSP}%`} onInput={(v) => set({ bgOpacity: v / 100 })} />
          <Slider id={id('radius')} label={fr.story.bgRadius} value={zone.bgRadius} min={0} max={120} display={`${zone.bgRadius}${NBSP}px`} onInput={(v) => set({ bgRadius: v })} />
          <Slider id={id('pad')} label={fr.story.bgPadding} value={zone.bgPadding} min={0} max={120} display={`${zone.bgPadding}${NBSP}px`} onInput={(v) => set({ bgPadding: v })} />
        </>
      )}
      </details>

      <button type="button" class="btn btn--danger btn--block" onClick={onDelete}>
        {fr.story.deleteZone}
      </button>
    </section>
  );
}
