// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../src/core/defaults';
import { config, draft, emptyDraft, hashtagLimitHit, setConfig } from '../src/state/app';
import { App } from '../src/ui/App';

function resetState() {
  config.value = defaultConfig();
  draft.value = emptyDraft(config.value.groups[0]!.id);
  hashtagLimitHit.value = false;
}

function go(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function stubConfirm(answer: boolean) {
  Object.defineProperty(window, 'confirm', { value: vi.fn(() => answer), configurable: true, writable: true });
}

const instaChip = (name: string) =>
  within(screen.getByRole('group', { name: /Hashtags Insta/ })).getByRole('button', { name });
const xChip = (name: string) => within(screen.getByRole('group', { name: /Hashtags X/ })).getByRole('button', { name });

const outputTexts = () => screen.queryAllByTestId('output-text').map((el) => el.textContent);

beforeEach(() => {
  resetState();
  go('#/');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('écran de saisie', () => {
  it('met à jour le tweet, la légende et les compteurs en direct', async () => {
    render(<App />);
    expect(screen.getByText('Le texte principal est obligatoire.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Groupe'), { target: { value: 'hasunosora' } });
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'Nouveau single ! 🎉' } });

    await waitFor(() =>
      expect(outputTexts()).toEqual([
        '【🪷Hasunosora🪷】\n\nNouveau single ! 🎉\n\n#lovelive #蓮ノ空',
        '【🪷Hasunosora🪷】\n\nNouveau single ! 🎉',
      ]),
    );
    // 18 + 2 + 19 (dont 🎉 = 2) + 2 + 17 = 58 ; affiché dans la sortie ET sous le champ
    const visible = (el: HTMLElement) => el.querySelector('[aria-hidden="true"]')!.textContent;
    const tweet = screen.getByRole('region', { name: 'Tweet 1' });
    expect(visible(tweet.querySelector('[data-testid="counter"]')!)).toBe('58 / 280');
    const live = screen.getByLabelText(/Texte principal/).parentElement!.querySelector('[data-testid="counter"]')!;
    expect(live.textContent).toContain('Tweet 1');
    expect(visible(live as HTMLElement)).toBe('58 / 280');
    expect(screen.queryByText('Le texte principal est obligatoire.')).toBeNull();
  });

  it('affiche le tweet 2 seulement s’il est rempli', async () => {
    render(<App />);
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'A' } });
    expect(screen.queryByRole('region', { name: 'Tweet 2' })).toBeNull();
    fireEvent.input(screen.getByLabelText(/Texte tweet 2/), { target: { value: 'Suite' } });
    await waitFor(() => expect(screen.getByRole('region', { name: 'Tweet 2' })).toBeTruthy());
    expect(outputTexts()[1]).toBe('Suite');
  });

  it('au-delà de 280 : compteur rouge, message, texte toujours copiable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App />);
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'あ'.repeat(140) } });

    const tweet = await screen.findByRole('region', { name: 'Tweet 1' });
    expect(tweet.querySelector('.counter--over')).not.toBeNull();
    expect(tweet.textContent).toContain('Trop long pour X');
    const copy = tweet.querySelector('button')!;
    expect(copy.disabled).toBe(false);
    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`【🌺Love Live🌺】\n\n${'あ'.repeat(140)}\n\n#lovelive`));
    await waitFor(() => expect(copy.textContent).toBe('Copié ✓'));
  });

  it('bloque le 6e hashtag Insta avec un message', async () => {
    await setConfig({
      ...config.value,
      groups: config.value.groups.map((g, i) =>
        i === 0 ? { ...g, instaHashtags: ['#a', '#b', '#c', '#d', '#e', '#f'] } : g,
      ),
    });
    render(<App />);
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'Texte' } });
    for (const t of ['#a', '#b', '#c', '#d', '#e']) fireEvent.click(instaChip(t));
    expect(screen.queryByText(/5 hashtags maximum/)).toBeNull();

    fireEvent.click(instaChip('#f'));
    await screen.findByText(/5 hashtags maximum/);
    expect(instaChip('#f').getAttribute('aria-pressed')).toBe('false');
    expect(outputTexts().at(-1)).toBe('【🌺Love Live🌺】\n\nTexte\n\n#a #b #c #d #e');

    // Décocher libère une place et efface le message.
    fireEvent.click(instaChip('#b'));
    fireEvent.click(instaChip('#f'));
    await waitFor(() => expect(screen.queryByText(/5 hashtags maximum/)).toBeNull());
    expect(outputTexts().at(-1)).toBe('【🌺Love Live🌺】\n\nTexte\n\n#a #c #d #e #f');
  });

  it('changer de groupe décoche les hashtags', async () => {
    render(<App />);
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'T' } });
    fireEvent.click(instaChip('#lovelive'));
    expect(draft.value.instaHashtags).toEqual(['#lovelive']);
    fireEvent.change(screen.getByLabelText('Groupe'), { target: { value: 'aqours' } });
    expect(draft.value.instaHashtags).toEqual([]);
  });

  it('mention du lien dans la légende', async () => {
    render(<App />);
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'T' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Lien en story' }));
    await waitFor(() => expect(outputTexts().at(-1)).toBe('【🌺Love Live🌺】\n\nT\n\nLien en story'));
  });

  it('« Tout effacer » vide la saisie après confirmation et garde le groupe', async () => {
    stubConfirm(true);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Groupe'), { target: { value: 'aqours' } });
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'Texte' } });
    fireEvent.input(screen.getByLabelText(/Complément Insta/), { target: { value: 'Plus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tout effacer' }));
    expect(draft.value).toEqual(emptyDraft('aqours'));
    await waitFor(() =>
      expect((screen.getByLabelText(/Texte principal/) as HTMLTextAreaElement).value).toBe(''),
    );
  });
});

