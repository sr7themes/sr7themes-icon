/*! SR7 Technology label layout v1.2  |  The Orpte / SR7Themes
 *  BBC-style label page: full-width hero, rows with left thumbnails, Tech-videos rail, "More Tech" cards with right images.
 *  - Self-contained: injects its own CSS, reads the Blogger JSON feed, adds JSON-LD.
 *  - Needs the shell  <div id="sr7-tech" data-label="Technology">  rendered by the theme.
 *  - If it fails, the theme's normal post grid stays visible (no blank page).
 *  - Posts without a Blogger thumbnail get their first image (or YouTube thumbnail) read from the post itself.
 */
(function () {
  'use strict';

  /* ================= SETTINGS ================= */
  var CFG = {
    videoLabels: ['videos', 'video'],   // posts with these labels are kept out of the lists
    videoLabel: 'Videos',               // rail = posts that have BOTH this label and the page label
    firstBatch: 25,                     // posts fetched on first load
    moreBatch: 12,                      // posts added per "Load more" tap
    topCount: 4,                        // rows (left thumbnail) under the hero
    railMax: 8,                         // tiles in the Videos rail
    moreTitle: 'More Tech',
    heroChars: 200,
    cardChars: 150,
    placeholder: '',                    // text on the grey box when a post has no image ('' = site name)
    prettyUrl: ''                       // '' = keep the normal /search/label/... address (set to 'Technology' to show /Technology)
  };

  var ORIGIN = location.origin;
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var SITE = CFG.placeholder || (function () {
    var m = document.querySelector('meta[property="og:site_name"]');
    return (m && m.content) || String(document.title).split('|').pop().trim() || 'News';
  })();

  /* ================= helpers ================= */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function img(url, w, h) {
    if (!url) return '';
    return url.replace(/\/(s\d+(-c)?|w\d+-h\d+(-[a-z-]+)?)\//, '/w' + w + '-h' + h + '-p-k-no-nu/').replace(/=(s|w)\d+(-[a-z0-9-]+)?$/, '=w' + w + '-h' + h + '-p-k-no-nu');
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
  var seq = 0;

  /* ================= data ================= */
  function parse(e) {
    var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0] || {};
    return {
      pid: 'p' + (++seq),
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
    var timer = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 9000); });
    return Promise.race([fetch(url), timer]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      var f = d.feed || {};
      var items = (f.entry || []).map(parse).filter(function (p) { return p.url && p.title; });
      return { items: items, raw: (f.entry || []).length, total: +((f.openSearch$totalResults || {}).$t || 0) };
    }).catch(function () { return { items: [], raw: 0, total: 0, failed: true }; });
  }
  /* posts already rendered by Blogger inside the shell (used if the JSON feed is blocked or empty) */
  function fromDom(root) {
    return $$('.card', root).map(function (c) {
      var a = c.querySelector('h2 a'), im = c.querySelector('.thumb img'), t = c.querySelector('time'), sm = c.querySelector('p');
      if (!a || !a.href) return null;
      return {
        pid: 'p' + (++seq), id: '', title: a.textContent.replace(/\s+/g, ' ').trim(), url: a.href,
        date: t ? (t.getAttribute('datetime') || '') : '',
        image: im ? (im.getAttribute('src') || '') : '',
        summary: sm ? sm.textContent.replace(/\s+/g, ' ').trim() : '',
        labels: $$('.kicker-row a', c).map(function (x) { return x.textContent.trim(); })
      };
    }).filter(Boolean);
  }

  /* ---- images: find the first image / YouTube thumbnail inside the post when the feed gives none ---- */
  function pickImage(html) {
    html = String(html || '');
    var m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
    if (m) return m[1].replace(/&amp;/g, '&');
    var y = /(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{11})/i.exec(html);
    return y ? 'https://i.ytimg.com/vi/' + y[1] + '/hqdefault.jpg' : '';
  }
  function fetchImage(p) {
    var key = 'sr7t:' + p.url;
    try { var c = sessionStorage.getItem(key); if (c !== null) return Promise.resolve(c); } catch (e) {}
    var url = /^\d+$/.test(p.id) ? ORIGIN + '/feeds/posts/default/' + p.id + '?alt=json'
                                 : ORIGIN + '/feeds/posts/default?alt=json&max-results=1&path=' + encodeURIComponent(new URL(p.url).pathname);
    return fetch(url).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
      var e = d.entry || ((d.feed || {}).entry || [])[0] || {};
      var src = pickImage(e.content && e.content.$t);
      try { sessionStorage.setItem(key, src); } catch (x) {}
      return src;
    }).catch(function () { return ''; });
  }
  function imgTag(src, alt, w, h, eager) {
    return '<img ' + (eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"') + ' referrerpolicy="no-referrer" alt="' + esc(alt) + '" width="' + w + '" height="' + h + '" src="' + esc(img(src, w, h)) + '"' +
      (eager ? ' srcset="' + esc(img(src, 640, 360)) + ' 640w, ' + esc(img(src, 1280, 720)) + ' 1280w" sizes="(max-width:900px) 100vw, 60vw"' : '') + '>';
  }
  function patch(p) {
    $$('[data-pid="' + p.pid + '"]').forEach(function (el) {
      var ph = el.querySelector('.t-ph'); if (ph) ph.remove();
      var old = el.querySelector('img'); if (old) old.remove();
      el.insertAdjacentHTML('afterbegin', imgTag(p.image, p.title, +el.getAttribute('data-w') || 640, +el.getAttribute('data-h') || 360, false));
    });
  }
  function resolveImages(list) {
    var q = list.filter(function (p) { return !p.image && !p.tried; });
    function next() {
      var p = q.shift(); if (!p) return;
      p.tried = true;
      return fetchImage(p).then(function (src) { if (src) { p.image = src; patch(p); } }).then(next);
    }
    for (var i = 0; i < 4; i++) next();
  }

  /* ================= templates ================= */
  function timeTag(p) { return p.date ? '<div class="t-meta"><time datetime="' + esc(p.date) + '">' + esc(ago(p.date)) + '</time></div>' : ''; }
  function box(p, cls, w, h, eager) {
    return '<a class="' + cls + '" data-pid="' + p.pid + '" data-w="' + w + '" data-h="' + h + '" href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true">' +
      (p.image ? imgTag(p.image, p.title, w, h, eager) : '<span class="t-ph">' + esc(SITE) + '</span>') + '</a>';
  }
  function heroHTML(p) {
    return '<article class="t-hero">' + box(p, 't-hero-img', 1280, 720, true) +
      '<div class="t-hero-body"><h2 class="t-hero-t"><a href="' + esc(p.url) + '">' + esc(p.title) + '</a></h2>' +
      (p.summary ? '<p class="t-hero-s">' + esc(clip(p.summary, CFG.heroChars)) + '</p>' : '') + timeTag(p) + '</div></article>';
  }
  function rowHTML(p) {
    return '<article class="t-row">' + box(p, 't-row-img', 480, 270) + '<h3 class="t-row-t"><a href="' + esc(p.url) + '">' + esc(p.title) + '</a></h3></article>';
  }
  function cardHTML(p) {
    return '<article class="t-card">' + box(p, 't-card-img', 640, 360) +
      '<h3 class="t-card-t"><a href="' + esc(p.url) + '">' + esc(p.title) + '</a></h3>' +
      (p.summary ? '<p class="t-card-s">' + esc(clip(p.summary, CFG.cardChars)) + '</p>' : '') + timeTag(p) + '</article>';
  }
  function tileHTML(p) {
    return '<a class="sr7-vtile" href="' + esc(p.url) + '"><span class="thumb" data-pid="' + p.pid + '" data-w="640" data-h="360">' +
      (p.image ? imgTag(p.image, p.title, 640, 360, false) : '<span class="t-ph">' + esc(SITE) + '</span>') +
      '<span class="sr7-play" aria-hidden="true">' + PLAY + '</span></span>' +
      '<div class="v-txt"><h3>' + esc(p.title) + '</h3>' + (p.date ? '<time class="v-t" datetime="' + esc(p.date) + '">' + esc(ago(p.date)) + '</time>' : '') + '</div></a>';
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
    '.sr7-tech .t-ph{display:grid;place-items:center;width:100%;height:100%;padding:8px;text-align:center;background:linear-gradient(135deg,var(--red-soft,#e6edf8),var(--surface-2,#f1f2f4));color:var(--muted,#6b7077);font:800 clamp(13px,3.6vw,20px)/1.15 var(--font-head,Georgia,serif)}',
    '.sr7-tech .sr7-vtile .t-ph{background:#0b1220;color:#8fa3c7}',
    /* hero (phone first: edge-to-edge image, centred text) */
    '.t-hero{display:block;margin:0}',
    '.t-hero-img{display:block;overflow:hidden;background:var(--surface-2,#f1f2f4);aspect-ratio:2/1;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw)}',
    '.t-hero-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-hero-body{padding:18px 0 22px;text-align:center;border-bottom:1px solid var(--line,#e6e8eb)}',
    '.t-hero-t{margin:0 0 12px;font:400 clamp(28px,8vw,34px)/1.14 var(--font-head,Georgia,serif);letter-spacing:-.01em}',
    '.t-hero-s{margin:0;font:400 clamp(17px,4.6vw,20px)/1.45 var(--font-head,Georgia,serif);color:var(--ink-2,#3c3f44)}',
    /* rows: thumbnail LEFT, headline right */
    '.t-rows{display:block}',
    '.t-row{display:grid;grid-template-columns:33% minmax(0,1fr);gap:20px;align-items:start;padding:20px 0;border-bottom:1px solid var(--line,#e6e8eb)}',
    '.t-row-img{display:block;overflow:hidden;aspect-ratio:16/9;background:var(--surface-2,#f1f2f4)}',
    '.t-row-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-row-t{margin:0;font:700 clamp(18px,5vw,22px)/1.25 var(--font-head,Georgia,serif)}',
    /* section heading */
    '.t-sec{margin-top:14px}',
    '.t-sec-h{margin:0;padding:14px 0 4px;border-top:4px solid var(--ink,#1a1a1a);font:800 20px/1.2 var(--font,system-ui,sans-serif);letter-spacing:.02em;text-transform:uppercase}',
    /* cards: headline + summary left, image floated RIGHT */
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
    /* ---- Videos band: BBC-style (this page only, scoped to #sr7-tech-videos) ---- */
    '#sr7-tech-videos.sr7-vhome{--vp:16px;margin-top:34px;margin-bottom:0;padding:26px 0 34px;background:#141414;color:#fff;border-radius:0;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw)}',
    '#sr7-tech-videos a,#sr7-tech-videos a:hover{color:#fff}',
    '#sr7-tech-videos .sr7-vhome-head{padding:0 var(--vp) 18px;align-items:center}',
    '#sr7-tech-videos .sr7-vhome-head h2{gap:10px;font:800 clamp(22px,5vw,28px)/1.15 var(--font,system-ui,sans-serif);letter-spacing:-.01em}',
    '#sr7-tech-videos .sr7-vhome-head h2 svg{box-sizing:content-box;width:16px;height:16px;padding:6px;border:2px solid #fff;border-radius:50%}',
    '#sr7-tech-videos .sr7-vhome-head a{opacity:1;font:700 14px/1.2 var(--font,system-ui,sans-serif);padding-bottom:3px;border-bottom:2px solid rgba(255,255,255,.55)}',
    '#sr7-tech-videos .sr7-vhome-head a:hover{border-bottom-color:#fff}',
    '#sr7-tech-videos .sr7-vtrack{gap:14px;padding:0 var(--vp) 4px;scroll-padding:0 var(--vp)}',
    '#sr7-tech-videos .sr7-vtile{display:block;flex:0 0 78%}',
    '#sr7-tech-videos .sr7-vtile .thumb{border-radius:0}',
    '#sr7-tech-videos .sr7-vtile .thumb::after{height:40%}',
    '#sr7-tech-videos .sr7-vtile .sr7-play{left:12px;bottom:12px;width:44px;height:44px;background:rgba(20,20,20,.82);border:2px solid #fff;transition:transform .2s,background .2s}',
    '#sr7-tech-videos .sr7-vtile:hover .sr7-play{transform:scale(1.08);background:#000}',
    '#sr7-tech-videos .sr7-vtile h3{margin:12px 0 0;font:700 clamp(18px,4.8vw,21px)/1.28 var(--font-head,Georgia,serif);-webkit-line-clamp:3}',
    '#sr7-tech-videos .sr7-vtile:hover h3{text-decoration:underline;text-underline-offset:3px}',
    '#sr7-tech-videos .v-t{display:block;margin-top:8px;font:400 13px/1.3 var(--font,system-ui,sans-serif);color:rgba(255,255,255,.68)}',
    /* desktop */
    '@media (min-width:901px){',
    '  .t-hero{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:36px;align-items:center;padding:6px 0 30px;border-bottom:1px solid var(--line,#e6e8eb)}',
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
    '  #sr7-tech-videos.sr7-vhome{--vp:24px;padding:34px 0 44px}',
    '  #sr7-tech-videos .sr7-vtrack{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);column-gap:32px;align-items:start;overflow:visible;scroll-snap-type:none}',
    '  #sr7-tech-videos .sr7-vtile:first-child{grid-column:1;grid-row:1/span 4}',
    '  #sr7-tech-videos .sr7-vtile:first-child h3{margin-top:16px;font-size:clamp(26px,2.6vw,34px);line-height:1.2;-webkit-line-clamp:4}',
    '  #sr7-tech-videos .sr7-vtile:first-child .sr7-play{left:18px;bottom:18px;width:60px;height:60px}',
    '  #sr7-tech-videos .sr7-vtile:first-child .sr7-play svg{width:26px;height:26px}',
    '  #sr7-tech-videos .sr7-vtile:first-child .v-t{font-size:14px}',
    '  #sr7-tech-videos .sr7-vtile:not(:first-child){grid-column:2;display:grid;grid-template-columns:42% minmax(0,1fr);gap:16px;align-items:start;padding:16px 0;border-top:1px solid rgba(255,255,255,.18)}',
    '  #sr7-tech-videos .sr7-vtile:nth-child(2){padding-top:0;border-top:0}',
    '  #sr7-tech-videos .sr7-vtile:nth-child(n+6){display:none}',
    '  #sr7-tech-videos .sr7-vtile:not(:first-child) h3{margin:0;font-size:17px;line-height:1.3}',
    '  #sr7-tech-videos .sr7-vtile:not(:first-child) .sr7-play{left:8px;bottom:8px;width:34px;height:34px}',
    '  #sr7-tech-videos .sr7-vtile:not(:first-child) .sr7-play svg{width:15px;height:15px}',
    '}',
    '@media (min-width:1329px){#sr7-tech-videos.sr7-vhome{--vp:calc((100vw - 1280px)/2 + 24px)}}',
    '@media (min-width:1200px){.t-more-list{grid-template-columns:repeat(4,minmax(0,1fr))}}'
  ].join('\n');

  /* ================= structured data ================= */
  function addLD(label, items, canon) {
    try {
      var ld = [
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: label, url: canon, isPartOf: { '@type': 'WebSite', url: ORIGIN + '/' } },
        { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items.slice(0, 12).map(function (p, i) { return { '@type': 'ListItem', position: i + 1, url: p.url, name: p.title }; }) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: label } ] }
      ];
      var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    } catch (e) {}
  }

  /* /search/label/Technology  ->  shows /Technology in the address bar.
     Only when /Technology really redirects (Blogger > Settings > Custom redirects), so reload/share never 404s.
     Search engines still use the canonical label URL. */
  function prettyUrl() {
    var slug = CFG.prettyUrl;
    if (!slug || !window.history || !history.replaceState) return;
    if (!/\/search\/label\//i.test(location.pathname)) return;
    fetch(ORIGIN + '/' + slug, { redirect: 'manual', cache: 'no-store' }).then(function (r) {
      if (r.type === 'opaqueredirect' || (r.status >= 300 && r.status < 400)) history.replaceState(history.state, '', '/' + slug);
    }).catch(function () {});
  }

  /* ================= build ================= */
  function init() {
    var root = $('#sr7-tech');
    if (!root || root.getAttribute('data-sr7-init')) return;
    root.setAttribute('data-sr7-init', '1');
    var label = root.getAttribute('data-label') || 'Technology';
    var domItems = fromDom(root), orig = root.innerHTML;
    var canon = (($('link[rel="canonical"]') || {}).href) || (ORIGIN + location.pathname);

    var st = document.createElement('style'); st.id = 'sr7-tech-css'; st.textContent = CSS; document.head.appendChild(st);

    var safe = encodeURIComponent(label);
    var main = getFeed(safe, 1, CFG.firstBatch);
    var techVids = getFeed(encodeURIComponent(CFG.videoLabel) + '/' + safe, 1, CFG.railMax);   // BOTH labels only

    main.then(function (res) {
     try {
      var fromFeed = res.items.length > 0;
      var posts = (fromFeed ? res.items : domItems).filter(function (p) { return !isVideo(p); });
      if (!posts.length) return;                           // keep the theme's own grid

      var hi = 0; for (var i = 0; i < posts.length; i++) { if (posts[i].image) { hi = i; break; } }
      var hero = posts.splice(hi, 1)[0];
      var top = posts.splice(0, CFG.topCount);
      var more = posts;
      var start = fromFeed ? res.raw + 1 : domItems.length + 1, total = fromFeed ? res.total : 0;   // total 0 = unknown

      root.innerHTML =
        '<h1 class="t-sr">' + esc(label) + '</h1>' +
        heroHTML(hero) +
        '<div class="t-rows" id="sr7-tech-top">' + top.map(rowHTML).join('') + '</div>' +
        '<div id="sr7-tech-rail"></div>' +
        '<section class="t-sec" id="sr7-tech-more" aria-label="' + esc(CFG.moreTitle) + '"' + (more.length ? '' : ' hidden') + '>' +
          '<h2 class="t-sec-h">' + esc(CFG.moreTitle) + '</h2>' +
          '<div class="t-more-list" id="sr7-tech-list">' + more.map(cardHTML).join('') + '</div>' +
        '</section>' +
        '<div class="t-more-wrap" id="sr7-tech-btnwrap"' + (!total || start <= total ? '' : ' hidden') + '><button class="btn btn-red" id="sr7-tech-btn" type="button">Load more stories</button></div>';
      root.classList.add('is-on');
      var pager = root.parentNode && root.parentNode.querySelector('.pager'); if (pager) pager.hidden = true;
      addLD(label, [hero].concat(top, more), canon);
      resolveImages([hero].concat(top, more));
      prettyUrl();

      /* Videos rail: only posts labelled Videos AND this label; hidden when there are none */
      techVids.then(function (tv) {
        var v = tv.items.slice(0, CFG.railMax);
        if (!v.length) return;
        $('#sr7-tech-rail').innerHTML = railHTML(v);
        resolveImages(v);
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
            resolveImages(add);
          }
          if (r.failed || r.raw < CFG.moreBatch || (total && start > total)) wrap.hidden = true;
          btn.textContent = 'Load more stories'; busy = false;
        });
      });
     } catch (err) { root.innerHTML = orig; root.classList.remove('is-on'); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
