// HTML for every page the build writes. Plain template strings: the pages are
// static, readable without JavaScript, and what a crawler indexes is exactly
// what a visitor sees first.
import { KINDS, byProvider, countryName, esc, titlePath, tsdbUrl } from './lib.mjs';

const IMG = 'https://image.tmdb.org/t/p';

export function head(site, { title, desc, path, image, noindex, extra = '' }) {
  const canonical = site.url + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n` : ''}<link rel="stylesheet" href="${site.base}assets/style.css">
<link rel="icon" href="${site.base}assets/icon.svg" type="image/svg+xml">
${extra}</head>`;
}

const bar = (site) => `<header class="bar"><div class="wrap bar-in">
  <a class="brand" href="${site.base}"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 8.2v7.6l6-3.8z" fill="currentColor"/></svg>${esc(site.name)}</a>
  <form class="find" action="${site.base}" method="get" role="search">
    <label class="sr" for="q">IMDb or TMDB id</label>
    <input id="q" name="q" placeholder="IMDb or TMDB id, e.g. tt0903747" autocomplete="off" spellcheck="false">
  </form>
</div></header>`;

const foot = (site) => `<footer class="foot"><div class="wrap">
  <p>Streaming availability from <a href="https://www.justwatch.com" rel="nofollow">JustWatch</a>, via TMDB. Community links are submitted on <a href="${esc(site.repo)}">GitHub</a> and checked against a list of licensed services.</p>
  <p>This product uses the TMDB API but is not endorsed or certified by TMDB. Subtitles by <a href="https://thesubtitledb.org">TSDB</a>.</p>
</div></footer>`;

export const providerLogo = (logo, name) => logo
  ? `<img src="${IMG}/w92${esc(logo)}" width="40" height="40" alt="" loading="lazy">`
  : `<span class="nologo" aria-hidden="true">${esc(String(name).slice(0, 1))}</span>`;

const KIND_LABEL = Object.fromEntries(KINDS);

/** The per-title data both the page script and the embed read. */
export function titleData(t, site) {
  const p = {};
  for (const row of Object.values(t.c)) {
    for (const [k] of KINDS) for (const id of row[k] || []) p[id] = t.catalog[id];
  }
  return {
    t: t.name, y: t.year, type: t.type, tmdb: t.tmdb, imdb: t.imdb,
    path: titlePath(t.type, t.tmdb, t.name), poster: t.poster || '',
    c: t.c, p, links: t.links,
  };
}

export function titlePage(t, site) {
  const path = titlePath(t.type, t.tmdb, t.name);
  const data = titleData(t, site);
  const kindName = t.type === 'tv' ? 'TV series' : 'Film';
  const grouped = byProvider(t.c);
  const nCountries = Object.keys(t.c).length;
  const top = (grouped.flatrate || grouped.free || grouped.ads || grouped.rent || grouped.buy || [])
    .slice(0, 3).map((e) => t.catalog[e.id][0]);
  const desc = nCountries
    ? `Where to watch ${t.name}${t.year ? ` (${t.year})` : ''} legally: ${top.join(', ')} and more, in ${nCountries} ${nCountries === 1 ? 'country' : 'countries'}.`
    : `Where to watch ${t.name}${t.year ? ` (${t.year})` : ''} legally, with links from the community.`;
  const poster = t.poster ? `${IMG}/w342${t.poster}` : '';
  const ld = {
    '@context': 'https://schema.org',
    '@type': t.type === 'tv' ? 'TVSeries' : 'Movie',
    name: t.name,
    ...(t.year ? { datePublished: String(t.year) } : {}),
    ...(poster ? { image: poster } : {}),
    url: site.url + path,
    sameAs: [
      ...(t.imdb ? [`https://www.imdb.com/title/${t.imdb}/`] : []),
      `https://www.themoviedb.org/${t.type}/${t.tmdb}`,
    ],
  };
  const sections = KINDS.filter(([k]) => grouped[k]).map(([k, label]) => `
    <section class="kind">
      <h3>${esc(label)}</h3>
      <ul class="plist">${grouped[k].map((e) => {
        const [name, logo] = t.catalog[e.id];
        const names = e.countries.map(countryName).sort((a, b) => a.localeCompare(b));
        return `<li>${providerLogo(logo, name)}<div><b>${esc(name)}</b>
          <details><summary>${e.countries.length === 1 ? esc(names[0]) : `${e.countries.length} countries`}</summary><p>${esc(names.join(', '))}</p></details></div></li>`;
      }).join('')}</ul>
    </section>`).join('');
  const links = t.links.length
    ? `<ul class="clist">${t.links.map((l) => `<li>
        <a href="${esc(l.url)}" rel="nofollow ugc noopener" target="_blank"><b>${esc(l.service)}</b><span>${esc(KIND_LABEL[l.kind])} in ${esc(countryName(l.country))}${l.note ? ` &middot; ${esc(l.note)}` : ''}</span></a></li>`).join('')}</ul>`
    : `<p class="empty">No links yet.</p>`;
  const add = `${site.repo}/issues/new?template=add-link.yml&title=${encodeURIComponent(`Link: ${t.name} (${t.type} ${t.tmdb})`)}&title_id=${t.tmdb}&type=${t.type}`;
  return `${head(site, {
    title: `Where to watch ${t.name}${t.year ? ` (${t.year})` : ''}`, desc, path, image: poster,
    extra: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`,
  })}
