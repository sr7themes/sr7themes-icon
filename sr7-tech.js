/*! SR7 Technology label layout v2.0  |  The Orpte / SR7Themes
 *  BBC Technology-style label page (bbc.com/technology):
 *  centred title -> 3-column top (2 cards | big hero | 2 cards) -> "Keeping Tabs" (2 big cards)
 *  -> dark "Watch" video band (big player card + "Explore more") -> "In case you missed it" (4 cards)
 *  -> "More Tech" rows (time | headline + summary | image right) with numbered pagination.
 *  - Self-contained: injects its own CSS, reads the Blogger JSON feed, adds JSON-LD.
 *  - Needs the shell  <div id="sr7-tech" data-label="Technology">  rendered by the theme.
 *  - If it fails, the theme's normal post grid stays visible (no blank page).
 *  - Posts without a Blogger thumbnail get their first image (or YouTube thumbnail) read from the post itself.
 */
(function () {
  'use strict';

  /* ================= SETTINGS ================= */
  var CFG = {
    videoLabels: ['videos', 'video'],   // posts with these labels are kept out of the story lists
    videoLabel: 'Videos',               // Watch band = posts that have BOTH this label and the page label
    liveLabels: ['live'],               // a post with one of these labels gets the red LIVE badge when it is the hero
    firstBatch: 25,                     // posts fetched on first load
    pageSize: 12,                       // stories per page of "More Tech" (pages 2, 3 ... are fetched on demand)
    sideCount: 4,                       // small cards beside the hero (2 left + 2 right)
    keepCount: 2,                       // "Keeping Tabs" big cards
    icymiCount: 4,                      // "In case you missed it" cards
    railMax: 6,                         // Watch band: 1 big video + up to 5 in "Explore more"
    keepTitle: 'Keeping Tabs',
    icymiTitle: 'In case you missed it',
    moreTitle: 'More Tech',
    watchTitle: 'Watch',
    exploreTitle: 'Explore more',
    subNav: [],                         // optional topic links under the header, e.g. ['Artificial Intelligence', 'Gadgets']  (blog labels)
    heroChars: 220,
    cardChars: 150,
    rowChars: 180,
    placeholder: '',                    // text on the grey box when a post has no image ('' = site name)
    prettyUrl: ''                       // '' = keep the normal /search/label/... address (set to 'Technology' to show /Technology)
  };

  var ORIGIN = location.origin;
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.1 10.9l7.8-3.8M8.1 13.1l7.8 3.8"/></svg>';
  var LIVE = '<div class="t-live"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="4.6" fill="currentColor"/></svg><span>LIVE</span></div>';
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
  function hasLabel(p, list) {
    return (p.labels || []).some(function (l) { return list.indexOf(String(l).trim().toLowerCase()) > -1; });
  }
  function isVideo(p) { return hasLabel(p, CFG.videoLabels); }
  function isLive(p) { return hasLabel(p, CFG.liveLabels); }
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
    return Promise.resolve().then(function () { return fetch(url); }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
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
  function timeTag(p, cls) { return p.date ? '<time class="' + cls + '" datetime="' + esc(p.date) + '">' + esc(ago(p.date)) + '</time>' : ''; }
  function ph() { return '<span class="t-ph">' + esc(SITE) + '</span>'; }
  function box(p, cls, w, h, eager) {
    return '<a class="' + cls + '" data-pid="' + p.pid + '" data-w="' + w + '" data-h="' + h + '" href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true">' +
      (p.image ? imgTag(p.image, p.title, w, h, eager) : ph()) + '</a>';
  }
  function link(p) { return '<a href="' + esc(p.url) + '">' + esc(p.title) + '</a>'; }

  /* image on top, bold headline, summary (side cards, Keeping Tabs, In case you missed it) */
  function cardHTML(p) {
    return '<article class="t-sc">' + box(p, 't-sc-img', 640, 360) +
      '<div class="t-sc-b"><h3 class="t-sc-t">' + link(p) + '</h3>' +
      (p.summary ? '<p class="t-sc-s">' + esc(clip(p.summary, CFG.cardChars)) + '</p>' : '') + '</div></article>';
  }
  function heroHTML(p) {
    return '<article class="t-hero">' + box(p, 't-hero-img', 1280, 720, true) +
      '<div class="t-hero-b">' + (isLive(p) ? LIVE : '') + '<h2 class="t-hero-t">' + link(p) + '</h2>' +
      (p.summary ? '<p class="t-hero-s">' + esc(clip(p.summary, CFG.heroChars)) + '</p>' : '') + '</div></article>';
  }
  /* More Tech row: time | headline + summary | image on the right */
  function itemHTML(p) {
    return '<article class="t-item"><div class="t-item-time">' + timeTag(p, 't-tm') + '</div>' +
      '<div class="t-item-b"><h3 class="t-item-t">' + link(p) + '</h3>' +
      (p.summary ? '<p class="t-item-s">' + esc(clip(p.summary, CFG.rowChars)) + '</p>' : '') + '</div>' +
      box(p, 't-item-img', 640, 360) + '</article>';
  }
  function sectionHTML(id, title, cls, items) {
    return '<section class="t-sec" id="' + id + '" aria-label="' + esc(title) + '"><h2 class="t-h">' + esc(title) + '</h2>' +
      '<div class="' + cls + '">' + items.map(cardHTML).join('') + '</div></section>';
  }
  function exHTML(p) {
    return '<a class="t-ex" href="' + esc(p.url) + '"><span class="t-ex-th" data-pid="' + p.pid + '" data-w="480" data-h="270">' +
      (p.image ? imgTag(p.image, p.title, 480, 270, false) : ph()) +
      '<span class="t-ex-play" aria-hidden="true">' + PLAY + '</span></span><span class="t-ex-t">' + esc(p.title) + '</span></a>';
  }
  function watchHTML(v, label) {
    var f = v[0], rest = v.slice(1);
    var chips = (f.labels || []).filter(function (l) {
      var k = String(l).trim().toLowerCase();
      return CFG.videoLabels.indexOf(k) < 0 && k !== String(label).trim().toLowerCase();
    }).slice(0, 6);
    return '<section aria-label="' + esc(CFG.watchTitle) + '" class="sr7-vhome t-watch' + (rest.length ? '' : ' t-solo') + '" id="sr7-tech-videos"><div class="t-w-in">' +
      '<div class="t-w-head"><h2>' + esc(CFG.watchTitle) + '</h2><a href="' + esc(ORIGIN + '/search/label/' + encodeURIComponent(CFG.videoLabel)) + '">More videos \u2192</a></div>' +
      '<div class="t-w-grid">' +
        '<a class="t-w-vid" data-pid="' + f.pid + '" data-w="1280" data-h="720" href="' + esc(f.url) + '" aria-label="' + esc(f.title) + '">' +
          (f.image ? imgTag(f.image, f.title, 1280, 720, false) : ph()) +
          '<span class="t-w-play" aria-hidden="true">' + PLAY + '</span></a>' +
        '<div class="t-w-cap"><h3 class="t-w-t">' + link(f) + '</h3>' +
          (f.summary ? '<p class="t-w-s">' + esc(clip(f.summary, CFG.heroChars)) + '</p>' : '') +
          (f.date ? '<div class="t-w-meta">' + timeTag(f, 't-tm') + '</div>' : '') +
          (chips.length ? '<ul class="t-chips">' + chips.map(function (l) {
            return '<li><a href="' + esc(ORIGIN + '/search/label/' + encodeURIComponent(l)) + '">' + esc(l) + '</a></li>';
          }).join('') + '</ul>' : '') +
          '<button class="t-share" type="button" data-url="' + esc(f.url) + '" data-title="' + esc(f.title) + '"><span>Share</span>' + SHARE + '</button>' +
        '</div>' +
        (rest.length ? '<div class="t-w-ex"><div class="t-w-ex-in"><h3 class="t-w-ex-h">' + esc(CFG.exploreTitle) + '</h3>' + rest.map(exHTML).join('') + '</div></div>' : '') +
      '</div></div></section>';
  }
  function subNavHTML() {
    if (!CFG.subNav.length) return '';
    return '<nav class="t-sub" aria-label="Related topics">' + CFG.subNav.map(function (l) {
      return '<a href="' + esc(ORIGIN + '/search/label/' + encodeURIComponent(l)) + '">' + esc(l) + '</a>';
    }).join('') + '</nav>';
  }
  function pageList(cur, total) {
    var out = [], i;
    if (total <= 7) { for (i = 1; i <= total; i++) out.push(i); return out; }
    if (cur <= 4) return [1, 2, 3, 4, 5, '\u2026', total];
    if (cur >= total - 3) return [1, '\u2026', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '\u2026', cur - 1, cur, cur + 1, '\u2026', total];
  }

  /* ================= CSS (injected, so the theme stays light) ================= */
  var CSS = [
    '.sr7-tech{--t-body:Georgia,"Times New Roman",serif;display:block;color:var(--ink,#141414)}',
    '.sr7-tech a{color:inherit;text-decoration:none}',
    '.sr7-tech a:hover{color:inherit;text-decoration:underline;text-underline-offset:3px}',
    '.sr7-tech .t-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.sr7-tech .t-tm{font:400 13px/1.4 var(--font,system-ui,sans-serif);color:var(--muted,#6b7077)}',
    '.sr7-tech .t-ph{display:grid;place-items:center;width:100%;height:100%;padding:8px;text-align:center;background:linear-gradient(135deg,var(--red-soft,#e6edf8),var(--surface-2,#f1f2f4));color:var(--muted,#6b7077);font:800 clamp(13px,3.6vw,20px)/1.15 var(--font-head,Georgia,serif)}',
    /* topic links + page title */
    '.t-sub{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 22px;padding:10px 0;border-bottom:1px solid var(--line,#e6e8eb);font:500 13px/1.3 var(--font,system-ui,sans-serif)}',
    '.t-title{margin:26px 0 26px;text-align:center;font:400 clamp(26px,3vw,34px)/1.2 var(--font-head,Georgia,serif)}',
    /* top block: 2 cards | hero | 2 cards */
    '.t-top{display:flex;flex-direction:column}',
    '.t-hero{order:-1;display:block;text-align:center;margin:0 0 6px}',
    '.t-hero-img{display:block;overflow:hidden;aspect-ratio:16/9;background:var(--surface-2,#f1f2f4);width:100vw;max-width:100vw;margin-left:calc(50% - 50vw)}',
    '.t-hero-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-hero-b{padding:12px 0 18px}',
    '.t-live{display:inline-flex;align-items:center;gap:6px;margin:2px 0 8px;color:#d6001c;font:800 26px/1 var(--font,system-ui,sans-serif);letter-spacing:.01em}',
    '.t-live svg{width:28px;height:28px}',
    '.t-hero-t{margin:0 0 12px;font:400 clamp(28px,8vw,36px)/1.14 var(--font-head,Georgia,serif);letter-spacing:-.01em}',
    '.t-hero-s{margin:0 auto;font:400 16px/1.45 var(--t-body);color:var(--ink-2,#3c3f44)}',
    /* card: image on top (desktop) / text left + image right (phone) */
    '.t-sc{display:grid;grid-template-columns:minmax(0,1fr) 34%;gap:14px;align-items:start;padding:16px 0;border-bottom:1px solid var(--line,#e6e8eb)}',
    '.t-sc-img{order:2;display:block;overflow:hidden;aspect-ratio:16/9;background:var(--surface-2,#f1f2f4)}',
    '.t-sc-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-sc-b{order:1;min-width:0}',
    '.t-sc-t{margin:0 0 6px;font:700 clamp(17px,4.6vw,20px)/1.25 var(--font-head,Georgia,serif)}',
    '.t-sc-s{margin:0;font:400 14.5px/1.45 var(--t-body);color:var(--ink-2,#3c3f44);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
    /* section heading: thick rule + small caps label */
    '.t-sec{margin:44px 0 0}',
    '.t-h{margin:0 0 18px;padding-top:12px;border-top:2px solid var(--ink,#141414);font:800 14px/1.2 var(--font,system-ui,sans-serif);letter-spacing:.03em;text-transform:uppercase}',
    '.t-keep,.t-icymi{display:block}',
    '.t-keep .t-sc{display:block;padding:0 0 20px;border:0}',
    '.t-keep .t-sc-img{display:block}',
    '.t-keep .t-sc-t{margin:12px 0 8px}',
    '.t-keep .t-sc-s{display:block;-webkit-line-clamp:none}',
    /* Watch band (full-bleed dark, same .sr7-vhome class as the theme, restyled for this page only) */
    '#sr7-tech-videos.sr7-vhome{width:100vw;max-width:100vw;margin:48px calc(50% - 50vw) 0;padding:20px 0 40px;background:#141518;color:#fff;border-radius:0;overflow:visible}',
    '#sr7-tech-videos a,#sr7-tech-videos a:hover{color:#fff}',
    '.t-w-in{max-width:1280px;margin:0 auto;padding:0 16px}',
    '.t-w-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:0 0 22px;padding-top:12px;border-top:2px solid #fff}',
    '.t-w-head h2{margin:0;font:800 14px/1.2 var(--font,system-ui,sans-serif);letter-spacing:.03em;text-transform:uppercase;color:#fff}',
    '.t-w-head a{font:700 13px/1.2 var(--font,system-ui,sans-serif)}',
    '.t-w-grid{display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"vid" "cap" "ex"}',
    '.t-w-vid{grid-area:vid;position:relative;display:block;aspect-ratio:16/9;overflow:hidden;background:#000}',
    '.t-w-vid img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-w-vid .t-ph{background:#0b0c0e;color:#8c8f96}',
    '.t-w-play{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(170,170,170,.86);display:grid;place-items:center;transition:background .2s}',
    '.t-w-play svg{width:28px;height:28px;fill:#141518;margin-left:3px}',
    '.t-w-vid:hover .t-w-play{background:rgba(205,205,205,.95)}',
    '.t-w-cap{grid-area:cap;padding-top:14px}',
    '.t-w-t{margin:0 0 8px;font:500 clamp(21px,5.4vw,26px)/1.25 var(--font-head,Georgia,serif);color:#fff}',
    '.t-w-s{margin:0 0 10px;font:400 15px/1.45 var(--t-body);color:#d3d4d6}',
    '.t-w-meta{margin:0 0 12px}',
    '#sr7-tech-videos .t-tm{color:#b7b9bd}',
    '.t-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;padding:0;list-style:none}',
    '.t-chips a{display:block;padding:8px 12px;background:#3b3c40;font:400 14px/1.2 var(--font,system-ui,sans-serif)}',
    '#sr7-tech-videos .t-chips a:hover{background:#4a4b50;text-decoration:none}',
    '.t-share{display:inline-flex;align-items:center;gap:8px;padding:0;color:#fff;font:600 14px/1.2 var(--font,system-ui,sans-serif)}',
    '.t-share svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}',
    '.t-share svg circle{fill:currentColor;stroke:none}',
    '.t-w-ex{grid-area:ex;margin-top:24px}',
    '.t-w-ex-h{margin:0 0 12px;font:800 14px/1.2 var(--font,system-ui,sans-serif);letter-spacing:.03em;text-transform:uppercase;color:#fff}',
    '.t-ex{display:grid;grid-template-columns:42% minmax(0,1fr);gap:14px;align-items:start;padding:12px 0;border-top:1px solid rgba(255,255,255,.2)}',
    '.t-w-ex-h + .t-ex{border-top:0;padding-top:0}',
    '.t-ex-th{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;background:#0b0c0e}',
    '.t-ex-th img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-ex-th .t-ph{background:#0b0c0e;color:#8c8f96;font-size:12px}',
    '.t-ex-play{position:absolute;left:0;bottom:0;width:22px;height:22px;background:#141518;display:grid;place-items:center}',
    '.t-ex-play svg{width:11px;height:11px;fill:#fff;margin-left:1px}',
    '.t-ex-t{font:700 16px/1.28 var(--font-head,Georgia,serif);color:#fff}',
    '.t-ex:hover .t-ex-t{text-decoration:underline;text-underline-offset:3px}',
    '.t-solo .t-w-grid{grid-template-areas:"vid" "cap"}',
    /* More Tech list */
    '.t-list{display:block}',
    '.t-item{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 36%;grid-template-areas:"time time" "body img";gap:6px 14px;padding:16px 0 20px;border-bottom:1px solid var(--line,#e6e8eb)}',
    '.t-item-time{grid-area:time}',
    '.t-item-b{grid-area:body;min-width:0}',
    '.t-item-img{grid-area:img;display:block;overflow:hidden;aspect-ratio:16/9;background:var(--surface-2,#f1f2f4)}',
    '.t-item-img img{display:block;width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}',
    '.t-item-t{margin:0 0 8px;font:700 clamp(18px,4.8vw,22px)/1.22 var(--font-head,Georgia,serif)}',
    '.t-item-s{margin:0;font:400 15px/1.45 var(--t-body);color:var(--ink-2,#3c3f44);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
    '.t-list[aria-busy="true"]{opacity:.45;transition:opacity .15s}',
    '.t-more{scroll-margin-top:90px}',
    '.t-pager{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:34px 0 8px}',
    '.t-pager button,.t-pager span{display:inline-grid;place-items:center;min-width:40px;height:40px;padding:0 10px;font:600 15px/1 var(--font,system-ui,sans-serif)}',
    '.t-pager button{background:var(--surface-2,#f1f2f4);color:var(--ink,#141414)}',
    '.t-pager button:hover{background:var(--line,#e6e8eb)}',
    '.t-pager button[aria-current="page"]{background:var(--ink,#141414);color:var(--surface,#fff)}',
    '.t-pager span{color:var(--muted,#6b7077)}',
    /* small tablets */
    '@media (min-width:701px){',
    '  .t-w-in{padding:0 24px}',
    '  .t-icymi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px}',
    '  .t-sc{display:block;padding:0 0 18px;border:0}',
    '  .t-sc-img{display:block}',
    '  .t-sc-t{margin:12px 0 8px}',
    '  .t-sc-s{-webkit-line-clamp:none}',
    '  .t-keep{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px}',
    '  .t-keep .t-sc-t{font-size:20px}',
    '  .t-item{grid-template-columns:96px minmax(0,1fr) 260px;grid-template-areas:"time body img";gap:20px;padding:18px 0 22px;border-bottom:0}',
    '  .t-item::after{content:"";position:absolute;left:116px;right:0;bottom:0;height:1px;background:var(--line,#dcdcdc)}',
    '  .t-item-t{font-size:clamp(20px,2.1vw,25px);margin-bottom:10px}',
    '  .t-item-s{-webkit-line-clamp:none;font-size:16px}',
    '  .t-list{max-width:1060px;margin:0 auto}',
    '  .t-pager{margin-top:38px}',
    '}',
    /* desktop */
    '@media (min-width:901px){',
    '  .t-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.05fr) minmax(0,1fr);gap:0 14px;align-items:start}',
    '  .t-hero{order:0;margin:0}',
    '  .t-hero-img{width:auto;max-width:none;margin-left:0}',
    '  .t-hero-b{padding:10px 8px 0}',
    '  .t-hero-s{max-width:560px}',
    '  .t-top .t-sc{padding:0 0 18px;margin:0 0 18px;border-bottom:1px solid var(--line,#e6e8eb)}',
    '  .t-icymi{grid-template-columns:repeat(4,minmax(0,1fr))}',
    '  .t-w-grid{grid-template-columns:minmax(0,3.25fr) minmax(0,1fr);grid-template-areas:"vid ex" "cap .";column-gap:14px}',
    '  .t-w-ex{margin-top:0;position:relative;min-height:0}',
    '  .t-w-ex-in{position:absolute;inset:0;overflow:hidden}',
    '  .t-solo .t-w-grid{grid-template-columns:minmax(0,1fr);grid-template-areas:"vid" "cap"}',
    '}',
    '@media (max-width:900px){',
    '  .t-top .t-left,.t-top .t-right{display:block}',
    '}'
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

      /* hero: a LIVE post with an image first, else the first post with an image, else the first post */
      var hi = -1, i;
      for (i = 0; i < posts.length; i++) { if (isLive(posts[i]) && posts[i].image) { hi = i; break; } }
      if (hi < 0) for (i = 0; i < posts.length; i++) { if (posts[i].image) { hi = i; break; } }
      if (hi < 0) hi = 0;
      var hero = posts.splice(hi, 1)[0];
      var side = posts.splice(0, CFG.sideCount);
      var keep = posts.splice(0, CFG.keepCount);
      var icymi = posts.splice(0, CFG.icymiCount);
      var more = posts;
      var left = side.filter(function (_, k) { return k % 2 === 0; }), right = side.filter(function (_, k) { return k % 2 === 1; });
      var PS = CFG.pageSize, page = 1, cache = { 1: more }, busy = false;
      var total = fromFeed ? res.total : 0;
      var pages = (fromFeed && total > res.raw) ? 1 + Math.ceil((total - res.raw) / PS) : 1;

      root.innerHTML =
        subNavHTML() +
        '<h1 class="t-title">' + esc(label) + '</h1>' +
        '<div class="t-top"><div class="t-col t-left">' + left.map(cardHTML).join('') + '</div>' + heroHTML(hero) +
          '<div class="t-col t-right">' + right.map(cardHTML).join('') + '</div></div>' +
        (keep.length ? sectionHTML('sr7-tech-keep', CFG.keepTitle, 't-keep', keep) : '') +
        '<div id="sr7-tech-rail"></div>' +
        (icymi.length ? sectionHTML('sr7-tech-icymi', CFG.icymiTitle, 't-icymi', icymi) : '') +
        '<section class="t-sec t-more" id="sr7-tech-more" aria-label="' + esc(CFG.moreTitle) + '"' + (more.length || pages > 1 ? '' : ' hidden') + '>' +
          '<h2 class="t-h">' + esc(CFG.moreTitle) + '</h2>' +
          '<div class="t-list" id="sr7-tech-list">' + more.map(itemHTML).join('') + '</div>' +
          '<nav class="t-pager" id="sr7-tech-pager" aria-label="Pagination"' + (pages > 1 ? '' : ' hidden') + '></nav>' +
        '</section>';
      root.classList.add('is-on');
      var pager = root.parentNode && root.parentNode.querySelector('.pager'); if (pager) pager.hidden = true;
      addLD(label, [hero].concat(side, keep, icymi, more), canon);
      resolveImages([hero].concat(side, keep, icymi, more));
      prettyUrl();

      /* Watch band: only posts labelled Videos AND this label; hidden when there are none */
      techVids.then(function (tv) {
        var v = tv.items.slice(0, CFG.railMax);
        if (!v.length) return;
        $('#sr7-tech-rail').innerHTML = watchHTML(v, label);
        resolveImages(v);
      });

      /* Share button (native share sheet, else copy the link) */
      root.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.t-share') : null; if (!b) return;
        var u = b.getAttribute('data-url'), t = b.getAttribute('data-title');
        if (navigator.share) { navigator.share({ title: t, url: u }).catch(function () {}); }
        else if (navigator.clipboard) {
          navigator.clipboard.writeText(u).then(function () {
            var s = b.querySelector('span'); s.textContent = 'Link copied';
            setTimeout(function () { s.textContent = 'Share'; }, 1800);
          }).catch(function () {});
        }
      });

      /* Numbered pagination for More Tech (page 1 = leftovers of the first batch, later pages are fetched) */
      var pagerEl = $('#sr7-tech-pager'), listEl = $('#sr7-tech-list');
      function renderPager() {
        if (pages <= 1) { pagerEl.hidden = true; return; }
        pagerEl.hidden = false;
        pagerEl.innerHTML = pageList(page, pages).map(function (n) {
          return n === '\u2026' ? '<span aria-hidden="true">\u2026</span>'
            : '<button type="button" data-p="' + n + '" aria-label="Page ' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + n + '</button>';
        }).join('');
      }
      function loadPage(n) {
        if (cache[n]) return Promise.resolve(cache[n]);
        var from = res.raw + 1 + (n - 2) * PS;
        return getFeed(safe, from, PS).then(function (r) {
          if (r.failed) throw new Error('feed');
          var items = r.items.filter(function (p) { return !isVideo(p); });
          cache[n] = items; return items;
        });
      }
      function go(n) {
        if (busy || n === page || n < 1 || n > pages) return;
        busy = true; listEl.setAttribute('aria-busy', 'true');
        loadPage(n).then(function (items) {
          listEl.innerHTML = items.map(itemHTML).join('');
          page = n; renderPager(); resolveImages(items);
          try { $('#sr7-tech-more').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }).catch(function () {}).then(function () { listEl.removeAttribute('aria-busy'); busy = false; });
      }
      pagerEl.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('button[data-p]') : null;
        if (b) go(+b.getAttribute('data-p'));
      });
      renderPager();
     } catch (err) { root.innerHTML = orig; root.classList.remove('is-on'); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
