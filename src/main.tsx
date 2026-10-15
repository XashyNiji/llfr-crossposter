import { render } from 'preact';
import { initState } from './state/app';
import { App } from './ui/App';
import { registerServiceWorker } from './ui/UpdateBanner';
import './styles.css';

// On attend la lecture des réglages avant d'afficher l'app : une modification
// faite pendant le chargement ne peut donc pas être écrasée.
void initState().finally(() => render(<App />, document.getElementById('app')!));
void registerServiceWorker();
