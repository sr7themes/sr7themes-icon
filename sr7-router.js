/*! SR7 Router v1.0 | PJAX / client-side routing for Blogger | The Orpte / SR7Themes
 *
 * INSTALL: Theme > Edit HTML, paste right before </body> (after your other scripts):
 *   <script type='text/javascript'>  then  //<![CDATA[  on the next line
 *   ...this whole file...
 *   (closing CDATA marker, then the closing script tag)
 *
 * WHAT IT SWAPS: everything between <header class='site-header'> and <footer class='footer'>
 * (hero ads, trending, #main, sidebar). Header, footer, cookie bar, drawer, login stay alive.
 *
 * HOOKS (section 6): SR7Router.on('leave' | 'before' | 'ready', fn)
 * EVENTS:            document 'sr7:route:leave' / 'sr7:route:ready'  (event.detail = ctx)
 * ESCAPE HATCHES:    <a data-no-pjax>, <script data-pjax-ignore>, <script data-pjax-rerun>,
 *                    <meta name='sr7-router-off'> in a page = always hard-load that page.
 */
(function (w, d) {
'use strict';
if (w.SR7Router) return;
if (!w.fetch || !w.Promise || !w.Map || !w.URL || !w.DOMParser || !w.history || !history.pushState || !Element.prototype.closest) return;
if (/[?&]sr7(embed|card)=1(&|$)/.test(location.search)) return;

/* ===================================================================
   1. CONFIG
   =================================================================== */
var CFG = {
  startAnchor: 'header.site-header',          // swap starts after this element ...
  endAnchor: 'footer.footer',                 // ... and stops before this one (must be siblings)
  focusTarget: '#main',                       // receives focus after each swap (a11y)
  navLinks: ['#main-nav a'],                  // header links whose class/aria-current follow the new page
  exclude: function (u) {                     // URLs that must always do a normal page load
    return /^\/(feeds|b|_)(\/|$)/i.test(u.pathname) ||
           /\.(xml|json|pdf|zip|rar|mp4|mp3|jpe?g|png|gif|webp|svg|js|css|txt)$/i.test(u.pathname);
  },
  timeout: 12000,                             // ms before falling back to a normal load
  cacheTTL: 300000, cacheMax: 30,             // in-memory page cache
  prefetch: true, hoverDelay: 80,             // prefetch on hover / touchstart
  forms: true,                                // also handle GET forms (search) that nobody else handled
  analytics: { mode: 'manual' },              // 'manual' = we send the pageview | 'off' = GA4 Enhanced Measurement does it
  ads: { enabled: true },                     // push() only NEW <ins class="adsbygoogle"> slots after each swap
  reexecSrc: /comment/i,                      // external scripts that must run again on every page (Blogger comments)
  // Scripts living OUTSIDE the swapped region that must run again after a swap.
  // Strings or RegExps matched against the script text of the NEW page.
  rerun: [
    /_WidgetManager\._RegisterWidget\(/       // Blogger widget registration (Blog1 / comments / lightbox / PopularPosts ...)
    // , 'SR7 Technology label layout'        // theme label-page scripts: enable one at a time and test,
    // , 'SR7 Healthcare label layout'        // they must be safe to run twice (no duplicate listeners/CSS)
    // , 'LIVE_LABEL'
  ]
};

/* ===================================================================
   2. HELPERS
   =================================================================== */
var $ = function (s, c) { return (c || d).querySelector(s); };
var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
var uid = function () { return Math.random().toString(36).slice(2, 10); };
var ADPUSH = /adsbygoogle[^;]*push\s*\(/;
var JSTYPE = /^(|module|(text|application)\/(x-)?(java|ecma)script)$/;

/* ===================================================================
   3. PROGRESS BAR (thin red line, YouTube style)
   =================================================================== */
var bar = (function () {
  var el, t, p = 0, on = false;
  function mk() {
    if (el) return;
    var s = d.createElement('style');
    s.textContent = '#sr7-route-bar{position:fixed;top:0;left:0;right:0;height:3px;z-index:2147483000;pointer-events:none;' +
      'background:var(--sr7-bar,#f00);transform-origin:0 50%;transform:scaleX(0);opacity:0;' +
      'transition:transform .25s ease,opacity .25s ease;box-shadow:0 0 8px var(--sr7-bar,rgba(255,0,0,.6))}' +
      '#sr7-route-bar.on{opacity:1}' + CFG.focusTarget + ':focus{outline:none}' +
      '@media(prefers-reduced-motion:reduce){#sr7-route-bar{transition:opacity .15s}}';
    d.head.appendChild(s);
    el = d.createElement('div'); el.id = 'sr7-route-bar';
    el.setAttribute('aria-hidden', 'true'); d.body.appendChild(el);
  }
  function set(v) { p = v; el.style.transform = 'scaleX(' + v + ')'; }
  return {
    start: function () {
      mk(); clearTimeout(t); on = true;
      el.style.transition = 'none'; set(0); void el.offsetWidth; el.style.transition = '';
      el.classList.add('on'); set(0.12);
      (function tick() { if (!on) return; set(p + (0.92 - p) * 0.08); t = setTimeout(tick, 180); })();
    },
    done: function () {
      if (!el) return; on = false; clearTimeout(t); set(1);
      t = setTimeout(function () {
        el.classList.remove('on');
        t = setTimeout(function () { el.style.transition = 'none'; set(0); }, 300);
      }, 180);
    }
  };
})();

var live;
function announce(txt) {
  if (!live) {
    live = d.createElement('div'); live.setAttribute('aria-live', 'polite');
    live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
    d.body.appendChild(live);
  }
  live.textContent = ''; setTimeout(function () { live.textContent = txt; }, 60);
}

/* ===================================================================
   4. FETCH + CACHE
   =================================================================== */
var cache = new Map(), pending = {};
function key(u) { return u.split('#')[0]; }
function load(url, signal) {
  var k = key(url), hit = cache.get(k);
  if (hit && Date.now() - hit.t < CFG.cacheTTL) return Promise.resolve(hit);
  if (pending[k]) return pending[k];
  var p = fetch(k, { credentials: 'same-origin', signal: signal, headers: { 'X-Requested-With': 'sr7-router' } })
    .then(function (r) {
      if (!r.ok || (r.headers.get('content-type') || '').indexOf('text/html') < 0) throw new Error('not-html');
      var fu = new URL(r.url);
      if (fu.origin !== location.origin) throw new Error('cross-origin');
      return r.text().then(function (html) {
        var rec = { t: Date.now(), url: fu.href, html: html };
        cache.set(k, rec);
        if (cache.size > CFG.cacheMax) cache.delete(cache.keys().next().value);
        return rec;
      });
    })
    .then(function (r) { delete pending[k]; return r; }, function (e) { delete pending[k]; throw e; });
  return (pending[k] = p);
}
function prefetch(h) {
  var c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;
  load(h).catch(function () {});
}

/* ===================================================================
   5. DOM SWAP
   =================================================================== */
var BODY_CLS = ['is-item', 'is-list', 'is-search', 'is-home'];
var HEAD_SEL = 'link[rel="canonical"],link[rel="amphtml"],meta[name="description"],meta[name="robots"],meta[name="keywords"],' +
               'meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]';

function typeOf(b) {
  return b.classList.contains('is-home') ? 'home' : b.classList.contains('is-search') ? 'search' :
         b.classList.contains('is-item') ? 'post' : 'list';
}
function region(root) {
  var s = $(CFG.startAnchor, root), e = $(CFG.endAnchor, root);
  if (!s || !e || s.parentNode !== e.parentNode) return null;
  var out = [], n = s.nextSibling;
  while (n && n !== e) { out.push(n); n = n.nextSibling; }
  return out;
}
function keep(n) { return n.nodeType === 1 && n.hasAttribute('data-pjax-keep'); }

/* swap <script>s for inert placeholders so nothing runs by accident; we execute them ourselves, in order */
function neutralize(root, token) {
  var list = [];
  $$('script', root).forEach(function (s) {
    var ph = d.createElement('script');
    ph.type = 'text/sr7-pending'; ph.setAttribute('data-sr7', token + '-' + list.length);
    list.push({
      id: token + '-' + list.length, ph: ph, src: s.getAttribute('src'),
      type: (s.getAttribute('type') || '').toLowerCase(), text: s.textContent,
      attrs: Array.prototype.slice.call(s.attributes).map(function (a) { return [a.name, a.value]; })
    });
    s.parentNode.replaceChild(ph, s);
  });
  return list;
}

function runScript(rec, host) {
  return new Promise(function (res) {
    if (!JSTYPE.test(rec.type)) return res();
    var s = d.createElement('script'), force = false;
    rec.attrs.forEach(function (a) {
      if (a[0] === 'data-pjax-ignore') rec.skip = true;
      if (a[0] === 'data-pjax-rerun') force = true;
      try { s.setAttribute(a[0], a[1]); } catch (e) {}
    });
    if (rec.skip) return res();
    if (rec.src) {
      var abs = new URL(rec.src, location.href).href;
      var loaded = $$('script[src]').some(function (x) { return x.src === abs; });
      if (loaded && !force && !CFG.reexecSrc.test(rec.src)) return res();
      s.async = false; s.onload = s.onerror = function () { res(); };
      host(s);
    } else {
      if (CFG.ads.enabled && ADPUSH.test(rec.text)) return res();   // ads are pushed once, in refreshAds()
      s.text = rec.text; host(s); res();
    }
  });
}
function runAll(list, hostFor) {
  return list.reduce(function (p, r) { return p.then(function () { return runScript(r, hostFor(r)); }); }, Promise.resolve());
}

function swapRegion(doc, token) {
  var recs = neutralize(doc.body, token);
  var oldR = region(d), newR = region(doc), end = $(CFG.endAnchor);
  if (!oldR || !newR || !end) return null;
  oldR.forEach(function (n) { if (!keep(n) && n.parentNode) n.parentNode.removeChild(n); });
  var frag = d.createDocumentFragment();
  newR.forEach(function (n) { if (!keep(n)) frag.appendChild(d.importNode(n, true)); });
  end.parentNode.insertBefore(frag, end);
  var inRegion = [], tail = [];
  recs.forEach(function (r) {
    (newR.some(function (n) { return n === r.ph || (n.contains && n.contains(r.ph)); }) ? inRegion : tail).push(r);
  });
  return { inRegion: inRegion, tail: tail };
}

function syncHead(doc) {
  d.title = doc.title;
  $$(HEAD_SEL, d.head).forEach(function (n) { n.parentNode.removeChild(n); });
  $$(HEAD_SEL, doc.head).forEach(function (n) { d.head.appendChild(d.importNode(n, true)); });
  $$('link[rel="stylesheet"],style', doc.head).forEach(function (n) {
    var ex = n.tagName === 'LINK'
      ? $$('link[rel="stylesheet"]', d.head).some(function (l) { return l.href === n.href; })
      : $$('style', d.head).some(function (s) { return s.textContent === n.textContent; });
    if (!ex) d.head.appendChild(d.importNode(n, true));
  });
}
function syncBody(doc) { BODY_CLS.forEach(function (c) { d.body.classList.toggle(c, doc.body.classList.contains(c)); }); }
function syncNav(doc) {
  CFG.navLinks.forEach(function (sel) {
    var a = $$(sel), b = $$(sel, doc);
    if (!a.length || a.length !== b.length) return;
    a.forEach(function (el, i) {
      el.className = b[i].className;
      var c = b[i].getAttribute('aria-current');
      if (c) el.setAttribute('aria-current', c); else el.removeAttribute('aria-current');
    });
  });
}

/* ===================================================================
   6. HOOKS: re-initialise third-party widgets, analytics, ads
   =================================================================== */
var hooks = { leave: [], before: [], ready: [] };
function emit(name, ctx) {
  hooks[name].forEach(function (fn) { try { fn(ctx); } catch (e) { console.error('[SR7Router]', name, e); } });
  if (name !== 'before') d.dispatchEvent(new CustomEvent('sr7:route:' + name, { detail: ctx }));
}

/* 6a. Built-in re-init for common embeds (each is a no-op if the library is absent) */
var builtins = [
  function disqus(c) {
    if (w.DISQUS && $('#disqus_thread')) {
      try { w.DISQUS.reset({ reload: true, config: function () { this.page.url = c.url; this.page.identifier = c.url; } }); } catch (e) {}
    }
  },
  function twitter() { if (w.twttr && w.twttr.widgets) w.twttr.widgets.load($(CFG.focusTarget) || d); },
  function instagram() { if (w.instgrm && w.instgrm.Embeds) w.instgrm.Embeds.process(); },
  function facebook() { if (w.FB && w.FB.XFBML) w.FB.XFBML.parse($(CFG.focusTarget) || d); },
  function pinterest() { if (w.PinUtils && w.PinUtils.build) w.PinUtils.build(); },
  function addthis() { if (w.addthis && w.addthis.layers && w.addthis.layers.refresh) w.addthis.layers.refresh(); },
  function sharethis() { if (w.__sharethis__ && w.__sharethis__.initialize) w.__sharethis__.initialize(); }
];

/* 6b. Google Analytics / GTM / legacy UA pageview */
function track(ctx) {
  if (CFG.analytics.mode !== 'manual') return;
  var u = new URL(ctx.url), pt = d.title;
  if (typeof w.gtag === 'function') {
    w.gtag('event', 'page_view', { page_title: pt, page_location: u.href, page_path: u.pathname + u.search, page_referrer: ctx.from });
  } else if (w.dataLayer && w.dataLayer.push) {           // GTM: fire a trigger on this custom event
    w.dataLayer.push({ event: 'sr7_pageview', page_title: pt, page_location: u.href, page_path: u.pathname + u.search });
  }
  if (w.ga && w.ga.getAll) {                               // old analytics.js
    try { w.ga.getAll().forEach(function (t) { t.set('page', u.pathname + u.search); t.set('title', pt); t.send('pageview'); }); } catch (e) {}
  }
  if (typeof w.fbq === 'function') { try { w.fbq('track', 'PageView'); } catch (e) {} }
}

/* 6c. AdSense: only brand-new slots get a push(); existing slots are never "refreshed" (policy) */
function refreshAds(root) {
  if (!CFG.ads.enabled) return;
  $$('ins.adsbygoogle:not([data-adsbygoogle-status])', root || d).forEach(function () {
    try { (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch (e) {}
  });
}

/* 6d. YOUR HOOKS go here ------------------------------------------------
   ctx = { url, from, fromType, toType ('home'|'post'|'list'|'search'), doc, first }
   Example:
     SR7Router.on('ready', function (ctx) {
       if (ctx.toType === 'post') { initMyArticleTools(document.getElementById('article')); }
     });
     SR7Router.on('leave', function () { stopMyScrollListener(); });   // tear down before DOM is replaced
------------------------------------------------------------------------ */

/* ===================================================================
   7. ROUTER CORE
   =================================================================== */
var nav = 0, ctl = null, curKey, curPath = location.pathname + location.search, pos = {};

function hard(u) { w.location.assign(u); }
function jump(y) {
  var r = d.documentElement, sb = r.style.scrollBehavior;
  r.style.scrollBehavior = 'auto'; w.scrollTo(0, y); r.style.scrollBehavior = sb;
}
function toHash(h) {
  if (!h || h.length < 2) return false;
  var el; try { el = d.getElementById(decodeURIComponent(h.slice(1))); } catch (e) {}
  if (el) { el.scrollIntoView(); return true; }
  return false;
}

function go(href, o) {
  o = o || {};
  var u;
  try { u = new URL(href, location.href); } catch (e) { return hard(href); }
  if (u.origin !== location.origin || CFG.exclude(u)) return hard(u.href);
  var token = ++nav, from = location.href, timer;
  if (ctl) ctl.abort();
  ctl = w.AbortController ? new AbortController() : null;
  bar.start();
  timer = setTimeout(function () { if (ctl) ctl.abort(); }, CFG.timeout);

  load(u.href, ctl && ctl.signal).then(function (rec) {
    clearTimeout(timer);
    if (token !== nav) return;
    var doc = new DOMParser().parseFromString(rec.html, 'text/html');
    if (doc.querySelector('meta[name="sr7-router-off"]') || !region(doc)) return hard(u.href);

    var fin = new URL(rec.url); fin.hash = u.hash;
    var ctx = { url: fin.href, from: from, fromType: typeOf(d.body), toType: typeOf(doc.body), doc: doc, first: false };

    emit('leave', ctx);
    pos[curKey] = w.pageYOffset;
    emit('before', ctx);

    syncHead(doc); syncBody(doc);
    if (o.push !== false) {
      curKey = uid();
      history.pushState({ sr7: 1, k: curKey }, '', fin.href);
    } else if (o.k) { curKey = o.k; }
    curPath = fin.pathname + fin.search;

    var parts = swapRegion(doc, token + '');
    if (!parts) return hard(u.href);
    syncNav(doc);

    var y = o.push === false ? (pos[curKey] || 0) : 0;
    if (!toHash(fin.hash)) jump(y);

    var tail = parts.tail.filter(function (r) {
      return CFG.rerun.some(function (m) { return typeof m === 'string' ? r.text.indexOf(m) > -1 : m.test(r.text); });
    });
    runAll(parts.inRegion, function (r) {
      return function (s) { var ph = $('script[data-sr7="' + r.id + '"]'); if (ph) ph.parentNode.replaceChild(s, ph); };
    }).then(function () {
      return runAll(tail, function () { return function (s) { d.body.appendChild(s); if (!s.src) d.body.removeChild(s); }; });
    }).then(function () {
      if (token !== nav) return;
      builtins.forEach(function (fn) { try { fn(ctx); } catch (e) {} });
      refreshAds(d);
      track(ctx);
      var f = $(CFG.focusTarget);
      if (f) { if (!f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
      announce(d.title);
      if (!toHash(fin.hash) && y) w.requestAnimationFrame(function () { jump(y); });
      emit('ready', ctx);
      bar.done();
    });
  }).catch(function () {
    clearTimeout(timer);
    if (token === nav) hard(u.href);
  });
}

/* ---- link / form / history interception ---- */
function link(t) {
  var a = t && t.closest && t.closest('a[href]');
  if (!a) return null;
  if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-no-pjax') || a.closest('[data-no-pjax]')) return null;
  if (/\bexternal\b/.test(a.getAttribute('rel') || '')) return null;
  var u; try { u = new URL(a.href, location.href); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return null;
  if (u.pathname === location.pathname && u.search === location.search && u.hash) return null;   // in-page anchor
  if (CFG.exclude(u)) return null;
  return a;
}

d.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var a = link(e.target);
  if (!a) return;
  e.preventDefault();
  if (a.href === location.href) { w.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  go(a.href);
});

d.addEventListener('submit', function (e) {
  var f = e.target;
  if (!CFG.forms || e.defaultPrevented || !f || f.tagName !== 'FORM' || f.hasAttribute('data-no-pjax')) return;
  if ((f.getAttribute('method') || 'get').toLowerCase() !== 'get') return;
  var u; try { u = new URL(f.getAttribute('action') || location.href, location.href); } catch (er) { return; }
  if (u.origin !== location.origin || CFG.exclude(u)) return;
  var q = new URLSearchParams(new FormData(f)).toString();
  u.search = q ? '?' + q : '';
  e.preventDefault(); go(u.href);
});

var hoverT;
d.addEventListener('mouseover', function (e) {
  if (!CFG.prefetch) return;
  var a = link(e.target); if (!a) return;
  clearTimeout(hoverT); hoverT = setTimeout(function () { prefetch(a.href); }, CFG.hoverDelay);
}, { passive: true });
d.addEventListener('mouseout', function () { clearTimeout(hoverT); }, { passive: true });
d.addEventListener('touchstart', function (e) { if (CFG.prefetch) { var a = link(e.target); if (a) prefetch(a.href); } }, { passive: true });

w.addEventListener('popstate', function (e) {
  var st = e.state, u = new URL(location.href);
  if (u.pathname + u.search === curPath) { if (st && st.k) curKey = st.k; return; }   // hash-only change: browser handles it
  go(u.href, { push: false, k: st && st.k });
});

/* ---- scroll position survives reloads and hard back/forward ---- */
try { history.scrollRestoration = 'manual'; } catch (e) {}
try { pos = JSON.parse(sessionStorage.getItem('sr7_pos') || '{}') || {}; } catch (e) { pos = {}; }
var st0 = history.state && history.state.sr7 ? history.state : null;
curKey = st0 ? st0.k : uid();
if (!st0) history.replaceState(Object.assign({}, history.state, { sr7: 1, k: curKey }), '');
function savePos() {
  pos[curKey] = w.pageYOffset;
  try { sessionStorage.setItem('sr7_pos', JSON.stringify(pos)); } catch (e) {}
}
w.addEventListener('pagehide', savePos);
d.addEventListener('visibilitychange', function () { if (d.visibilityState === 'hidden') savePos(); });
if (st0 && pos[curKey] && !location.hash) {
  var y0 = pos[curKey];
  w.requestAnimationFrame(function () { jump(y0); });
  w.addEventListener('load', function () { jump(y0); }, { once: true });
}

/* ===================================================================
   8. PUBLIC API
   =================================================================== */
w.SR7Router = {
  go: go,
  prefetch: prefetch,
  config: CFG,
  refreshAds: refreshAds,
  track: track,
  on: function (name, fn) { if (hooks[name]) hooks[name].push(fn); return this; },
  off: function (name, fn) { if (hooks[name]) hooks[name] = hooks[name].filter(function (f) { return f !== fn; }); return this; }
};
})(window, document);
