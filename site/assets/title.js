/* The title page's "Watch now" panel. The page is complete without it; this
   draws the visitor's own country on top, with a tab per kind of offer.
   #GB in the address picks a country. */
(function () {
  var el = document.getElementById('data');
  var here = document.getElementById('here');
  if (!el || !here || !window.W) return;
  var d = JSON.parse(el.textContent);
  var list = W.countries(d);
  if (!list.length) return;
  var sel = document.getElementById('cc');
  var tabs = document.getElementById('tabs');
  var out = document.getElementById('here-list');
  var jw = document.getElementById('jw');
  var kind = 'all';
  sel.innerHTML = list.map(function (cc) { return '<option value="' + cc + '">' + W.esc(W.countryName(cc)) + '</option>'; }).join('');

  function filter() {
    [].forEach.call(tabs.children, function (b) { b.setAttribute('aria-selected', String(b.dataset.kind === kind)); });
    [].forEach.call(out.querySelectorAll('.offer'), function (r) { r.hidden = kind !== 'all' && r.dataset.kind !== kind; });
  }
  function draw(cc) {
    sel.value = cc;
    var row = d.c[cc] || {};
    jw.hidden = !row.link;
    if (row.link) jw.href = row.link;
    var ks = W.kinds(d, cc);
    if (kind !== 'all' && !ks.some(function (k) { return k.id === kind; })) kind = 'all';
    tabs.innerHTML = ks.length > 1 ? [{ id: 'all', label: 'All', n: ks.reduce(function (s, k) { return s + k.n; }, 0) }].concat(ks).map(function (k) {
      return '<button type="button" role="tab" data-kind="' + k.id + '">' + k.label + ' <span>' + k.n + '</span></button>';
    }).join('') : '';
    var html = W.offers(d, cc, function (k, id, l) { return l ? l.url : row.link || '#'; }, '_blank');
    out.innerHTML = html || '<p class="empty">Not listed in ' + W.esc(W.countryName(cc)) + ' yet. Pick another country, or add a direct link below.</p>';
    filter();
  }
  var fromHash = (location.hash || '').slice(1).toUpperCase();
  draw(list.indexOf(fromHash) !== -1 ? fromHash : W.pickCountry(list));
  sel.addEventListener('change', function () { W.saveCountry(sel.value); draw(sel.value); });
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) { kind = b.dataset.kind; filter(); }
  });
  here.hidden = false;
  document.getElementById('cc-wrap').hidden = false;
})();
