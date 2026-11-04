/* The embed: /embed/?tmdb=1396&type=tv or /embed/?imdb=tt0903747, plus an
   optional &country=GB. Lists the services for the visitor's country and the
   community links; every item opens the title's full page in a new tab. */
(function () {
  var root = document.getElementById('e');
  var q = new URLSearchParams(location.search);
  var base = location.pathname.replace(/embed\/(index\.html)?$/, '');

  function msg(text, href) {
    root.innerHTML = '<p class="e-msg">' + W.esc(text) + (href ? ' <a href="' + W.esc(href) + '" target="_blank">Add a link</a>' : '') + '</p>';
  }
  function get(path) {
    return fetch(base + path).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  var imdb = q.get('imdb'), tmdb = q.get('tmdb'), type = q.get('type');
  var find;
  if (/^tt\d{7,10}$/.test(imdb || '')) find = get('data/imdb/' + imdb + '.json');
  else if (/^\d{1,10}$/.test(tmdb || '') && (type === 'movie' || type === 'tv')) find = Promise.resolve({ type: type, tmdb: tmdb });
  else return msg('Pass ?imdb=tt... or ?tmdb=...&type=movie|tv.');

  find.then(function (id) { return get('data/' + id.type + '/' + id.tmdb + '.json'); })
    .then(function (d) {
      var list = W.countries(d);
      var page = base + d.path;
      if (!list.length) {
        root.innerHTML = '<p class="e-msg">No services list ' + W.esc(d.t) + ' yet. <a href="' + W.esc(page) + '" target="_blank">Open the full page</a></p>';
        return;
      }
      var want = (q.get('country') || '').toUpperCase();
      var cc = list.indexOf(want) !== -1 ? want : W.pickCountry(list);
      function draw() {
        var to = function () { return page + '#' + cc; };
        var body = W.offers(d, cc, to, '_blank');
        root.innerHTML = '<header class="e-hd"><h1><a href="' + W.esc(page) + '" target="_blank">' + W.esc(d.t) + (d.y ? ' <span>' + d.y + '</span>' : '') + '</a></h1>'
          + '<label class="sr" for="ecc">Country</label><select id="ecc">' + list.map(function (c) {
            return '<option value="' + c + '"' + (c === cc ? ' selected' : '') + '>' + W.esc(W.countryName(c)) + '</option>';
          }).join('') + '</select></header>'
          + (body || '<p class="e-msg">Not listed in ' + W.esc(W.countryName(cc)) + ' yet.</p>')
          + '<p class="e-foot">Availability from JustWatch, via TMDB. <a href="' + W.esc(page) + '" target="_blank">Full page</a></p>';
        document.getElementById('ecc').addEventListener('change', function (e) { cc = e.target.value; W.saveCountry(cc); draw(); });
      }
      draw();
    })
    .catch(function () { msg('This title is not listed yet.', null); });
})();
