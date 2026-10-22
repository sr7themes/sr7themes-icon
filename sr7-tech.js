/*! SR7 Technology label layout v1.0  |  The Orpte / SR7Themes
 *  BBC-style label page: full-width hero, thumbnail list, Videos rail, "More Tech" cards + Load more.
 *  Self-contained: injects its own CSS, reads the Blogger JSON feed, adds JSON-LD.
 *  Needs the shell  <div id="sr7-tech" data-label="Technology">  rendered by the theme.
 *  If this file fails to load, the theme's normal post grid stays visible (no blank page).
 */
(function () {
  'use strict';

  /* ================= SETTINGS ================= */
  var CFG = {
    videoLabels: ['videos', 'video'],   // posts with these labels are kept out of the lists (they go in the rail)
    videoLabel: 'Videos',               // label used for the Videos rail
    firstBatch: 25,                     // posts fetched on first load
    moreBatch: 12,                      // posts added per "Load more" tap
    topCount: 4,                        // rows shown under the hero
    railMax: 8,                         // tiles in the Videos rail
    railMin: 3,                         // fewer tech videos than this -> fill the rail with latest videos
    moreTitle: 'More Tech',
    heroChars: 200,
    cardChars: 150
  };

  var ORIGIN = location.origin;
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';

  /* ================= helpers ================= */
  function $(s, c) { return (c || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function img(url, w, h) {
    if (!url) return '';
    return url.replace(/\/s\d+(-c)?\//, '/w' + w + '-h' + h + '-p-k-no-nu/').replace(/=s\d+(-c)?$/, '=w' + w + '-h' + h + '-p-k-no-nu');
  }
  function plain(html) {
    var t = String(html || '').replace(/<[^>]*>/g, ' ');
    var ta = document.createElement('textarea'); ta.innerHTML = t;
    return ta.value.replace(/\s+/g, ' ').trim();
  }
  function clip(s, n) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    var c = s.slice(0, n), i = c.lastIndexOf(' ');
    if (i > n * 0.6) c = c.slice(0, i);
    return c.replace(/[\s,.;:\-\u2013]+$/, '') + '\u2026';
  }
  function ago(d) {
    var s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'Just now';
    var m = Math.floor(s / 60); if (m < 60) return m + (m === 1 ? ' min' : ' mins') + ' ago';
    var h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? ' hr' : ' hrs') + ' ago';
    var dd = Math.floor(h / 24); if (dd < 7) return dd + (dd === 1 ? ' day' : ' days') + ' ago';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function isVideo(p) {
    return (p.labels || []).some(function (l) { return CFG.videoLabels.indexOf(String(l).trim().toLowerCase()) > -1; });
  }

  /* ================= data ================= */
  function parse(e) {
    var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0] || {};
    return {
      id: String(e.id.$t).split('post-').pop(),
      title: plain(e.title.$t),
      url: link.href,
      date: e.published.$t,
      image: e.media$thumbnail ? e.media$thumbnail.url : '',
      summary: plain((e.summary && e.summary.$t) || ''),
      labels: (e.category || []).map(function (c) { return c.term; })
    };
  }
  function getFeed(path, start, max) {
    var url = ORIGIN + '/feeds/posts/summary/-/' + path + '?alt=json&start-index=' + start + '&max-results=' + max;
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      var f = d.feed || {};
      var items = (f.entry || []).map(parse).filter(function (p) { return p.url && p.title; });
      return { items: items, raw: (f.entry || []).length, total: +((f.openSearch$totalResults || {}).$t || 0) };
    }).catch(function () { return { items: [], raw: 0, total: 0, failed: true }; });
  }

  /* ================= templates ================= */
  function timeTag(p) { return '<div class="t-meta"><time datetime="' + esc(p.date) + '">' + esc(ago(p.date)) + '</time></div>'; }

  function heroHTML(p) {
    var u = esc(p.url), t = esc(p.title), im = '';
    if (p.image) {
      im = '<a class="t-hero-img" href="' + u + '" tabindex="-1" aria-hidden="true"><img alt="' + t + '" width="1280" height="720" fetchpriority="high" decoding="async" ' +
        'src="' + esc(img(p.image, 1280, 720)) + '" ' +
        'srcset="' + esc(img(p.image, 640, 360)) + ' 640w, ' + esc(img(p.image, 1280, 720)) + ' 1280w" sizes="(max-width:900px) 100vw, 60vw"></a>';
    }
    return '<article class="t-hero' + (p.image ? '' : ' noimg') + '">' + im +
      '<div class="t-hero-body"><h2 class="t-hero-t"><a href="' + u + '">' + t + '</a></h2>' +
      (p.summary ? '<p class="t-hero-s">' + esc(clip(p.summary, CFG.heroChars)) + '</p>' : '') + timeTag(p) + '</div></article>';
  }
  function rowHTML(p) {
    var u = esc(p.url), t = esc(p.title);
    return '<article class="t-row' + (p.image ? '' : ' noimg') + '">' +
      (p.image ? '<a class="t-row-img" href="' + u + '" tabindex="-1" aria-hidden="true"><img loading="lazy" decoding="async" alt="' + t + '" width="480" height="270" src="' + esc(img(p.image, 480, 270)) + '"></a>' : '') +
      '<h3 class="t-row-t"><a href="' + u + '">' + t + '</a></h3></article>';
  }
  function cardHTML(p) {
    var u = esc(p.url), t = esc(p.title);
    return '<article class="t-card' + (p.image ? '' : ' noimg') + '">' +
      (p.image ? '<a class="t-card-img" href="' + u + '" tabindex="-1" aria-hidden="true"><img loading="lazy" decoding="async" alt="' + t + '" width="640" height="360" src="' + esc(img(p.image, 640, 360)) + '"></a>' : '') +
      '<h3 class="t-card-t"><a href="' + u + '">' + t + '</a></h3>' +
      (p.summary ? '<p class="t-card-s">' + esc(clip(p.summary, CFG.cardChars)) + '</p>' : '') + timeTag(p) + '</article>';
  }
  function tileHTML(p) {
    return '<a class="sr7-vtile" href="' + esc(p.url) + '"><span class="thumb"><img loading="lazy" alt="' + esc(p.title) + '" width="640" height="360" src="' + esc(img(p.image, 640, 360)) + '">' +
      '<span class="sr7-play" aria-hidden="true">' + PLAY + '</span></span><h3>' + esc(p.title) + '</h3></a>';
  }
  function railHTML(vids) {
    return '<section aria-label="Videos" class="sr7-vhome" id="sr7-tech-videos"><div class="sr7-vhome-head"><h2>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>Videos</h2>' +
      '<a href="' + esc(ORIGIN + '/search/label/' + encodeURIComponent(CFG.videoLabel)) + '">More videos \u2192</a></div>' +
      '<div class="sr7-vtrack">' + vids.map(tileHTML).join('') + '</div></section>';
  }

  /* ================= CSS (injected, so the theme stays light) ================= */
  var CSS = [
    '.sr7-tech{display:block;color:var(--ink,#1a1a1a)}',
    '.sr7-tech a{color:inherit;text-decoration:none}',
    '.sr7-tech a:hover{color:var(--red,#001f51)}',
    '.sr7-tech .t-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.sr7-tech .t-meta{margin-top:12px;font:400 14px/1.4 var(--font,system-ui,sans-serif);color:var(--muted,#6b7077)}',
    /* hero (phone first: edge-to-edge image, centred text) */
    '.t-hero{display:block;margin:0}',
    '.t-hero-img{display:block;overflow:hidden;background:var(--surface-2,#f1f2f4);aspect-ratio:2/1;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw)}',
    '.t-hero-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-hero-body{padding:18px 0 22px;text-align:center;border-bottom:1px solid var(--line,#e6e8eb)}',
    '.t-hero-t{margin:0 0 12px;font:400 clamp(28px,8vw,34px)/1.14 var(--font-head,Georgia,serif);letter-spacing:-.01em}',
    '.t-hero-s{margin:0;font:400 clamp(17px,4.6vw,20px)/1.45 var(--font-head,Georgia,serif);color:var(--ink-2,#3c3f44)}',
    '.t-hero.noimg .t-hero-body{padding-top:8px}',
    /* rows: thumbnail left, headline right */
    '.t-rows{display:block}',
    '.t-row{display:grid;grid-template-columns:33% minmax(0,1fr);gap:20px;align-items:start;padding:20px 0;border-bottom:1px solid var(--line,#e6e8eb)}',
    '.t-row.noimg{grid-template-columns:minmax(0,1fr)}',
    '.t-row-img{display:block;overflow:hidden;aspect-ratio:16/9;background:var(--surface-2,#f1f2f4)}',
    '.t-row-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-row-t{margin:0;font:700 clamp(18px,5vw,22px)/1.25 var(--font-head,Georgia,serif)}',
    /* section heading */
    '.t-sec{margin-top:14px}',
    '.t-sec-h{margin:0;padding:14px 0 4px;border-top:4px solid var(--ink,#1a1a1a);font:800 20px/1.2 var(--font,system-ui,sans-serif);letter-spacing:.02em;text-transform:uppercase}',
    /* cards: headline + summary left, image floated right */
    '.t-more-list{display:block}',
    '.t-card{display:flow-root;padding:22px 0 18px;border-bottom:1px solid var(--line,#e6e8eb)}',
    '.t-card-img{float:right;width:46%;margin:2px 0 10px 18px;overflow:hidden;aspect-ratio:16/9;background:var(--surface-2,#f1f2f4)}',
    '.t-card-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-card-t{margin:0 0 8px;font:700 clamp(19px,5.2vw,22px)/1.25 var(--font-head,Georgia,serif)}',
    '.t-card-s{margin:0;font:400 16px/1.45 var(--font-head,Georgia,serif);color:var(--ink-2,#3c3f44)}',
    '.t-card .t-meta{clear:both;margin-top:14px}',
    '.t-more-wrap{display:flex;justify-content:center;margin:26px 0 8px}',
    '.t-more-wrap[hidden]{display:none}',
    '.sr7-tech .sr7-vhome{margin-top:26px}',
    /* desktop */
    '@media (min-width:901px){',
    '  .t-hero{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:36px;align-items:center;padding:6px 0 30px;border-bottom:1px solid var(--line,#e6e8eb)}',
    '  .t-hero.noimg{grid-template-columns:minmax(0,1fr)}',
    '  .t-hero-img{width:auto;max-width:none;margin-left:0;aspect-ratio:16/9;border-radius:var(--radius-sm,8px)}',
    '  .t-hero-body{padding:0;text-align:left;border:0}',
    '  .t-hero-t{font-size:clamp(34px,3.3vw,48px)}',
    '  .t-hero-s{font-size:20px}',
    '  .t-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:40px}',
    '  .t-row-t{font-size:21px}',
    '  .t-more-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:28px}',
    '  .t-card{padding:20px 0 22px}',
    '  .t-card-img{float:none;width:100%;margin:0 0 12px;border-radius:var(--radius-sm,8px)}',
    '  .t-card-t{font-size:21px}',
    '}',
    '@media (min-width:1200px){.t-more-list{grid-template-columns:repeat(4,minmax(0,1fr))}}'
  ].join('\n');

  /* ================= structured data ================= */
  function addLD(label, items) {
    try {
      var ld = [
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: label, url: ORIGIN + location.pathname, isPartOf: { '@type': 'WebSite', url: ORIGIN + '/' } },
        { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items.slice(0, 12).map(function (p, i) { return { '@type': 'ListItem', position: i + 1, url: p.url, name: p.title }; }) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: label } ] }
      ];
      var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    } catch (e) {}
  }

  /* ================= build ================= */
  function init() {
    var root = $('#sr7-tech');
    if (!root || root.getAttribute('data-sr7-init')) return;
    root.setAttribute('data-sr7-init', '1');
    var label = root.getAttribute('data-label') || 'Technology';

    var st = document.createElement('style'); st.id = 'sr7-tech-css'; st.textContent = CSS; document.head.appendChild(st);

    var safe = encodeURIComponent(label);
    var main = getFeed(safe, 1, CFG.firstBatch);
    var techVids = getFeed(encodeURIComponent(CFG.videoLabel) + '/' + safe, 1, CFG.railMax);

    main.then(function (res) {
      var posts = res.items.filter(function (p) { return !isVideo(p); });
      if (!posts.length) return;                           // keep the theme's own grid

      var hi = 0; for (var i = 0; i < posts.length; i++) { if (posts[i].image) { hi = i; break; } }
      var hero = posts.splice(hi, 1)[0];
      var top = posts.splice(0, CFG.topCount);
      var more = posts;
      var start = res.raw + 1, total = res.total;

      root.innerHTML =
        '<h1 class="t-sr">' + esc(label) + '</h1>' +
        heroHTML(hero) +
        '<div class="t-rows" id="sr7-tech-top">' + top.map(rowHTML).join('') + '</div>' +
        '<div id="sr7-tech-rail"></div>' +
        '<section class="t-sec" id="sr7-tech-more" aria-label="' + esc(CFG.moreTitle) + '"' + (more.length ? '' : ' hidden') + '>' +
          '<h2 class="t-sec-h">' + esc(CFG.moreTitle) + '</h2>' +
          '<div class="t-more-list" id="sr7-tech-list">' + more.map(cardHTML).join('') + '</div>' +
        '</section>' +
        '<div class="t-more-wrap" id="sr7-tech-btnwrap"' + (start <= total ? '' : ' hidden') + '><button class="btn btn-red" id="sr7-tech-btn" type="button">Load more stories</button></div>';
      root.classList.add('is-on');
      var pager = root.parentNode && root.parentNode.querySelector('.pager'); if (pager) pager.hidden = true;
      addLD(label, [hero].concat(top, more));

      /* Videos rail (tech videos first, otherwise latest videos) */
      techVids.then(function (tv) {
        var v = tv.items;
        if (v.length >= CFG.railMin) return v;
        return getFeed(encodeURIComponent(CFG.videoLabel), 1, CFG.railMax).then(function (all) { return all.items; });
      }).then(function (v) {
        v = (v || []).filter(function (p) { return p.image; }).slice(0, CFG.railMax);
        if (v.length) $('#sr7-tech-rail').innerHTML = railHTML(v);
      });

      /* Load more */
      var btn = $('#sr7-tech-btn'), wrap = $('#sr7-tech-btnwrap'), busy = false;
      btn.addEventListener('click', function () {
        if (busy) return; busy = true; btn.textContent = 'Loading\u2026';
        getFeed(safe, start, CFG.moreBatch).then(function (r) {
          start += r.raw;
          var add = r.items.filter(function (p) { return !isVideo(p); });
          if (add.length) {
            $('#sr7-tech-more').hidden = false;
            $('#sr7-tech-list').insertAdjacentHTML('beforeend', add.map(cardHTML).join(''));
          }
          if (r.failed || r.raw < CFG.moreBatch || start > (r.total || total)) wrap.hidden = true;
          btn.textContent = 'Load more stories'; busy = false;
        });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
