import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/defaults';

/** Points de code en hexadécimal, pour comparer caractère par caractère. */
const cps = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'));

const config = defaultConfig();

// Tableau du cahier des charges, recopié tel quel.
const SPEC: Array<[name: string, prefix: string, xHashtags: string]> = [
  ['Love Live', '【🌺Love Live🌺】', '#lovelive'],
  ["μ's", "【🌺µ's🌺】", '#lovelive #μʼs'],
  ['Aqours', '【🌅Aqours🌅】', '#lovelive #Aqours'],
  ['Genjitsu no Yohane', '【🐺Genjitsu no Yohane🐺】', '#lovelive #Aqours #yohane'],
  ['Nijigasaki', '【🌈NijiGaku🌈】', '#lovelive #虹ヶ咲'],
  ['Liella!', '【💫 Liella!💫 】', '#lovelive #Liella'],
  ['School Idol Musical', '【🎵School Idol Musical🎵】', '#lovelive #SIM #スクミュ'],
  ['Hasunosora', '【🪷Hasunosora🪷】', '#lovelive #蓮ノ空'],
  ['BLUEBIRD', '【🐦BLUEBIRD🐦】', '#lovelive #イキヅライブ #いきづらい部'],
];

describe('données initiales', () => {
  it('9 groupes dans l’ordre du cahier des charges', () => {
    expect(config.groups.map((g) => g.name)).toEqual(SPEC.map(([n]) => n));
  });

  it.each(SPEC)('%s : préfixe et hashtags identiques caractère par caractère', (name, prefix, x) => {
    const g = config.groups.find((gr) => gr.name === name)!;
    expect(cps(g.prefix)).toEqual(cps(prefix));
    expect(cps(g.xHashtags.join(' '))).toEqual(cps(x));
    // Réserve Insta initialisée avec les hashtags X.
    expect(g.instaHashtags).toEqual(g.xHashtags);
  });

  it('μ’s : signe micro dans le préfixe, μ grec et ʼ dans le nom et le hashtag', () => {
    const g = config.groups[1]!;
    expect(cps(g.prefix)).toEqual(['3010', '1F33A', '00B5', '0027', '0073', '1F33A', '3011']);
    expect(cps(g.name)).toEqual(['03BC', '0027', '0073']);
    expect(cps(g.xHashtags[1]!)).toEqual(['0023', '03BC', '02BC', '0073']);
  });

  it('Liella! : espaces ASCII après chaque 💫', () => {
    expect(cps(config.groups[5]!.prefix)).toEqual([
      '3010', '1F4AB', '0020', '004C', '0069', '0065', '006C', '006C', '0061', '0021', '1F4AB', '0020', '3011',
    ]);
  });

  it('aucun caractère invisible ou de variation dans les données', () => {
    for (const g of config.groups) {
      for (const s of [g.name, g.prefix, ...g.xHashtags]) {
        expect(s).not.toMatch(/[︎️​-‍⁠﻿]/u);
      }
    }
  });

  it('formulations de lien par défaut', () => {
    expect(config.linkMentions).toEqual({ bio: 'Lien en bio', story: 'Lien en story' });
  });

  it('identifiants uniques', () => {
    expect(new Set(config.groups.map((g) => g.id)).size).toBe(config.groups.length);
  });
});

describe('règle « jamais de normalisation Unicode »', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  }

  it('aucun appel à .normalize( dans src/', () => {
    const offenders = files(fileURLToPath(new URL('../src', import.meta.url)))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /\.normalize\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
