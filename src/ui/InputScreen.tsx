import { INSTA_HASHTAGS_MAX, type LinkMentionKind } from '../core/model';
import {
  clearDraft,
  config,
  currentGroup,
  draft,
  hashtagLimitHit,
  instaCaption,
  instaCount,
  mainTextMissing,
  selectGroup,
  setLinkMention,
  toggleInstaHashtag,
  tweet1,
  tweet1Count,
  tweet2,
  tweet2Count,
  updateDraft,
} from '../state/app';
import { fr } from './fr';
import { OutputCard } from './OutputCard';

function textValue(e: Event): string {
  return (e.currentTarget as HTMLTextAreaElement).value;
}

export function InputScreen() {
  const d = draft.value;
  const group = currentGroup.value;
  const mentions = config.value.linkMentions;
  const linkOptions: { kind: LinkMentionKind; label: string }[] = [
    { kind: 'none', label: fr.input.linkNone },
    { kind: 'bio', label: mentions.bio },
    { kind: 'story', label: mentions.story },
  ];

  function onClear() {
    if (window.confirm(fr.input.clearConfirm)) clearDraft();
  }

  return (
    <div class="screen">
      <form class="card form" onSubmit={(e) => e.preventDefault()}>
        <div class="field">
          <label for="group">{fr.input.group}</label>
          {group ? (
            <select
              id="group"
              class="input"
              value={group.id}
              onChange={(e) => selectGroup((e.currentTarget as HTMLSelectElement).value)}
            >
              {config.value.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name || fr.settings.unnamed}
                </option>
              ))}
            </select>
          ) : (
            <p class="alert">{fr.input.noGroup}</p>
          )}
        </div>

        <div class="field">
          <label for="main-text">
            {fr.input.mainText} <span class="hint">({fr.input.required})</span>
          </label>
          <textarea
            id="main-text"
            class="input"
            rows={6}
            value={d.mainText}
            aria-invalid={mainTextMissing.value}
            onInput={(e) => updateDraft({ mainText: textValue(e) })}
          />
        </div>

        <div class="field">
          <label for="tweet2">
            {fr.input.tweet2} <span class="hint">({fr.input.tweet2Hint})</span>
          </label>
          <textarea
            id="tweet2"
            class="input"
            rows={3}
            value={d.tweet2}
            onInput={(e) => updateDraft({ tweet2: textValue(e) })}
          />
        </div>

        <div class="field">
          <label for="insta-extra">
            {fr.input.instaExtra} <span class="hint">({fr.input.instaExtraHint})</span>
          </label>
          <textarea
            id="insta-extra"
            class="input"
            rows={3}
            value={d.instaExtra}
            onInput={(e) => updateDraft({ instaExtra: textValue(e) })}
          />
        </div>

        <fieldset class="field">
          <legend>{fr.input.linkMention}</legend>
          <div class="segmented" role="radiogroup" aria-label={fr.input.linkMention}>
            {linkOptions.map((o) => (
              <button
                key={o.kind}
                type="button"
                role="radio"
                aria-checked={d.linkMention === o.kind}
                class={`chip${d.linkMention === o.kind ? ' chip--on' : ''}`}
                onClick={() => setLinkMention(o.kind)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {group && (
          <fieldset class="field">
            <legend>
              {fr.input.instaHashtags}{' '}
              <span class="hint">{fr.input.instaHashtagsHint(d.instaHashtags.length, INSTA_HASHTAGS_MAX)}</span>
            </legend>
            {group.instaHashtags.length === 0 ? (
              <p class="hint">{fr.input.instaHashtagsEmpty}</p>
            ) : (
              <div class="chips">
                {group.instaHashtags.map((tag, i) => {
                  const on = d.instaHashtags.includes(tag);
                  return (
                    <button
                      key={`${i}:${tag}`}
                      type="button"
                      aria-pressed={on}
                      class={`chip${on ? ' chip--on' : ''}`}
                      onClick={() => toggleInstaHashtag(tag)}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
            {hashtagLimitHit.value && (
              <p class="alert" role="alert">
                {fr.input.hashtagLimit(INSTA_HASHTAGS_MAX)}
              </p>
            )}
          </fieldset>
        )}

        <button type="button" class="btn btn--danger btn--block" onClick={onClear}>
          {fr.input.clearAll}
        </button>
      </form>

      {mainTextMissing.value && (
        <p class="notice" role="status">
          {fr.input.mainTextMissing}
        </p>
      )}

      <h2 class="section-title">{fr.outputs.xTitle}</h2>
      <OutputCard
        title={fr.outputs.tweet(1)}
        text={tweet1.value}
        count={tweet1Count.value}
        tooLong={fr.outputs.tweetTooLong}
      />
      {tweet2.value !== null && (
        <OutputCard
          title={fr.outputs.tweet(2)}
          text={tweet2.value}
          count={tweet2Count.value}
          tooLong={fr.outputs.tweetTooLong}
        />
      )}

      <h2 class="section-title">{fr.outputs.instaTitle}</h2>
      <OutputCard
        title={fr.outputs.caption}
        text={instaCaption.value}
        count={instaCount.value}
        tooLong={fr.outputs.captionTooLong}
      />
    </div>
  );
}