<body>
${bar(site)}
<main class="wrap">
  <section class="hero">
    ${poster ? `<img class="poster" src="${esc(poster)}" width="228" height="342" alt="${esc(t.name)} poster">` : '<div class="poster none" aria-hidden="true"></div>'}
    <div class="hero-txt">
      <h1>${esc(t.name)}${t.year ? ` <span>${t.year}</span>` : ''}</h1>
      <p class="meta">${kindName}${t.imdb ? ` &middot; IMDb <a href="https://www.imdb.com/title/${t.imdb}/" rel="nofollow">${t.imdb}</a>` : ''} &middot; TMDB <a href="https://www.themoviedb.org/${t.type}/${t.tmdb}" rel="nofollow">${t.tmdb}</a></p>
      ${t.overview ? `<p class="ov">${esc(t.overview)}</p>` : ''}
      <p><a class="tsdb" href="${esc(tsdbUrl(t.type, t.tmdb, t.name))}">Subtitles for ${esc(t.name)} on TSDB</a></p>
    </div>
  </section>

  <section class="here" id="here" hidden>
    <div class="here-hd"><h2>Watch in <label class="sr" for="cc">Country</label><select id="cc"></select></h2>
      <a id="jw" class="jw" rel="nofollow" target="_blank">All offers on JustWatch</a></div>
    <div id="here-list"></div>
  </section>

  <section class="block">
    <h2>Links from the community</h2>
    ${links}
    <p><a class="add" href="${esc(add)}">Add a link</a></p>
  </section>

  <section class="block">
    <h2>Where it streams worldwide</h2>
    ${sections || '<p class="empty">No streaming services list this title yet.</p>'}
  </section>
</main>
${foot(site)}
<script type="application/json" id="data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="${site.base}assets/watch.js" defer></script>
<script src="${site.base}assets/title.js" defer></script>
</body>
</html>
`;
}

export function indexPage(site, popular) {
  return `${head(site, {
    title: `${site.name}: legal streaming options for films and TV`,
    desc: 'Find where a film or TV series streams legally in your country, by IMDb or TMDB id.',
    path: '',
  })}
<body>
${bar(site)}
<main class="wrap">
  <section class="intro">
    <h1>Where to watch, legally</h1>
    <p>Look up a film or TV series by its IMDb or TMDB id to see which licensed services carry it in your country, with links checked and added by the community.</p>
    <p id="resolve" class="resolve" hidden></p>
  </section>
  <section class="block">
    <h2>Popular titles</h2>
    <ul class="grid">${popular.map((t) => `<li><a href="${site.base}${titlePath(t.type, t.tmdb, t.name)}">${t.poster
      ? `<img src="${IMG}/w185${esc(t.poster)}" width="185" height="278" alt="" loading="lazy">`
      : '<span class="poster none"></span>'}<b>${esc(t.name)}</b>${t.year ? `<span>${t.year}</span>` : ''}</a></li>`).join('')}</ul>
  </section>
</main>
${foot(site)}
<script src="${site.base}assets/resolve.js" defer></script>
</body>
</html>
`;
}

export function notFoundPage(site) {
  return `${head(site, { title: `Not found - ${site.name}`, desc: 'Page not found.', path: '404.html', noindex: true })}
<body>
${bar(site)}
<main class="wrap">
  <section class="intro">
    <h1>Not listed yet</h1>
    <p id="resolve" class="resolve">This page does not exist. If you followed an IMDb or TMDB id, the title may not be listed yet.</p>
    <p><a class="add" href="${esc(site.repo)}/issues/new?template=add-link.yml">Add a link for it</a></p>
  </section>
</main>
${foot(site)}
<script src="${site.base}assets/resolve.js" defer></script>
</body>
</html>
`;
}

export function embedPage(site) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<title>${esc(site.name)}</title>
<link rel="stylesheet" href="${site.base}assets/style.css">
</head>
<body class="embed">
<main id="e" class="e" aria-live="polite"><p class="e-msg">Loading streaming options...</p></main>
<script src="${site.base}assets/watch.js" defer></script>
<script src="${site.base}assets/embed.js" defer></script>
</body>
</html>
`;
}

export function sitemap(site, paths) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `<url><loc>${esc(site.url + p)}</loc></url>`).join('\n')}
</urlset>
`;
}

export function sitemapIndex(site, names) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${names.map((n) => `<sitemap><loc>${esc(site.url + n)}</loc></sitemap>`).join('\n')}
</sitemapindex>
`;
}
