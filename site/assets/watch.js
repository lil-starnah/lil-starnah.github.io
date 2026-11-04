/* Shared by the title page and the embed: which country to show, and the list
   of services for one country. */
(function () {
  var KINDS = [['flatrate', 'Stream'], ['free', 'Free'], ['ads', 'Free with ads'], ['rent', 'Rent'], ['buy', 'Buy']];
  var IMG = 'https://image.tmdb.org/t/p/w92';
  var names;
  try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { names = null; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function countryName(cc) { try { return (names && names.of(cc)) || cc; } catch (e) { return cc; } }

  /* The visitor's country: a choice they made here before, then the region of
     their browser language, then the first of a few large markets the title has. */
  function pickCountry(available) {
    var saved = null;
    try { saved = localStorage.getItem('cc'); } catch (e) {}
    if (saved && available.indexOf(saved) !== -1) return saved;
    var langs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      var m = /-([A-Z]{2})$/i.exec(langs[i] || '');
      if (m && available.indexOf(m[1].toUpperCase()) !== -1) return m[1].toUpperCase();
    }
    var big = ['GB', 'US', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BR', 'IN'];
    for (var j = 0; j < big.length; j++) if (available.indexOf(big[j]) !== -1) return big[j];
    return available[0] || '';
  }
  function saveCountry(cc) { try { localStorage.setItem('cc', cc); } catch (e) {} }

  function countries(d) {
    var set = {};
    Object.keys(d.c || {}).forEach(function (k) { set[k] = 1; });
    (d.links || []).forEach(function (l) { set[l.country] = 1; });
    return Object.keys(set).sort(function (a, b) { return countryName(a).localeCompare(countryName(b)); });
  }

  /* One country's offers. href(kind, providerId) gives each item's link. */
  function offers(d, cc, href, target) {
    var row = (d.c || {})[cc] || {};
    var html = '';
    KINDS.forEach(function (k) {
      var ids = row[k[0]] || [];
      if (!ids.length) return;
      html += '<div class="kind"><h3>' + k[1] + '</h3><ul class="plist">' + ids.map(function (id) {
        var p = d.p[id] || ['Unknown', ''];
        var logo = p[1] ? '<img src="' + IMG + esc(p[1]) + '" width="40" height="40" alt="" loading="lazy">'
          : '<span class="nologo" aria-hidden="true">' + esc(p[0].slice(0, 1)) + '</span>';
        return '<li><a href="' + esc(href(k[0], id)) + '" rel="nofollow"' + (target ? ' target="' + target + '"' : '') + '>' + logo + '<b>' + esc(p[0]) + '</b></a></li>';
      }).join('') + '</ul></div>';
    });
    return html;
  }

  function community(d, cc, href, target) {
    var ls = (d.links || []).filter(function (l) { return l.country === cc; });
    if (!ls.length) return '';
    var label = {}; KINDS.forEach(function (k) { label[k[0]] = k[1]; });
    return '<div class="kind"><h3>From the community</h3><ul class="clist">' + ls.map(function (l) {
      return '<li><a href="' + esc(href(l)) + '" rel="nofollow ugc noopener"' + (target ? ' target="' + target + '"' : '') + '><b>' + esc(l.service) + '</b><span>' + esc(label[l.kind] || l.kind) + (l.note ? ' &middot; ' + esc(l.note) : '') + '</span></a></li>';
    }).join('') + '</ul></div>';
  }

  window.W = { esc: esc, countryName: countryName, pickCountry: pickCountry, saveCountry: saveCountry, countries: countries, offers: offers, community: community };
})();
