import { render } from 'preact';
import { initState } from './state/app';
import { App } from './ui/App';
import './styles.css';

void initState();
render(<App />, document.getElementById('app')!);
