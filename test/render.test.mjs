import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedPage, indexPage, titlePage } from '../src/render.mjs';

const site = { name: 'Where to Stream', url: 'https://example.github.io/watch/', base: '/watch/', repo: 'https://github.com/o/r' };
const title = {
  type: 'movie', tmdb: 603, imdb: 'tt0133093', name: 'The Matrix', year: 1999, poster: '/p.jpg',
  overview: 'A hacker </script><script>alert(1)</script> learns the truth.',
  c: { GB: { link: 'https://www.themoviedb.org/movie/603/watch?locale=GB', flatrate: [8] } },
  catalog: { 8: ['Netflix', '/n.jpg'] },
  links: [{ service: 'Max', url: 'https://www.max.com/m', country: 'US', kind: 'flatrate', note: '<b>4K</b>' }],
};

test('title page is indexable and links back to TSDB', () => {
  const html = titlePage(title, site);
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.github\.io\/watch\/movie\/603-the-matrix\/">/);
  assert.match(html, /"@type":"Movie"/);
  assert.match(html, /https:\/\/www\.imdb\.com\/title\/tt0133093\//);
  assert.match(html, /href="https:\/\/thesubtitledb\.org\/movie\/603-the-matrix"/);
  assert.match(html, /Netflix/);
  assert.match(html, /not endorsed or certified by TMDB/);
  assert.match(html, /JustWatch/);
  assert.doesNotMatch(html, /<meta name="robots"/);
});

test('untrusted text cannot break out of the page', () => {
  const html = titlePage(title, site);
  assert.equal(html.match(/<script>alert/g), null);
  assert.doesNotMatch(html, /<b>4K<\/b>/);
  assert.match(html, /rel="nofollow ugc noopener"/);
});

test('index and embed', () => {
  assert.match(indexPage(site, [title]), /href="\/watch\/movie\/603-the-matrix\/"/);
  const e = embedPage(site);
  assert.match(e, /<meta name="robots" content="noindex">/);
  assert.match(e, /\/watch\/assets\/embed\.js/);
});
