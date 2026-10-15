import { describe, expect, it } from 'vitest';
import { countInstaCaption, countTweet } from '../src/core/count';

const w = (s: string) => countTweet(s).length;

describe('countTweet : poids des caractères (comptage officiel X)', () => {
  it.each([
    ['a', 1],
    ['é', 1],
    ['µ', 1], // µ signe micro
    ['μ', 1], // μ grec
    ['ʼ', 1], // ʼ apostrophe modificative
    ['’', 1], // ’
    ['«', 1],
    ['\n', 1],
    ['【', 2],
    ['】', 2],
    ['、', 2],
    ['。', 2],
    ['あ', 2],
    ['虹', 2],
    ['ヶ', 2],
    ['…', 2],
    ['€', 2],
    ['🌺', 2],
    ['🪷', 2],
    ['🐦', 2],
    ['🇫🇷', 2],
    ['1️⃣', 2],
    ['❤️', 2],
    ['👍🏽', 2],
    ['👨‍👩‍👧‍👦', 2],
    ['🫠', 2],
    ['🧑‍💻', 2], // Unicode 12 : correct grâce à twemoji-parser 14
    ['😮‍💨', 2], // Unicode 13.1
  ])('%s → %i', (s, n) => expect(w(s)).toBe(n));

  it.each([
    ['https://example.com', 23],
    ['https://www.lovelive-anime.jp/hasunosora/news/detail.php?p=1#x', 23],
    ['lovelive-anime.jp', 23],
    ['x.com/LoveLive_staff', 23],
  ])('lien %s → %i', (s, n) => expect(w(s)).toBe(n));

  it('limite connue : les emojis Unicode 15.1 comme 🐦‍🔥 sont surcomptés (5)', () => {
    // Si ce test casse, la bibliothèque a changé : vérifier le compteur de x.com.
    expect(w('🐦‍🔥')).toBe(5);
  });
});

describe('countTweet : données initiales', () => {
  it.each([
    ['【🌺Love Live🌺】', 17],
    ['【🌺µ\'s🌺】', 11],
    ['【🌅Aqours🌅】', 14],
    ['【🐺Genjitsu no Yohane🐺】', 26],
    ['【🌈NijiGaku🌈】', 16],
    ['【💫 Liella!💫 】', 17],
    ['【🎵School Idol Musical🎵】', 27],
    ['【🪷Hasunosora🪷】', 18],
    ['【🐦BLUEBIRD🐦】', 16],
    ['#lovelive', 9],
    ['#lovelive #μʼs', 14],
    ['#lovelive #虹ヶ咲', 17],
    ['#lovelive #SIM #スクミュ', 24],
    ['#lovelive #イキヅライブ #いきづらい部', 37],
  ])('%s → %i', (s, n) => expect(w(s)).toBe(n));

  it('tweet complet avec lien, japonais et emojis', () => {
    const t =
      '【🪷Hasunosora🪷】\n\nInfos : https://www.lovelive-anime.jp/hasunosora/news/ 「蓮ノ空」✨\n\n#lovelive #蓮ノ空';
    // préfixe 18 + \n\n 2 + "Infos : " 8 + lien 23 + espace 1 + 「蓮ノ空」 10 + ✨ 2 + \n\n 2 + hashtags 17
    expect(w(t)).toBe(18 + 2 + 8 + 23 + 1 + 10 + 2 + 2 + 17);
  });
});

describe('countTweet : limites', () => {
  it('280 caractères latins : OK ; 281 : dépassement', () => {
    expect(countTweet('a'.repeat(280))).toMatchObject({ length: 280, over: false, remaining: 0 });
    expect(countTweet('a'.repeat(281))).toMatchObject({ length: 281, over: true, remaining: -1, max: 280 });
  });

  it('140 kana = 280 ; 141 kana = dépassement', () => {
    expect(countTweet('あ'.repeat(140)).over).toBe(false);
    expect(countTweet('あ'.repeat(141))).toMatchObject({ length: 282, over: true });
  });

  it('texte vide : 0, pas de dépassement', () => {
    expect(countTweet('')).toMatchObject({ length: 0, over: false, remaining: 280 });
  });

  it('ne modifie jamais le texte compté', () => {
    const s = "é #μʼs µ's é";
    const copy = s.slice();
    countTweet(s);
    expect(s).toBe(copy);
  });
});

describe('countInstaCaption', () => {
  it('compte les unités UTF-16 (emoji = 2 ou plus, japonais = 1)', () => {
    expect(countInstaCaption('abc').length).toBe(3);
    expect(countInstaCaption('虹ヶ咲').length).toBe(3);
    expect(countInstaCaption('🌺').length).toBe(2);
    expect(countInstaCaption('👍🏽').length).toBe(4);
  });

  it('limite 2 200', () => {
    expect(countInstaCaption('a'.repeat(2200))).toMatchObject({ over: false, max: 2200 });
    expect(countInstaCaption('a'.repeat(2201))).toMatchObject({ over: true, remaining: -1 });
  });
});
