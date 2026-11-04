/* Turns an id into the title's page. Handles ?q=, ?imdb=, ?tmdb=&type= on the
   home page and, through 404.html, addresses like /tt0903747 or /tv/1396. */
(function () {
  var el = document.getElementById('resolve');
  var q = new URLSearchParams(location.search);
  var base = document.querySelector('link[rel=stylesheet]').getAttribute('href').replace(/assets\/style\.css$/, '');
  var rest = location.pathname.indexOf(base) === 0 ? location.pathname.slice(base.length) : '';
  var raw = (q.get('q') || q.get('imdb') || '').trim();
  var tmdb = q.get('tmdb'), type = q.get('type');
  var m;
  if (!raw && !tmdb && (m = /^(tt\d{7,10})\/?$/.exec(rest))) raw = m[1];
  if (!raw && !tmdb && (m = /^(movie|tv)\/(\d{1,10})\/?$/.exec(rest))) { type = m[1]; tmdb = m[2]; }
  if (raw && (m = /(tt\d{7,10})/.exec(raw))) raw = m[1];
  else if (raw && /^\d{1,10}$/.test(raw)) { tmdb = raw; raw = ''; }

  function say(text) { if (el) { el.textContent = text; el.hidden = false; } }
  function get(path) { return fetch(base + path).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function go(d) { location.replace(base + d.path); }

  if (/^tt\d+$/.test(raw)) {
    say('Looking up ' + raw + '...');
    get('data/imdb/' + raw + '.json')
      .then(function (id) { return get('data/' + id.type + '/' + id.tmdb + '.json'); })
      .then(go, function () { say(raw + ' is not listed yet.'); });
  } else if (tmdb) {
    say('Looking up TMDB ' + tmdb + '...');
    var types = type === 'movie' || type === 'tv' ? [type] : ['movie', 'tv'];
    (function next(i) {
      if (i >= types.length) return say('TMDB ' + tmdb + ' is not listed yet.');
      get('data/' + types[i] + '/' + tmdb + '.json').then(go, function () { next(i + 1); });
    })(0);
  }
})();
