// Builds the static site into dist/.
//
//   node src/build.mjs [--limit N]
//
// Which titles get a page: every title with a folder under titles/, plus the
// most popular titles TSDB has pages for (TMDB's daily popularity export,
// intersected with TSDB's sitemap feed), up to TITLE_LIMIT. Each title costs one
// TMDB request (details + watch/providers + external ids). The build fails if
// more than 1% of those requests fail, rather than publishing a site with holes.
import { mkdir, readFile, writeFile, readdir, cp, rm, stat } from 'node:fs/promises';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactProviders, folderId, imdbOf, titlePath, TYPES } from './lib.mjs';
import { embedPage, indexPage, notFoundPage, sitemap, sitemapIndex, titleData, titlePage } from './render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const CACHE = join(ROOT, '.cache');
const args = process.argv.slice(2);
const argLimit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 0;

const config = JSON.parse(await readFile(join(ROOT, 'site.config.json'), 'utf8'));
const KEY = process.env.TMDB_API_KEY || (await readFile(join(ROOT, '.env'), 'utf8').catch(() => ''))
  .match(/^TMDB_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) throw new Error('TMDB_API_KEY is not set (environment or .env)');

const siteUrl = (process.env.SITE_URL || config.url).replace(/\/?$/, '/');
const site = {
  name: config.name,
  url: siteUrl,
  base: new URL(siteUrl).pathname,
  repo: config.repo,
};
const LIMIT = argLimit || Number(process.env.TITLE_LIMIT) || config.titleLimit;
const CACHE_HOURS = Number(process.env.CACHE_HOURS ?? 20);

/* ---------- helpers ---------- */

async function getJson(url, tries = 4) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    if (i >= tries - 1 || (r.status < 500 && r.status !== 429)) throw new Error(`${r.status} ${url.replace(KEY, '***')}`);
    await new Promise((res) => setTimeout(res, 500 * 2 ** i + (Number(r.headers.get('retry-after')) || 0) * 1000));
  }
}

/** Runs fn over items with `n` in flight and at most `rps` starts a second. */
async function pool(items, n, rps, fn) {
  let next = 0, started = 0;
  const t0 = Date.now();
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      const wait = t0 + (started++ / rps) * 1000 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: n }, worker));
}

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

/* ---------- which titles ---------- */

async function tsdbTitles() {
  const out = new Map();
  for (const type of TYPES) {
    const j = await getJson(`https://api.thesubtitledb.org/app/sitemap/titles?type=${type}`);
    if (!j || !Array.isArray(j.rows)) throw new Error(`TSDB sitemap for ${type} returned nothing`);
    const col = Object.fromEntries(j.columns.map((c, i) => [c, i]));
    for (const r of j.rows) {
      const tmdb = r[col.tmdb];
      if (tmdb) out.set(`${type}:${tmdb}`, { type, tmdb, imdb: imdbOf(r[col.imdb]) });
    }
  }
  return out;
}

/** TMDB's daily id export, newest available: id -> popularity. */
async function popularity(type) {
  const name = type === 'movie' ? 'movie_ids' : 'tv_series_ids';
  for (let back = 1; back <= 3; back++) {
    const d = new Date(Date.now() - back * 86400e3);
    const stamp = `${String(d.getUTCMonth() + 1).padStart(2, '0')}_${String(d.getUTCDate()).padStart(2, '0')}_${d.getUTCFullYear()}`;
    const r = await fetch(`https://files.tmdb.org/p/exports/${name}_${stamp}.json.gz`);
    if (!r.ok) continue;
    const pop = new Map();
    const lines = createInterface({ input: Readable.fromWeb(r.body).pipe(createGunzip()), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line) continue;
      const j = JSON.parse(line);
      if (!j.adult) pop.set(j.id, j.popularity || 0);
    }
    return pop;
  }
  throw new Error(`no TMDB ${name} export in the last three days`);
}

async function communityLinks() {
  const out = new Map();
  for (const type of TYPES) {
    const dir = join(ROOT, 'titles', type);
    if (!(await exists(dir))) continue;
    for (const folder of await readdir(dir)) {
      const id = folderId(folder);
      const f = join(dir, folder, 'links.json');
      if (!id || !(await exists(f))) continue;
      out.set(`${type}:${id}`, JSON.parse(await readFile(f, 'utf8')).links || []);
    }
  }
  return out;
}

/* ---------- TMDB ---------- */

