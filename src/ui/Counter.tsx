import type { Count } from '../core/count';
import { fr } from './fr';

/** Compteur « 123 / 280 », rouge en cas de dépassement. */
export function Counter({ count, label }: { count: Count; label?: string }) {
  return (
    <span class={`counter${count.over ? ' counter--over' : ''}`} data-testid="counter">
      {label && <span class="counter__label">{fr.input.liveCounter(label)} </span>}
      <span aria-hidden="true">{fr.outputs.counter(count.length, count.max)}</span>
      <span class="visually-hidden">{fr.outputs.counterLabel(count.length, count.max)}</span>
    </span>
  );
}
