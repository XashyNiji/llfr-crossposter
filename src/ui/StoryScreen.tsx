import { fr } from './fr';

export function StoryScreen() {
  return (
    <div class="screen">
      <section class="card">
        <h2>{fr.story.title}</h2>
        <p>{fr.story.comingSoon}</p>
      </section>
    </div>
  );
}