async function details(type, tmdb) {
  const f = join(CACHE, 'tmdb', `${type}-${tmdb}.json`);
  try {
    const s = await stat(f);
    if (Date.now() - s.mtimeMs < CACHE_HOURS * 3600e3) return JSON.parse(await readFile(f, 'utf8'));
  } catch {}
  const j = await getJson(`https://api.themoviedb.org/3/${type}/${tmdb}?append_to_response=watch/providers,external_ids&api_key=${KEY}`);
  await mkdir(dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(j));
  return j;
}

/* ---------- build ---------- */

const t0 = Date.now();
const [known, links] = await Promise.all([tsdbTitles(), communityLinks()]);
const pops = Object.fromEntries(await Promise.all(TYPES.map(async (t) => [t, await popularity(t)])));
const ranked = [...known.values()]
  .map((t) => ({ ...t, pop: pops[t.type].get(t.tmdb) ?? -1 }))
  .filter((t) => t.pop >= 0)
  .sort((a, b) => b.pop - a.pop);
const chosen = new Map(ranked.slice(0, LIMIT).map((t) => [`${t.type}:${t.tmdb}`, t]));
for (const key of links.keys()) {
  if (!chosen.has(key)) {
    const [type, tmdb] = key.split(':');
    chosen.set(key, { type, tmdb: Number(tmdb), imdb: '', pop: 0 });
  }
}
console.log(`titles: ${known.size} on TSDB, ${chosen.size} chosen (limit ${LIMIT}, ${links.size} with links)`);

const catalog = {};
const titles = [];
let failed = 0;
await pool([...chosen.values()], 16, 35, async (c) => {
  try {
    const d = await details(c.type, c.tmdb);
    if (!d) { failed++; return; }
    const name = d.title || d.name || '';
    const date = d.release_date || d.first_air_date || '';
    titles.push({
      type: c.type, tmdb: c.tmdb, pop: c.pop,
      imdb: d.external_ids?.imdb_id || d.imdb_id || c.imdb || '',
      name, year: date ? Number(date.slice(0, 4)) : null,
      poster: d.poster_path || '',
      overview: (d.overview || '').slice(0, 600),
      c: compactProviders(d['watch/providers']?.results, catalog),
      links: links.get(`${c.type}:${c.tmdb}`) || [],
    });
  } catch (e) {
    failed++;
    if (failed <= 5) console.error(String(e.message || e));
  }
});
if (failed > Math.max(2, chosen.size * 0.01)) {
  throw new Error(`${failed} of ${chosen.size} TMDB lookups failed; not publishing a partial site`);
}
titles.forEach((t) => { t.catalog = catalog; });
titles.sort((a, b) => b.pop - a.pop);
console.log(`fetched ${titles.length} titles (${failed} failed) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(join(ROOT, 'site'), DIST, { recursive: true });

const paths = [];
for (const t of titles) {
  if (!t.name) continue;
  const p = titlePath(t.type, t.tmdb, t.name);
  await mkdir(join(DIST, p), { recursive: true });
  await writeFile(join(DIST, p, 'index.html'), titlePage(t, site));
  await mkdir(join(DIST, 'data', t.type), { recursive: true });
  await writeFile(join(DIST, 'data', t.type, `${t.tmdb}.json`), JSON.stringify(titleData(t, site)));
  if (t.imdb) {
    await mkdir(join(DIST, 'data', 'imdb'), { recursive: true });
    await writeFile(join(DIST, 'data', 'imdb', `${t.imdb}.json`), JSON.stringify({ type: t.type, tmdb: t.tmdb }));
  }
  paths.push(p);
}

await writeFile(join(DIST, 'index.html'), indexPage(site, titles.filter((t) => t.name).slice(0, 48)));
await writeFile(join(DIST, '404.html'), notFoundPage(site));
await mkdir(join(DIST, 'embed'), { recursive: true });
await writeFile(join(DIST, 'embed', 'index.html'), embedPage(site));
await writeFile(join(DIST, 'assets', 'site.json'), JSON.stringify({ base: site.base, name: site.name }));

const SIZE = 45000;
const maps = [];
for (let i = 0; i * SIZE < paths.length || i === 0; i++) {
  const name = `sitemap-${i + 1}.xml`;
  await writeFile(join(DIST, name), sitemap(site, ['', ...paths.slice(i * SIZE, (i + 1) * SIZE)].filter((p, j) => i === 0 || j > 0)));
  maps.push(name);
}
await writeFile(join(DIST, 'sitemap.xml'), sitemapIndex(site, maps));
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: ${site.base}embed/\nSitemap: ${site.url}sitemap.xml\n`);
await writeFile(join(DIST, '.nojekyll'), '');
console.log(`wrote ${paths.length} title pages to dist/ in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
