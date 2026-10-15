import { useEffect, useRef, useState } from 'preact/hooks';
import type { Count } from '../core/count';
import { copyText } from './clipboard';
import { fr } from './fr';

interface Props {
  title: string;
  text: string;
  count: Count;
  tooLong: (excess: number) => string;
}

/** Une sortie (tweet ou légende) avec son compteur et son bouton Copier. */
export function OutputCard({ title, text, count, tooLong }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const empty = text.length === 0;

  async function onCopy() {
    const ok = await copyText(text);
    setStatus(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <section class={`output${count.over ? ' output--over' : ''}`} aria-label={title}>
      <header class="output__header">
        <h3>{title}</h3>
        <span class={`counter${count.over ? ' counter--over' : ''}`} data-testid="counter">
          {fr.outputs.counter(count.length, count.max)}
        </span>
      </header>
      {empty ? (
        <p class="output__placeholder">{fr.outputs.empty}</p>
      ) : (
        <pre class="output__text" data-testid="output-text">
          {text}
        </pre>
      )}
      {count.over && (
        <p class="alert" role="alert">
          {tooLong(-count.remaining)}
        </p>
      )}
      <button type="button" class="btn btn--primary btn--block" onClick={onCopy} disabled={empty}>
        {status === 'copied' ? fr.outputs.copied : status === 'failed' ? fr.outputs.copyFailed : fr.outputs.copy}
      </button>
    </section>
  );
}
