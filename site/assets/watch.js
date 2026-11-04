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

  /* Which kinds one country has, in display order, with how many services each. */
  function kinds(d, cc) {
    var row = (d.c || {})[cc] || {};
    var ls = (d.links || []).filter(function (l) { return l.country === cc; });
    return KINDS.map(function (k) {
      var n = (row[k[0]] || []).length + ls.filter(function (l) { return l.kind === k[0]; }).length;
      return { id: k[0], label: k[1], n: n };
    }).filter(function (k) { return k.n; });
  }

  /* One country's offers, one row each: logo, service and kind, then the
     button. Direct links from the community lead each kind. href(kind,
     providerId, link) gives a row's link; link is set for a direct link. */
  function offers(d, cc, href, target) {
    var row = (d.c || {})[cc] || {};
    var ls = (d.links || []).filter(function (l) { return l.country === cc; });
    var t = target ? ' target="' + target + '"' : '';
    var html = '';
    function item(kind, url, rel, logo, name, sub, cta) {
      return '<li class="offer" data-kind="' + kind + '"><a href="' + esc(url) + '" rel="' + rel + '"' + t + '>' + logo
        + '<span class="o-name"><b>' + esc(name) + '</b><small>' + sub + '</small></span><span class="cta' + cta + '">Watch now</span></a></li>';
    }
    KINDS.forEach(function (k) {
      var strong = k[0] === 'flatrate' || k[0] === 'free' || k[0] === 'ads' ? '' : ' quiet';
      ls.filter(function (l) { return l.kind === k[0]; }).forEach(function (l) {
        html += item(k[0], href(k[0], null, l), 'nofollow ugc noopener', '<span class="logo">' + esc(l.service.slice(0, 1)) + '</span>',
          l.service, k[1] + ' &middot; ' + (l.note ? esc(l.note) : 'Direct link'), strong);
      });
      (row[k[0]] || []).forEach(function (id) {
        var p = d.p[id] || ['Unknown', ''];
        var logo = p[1] ? '<img class="logo" src="' + IMG + esc(p[1]) + '" width="48" height="48" alt="" loading="lazy">'
          : '<span class="logo">' + esc(p[0].slice(0, 1)) + '</span>';
        html += item(k[0], href(k[0], id), 'nofollow', logo, p[0], k[1], strong);
      });
    });
    return html ? '<ul class="offers">' + html + '</ul>' : '';
  }

  window.W = { esc: esc, countryName: countryName, pickCountry: pickCountry, saveCountry: saveCountry, countries: countries, kinds: kinds, offers: offers };
})();