describe('réglages', () => {
  it('réordonne les groupes avec ↑ / ↓', async () => {
    go('#/reglages');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: "Monter μ's" }));
    expect(config.value.groups.slice(0, 2).map((g) => g.name)).toEqual(["μ's", 'Love Live']);
    fireEvent.click(screen.getByRole('button', { name: "Descendre μ's" }));
    expect(config.value.groups.slice(0, 2).map((g) => g.name)).toEqual(['Love Live', "μ's"]);
  });

  it('modifie un groupe en conservant les caractères exacts', async () => {
    go('#/reglages');
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[1]!);
    const insta = await screen.findByLabelText('Réserve de hashtags Insta');
    fireEvent.input(insta, { target: { value: '#lovelive\n#μʼs #μs　#ラブライブ\nlovelive' } });
    expect(screen.getByText('Sans « # » : lovelive')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() =>
      expect(config.value.groups[1]!.instaHashtags).toEqual(['#lovelive', '#μʼs', '#μs', '#ラブライブ', 'lovelive']),
    );
    expect(config.value.groups[1]!.prefix).toBe('【🌺µ\'s🌺】');
  });

  it('ajoute et supprime un groupe', async () => {
    stubConfirm(true);
    go('#/reglages');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un groupe' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Le nom est obligatoire.')).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Nom'), { target: { value: 'Yohane the Parhelion' } });
    fireEvent.input(screen.getByLabelText('Préfixe'), { target: { value: '【🐺Yohane🐺】' } });
    fireEvent.input(screen.getByLabelText('Hashtags X'), { target: { value: '#lovelive #yohane' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(config.value.groups).toHaveLength(10));
    expect(config.value.groups[9]).toMatchObject({ name: 'Yohane the Parhelion', prefix: '【🐺Yohane🐺】', xHashtags: ['#lovelive', '#yohane'] });

    const deleteButtons = await screen.findAllByRole('button', { name: 'Supprimer' });
    fireEvent.click(deleteButtons[9]!);
    await waitFor(() => expect(config.value.groups).toHaveLength(9));
  });

  it('modifie les formulations de lien', async () => {
    go('#/reglages');
    render(<App />);
    fireEvent.input(screen.getByLabelText('Formulation « lien en bio »'), { target: { value: '🔗 Lien en bio' } });
    expect(config.value.linkMentions.bio).toBe('🔗 Lien en bio');
  });
});

describe('hashtags X', () => {
  it('décocher puis ajouter des hashtags personnalisés met à jour le tweet et le compteur', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Groupe'), { target: { value: 'aqours' } });
    fireEvent.input(screen.getByLabelText(/Texte principal/), { target: { value: 'Texte' } });
    await waitFor(() => expect(outputTexts()[0]).toBe('【🌅Aqours🌅】\n\nTexte\n\n#lovelive #Aqours'));

    fireEvent.click(xChip('#lovelive'));
    fireEvent.click(xChip('#Aqours'));
    expect(xChip('#Aqours').getAttribute('aria-pressed')).toBe('false');
    await waitFor(() => expect(outputTexts()[0]).toBe('【🌅Aqours🌅】\n\nTexte'));

    fireEvent.input(screen.getByLabelText(/Autres hashtags X/), { target: { value: '#Aqours_10th lovelive' } });
    await waitFor(() => expect(outputTexts()[0]).toBe('【🌅Aqours🌅】\n\nTexte\n\n#Aqours_10th lovelive'));
    expect(screen.getByText(/^Sans .*: lovelive$/)).toBeTruthy();

    // La légende Insta ne bouge pas.
    expect(outputTexts().at(-1)).toBe('【🌅Aqours🌅】\n\nTexte');
  });

  it('changer de groupe recoche tous les hashtags X et garde les personnalisés', async () => {
    render(<App />);
    fireEvent.click(xChip('#lovelive'));
    fireEvent.input(screen.getByLabelText(/Autres hashtags X/), { target: { value: '#perso' } });
    fireEvent.change(screen.getByLabelText('Groupe'), { target: { value: 'aqours' } });
    expect(draft.value.xHashtagsOff).toEqual([]);
    expect(draft.value.xHashtagsCustom).toBe('#perso');
  });
});

describe('cas limites de l’affichage', () => {
  it('formulation de lien vide : puce avec un libellé de secours', async () => {
    config.value = { ...config.value, linkMentions: { bio: '', story: 'Lien en story' } };
    render(<App />);
    expect(screen.getByRole('radio', { name: 'Lien en bio (formulation vide)' })).toBeTruthy();
  });

  it('réserve avec doublons : chaque hashtag n’apparaît qu’une fois', async () => {
    config.value = {
      ...config.value,
      groups: config.value.groups.map((g, i) => (i === 0 ? { ...g, instaHashtags: ['#a', '#b', '#a'] } : g)),
    };
    render(<App />);
    expect(screen.getAllByRole('button', { name: '#a' })).toHaveLength(1);
  });
});
