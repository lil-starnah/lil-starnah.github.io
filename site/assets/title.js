/* The title page's "Watch in <country>" panel. The page is complete without it;
   this draws the visitor's own country on top. #GB in the address picks a country. */
(function () {
  var el = document.getElementById('data');
  var here = document.getElementById('here');
  if (!el || !here || !window.W) return;
  var d = JSON.parse(el.textContent);
  var list = W.countries(d);
  if (!list.length) return;
  var sel = document.getElementById('cc');
  var out = document.getElementById('here-list');
  var jw = document.getElementById('jw');
  sel.innerHTML = list.map(function (cc) { return '<option value="' + cc + '">' + W.esc(W.countryName(cc)) + '</option>'; }).join('');

  function draw(cc) {
    sel.value = cc;
    var row = d.c[cc] || {};
    var link = row.link || '';
    jw.hidden = !link;
    if (link) jw.href = link;
    var html = W.community(d, cc, function (l) { return l.url; }, '_blank')
      + W.offers(d, cc, function () { return link || '#'; }, '_blank');
    out.innerHTML = html || '<p class="empty">Not listed in ' + W.esc(W.countryName(cc)) + ' yet. Pick another country, or add a link below.</p>';
  }
  var fromHash = (location.hash || '').slice(1).toUpperCase();
  draw(list.indexOf(fromHash) !== -1 ? fromHash : W.pickCountry(list));
  sel.addEventListener('change', function () { W.saveCountry(sel.value); draw(sel.value); });
  here.hidden = false;
})();
