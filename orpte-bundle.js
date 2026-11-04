/*! Orpte bundle - all site scripts in one file (main, ads, QR, label layouts, login, article tools, quick read, live).
    Upload to the root of the GitHub repo as orpte-bundle.js. Edit a section, commit, then purge jsDelivr. */

/* ========== main ========== */
try {
(function () {
'use strict';
var $ = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
var ORIGIN = location.origin;
var SETTINGS = {
newsletter: {
action: '',
field: 'email',
extra: {},
title: 'Get the top stories in your inbox',
text: 'A short briefing with the stories that matter. Free, no spam.'
},
checkEveryMs: 120000
};
var LS = { get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#eef0f3"/></svg>');
function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function img(url, w, h) {
if (!url) return PLACEHOLDER;
return url.replace(/\/s\d+(-c)?\//, '/w' + w + '-h' + h + '-p-k-no-nu/').replace(/=s\d+(-c)?$/, '=w' + w + '-h' + h + '-p-k-no-nu');
}
function ago(d) {
var s = (Date.now() - new Date(d)) / 1000;
if (s < 60) return 'Just now';
if (s < 3600) return Math.floor(s / 60) + ' min ago';
if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
if (s < 604800) return Math.floor(s / 86400) + ' days ago';
return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function hhmm(d) { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }); }
var toastTimer;
function toast(html) { var t = $('#toast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 4500); }
/* ---------- Videos section ---------- */
var VIDEO_LABEL = 'Videos';                 /* label used for the feeds (home rail, related videos) */
var VIDEO_LABELS = ['videos', 'video'];     /* any of these labels turns a post into a video post */
var PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
var SHARE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>';
function isVideoLabel(n) { return VIDEO_LABELS.indexOf(String(n || '').trim().toLowerCase()) > -1; }
function vdate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
function vcard(p) {
var u = esc(p.url), t = esc(p.title);
return '<article class="card sr7-vcard"><a class="thumb" href="' + u + '" aria-label="' + t + '"><img loading="lazy" alt="" width="640" height="360" src="' + esc(img(p.image, 640, 360)) + '">' +
'<span class="sr7-play" aria-hidden="true">' + PLAY_SVG + '</span><time class="sr7-vdate" datetime="' + esc(p.date) + '">' + vdate(p.date) + '</time></a>' +
'<div class="sr7-vtitle"><h3><a href="' + u + '">' + t + '</a></h3><button type="button" class="sr7-share" aria-label="Share this video" data-url="' + u + '" data-title="' + t + '">' + SHARE_SVG + '</button></div></article>';
}
/* ---------- Video durations for the blue homepage rail ---------- */
function fmtDur(s) { s = Math.round(s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (x < 10 ? '0' : '') + x; }
function durCache(k, v) { try { if (v === undefined) return +localStorage.getItem('sr7dur:' + k) || 0; localStorage.setItem('sr7dur:' + k, v); } catch (e) {} return 0; }
function durShow(id, s) { $$('.sr7-vdur').forEach(function (n) { if (n.getAttribute('data-id') === String(id)) { n.textContent = fmtDur(s); n.hidden = false; } }); }
function durFile(url, cb) {
var v = document.createElement('video'), done = 0, g;
function end(d) { if (done) return; done = 1; clearTimeout(g); v.removeAttribute('src'); try { v.load(); } catch (e) {} cb(d); }
v.preload = 'metadata'; v.muted = true;
v.onloadedmetadata = function () { end(isFinite(v.duration) ? v.duration : 0); };
v.onerror = function () { end(0); };
g = setTimeout(function () { end(0); }, 8000);
v.src = url;
}
function durYT(id, cb) {
vpYT(function () {
var host = document.createElement('div'), ph = document.createElement('div'), done = 0, tries = 0, pl, tm, g;
host.setAttribute('aria-hidden', 'true');
host.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:180px;opacity:0;pointer-events:none';
host.appendChild(ph); document.body.appendChild(host);
function end(d) { if (done) return; done = 1; clearTimeout(tm); clearTimeout(g); try { pl.destroy(); } catch (e) {} host.remove(); cb(d); }
function poll() { var d = 0; try { d = pl.getDuration(); } catch (e) {} if (d > 0) return end(d); if (++tries > 20) return end(0); tm = setTimeout(poll, 300); }
g = setTimeout(function () { end(0); }, 12000);
try {
pl = new window.YT.Player(ph, { host: 'https://www.youtube-nocookie.com', videoId: id, width: 320, height: 180,
playerVars: { controls: 0, rel: 0, playsinline: 1, origin: location.origin },
events: { onReady: poll, onError: function () { end(0); } } });
} catch (e) { end(0); }
});
}
function vdurInit(vids) {
var rail = $('#sr7-vhome'); if (!rail) return;
var need = [];
vids.forEach(function (p) { var c = durCache(p.id); if (c) durShow(p.id, c); else need.push(String(p.id)); });
if (!need.length) return;
function run() {
fetch(ORIGIN + '/feeds/posts/default/-/' + encodeURIComponent(VIDEO_LABEL) + '?alt=json&max-results=8')
.then(function (r) { return r.json(); })
.then(function (data) {
var jobs = [];
((data.feed || {}).entry || []).forEach(function (e) {
var id = e.id.$t.split('post-').pop();
if (need.indexOf(id) < 0) return;
var html = (e.content && e.content.$t) || '', y = ytId(html), f = (html.match(/https?:\/\/[^"'\s<>]+\.(?:mp4|webm)(?:\?[^"'\s<>]*)?/i) || [])[0];
if (y) jobs.push({ id: id, run: function (cb) { durYT(y, cb); } });
else if (f) jobs.push({ id: id, run: function (cb) { durFile(f.replace(/&amp;/g, '&'), cb); } });
});
var i = 0, active = 0;
function next() {
while (active < 3 && i < jobs.length) {
(function (j) { active++; j.run(function (d) { active--; if (d > 0) { durCache(j.id, Math.round(d)); durShow(j.id, d); } next(); }); })(jobs[i++]);
}
}
next();
}).catch(function () {});
}
if ('IntersectionObserver' in window) {
var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); run(); } }, { rootMargin: '300px' });
io.observe(rail);
} else run();
}
function ytId(u) {
var m = String(u || '').match(/(?:youtube\.com\/(?:embed\/|watch\?(?:[^#]*&)?v=|shorts\/|live\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([\w-]{11})/);
return m ? m[1] : '';
}
/* ==========================================================
SR7 custom video player
- YouTube (IFrame API, loaded only after the first tap) and MP4 / WebM / HLS
- Pre-roll ad from the data-nx-slot="video-top" promos (skippable after 5s)
- Logo watermark, NDTV-style controls (±10s, seek, time, mute, fullscreen)
========================================================== */
var VP_LOGO = 'https://raw.githubusercontent.com/sr7saim45/sr7themes/refs/heads/main/The-orpte-header-logo.svg';
var VI = {
play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
back: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 9a15 15 0 1 1-15 15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M24 2.5 15.5 9 24 15.5z"/><text x="24" y="29.5" text-anchor="middle" font-size="13.5" font-weight="700">10</text></svg>',
fwd: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 9a15 15 0 1 0 15 15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M24 2.5 32.5 9 24 15.5z"/><text x="24" y="29.5" text-anchor="middle" font-size="13.5" font-weight="700">10</text></svg>',
vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>',
fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
fsx: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'
};
function vpFmt(t) {
t = Math.max(0, Math.floor(t || 0));
var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60, p = function (n) { return (n < 10 ? '0' : '') + n; };
return (h ? h + ':' + p(m) : p(m)) + ':' + p(s);
}
/* --- pre-roll ad lookup (window.sr7Ads comes from the ad script at the bottom of the page) --- */
var vpAdR, vpAdQ = [], vpAdAsk = 0, vpAdT0 = 0;
function vpAskAds(done) {
function go() { try { window.sr7Ads.pre(done); } catch (e) { done(null); } }
if (window.sr7Ads) return go();
if (document.readyState === 'complete') return done(null); /* ad script never started (bots / blocked): don't wait */
var n = 0, t = setInterval(function () {
if (window.sr7Ads) { clearInterval(t); go(); } else if (++n > 30) { clearInterval(t); done(null); }
}, 100);
}
function vpGetAd(cb) {
if (vpAdR !== undefined) return cb(vpAdR);
var fired = 0;
function once(r) { if (!fired) { fired = 1; cb(r); } }
vpAdQ.push(once);
if (!vpAdAsk) {
vpAdAsk = 1; vpAdT0 = Date.now();
vpAskAds(function (r) { vpAdR = r || null; vpAdQ.splice(0).forEach(function (f) { f(vpAdR); }); });
}
setTimeout(function () { once(null); }, Math.max(250, 4000 - (Date.now() - vpAdT0)));
}
/* --- lazy script loaders (YouTube API / hls.js are only fetched when actually needed) --- */
var vpS = {};
function vpScript(src, cb) {
var o = vpS[src];
if (o) { if (o.done) cb(); else o.q.push(cb); return; }
o = vpS[src] = { done: 0, q: [cb] };
var s = document.createElement('script'); s.src = src; s.async = true;
s.onload = s.onerror = function () { o.done = 1; o.q.splice(0).forEach(function (f) { f(); }); };
document.head.appendChild(s);
}
var vpYTq = [];
function vpYT(cb) {
if (window.YT && window.YT.Player) return cb();
vpYTq.push(cb);
if (vpYT.l) return; vpYT.l = 1;
var prev = window.onYouTubeIframeAPIReady;
window.onYouTubeIframeAPIReady = function () {
if (prev) { try { prev(); } catch (e) {} }
vpYTq.splice(0).forEach(function (f) { f(); });
};
vpScript('https://www.youtube.com/iframe_api', function () {});
}
/* Secure streaming. Encrypted HLS (#EXT-X-KEY METHOD=AES-128) is decrypted by hls.js; the key is requested from
   SR7_SECURE.keyUrl-style key URLs and can be protected with a login token (see SR7_SECURE below).
   Hardware DRM (Widevine / PlayReady / FairPlay) is switched on by filling window.SR7_DRM. */
var SR7_SECURE = window.SR7_SECURE || {
  /* returns the login token your key server expects (Firebase ID token of the signed-in member) */
  token: function () { try { var u = window.orpteAuth && window.orpteAuth.currentUser; return u && u.getIdToken ? u.getIdToken() : Promise.resolve(''); } catch (e) { return Promise.resolve(''); } }
};
window.SR7_SECURE = SR7_SECURE;
function vpHlsConf() {
  var c = {
    enableWorker: true,
    xhrSetup: function (xhr, url) {
      /* send the member token ONLY to the key / license server, never to the CDN that serves segments */
      if (/\.key(\?|$)|\/key\b|\/license/i.test(url) && SR7_SECURE.tok) { xhr.setRequestHeader('Authorization', 'Bearer ' + SR7_SECURE.tok); }
    }
  };
  var d = window.SR7_DRM;   /* e.g. { widevine:'https://lic.example.com/wv', playready:'https://lic.example.com/pr', fairplay:{ license:'https://lic.example.com/fp', cert:'https://lic.example.com/fp.cer' } } */
  if (d) {
    c.emeEnabled = true; c.drmSystems = {};
    if (d.widevine) c.drmSystems['com.widevine.alpha'] = { licenseUrl: d.widevine };
    if (d.playready) c.drmSystems['com.microsoft.playready'] = { licenseUrl: d.playready };
    if (d.fairplay) c.drmSystems['com.apple.fps'] = { licenseUrl: d.fairplay.license, serverCertificateUrl: d.fairplay.cert };
  }
  return c;
}
function vpAttach(v, src, cb) {
  var isHls = /\.m3u8(\?|$)/i.test(src);
  if (!isHls) { v.src = src; cb(); return; }
  var ready = function () {
    /* hls.js (MSE) first: the <video> only sees a blob: URL and the AES-128 keys stay inside the player */
    var go = function () {
      if (window.Hls && window.Hls.isSupported()) {
        var h = new window.Hls(vpHlsConf()); v._hls = h;
        h.on(window.Hls.Events.ERROR, function (ev, d) { if (d && d.fatal) { try { v.dispatchEvent(new Event('error')); } catch (e) {} } });
        h.loadSource(src); h.attachMedia(v);
      } else if (v.canPlayType && v.canPlayType('application/vnd.apple.mpegurl')) { v.src = src; } /* iOS Safari: native HLS (AES-128 / FairPlay) */
      else v.src = src;
      cb();
    };
    SR7_SECURE.token().then(function (t) { SR7_SECURE.tok = t || ''; go(); }, function () { go(); });
  };
  vpScript('https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js', ready);
}
function vpVideo() {
var v = document.createElement('video');
v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'none'; v.controls = false;
v.setAttribute('controlsList', 'nodownload noremoteplayback noplaybackrate'); v.setAttribute('disablePictureInPicture', ''); v.setAttribute('disableRemotePlayback', '');
v.disablePictureInPicture = true; v.disableRemotePlayback = true; v.draggable = false;
['contextmenu', 'dragstart', 'selectstart'].forEach(function (t) { v.addEventListener(t, function (e) { e.preventDefault(); }); });
return v;
}
function vpBuild(box, cfg) {
var hov = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
box.className = 'sr7-player vp vp-idle ready';
box.setAttribute('tabindex', '0'); box.setAttribute('role', 'region');
box.setAttribute('aria-label', cfg.title || 'Video player');
box.innerHTML =
'<div class="vp-stage"></div>' +
'<img class="vp-poster" alt="" width="1280" height="720" decoding="async" fetchpriority="high">' +
'<img class="vp-wm" alt="" width="97" height="48" decoding="async" src="' + esc(VP_LOGO) + '">' +
'<button class="vp-b vp-mute" type="button"></button>' +
'<button class="vp-b vp-big" type="button" aria-label="Play video"></button>' +
'<div class="vp-mid"><button class="vp-sk vp-bk" type="button" aria-label="Back 10 seconds"></button>' +
'<button class="vp-pp" type="button" aria-label="Play"></button>' +
'<button class="vp-sk vp-fw" type="button" aria-label="Forward 10 seconds"></button></div>' +
'<div class="vp-adrow" hidden><span class="vp-adtag"><b>Ad</b><i class="vp-adt"></i></span>' +
'<a class="vp-learn" target="_blank" rel="sponsored nofollow noopener" hidden>Learn more</a></div>' +
'<button class="vp-skipad" type="button" hidden></button>' +
'<div class="vp-bar"><span class="vp-time">00:00 / 00:00</span>' +
'<div class="vp-seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
'<i class="vp-buf"></i><i class="vp-fill"></i><b class="vp-knob"></b></div>' +
'<button class="vp-fsb" type="button"></button></div>' +
'<div class="vp-recs" hidden></div><div class="vp-spin"></div><div class="vp-msg" hidden></div>';
var q = function (s) { return box.querySelector(s); };
['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut'].forEach(function (t) { box.addEventListener(t, function (e) { if (!e.target.closest || !e.target.closest('.vp-learn')) e.preventDefault(); }, true); });
box.setAttribute('draggable', 'false'); box.classList.add('vp-secure');
var stage = q('.vp-stage'), poster = q('.vp-poster'), mute = q('.vp-mute'), big = q('.vp-big'),
pp = q('.vp-pp'), bk = q('.vp-bk'), fw = q('.vp-fw'), seek = q('.vp-seek'), fill = q('.vp-fill'),
buf = q('.vp-buf'), knob = q('.vp-knob'), tm = q('.vp-time'), fsb = q('.vp-fsb'),
adrow = q('.vp-adrow'), adt = q('.vp-adt'), learn = q('.vp-learn'), skip = q('.vp-skipad'), msg = q('.vp-msg'), recs = q('.vp-recs');
var S = { started: 0, mode: 'idle', drag: 0, dragT: 0, m: 0, live: 0, adOn: 0, ad: null };
var A = null, B = null, V = null, yt = null, iv = 0, hideT = 0, adGuard = 0, ytGuard = 0, blockT = 0;
function AB() { return S.mode === 'ad' ? A : B; }
function spinner(on) { box.classList.toggle('vp-wait', !!on); }
function syncMute() {
var b = AB(), m = b ? b.muted() : !!S.m;
mute.innerHTML = m ? VI.off : VI.vol; mute.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
}
function armHide() {
clearTimeout(hideT);
hideT = setTimeout(function () { if (box.classList.contains('vp-on') && !S.drag) box.classList.remove('vp-ctl'); }, 3000);
}
function showCtl() { box.classList.add('vp-ctl'); if (box.classList.contains('vp-on')) armHide(); }
function tick() {
var b = AB(); if (!b) return;
var t = b.time(), d = b.dur();
if (!S.drag) {
var r = d ? Math.min(1, t / d) : 0;
fill.style.transform = 'scaleX(' + r + ')'; knob.style.left = (r * 100) + '%';
seek.setAttribute('aria-valuenow', Math.round(r * 100));
tm.textContent = vpFmt(t) + ' / ' + vpFmt(d);
}
buf.style.transform = 'scaleX(' + (d ? Math.min(1, b.buf() / d) : 0) + ')';
if (S.mode === 'ad') {
adt.textContent = d ? vpFmt(Math.max(0, d - t)) : '';
var left = Math.ceil(5 - t);
if (d && d <= 6) skip.hidden = true;
else if (left > 0) { skip.hidden = false; skip.textContent = 'Skip in ' + left; skip.disabled = true; }
else { skip.hidden = false; skip.textContent = 'Skip Ad \u203A'; skip.disabled = false; }
}
}
function setPlaying(on) {
box.classList.toggle('vp-on', on);
pp.innerHTML = on ? VI.pause : (S.mode === 'end' ? VI.replay : VI.play);
pp.setAttribute('aria-label', on ? 'Pause' : (S.mode === 'end' ? 'Replay' : 'Play'));
clearInterval(iv);
if (on) { iv = setInterval(tick, 250); showCtl(); }
else { clearTimeout(hideT); box.classList.add('vp-ctl'); }
tick();
}
function fail() {
spinner(0); setPlaying(false); msg.hidden = false;
msg.innerHTML = cfg.kind === 'yt'
? 'This video can\u2019t be played here. <a href="https://www.youtube.com/watch?v=' + esc(cfg.id) + '" target="_blank" rel="noopener">Watch on YouTube</a>'
: 'Sorry, this video couldn\u2019t be loaded.';
}
/* If the browser refuses to auto-start after the ad, fall back to a tap-to-play state */
function armBlock() {
clearTimeout(blockT);
blockT = setTimeout(function () {
var b = AB();
if (b && b.paused() && S.mode === 'live') { spinner(0); setPlaying(false); }
}, 3000);
}
function onS(k) {
if (k === 'play') {
spinner(0); clearTimeout(blockT); box.classList.add('vp-nop'); box.classList.remove('vp-end'); hideRecs(); setPlaying(true); syncMute();
if (S.mode === 'ad' && !S.adOn) {
S.adOn = 1; clearTimeout(adGuard);
var r = S.ad;
setTimeout(function () { if (S.mode === 'ad' && window.sr7Ads) window.sr7Ads.bump(r.id, 'i'); }, 1000);
}
} else if (k === 'pause') { setPlaying(false); }
else if (k === 'wait') { spinner(1); }
else if (k === 'end') { if (S.mode === 'ad') endAd(); else contentEnd(); }
else if (k === 'err') { if (S.mode === 'ad') endAd(); else fail(); }
}
function hideRecs() { recs.hidden = true; box.classList.remove('vp-recs-on'); }
/* YouTube-style "Watch next" screen with the site's own videos */
function showRecs() {
var rs = window.sr7VideoRecs; if (!rs || !rs.length) return;
var tgt = document.documentElement.classList.contains('sr7-embed') ? ' target="_top"' : '';
recs.innerHTML = '<div class="vp-recs-h"><b>Watch next</b><button type="button" class="vp-replay">' + VI.replay + ' Replay</button></div><div class="vp-recs-g">' +
rs.slice(0, 6).map(function (p) {
return '<a class="vp-rc" href="' + esc(p.url) + '"' + tgt + '><span class="vp-rt"><img loading="lazy" alt="" width="320" height="180" src="' + esc(img(p.image, 320, 180)) + '"></span><span class="vp-rn">' + esc(p.title) + '</span><span class="vp-rd">' + esc(ago(p.date)) + '</span></a>';
}).join('') + '</div>';
recs.hidden = false; box.classList.add('vp-recs-on');
recs.querySelector('.vp-replay').addEventListener('click', function () { pp.click(); });
}
function contentEnd() {
S.mode = 'end'; box.classList.add('vp-end'); box.classList.remove('vp-nop'); spinner(0); setPlaying(false); showRecs();
}
/* --- media back-ends --- */
function mkV(v) {
var o = {
el: v,
play: function () { var p = v.play(); if (p && p.catch) p.catch(function (e) { if (o.fail) o.fail(e); }); },
pause: function () { v.pause(); },
seek: function (t) { try { v.currentTime = Math.max(0, t); } catch (e) {} },
time: function () { return v.currentTime || 0; },
dur: function () { return isFinite(v.duration) ? v.duration : 0; },
mute: function (b) { v.muted = b; },
muted: function () { return v.muted; },
paused: function () { return v.paused; },
buf: function () { try { var r = v.buffered; return r.length ? r.end(r.length - 1) : 0; } catch (e) { return 0; } }
};
v.addEventListener('playing', function () { if (o.onS) o.onS('play'); });
v.addEventListener('pause', function () { if (!v.ended && o.onS) o.onS('pause'); });
v.addEventListener('waiting', function () { if (o.onS) o.onS('wait'); });
v.addEventListener('ended', function () { if (o.onS) o.onS('end'); });
v.addEventListener('error', function () { if (o.onS) o.onS('err'); });
return o;
}
function mkY(y) {
var o = {
play: function () { y.playVideo(); }, pause: function () { y.pauseVideo(); },
seek: function (t) { y.seekTo(Math.max(0, t), true); },
time: function () { return y.getCurrentTime ? (y.getCurrentTime() || 0) : 0; },
dur: function () { return y.getDuration ? (y.getDuration() || 0) : 0; },
mute: function (b) { if (b) y.mute(); else y.unMute(); },
muted: function () { return y.isMuted(); },
paused: function () { var s = y.getPlayerState(); return s !== 1 && s !== 3; },
buf: function () { return y.getVideoLoadedFraction ? y.getVideoLoadedFraction() * o.dur() : 0; }
};
return o;
}
function ytInit() {
if (yt) return;
var ph = document.createElement('div'); stage.appendChild(ph);
yt = new window.YT.Player(ph, {
host: 'https://www.youtube-nocookie.com', videoId: cfg.id, width: '100%', height: '100%',
playerVars: { autoplay: S.live ? 1 : 0, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, fs: 0, disablekb: 1, cc_load_policy: 0, color: 'white', origin: location.origin },
events: {
onReady: function () {
clearTimeout(ytGuard); B = mkY(yt);
if (S.m) B.mute(true);
if (S.live) { B.play(); armBlock(); }
},
onStateChange: function (e) {
if (S.mode === 'ad') return;
var c = e.data;
if (c === 1) onS('play'); else if (c === 2) onS('pause'); else if (c === 0) onS('end'); else if (c === 3) onS('wait');
},
onError: function () { fail(); }
}
});
}
/* --- flow: tap -> (pre-roll ad) -> content --- */
function start() {
if (S.started) return; S.started = 1;
box.classList.remove('vp-idle'); spinner(1);
if (cfg.kind === 'yt') vpYT(ytInit);
vpGetAd(function (r) { if (r && r.p && r.p.vid) runAd(r); else startContent(); });
}
function runAd(r) {
var p = r.p, v;
S.ad = r; S.mode = 'ad'; box.classList.add('vp-ad');
if (cfg.kind === 'file') { A = V; v = V.el; }
else { v = vpVideo(); stage.appendChild(v); A = mkV(v); A.onS = onS; }
v.classList.add('vp-advid');
A.fail = function (e) {
if (e && e.name === 'NotAllowedError' && !v.muted) {
v.muted = true; S.m = 1; syncMute(); A.fail = function () { endAd(); }; A.play();
} else endAd();
};
v.muted = !!S.m; v.preload = 'auto';
if (p.img) v.poster = p.img;
v.src = p.vid;
adrow.hidden = false; skip.hidden = false; skip.disabled = true; skip.textContent = 'Skip in 5';
if (p.url) { learn.href = p.url; learn.hidden = false; }
A.play();
adGuard = setTimeout(function () { if (!S.adOn) endAd(); }, 10000);
syncMute();
}
function endAd() {
if (S.mode !== 'ad') return;
clearTimeout(adGuard);
box.classList.remove('vp-ad'); adrow.hidden = true; learn.hidden = true; skip.hidden = true;
if (cfg.kind !== 'file' && A) { A.onS = null; A.pause(); A.el.remove(); } else if (V) { V.el.removeAttribute('poster'); V.el.classList.remove('vp-advid'); }
A = null; S.ad = null;
startContent();
}
function startContent() {
S.mode = 'live'; S.live = 1; box.classList.remove('vp-nop'); spinner(1);
if (cfg.kind === 'yt') {
if (B) { if (S.m) B.mute(true); B.play(); armBlock(); }
else { vpYT(ytInit); clearTimeout(ytGuard); ytGuard = setTimeout(function () { if (!B) fail(); }, 10000); }
} else {
V.fail = function () { spinner(0); setPlaying(false); };
vpAttach(V.el, cfg.src, function () { V.play(); armBlock(); });
}
}
function toggle() {
if (!S.started) return start();
if (S.mode === 'end') { S.mode = 'live'; box.classList.remove('vp-end'); B.seek(0); B.play(); return; }
var b = AB(); if (!b) return;
if (b.paused()) b.play(); else b.pause();
}
function jump(s) {
if (S.mode === 'ad' || !B) return;
var d = B.dur();
B.seek(Math.min(d || 1e9, Math.max(0, B.time() + s)));
if (S.mode === 'end' && s < 0) { S.mode = 'live'; box.classList.remove('vp-end'); B.play(); }
tick(); showCtl();
}
/* --- seek bar --- */
function ratioAt(e) { var r = seek.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / (r.width || 1))); }
function dragTo(e) {
var d = B ? B.dur() : 0; S.dragT = ratioAt(e) * d;
var r = d ? S.dragT / d : 0;
fill.style.transform = 'scaleX(' + r + ')'; knob.style.left = (r * 100) + '%';
tm.textContent = vpFmt(S.dragT) + ' / ' + vpFmt(d);
}
function endDrag() {
if (!S.drag) return; S.drag = 0;
B.seek(S.dragT);
if (S.mode === 'end') { S.mode = 'live'; box.classList.remove('vp-end'); B.play(); }
tick(); showCtl();
}
seek.addEventListener('pointerdown', function (e) {
if (S.mode === 'ad' || !B) return;
S.drag = 1; try { seek.setPointerCapture(e.pointerId); } catch (x) {}
dragTo(e); e.preventDefault();
});
seek.addEventListener('pointermove', function (e) { if (S.drag) dragTo(e); });
seek.addEventListener('pointerup', endDrag);
seek.addEventListener('pointercancel', endDrag);
seek.addEventListener('keydown', function (e) {
if (S.mode === 'ad' || !B) return;
if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { jump(e.key === 'ArrowLeft' ? -5 : 5); e.preventDefault(); e.stopPropagation(); }
});
/* --- fullscreen --- */
function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
function toggleFs() {
if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
var rf = box.requestFullscreen || box.webkitRequestFullscreen;
if (rf) {
var p = rf.call(box);
if (p && p.then) p.then(function () {
try { var l = screen.orientation.lock('landscape'); if (l && l.catch) l.catch(function () {}); } catch (e) {}
}, function () {});
} else if (V && V.el.webkitEnterFullscreen) V.el.webkitEnterFullscreen();
}
function onFs() {
var on = fsEl() === box;
box.classList.toggle('vp-full', on);
fsb.innerHTML = on ? VI.fsx : VI.fs; fsb.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
if (!on) { try { screen.orientation.unlock(); } catch (e) {} }
}
document.addEventListener('fullscreenchange', onFs);
document.addEventListener('webkitfullscreenchange', onFs);
/* --- wiring --- */
big.innerHTML = VI.play; pp.innerHTML = VI.play; bk.innerHTML = VI.back; fw.innerHTML = VI.fwd; fsb.innerHTML = VI.fs; mute.innerHTML = VI.vol;
fsb.setAttribute('aria-label', 'Full screen');
var fb = cfg.kind === 'yt' ? 'https://i.ytimg.com/vi/' + cfg.id + '/hqdefault.jpg' : '';
poster.onerror = function () { if (fb && poster.src !== fb) poster.src = fb; };
poster.onload = function () { if (fb && poster.naturalWidth && poster.naturalWidth <= 120 && poster.src !== fb) poster.src = fb; };
poster.src = cfg.poster || fb;
if (cfg.kind === 'file') { V = mkV(vpVideo()); V.onS = onS; B = V; stage.appendChild(V.el); }
big.addEventListener('click', function (e) { e.stopPropagation(); start(); });
pp.addEventListener('click', function (e) { e.stopPropagation(); toggle(); showCtl(); });
bk.addEventListener('click', function (e) { e.stopPropagation(); jump(-10); });
fw.addEventListener('click', function (e) { e.stopPropagation(); jump(10); });
fsb.addEventListener('click', function (e) { e.stopPropagation(); toggleFs(); });
mute.addEventListener('click', function (e) {
e.stopPropagation();
var b = AB(); S.m = b ? !b.muted() : !S.m;
if (b) b.mute(!!S.m);
syncMute(); showCtl();
});
skip.addEventListener('click', function (e) { e.stopPropagation(); if (!skip.disabled) endAd(); });
learn.addEventListener('click', function (e) {
e.stopPropagation();
if (window.sr7Ads && S.ad) window.sr7Ads.click(S.ad.id);
if (A && !A.paused()) A.pause();
});
box.addEventListener('click', function (e) {
if (e.target.closest('button,a,.vp-seek')) return;
if (!S.started) return start();
if (hov) toggle();
else if (box.classList.contains('vp-ctl') && box.classList.contains('vp-on')) box.classList.remove('vp-ctl');
else showCtl();
});
box.addEventListener('pointermove', function () { if (hov && S.started) showCtl(); });
box.addEventListener('pointerleave', function () { if (hov && box.classList.contains('vp-on')) box.classList.remove('vp-ctl'); });
box.addEventListener('keydown', function (e) {
if (e.target !== box) return;
var k = e.key, h = 1;
if (k === ' ' || k === 'Enter' || k === 'k' || k === 'K') toggle();
else if (k === 'ArrowLeft') jump(-5); else if (k === 'ArrowRight') jump(5);
else if (k === 'j' || k === 'J') jump(-10); else if (k === 'l' || k === 'L') jump(10);
else if (k === 'm' || k === 'M') mute.click(); else if (k === 'f' || k === 'F') toggleFs();
else h = 0;
if (h) { e.preventDefault(); if (S.started) showCtl(); }
});
/* look the pre-roll up while the browser is idle so the first tap starts instantly */
vpGetAd(function () {});
}
/* Moves the first video found in the post (YouTube, <video>, mp4/webm/m3u8 link) into the custom player. */
function buildPlayer(box, body, d) {
$$('.sr7-player').slice(1).forEach(function (n) { n.remove(); });
$$('.sr7-vnav').slice(1).forEach(function (n) { n.remove(); });
var first = body.querySelector('iframe, video, a[href*="youtube.com/watch"], a[href*="youtu.be/"], a[href*="youtube.com/shorts/"], a[href*=".mp4"], a[href*=".webm"], a[href*=".m3u8"]');
if (!first) { box.hidden = true; return null; }
var tag = first.tagName, src = '', info = { embed: '', content: '', thumb: '' };
if (tag === 'IFRAME') src = first.getAttribute('src') || first.getAttribute('data-src') || '';
else if (tag === 'VIDEO') src = first.currentSrc || first.getAttribute('src') || ((first.querySelector('source') || {}).src || '');
else src = first.getAttribute('href') || '';
var id = ytId(src), par = first.parentNode, poster = first.getAttribute && first.getAttribute('poster');
if (!id && tag === 'IFRAME') {
/* other embeds (Vimeo, Facebook ...) keep their own player */
var fr = document.createElement('iframe');
fr.src = src; fr.title = d.title || 'Video player'; fr.loading = 'lazy';
fr.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');
fr.setAttribute('allowfullscreen', ''); fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
info.embed = src; first.remove();
box.innerHTML = ''; box.appendChild(fr); box.classList.add('ready');
} else {
if (id) { info.embed = 'https://www.youtube.com/embed/' + id; info.thumb = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }
else info.content = src;
first.remove();
vpBuild(box, {
kind: id ? 'yt' : 'file', id: id, src: src, title: d.title,
poster: id ? 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg' : (poster || (d.image ? img(d.image, 1280, 720) : ''))
});
}
document.body.classList.add('is-video-post');
(function prune(n) {
while (n && n !== body && n.nodeType === 1 && !n.querySelector('img,iframe,video') && !(n.textContent || '').trim()) { var up = n.parentNode; n.remove(); n = up; }
})(par);
if (!info.thumb && d.image) info.thumb = img(d.image, 1280, 720);
return info;
}
document.addEventListener('click', function (e) {
var b = e.target.closest ? e.target.closest('.sr7-share') : null; if (!b) return;
e.preventDefault();
var u = b.getAttribute('data-url'), t = b.getAttribute('data-title');
if (navigator.share) { navigator.share({ title: t, url: u }).catch(function () {}); return; }
if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { toast('Link copied to clipboard'); });
});
var cache = {};
function feed(label, n, full) {
var key = (label || '*') + n + (full ? 'F' : '');
if (cache[key]) return cache[key];
/* on the homepage videos are shown ONLY in the Videos rail, never mixed with articles */
var noVid = document.body.classList.contains('is-home') && !isVideoLabel(label);
var noMb = document.body.classList.contains('is-home') && !/^membership$/i.test(String(label || '').trim());
var isMbLabel = function (l) { return /^membership$/i.test(String(l || '').trim()); };
var url = ORIGIN + '/feeds/posts/' + (full ? 'default' : 'summary') + (label ? '/-/' + encodeURIComponent(label) : '') + '?alt=json&max-results=' + ((noVid || noMb) ? n + (full ? 6 : 20) : n);
cache[key] = fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
return ((data.feed || {}).entry || []).map(function (e) {
var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0] || {};
var sum = (e.summary && e.summary.$t) || '';
return {
id: e.id.$t.split('post-').pop(),
title: e.title.$t, url: link.href, date: e.published.$t,
image: e.media$thumbnail ? e.media$thumbnail.url : '',
label: e.category && e.category[0] ? e.category[0].term : 'mint',
labels: (e.category || []).map(function (c) { return c.term; }),
summary: sum.replace(/<[^>]+>/g, '').slice(0, 160),
mins: (e.content && e.content.$t) ? Math.max(1, Math.round(e.content.$t.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length / 200)) : 0
};
}).filter(function (p) { return (!noVid || !p.labels.some(isVideoLabel)) && (!noMb || !p.labels.some(isMbLabel)); }).slice(0, n);
}).catch(function () { return []; });
return cache[key];
}
function allLabels() {
if (cache.__labels) return cache.__labels;
cache.__labels = fetch(ORIGIN + '/feeds/posts/summary?alt=json&max-results=1')
.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
.then(function (d) { return ((d.feed || {}).category || []).map(function (c) { return c.term; }).filter(Boolean); })
.catch(function () { return []; });
return cache.__labels;
}
var ed = $('#edition-date');
if (ed) ed.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · India edition';
$('#year').textContent = new Date().getFullYear();
var clock = $('#clock');
function tick() { if (clock) clock.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST'; }
tick(); setInterval(tick, 30000);
var path = decodeURIComponent(location.pathname);
$$('#main-nav a, #pills a').forEach(function (a) {
var p = decodeURIComponent(new URL(a.href).pathname);
if (p === path) a.classList.add('active');
});
var sBtn = $('#search-btn'), sPanel = $('#search-panel');
sBtn.addEventListener('click', function () {
sPanel.hidden = !sPanel.hidden; sBtn.setAttribute('aria-expanded', String(!sPanel.hidden));
if (!sPanel.hidden) $('input', sPanel).focus();
});
document.addEventListener('keydown', function (e) {
if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); sPanel.hidden = false; $('input', sPanel).focus(); }
if (e.key === 'Escape') { sPanel.hidden = true; sBtn.setAttribute('aria-expanded', 'false'); closeDrawer(); }
});
/* ---------- live search suggestions + recent searches (localStorage) ---------- */
(function () {
var inp = $('input', sPanel), box = $('#sr7-sug'); if (!inp || !box) return;
var KEY = 'sr7_recent', MAX = 8, ctrl = null, tmr = 0, active = -1;
var CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }) : []; } catch (e) { return []; } }
function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {} }
function remember(q) { q = (q || '').trim(); if (q.length < 2) return; save([q].concat(load().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); }))); }
function surl(q) { return ORIGIN + '/search?q=' + encodeURIComponent(q); }
function open() { box.hidden = false; active = -1; }
function close() { box.hidden = true; active = -1; if (ctrl) { ctrl.abort(); ctrl = null; } }
function hl(t, q) {
var out = esc(t); if (!q) return out;
try { return out.replace(new RegExp('(' + esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); } catch (e) { return out; }
}
function showRecent() {
var a = load(); if (!a.length) { close(); return; }
box.innerHTML = '<div class="sg-h"><span>Recent searches</span><button type="button" class="sg-clear">Clear all</button></div>' +
a.map(function (q) {
return '<div class="sg-r" role="option"><a class="sg-q" href="' + esc(surl(q)) + '" data-q="' + esc(q) + '">' + CLOCK + '<span>' + esc(q) + '</span></a>' +
'<button type="button" class="sg-x" data-del="' + esc(q) + '" aria-label="Remove ' + esc(q) + ' from recent searches">&times;</button></div>';
}).join('');
open();
}
function run(q) {
if (ctrl) ctrl.abort();
ctrl = window.AbortController ? new AbortController() : null;
box.innerHTML = '<div class="sg-m">Searching\u2026</div>'; open();
fetch(ORIGIN + '/feeds/posts/summary?alt=json&max-results=6&q=' + encodeURIComponent(q), ctrl ? { signal: ctrl.signal } : {})
.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
.then(function (d) {
if (inp.value.trim() !== q) return;
var es = (d.feed || {}).entry || [];
var all = '<a class="sg-all" href="' + esc(surl(q)) + '" data-q="' + esc(q) + '">See all results for \u201c' + esc(q) + '\u201d &#8594;</a>';
if (!es.length) { box.innerHTML = '<div class="sg-m">No stories found for \u201c' + esc(q) + '\u201d.</div>' + all; open(); return; }
box.innerHTML = es.map(function (e) {
var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0] || {};
var cats = (e.category || []).map(function (c) { return c.term; });
var tag = cats.filter(function (c) { return !isVideoLabel(c); })[0] || '';
var vid = cats.some(isVideoLabel);
var th = e.media$thumbnail ? img(e.media$thumbnail.url, 112, 112) : '';
return '<a class="sg-i" role="option" href="' + esc(link.href || '#') + '" data-q="' + esc(q) + '">' +
(th ? '<img loading="lazy" alt="" width="56" height="56" src="' + esc(th) + '">' : '') +
'<span><b>' + hl(e.title.$t, q) + '</b><small>' + (vid ? 'Video' + (tag ? ' \u00b7 ' : '') : '') + esc(tag) + (tag || vid ? ' \u00b7 ' : '') + esc(ago(e.published.$t)) + '</small></span></a>';
}).join('') + all;
open();
})
.catch(function (e) { if (e && e.name === 'AbortError') return; box.innerHTML = '<div class="sg-m">Couldn\u2019t load suggestions. Press Enter to search.</div>'; open(); });
}
function update() {
var q = inp.value.trim();
clearTimeout(tmr);
if (q.length < 2) { if (ctrl) { ctrl.abort(); ctrl = null; } showRecent(); return; }
tmr = setTimeout(function () { run(q); }, 220);
}
function rows() { return $$('.sg-q, .sg-i, .sg-all', box); }
function mark(i) {
var r = rows(); if (!r.length) return;
r.forEach(function (x) { (x.closest('.sg-r') || x).classList.remove('on'); });
active = (i + r.length) % r.length;
var el = r[active]; (el.closest('.sg-r') || el).classList.add('on');
if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}
inp.addEventListener('input', update);
inp.addEventListener('focus', update);
inp.addEventListener('keydown', function (e) {
if (box.hidden) return;
if (e.key === 'ArrowDown') { e.preventDefault(); mark(active + 1); }
else if (e.key === 'ArrowUp') { e.preventDefault(); mark(active < 0 ? -1 : active - 1); }
else if (e.key === 'Enter' && active > -1) { e.preventDefault(); var el = rows()[active]; if (el) { remember(el.getAttribute('data-q') || inp.value); location.href = el.href; } }
else if (e.key === 'Escape') { e.stopPropagation(); close(); }
});
box.addEventListener('mousedown', function (e) { e.preventDefault(); });
box.addEventListener('click', function (e) {
var del = e.target.closest('.sg-x'), clr = e.target.closest('.sg-clear'), a = e.target.closest('a');
if (del) { e.preventDefault(); var v = del.getAttribute('data-del'); save(load().filter(function (x) { return x !== v; })); showRecent(); return; }
if (clr) { e.preventDefault(); save([]); close(); return; }
if (a) remember(a.getAttribute('data-q') || inp.value);
});
if (inp.form) inp.form.addEventListener('submit', function () { remember(inp.value); });
document.addEventListener('click', function (e) { if (!box.hidden && !e.target.closest('.sr7-sbox') && !e.target.closest('#search-btn')) close(); });
sBtn.addEventListener('click', function () { if (sPanel.hidden) close(); });
})();
var drawer = $('#drawer'), menuBtn = $('#menu-btn'), drawerPanel = $('#drawer-panel'), lastFocus = null;
$('#drawer-nav').innerHTML = $$('#main-nav a').map(function (a) {
return '<a href="' + esc(a.getAttribute('href')) + '"' + (a.classList.contains('active') ? ' class="active"' : '') + '>' + esc(a.textContent) + '</a>';
}).join('');
function openDrawer() {
sPanel.hidden = true; sBtn.setAttribute('aria-expanded', 'false');
lastFocus = document.activeElement;
drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
menuBtn.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open');
setTimeout(function () { var c = $('#drawer-close'); if (c) c.focus(); }, 60);
}
function closeDrawer() {
if (!drawer.classList.contains('open')) return;
drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
menuBtn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open');
if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
}
menuBtn.addEventListener('click', openDrawer);
drawer.addEventListener('click', function (e) { if (e.target.closest('[data-close], a[href], [data-notify]')) closeDrawer(); });
var dx0 = null, dy0 = 0;
drawerPanel.addEventListener('touchstart', function (e) { dx0 = e.touches[0].clientX; dy0 = e.touches[0].clientY; }, { passive: true });
drawerPanel.addEventListener('touchend', function (e) {
if (dx0 === null) return;
var dx = e.changedTouches[0].clientX - dx0, dy = e.changedTouches[0].clientY - dy0; dx0 = null;
if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) closeDrawer();
}, { passive: true });
addEventListener('resize', function () { if (innerWidth > 900) closeDrawer(); });
addEventListener('pageshow', function (e) {
if (e.persisted) { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('menu-open'); }
});
var back = $('#back-top'), bar = $('#reading-progress'), ticking = false, maxScroll = 0, lastMeasure = 0;
function measure() { maxScroll = document.documentElement.scrollHeight - innerHeight; lastMeasure = Date.now(); }
function onScroll() {
if (Date.now() - lastMeasure > 600) measure();
var y = window.pageYOffset || 0;
bar.style.transform = 'scaleX(' + (maxScroll > 0 ? Math.min(1, y / maxScroll) : 0).toFixed(4) + ')';
var show = y > 600; if (back.hidden === show) back.hidden = !show;
ticking = false;
}
measure(); onScroll();
addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
addEventListener('resize', measure); addEventListener('load', measure);
back.addEventListener('click', function () { scrollTo({ top: 0, behavior: 'smooth' }); });
/* ---- Membership: gate "Membership" stories behind the site login ---- */
var MB_TAG = '<span class="mb-tag">Member-only story</span>';
var PM_BADGE = '<span class="pm-badge" title="Premium" aria-label="Premium"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.2l4.1 3.6L12 5l4.4 6.8 4.1-3.6-1.7 9.3H5.2z" fill="#f2a33a"/><rect x="5.4" y="19" width="13.2" height="1.8" rx=".9" fill="#f2a33a"/><circle cx="12" cy="2.6" r="1.1" fill="#f2a33a"/><circle cx="5.2" cy="4.3" r=".9" fill="#f2a33a"/><circle cx="18.8" cy="4.3" r=".9" fill="#f2a33a"/></svg></span>';
var PM_LOGO = 'https://github.com/sr7themes/sr7themes-icon/raw/refs/heads/main/orpte-premioum-logo.svg';
var PM_CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
function isMb(ls) { return !!ls && ls.some(function (l) { return /^membership$/i.test(l); }); }
function mbErr(t) { var e = $('#mb-err'); if (e) { e.textContent = t || ''; e.hidden = !t; } }
function mbState(u) {
document.documentElement.classList.toggle('mb-in', !!u);
try { localStorage.setItem('orpte:in', u ? '1' : '0'); } catch (e) {}
var el = $('#mb-user');
if (el) { el.hidden = !u; el.innerHTML = u ? 'Signed in &middot; <button class="mb-link" data-mb="out" type="button">Sign out</button>' : ''; }
if (u) mbErr('');
}
document.addEventListener('click', function (e) {
var b = e.target.closest && e.target.closest('[data-mb]'); if (!b) return;
var ui = window.orpteAuthUI, k = b.getAttribute('data-mb');
if (!ui) { mbErr('Sign-in is still loading. Please try again in a moment.'); return; }
mbErr('');
if (k === 'google' || k === 'facebook') ui.social(k); else if (k === 'email') ui.signup(); else if (k === 'signin') ui.open(); else if (k === 'out') ui.signOut();
});
window.addEventListener('orpte:authchange', function (e) { mbState(e.detail && e.detail.user); });
window.addEventListener('orpte:autherror', function (e) { mbErr(e.detail && e.detail.message); });

/* ---- Member-only stories: move Share next to Listen, copy/screenshot deterrents, viewer watermark ---- */
(function () {
if (!$('.mb-flag')) return;
var root = document.documentElement, pb = $('#article-body'), until = 0;
root.classList.add('mb-protect');
var slot = $('#mb-share-slot'), wrap = $('.sh-wrap');
if (slot && wrap) {
slot.appendChild(wrap);
var sb = $('#share-toggle'), sv = sb && sb.querySelector('svg'), sl = sb && sb.querySelector('.sh-lbl');
if (sv) sv.innerHTML = '<path d="M12 15V3.5M8 7l4-3.5L16 7"/><path d="M8.5 10.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5"/>';
if (sl) sl.textContent = 'Share';
}
function shield(on) { root.classList.toggle('mb-shield', !!on); }
function flash(ms) { until = Date.now() + (ms || 2500); shield(true); try { if (navigator.clipboard) navigator.clipboard.writeText(' ').catch(function () {}); } catch (e) {} setTimeout(function () { if (Date.now() >= until && document.hasFocus() && !document.hidden) shield(false); }, (ms || 2500) + 50); }
['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(function (t) {
document.addEventListener(t, function (e) {
var n = e.target; if (n && n.nodeType === 3) n = n.parentNode;
if (n && n.closest && n.closest('.article') && !n.closest('.mb-wall, input, textarea')) e.preventDefault();
}, true);
});
document.addEventListener('keydown', function (e) {
var c = e.code || '', mod = e.ctrlKey || e.metaKey;
if (c === 'PrintScreen' || (mod && (c === 'KeyP' || c === 'KeyS')) || (e.metaKey && e.shiftKey && (c === 'KeyS' || /^Digit[345]$/.test(c)))) { flash(); if (c !== 'PrintScreen') e.preventDefault(); }
});
document.addEventListener('keyup', function (e) { if (e.code === 'PrintScreen') flash(); });
addEventListener('blur', function () { shield(true); });
addEventListener('focus', function () { if (Date.now() >= until) shield(false); });
document.addEventListener('visibilitychange', function () { if (document.hidden) shield(true); else if (Date.now() >= until) shield(false); });
['pointerdown', 'touchstart'].forEach(function (t) { document.addEventListener(t, function () { if (Date.now() >= until && document.hasFocus() && !document.hidden) shield(false); }, { passive: true }); });
function mark(u) {
var old = $('.mb-wm'); if (old) old.remove();
var t = u && (u.email || u.displayName || u.uid); if (!t || !pb) return;
var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><text x="160" y="100" text-anchor="middle" transform="rotate(-24 160 100)" font-family="Arial,sans-serif" font-size="15" fill="#808080" fill-opacity=".16">' + esc(t) + '</text></svg>';
var w = document.createElement('div'); w.className = 'mb-wm'; w.setAttribute('aria-hidden', 'true');
w.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
pb.appendChild(w);
}
window.addEventListener('orpte:authchange', function (e) { mark(e.detail && e.detail.user); });
if (window.orpteAuth && window.orpteAuth.currentUser) mark(window.orpteAuth.currentUser);
})();

/* ---- Secure video + Membership: pause / hide on capture signals, block save, viewer watermark ---- */
(function () {
  var root = document.documentElement, isMbPost = !!$('.mb-flag');
  function vids() { return Array.prototype.slice.call(document.querySelectorAll('.sr7-player video, .article video')); }
  function hideAll(on) {
    root.classList.toggle('sr7-vhide', !!on);
    if (on) vids().forEach(function (v) { try { v.pause(); } catch (e) {} });
  }
  /* 1. screen-capture API used from this page / embeds: hide + pause while a capture request is open */
  try {
    var md = navigator.mediaDevices;
    if (md && md.getDisplayMedia) {
      var orig = md.getDisplayMedia.bind(md);
      md.getDisplayMedia = function () { hideAll(true); return orig.apply(null, arguments).then(function (st) { st.getTracks().forEach(function (t) { t.addEventListener('ended', function () { hideAll(false); }); }); return st; }, function (e) { hideAll(false); throw e; }); };
    }
  } catch (e) {}
  /* 2. screenshot shortcuts, tab switching, window blur */
  var until = 0;
  function flash(ms) { until = Date.now() + (ms || 2500); hideAll(true); setTimeout(function () { if (Date.now() >= until && document.hasFocus() && !document.hidden) hideAll(false); }, (ms || 2500) + 50); }
  document.addEventListener('keydown', function (e) {
    var c = e.code || '', mod = e.ctrlKey || e.metaKey;
    if (c === 'PrintScreen' || (e.metaKey && e.shiftKey && /^(KeyS|Digit[345])$/.test(c)) || (e.altKey && c === 'PrintScreen')) { flash(); if (c !== 'PrintScreen') e.preventDefault(); }
    if (mod && /^(KeyS|KeyP|KeyU)$/.test(c) && (isMbPost || document.querySelector('.sr7-player.vp'))) e.preventDefault();
    if (c === 'F12' || (mod && e.shiftKey && /^(KeyI|KeyJ|KeyC)$/.test(c))) { if (isMbPost) e.preventDefault(); }
  });
  document.addEventListener('keyup', function (e) { if (e.code === 'PrintScreen') { flash(); try { navigator.clipboard && navigator.clipboard.writeText(' '); } catch (x) {} } });
  if (isMbPost) {
    addEventListener('blur', function () { hideAll(true); });
    addEventListener('focus', function () { if (Date.now() >= until) hideAll(false); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) hideAll(true); else if (Date.now() >= until) hideAll(false); });
  } else {
    document.addEventListener('visibilitychange', function () { if (document.hidden) vids().forEach(function (v) { try { v.pause(); } catch (e) {} }); });
  }
  /* 3. no hold-to-save / right-click / drag on the player, images and videos of Membership posts */
  var guardSel = '.sr7-player, .sr7-player *, .article video, ' + (isMbPost ? '.article img, .article picture, .article figure' : '.sr7-player img');
  ['contextmenu', 'dragstart'].forEach(function (t) {
    document.addEventListener(t, function (e) { var n = e.target; if (n && n.nodeType === 3) n = n.parentNode; if (n && n.matches && n.matches(guardSel) && !n.closest('.vp-learn, input, textarea')) e.preventDefault(); }, true);
  });
  var lp = 0;
  document.addEventListener('touchstart', function (e) {
    var n = e.target; if (!(n && n.closest && n.closest('.sr7-player, .article video' + (isMbPost ? ', .article img' : '')))) return;
    clearTimeout(lp); lp = setTimeout(function () { try { getSelection().removeAllRanges(); } catch (x) {} }, 300);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(function (t) { document.addEventListener(t, function () { clearTimeout(lp); }, { passive: true }); });
  /* 4. moving viewer watermark over the player (deters phone / screen recordings, helps trace leaks) */
  function wmText() { var u = window.orpteAuth && window.orpteAuth.currentUser; return (u && (u.email || u.displayName || u.uid)) || (location.hostname || 'orpte'); }
  function wm() {
    $$('.sr7-player.vp').forEach(function (b) {
      if (!isMbPost && !b.closest('.article')) return;
      var w = b.querySelector('.vp-vwm');
      if (!w) { w = document.createElement('div'); w.className = 'vp-vwm'; w.setAttribute('aria-hidden', 'true'); b.appendChild(w); }
      w.textContent = wmText();
    });
  }
  var n = 0, ti = setInterval(function () { wm(); if (++n > 20) clearInterval(ti); }, 500);
  window.addEventListener('orpte:authchange', wm);
  setInterval(function () {
    $$('.vp-vwm').forEach(function (w) { w.style.top = (8 + Math.random() * 72) + '%'; w.style.left = (4 + Math.random() * 55) + '%'; });
  }, 6000);
})();
if (document.body.classList.contains('is-home')) {
$$('.sr7-vmark').forEach(function (m) { var c = m.closest('.card'); if (c) c.remove(); });
/* Latest stories: always show at least 8 non-video posts on the homepage */
(function () {
var list = $('.post-grid.nd-list'), MIN = 8;
if (!list) return;
var have = list.querySelectorAll(':scope > .card').length;
if (have >= MIN) return;
var seen = {};
list.querySelectorAll(':scope > .card h2 a').forEach(function (a) { try { seen[new URL(a.href).pathname] = 1; } catch (e) {} });
feed('', 30).then(function (posts) {
posts.forEach(function (p) {
if (have >= MIN) return;
var path; try { path = new URL(p.url).pathname; } catch (e) { return; }
if (seen[path]) return;
seen[path] = 1; have++;
var lab = p.labels && p.labels[0] ? '<div class="kicker-row"><a href="' + ORIGIN + '/search/label/' + encodeURIComponent(p.labels[0]) + '">' + esc(p.labels[0]) + '</a></div>' : '';
var el = document.createElement('article');
el.className = 'card';
el.innerHTML = '<a class="thumb" aria-label="' + esc(p.title) + '" href="' + esc(p.url) + '">' +
(p.image ? '<img class="upscale" alt="' + esc(p.title) + '" src="' + esc(img(p.image, 640, 400)) + '" width="640" height="360" loading="lazy">' : '<span class="noimg"></span>') + (isMb(p.labels) ? PM_BADGE : '') +
'</a><div>' + lab + '<h2><a href="' + esc(p.url) + '">' + esc(p.title) + '</a></h2></div>';
list.appendChild(el);
});
});
})();
/* Premium (member-only) stories section - Mint-style */
(function () {
var list = $('.post-grid.nd-list'); if (!list) return;
feed('Membership', 4, true).then(function (posts) {
if (!posts.length) return;
var all = esc(ORIGIN + '/search/label/Membership');
var sec = document.createElement('section'); sec.className = 'mb-sec pm'; sec.setAttribute('aria-label', 'Premium stories');
sec.innerHTML = '<div class="pm-head"><a class="pm-brand" href="' + all + '"><img alt="The Orpte" src="' + PM_LOGO + '" width="77" height="38" loading="lazy"><span>Premium</span></a>' +
'<a class="pm-more" href="' + all + '">View More ' + PM_CHEV + '</a></div>' +
'<div class="pm-grid">' + posts.map(function (p) {
return '<a class="pm-card" href="' + esc(p.url) + '"><span class="pm-th">' +
(p.image ? '<img loading="lazy" decoding="async" alt="" src="' + esc(img(p.image, 640, 360)) + '">' : '') + PM_BADGE + '</span>' +
'<span class="pm-body"><h3>' + esc(p.title) + '</h3><span class="pm-min">' + (p.mins || 1) + ' min read</span></span></a>';
}).join('') + '</div>' +
'<a class="pm-explore" href="' + all + '">Explore Premium ' + PM_CHEV + '</a>';
var head = list.previousElementSibling, at = head && head.classList.contains('sec-head') ? head : list;
at.parentNode.insertBefore(sec, at);
});
})();
feed('Membership', 40).then(function (v) {
var set = {};
v.forEach(function (p) { try { set[new URL(p.url).pathname] = 1; } catch (e) {} });
$$('.PopularPosts li, #mr-pop li').forEach(function (li) {
var a = li.querySelector('a[href]');
try { if (a && set[new URL(a.href).pathname]) li.remove(); } catch (e) {}
});
});
feed(VIDEO_LABEL, 40).then(function (v) {
var set = {};
v.forEach(function (p) { try { set[new URL(p.url).pathname] = 1; } catch (e) {} });
$$('.PopularPosts li, #mr-pop li').forEach(function (li) {
var a = li.querySelector('a[href]');
try { if (a && set[new URL(a.href).pathname]) li.remove(); } catch (e) {}
});
});
}
$$('img.upscale').forEach(function (i) { i.src = img(i.getAttribute('src'), 640, 400); });
$$('.rel-time').forEach(function (t) { var d = t.getAttribute('datetime'); if (d) { t.title = t.textContent; t.textContent = ago(d); } });
feed('', 10).then(function (posts) {
var tk = $('#ticker'), tr = $('#tr-track');
if (tk) {
if (!posts.length) { tk.closest('.breaking').hidden = true; return; }
var items = posts.map(function (p) { return '<a href="' + esc(p.url) + '">' + esc(p.title) + '</a>'; }).join('');
tk.innerHTML = items + items;
}
var artEl = $('#article'), pbody = $('#article-body');
if (artEl && pbody && artEl.getAttribute('data-type') === 'post') {
var lbl = $('#post-labels a'), lname = lbl ? lbl.getAttribute('data-label') : '', myId = artEl.getAttribute('data-post-id');
feed(lname || '', 6).then(function (rel) {
var picks = rel.filter(function (p) { return String(p.id) !== String(myId); }).slice(0, 3);
if (!picks.length) return;
var kids = [].slice.call(pbody.children).filter(function (c) { return /^(P|DIV)$/.test(c.tagName) && (c.textContent || '').trim().length > 80; });
if (kids.length < 3) return;
var box = document.createElement('aside');
box.className = 'also-read';
box.setAttribute('aria-label', 'Also read');
box.innerHTML = '<h3 class="ar-head">You may like this</h3>' + picks.map(function (p) {
return '<a class="ar-item" href="' + esc(p.url) + '"><span class="ar-txt"><em class="ar-lbl">' + esc(p.label || 'News') + '</em><strong class="ar-ttl">' + esc(p.title) + '</strong></span>' +
(p.image ? '<span class="ar-img"><img loading="lazy" decoding="async" alt="" src="' + esc(img(p.image, 480, 270)) + '"></span>' : '') + '</a>';
}).join('');
kids[1].parentNode.insertBefore(box, kids[1].nextSibling);
});
}
if (tr) {
var cur = $('#article'), curId = cur && cur.getAttribute('data-post-id');
var list = posts.filter(function (p) { return String(p.id) !== String(curId); }).slice(0, 8);
if (!list.length) { tr.closest('.trending').hidden = true; return; }
tr.innerHTML = list.map(function (p, i) {
return '<a class="tr-card" href="' + esc(p.url) + '"><div class="tr-meta"><b>' + (i + 1) + '</b><span>' + esc(p.label || 'News') + '</span></div><h3>' + esc(p.title) + '</h3></a>';
}).join('');
}
});
if (document.body.classList.contains('is-home')) {
Promise.all([feed('Featured', 6), feed('', 20, true)]).then(function (r) {
var featured = r[0].length >= 3 ? r[0] : r[1].slice(0, 6);
var latest = r[1];
buildSlider(featured);
var ids = featured.map(function (p) { return p.id; });
var rest = latest.filter(function (p) { return ids.indexOf(p.id) < 0; });
if (rest.length < 8) rest = latest;
$('#headlines').innerHTML = rest.slice(0, 8).map(function (p, i) {
var fresh = (Date.now() - new Date(p.date)) < 6 * 3600 * 1000;
var live = fresh && i < 2;
var d = new Date(p.date), t = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toUpperCase();
var when = (d.toDateString() === new Date().toDateString() ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).toUpperCase() + ', ') + t + ' IST';
return '<li>' + (live ? '<span class="hl-live"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="#fff"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="1.5 2.4"/><circle cx="12" cy="12" r="10" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="1.2 2.6"/></svg>LIVE UPDATES</span>' : '') +
'<div class="hl-cat">' + esc(p.label || 'News') + '</div>' +
'<a class="hl-t" href="' + esc(p.url) + '">' + esc(p.title) + '</a>' +
'<div class="hl-meta"><span>' + (p.mins || 1) + ' min read</span><i></i><span>' + when + '</span></div></li>';
}).join('') || '<li>No stories yet.</li>';
$('#timeline').innerHTML = latest.slice(0, 12).map(function (p) {
var today = new Date(p.date).toDateString() === new Date().toDateString();
return '<a class="tl-item" href="' + esc(p.url) + '"><span class="tl-time">' + (today ? hhmm(p.date) : ago(p.date)) + '</span><img loading="lazy" alt="" src="' + esc(img(p.image, 400, 225)) + '"><h3>' + esc(p.title) + '</h3></a>';
}).join('');
});
/* Populate In-between "More Stories" widget */
feed('', 12).then(function(posts) {
var msTrack = $('#ms-track');
if (!msTrack) return;
msTrack.innerHTML = posts.map(function(p) {
return '<a class="ms-card" href="' + esc(p.url) + '">' +
'<div class="ms-thumb"><img loading="lazy" alt="" src="' + esc(img(p.image, 400, 250)) + '"><span class="ms-tag">' + esc(p.label || 'mint') + '</span></div>' +
'<div class="ms-content"><h4>' + esc(p.title) + '</h4></div>' +
'</a>';
}).join('');
var msPrev = $('#ms-prev'), msNext = $('#ms-next');
if (msPrev && msNext) {
msNext.addEventListener('click', function() { msTrack.scrollBy({ left: 300, behavior: 'smooth' }); });
msPrev.addEventListener('click', function() { msTrack.scrollBy({ left: -300, behavior: 'smooth' }); });
}
});
feed(VIDEO_LABEL, 8).then(function (vids) {
var vt = $('#sr7-vtrack'), vs = $('#sr7-vhome');
if (!vt || !vs || !vids.length) return;
vt.innerHTML = vids.slice(0, 8).map(function (p) {
var u = esc(p.url);
return '<a class="sr7-vtile" href="' + u + '"><span class="thumb"><img loading="lazy" alt="" width="640" height="360" src="' + esc(img(p.image, 640, 360)) + '">' +
'<span class="sr7-play" aria-hidden="true">' + PLAY_SVG + '</span><span class="sr7-vdur" data-id="' + esc(p.id) + '" hidden></span></span><h3>' + esc(p.title) + '</h3></a>';
}).join('');
vs.hidden = false;
vdurInit(vids.slice(0, 8));
});
buildCategoryBlocks();
initWeather();
initMarkets();
initCricket();
initFootball();
}
if ($('.sr7-vintro')) {
var vg = $('#sr7-vgrid'), vc = $('#sr7-vchips');
var NEW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"/></svg>';
var vq = new URLSearchParams(location.search);
var firstPage = !vq.has('updated-max') && !vq.has('q') && !vq.has('start');
var seen = {}, F = { tag: '', q: '', when: '' };
function vcards() { return $$('.sr7-vcard', vg); }
function cardTime(c) { var t = c.querySelector('.sr7-vdate'); return t ? new Date(t.getAttribute('datetime')).getTime() : 0; }
function addNew(c) {
var th = c.querySelector('.thumb'); if (!th || th.querySelector('.sr7-new')) return;
if (Date.now() - cardTime(c) < 36e5 * 24) { var n = document.createElement('span'); n.className = 'sr7-new'; n.textContent = 'NEW'; th.appendChild(n); }
}
function cardTags(c) { return $$('.kicker-row a', c).map(function (a) { return a.textContent.trim(); }); }
function cardUrl(c) { var a = c.querySelector('a.thumb'); return a ? a.href : ''; }
if (vg) {
/* ---- featured (latest) video on top, first page only ---- */
var hero = null;
var first = vcards()[0];
if (first && firstPage && vcards().length > 2) {
var ha = first.querySelector('a.thumb'), him = first.querySelector('img'), hh = first.querySelector('h2 a, h3 a'), ht = first.querySelector('.sr7-vdate');
if (ha && hh) {
var tags0 = cardTags(first), hurl = esc(ha.href), httl = esc(hh.textContent.trim());
hero = document.createElement('section'); hero.className = 'sr7-vhero'; hero.setAttribute('aria-label', 'Featured video');
hero.innerHTML = '<a class="thumb" href="' + hurl + '" aria-label="' + httl + '"><img alt="" width="1280" height="720" fetchpriority="high" src="' + esc(img(him ? him.getAttribute('src') : '', 1280, 720)) + '"><span class="sr7-play" aria-hidden="true">' + PLAY_SVG + '</span></a>' +
'<div class="sr7-vhero-body"><span class="sr7-badge">Latest video</span><h2><a href="' + hurl + '">' + httl + '</a></h2>' +
'<div class="sr7-vhero-meta">' + (ht ? '<time datetime="' + esc(ht.getAttribute('datetime')) + '">' + esc(ht.textContent) + '</time>' : '') + tags0.slice(0, 2).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
'<div class="sr7-vhero-act"><a class="btn" href="' + hurl + '">Watch now</a><button type="button" class="sr7-share" aria-label="Share this video" data-url="' + hurl + '" data-title="' + httl + '">' + SHARE_SVG + '</button></div></div>';
seen[ha.href] = 1;
first.remove();
}
}
vcards().forEach(function (c) { seen[cardUrl(c)] = 1; addNew(c); });
/* ---- toolbar: search + date filter + count ---- */
var tools = document.createElement('div'); tools.className = 'sr7-vtools';
tools.innerHTML = '<form class="sr7-vsearch" role="search" action="' + esc(ORIGIN + '/search/label/' + VIDEO_LABEL) + '" method="get">' + NEW_SVG +
'<input type="search" name="q" autocomplete="off" placeholder="Search videos" aria-label="Search videos"></form>' +
'<select class="sr7-vwhen" aria-label="Filter by date"><option value="">Any time</option><option value="1">Today</option><option value="7">This week</option><option value="30">This month</option></select>' +
'<span class="sr7-vcount" aria-live="polite"></span>';
var anchor = vc || vg;
if (hero) anchor.parentNode.insertBefore(hero, anchor);
anchor.parentNode.insertBefore(tools, anchor);
var qIn = $('input', tools), whenSel = $('.sr7-vwhen', tools), cnt = $('.sr7-vcount', tools);
var none = document.createElement('div'); none.className = 'sr7-vnone'; none.hidden = true; none.textContent = 'No videos match your filters.';
vg.parentNode.insertBefore(none, vg.nextSibling);
function applyFilters() {
var q = F.q.toLowerCase(), min = F.when ? Date.now() - (+F.when) * 864e5 : 0, shown = 0;
vcards().forEach(function (c) {
var h = c.querySelector('h2, h3'), title = h ? h.textContent.toLowerCase() : '';
var ok = (!F.tag || cardTags(c).indexOf(F.tag) > -1) && (!q || title.indexOf(q) > -1) && (!min || cardTime(c) >= min);
c.hidden = !ok; if (ok) shown++;
});
none.hidden = shown > 0 || !vcards().length;
cnt.textContent = shown + (hero ? 1 : 0) + ' video' + (shown + (hero ? 1 : 0) === 1 ? '' : 's') + (more && more.total ? ' of ' + more.total : '');
}
qIn.addEventListener('input', function () { F.q = qIn.value.trim(); applyFilters(); });
whenSel.addEventListener('change', function () { F.when = whenSel.value; applyFilters(); });
/* ---- topic chips (rebuilt whenever more videos are loaded) ---- */
function buildChips() {
if (!vc) return;
var tg = {}; vcards().forEach(function (c) { cardTags(c).forEach(function (t) { if (t && !isVideoLabel(t)) tg[t] = 1; }); });
var names = Object.keys(tg);
if (names.length < 2) { vc.hidden = true; return; }
vc.innerHTML = '<button type="button" data-f=""' + (F.tag ? '' : ' class="on"') + '>All</button>' + names.map(function (n) { return '<button type="button" data-f="' + esc(n) + '"' + (F.tag === n ? ' class="on"' : '') + '>' + esc(n) + '</button>'; }).join('');
vc.hidden = false;
}
if (vc) vc.addEventListener('click', function (e) {
var b = e.target.closest('button'); if (!b) return;
F.tag = b.getAttribute('data-f') || '';
$$('button', vc).forEach(function (x) { x.classList.toggle('on', x === b); });
applyFilters();
});
/* ---- "Load more videos" (replaces page-by-page pagination on the first page) ---- */
var more = null, pager = $('.pager');
function mapEntry(e) {
var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0] || {};
return { title: e.title.$t, url: link.href, date: e.published.$t, image: e.media$thumbnail ? e.media$thumbnail.url : '',
labels: (e.category || []).map(function (c) { return c.term; }) };
}
function cardHtml(p) {
var u = esc(p.url), t = esc(p.title);
return '<article class="card sr7-vcard"><a class="thumb" href="' + u + '" aria-label="' + t + '"><img class="upscale" loading="lazy" alt="' + t + '" width="640" height="360" src="' + esc(img(p.image, 640, 360)) + '">' +
'<span class="sr7-play" aria-hidden="true">' + PLAY_SVG + '</span><time class="sr7-vdate" datetime="' + esc(p.date) + '">' + vdate(p.date) + '</time></a><div>' +
'<div class="kicker-row">' + p.labels.filter(function (l) { return !isVideoLabel(l); }).slice(0, 2).map(function (l) { return '<a href="' + esc(ORIGIN + '/search/label/' + encodeURIComponent(l)) + '">' + esc(l) + '</a>'; }).join('') + '</div>' +
'<div class="sr7-vtitle"><h2><a href="' + u + '">' + t + '</a></h2><button type="button" class="sr7-share" aria-label="Share this video" data-url="' + u + '" data-title="' + t + '">' + SHARE_SVG + '</button></div></div></article>';
}
if (firstPage) {
var wrap = document.createElement('div'); wrap.className = 'sr7-vmore-wrap'; wrap.hidden = true;
wrap.innerHTML = '<button type="button" class="sr7-vmore">Load more videos</button>';
(pager || vg).parentNode.insertBefore(wrap, pager || vg.nextSibling);
var btn = $('button', wrap), nextStart = 1 + vcards().length + (hero ? 1 : 0);
more = { total: 0 };
var probe = function (start, max) {
return fetch(ORIGIN + '/feeds/posts/summary/-/' + encodeURIComponent(VIDEO_LABEL) + '?alt=json&start-index=' + start + '&max-results=' + max)
.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
.then(function (d) { var f = d.feed || {}; return { total: parseInt((f.openSearch$totalResults || {}).$t, 10) || 0, items: (f.entry || []).map(mapEntry) }; });
};
probe(nextStart, 1).then(function (r) {
more.total = r.total; applyFilters();
if (r.items.length) { wrap.hidden = false; if (pager) pager.hidden = true; }
}).catch(function () {});
btn.addEventListener('click', function () {
btn.disabled = true; btn.textContent = 'Loading\u2026';
probe(nextStart, 12).then(function (r) {
var fresh = r.items.filter(function (p) { return p.url && !seen[p.url]; });
fresh.forEach(function (p) { seen[p.url] = 1; });
vg.insertAdjacentHTML('beforeend', fresh.map(cardHtml).join(''));
vcards().forEach(addNew);
nextStart += r.items.length;
buildChips(); applyFilters();
if (!r.items.length || nextStart > r.total) wrap.hidden = true;
else { btn.disabled = false; btn.textContent = 'Load more videos'; }
}).catch(function () { btn.disabled = false; btn.textContent = 'Try again'; });
});
}
buildChips(); applyFilters();
}
var items = vg ? $$('.sr7-vcard', vg).map(function (c, i) { return { '@type': 'ListItem', position: i + 1, url: (c.querySelector('a.thumb') || {}).href }; }) : [];
var vls = document.createElement('script'); vls.type = 'application/ld+json';
vls.textContent = JSON.stringify([
{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Videos', url: ORIGIN + location.pathname, isPartOf: { '@type': 'WebSite', url: ORIGIN + '/' } },
{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items },
{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: 'Videos' }] }
]);
document.head.appendChild(vls);
}
function buildSlider(posts) {
var slider = $('#slider'); if (!slider) return;
if (!posts.length) { slider.innerHTML = '<div class="empty" style="height:100%">Publish posts to fill the slider.</div>'; return; }
var track = $('#slides'), dots = $('#s-dots'), prog = $('#s-progress');
track.innerHTML = posts.map(function (p, i) {
return '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + posts.length + '"><a href="' + esc(p.url) + '">' +
'<img ' + (i ? 'loading="lazy" ' : 'fetchpriority="high" ') + 'alt="' + esc(p.title) + '" src="' + esc(img(p.image, 900, 740)) + '">' +
'<div class="cap">' + (p.label ? '<span class="kicker">' + esc(p.label) + '</span>' : '') + '<h2>' + esc(p.title) + '</h2><time>' + ago(p.date) + '</time></div></a></div>';
}).join('');
dots.innerHTML = posts.map(function (_, i) { return '<button type="button" role="tab" aria-label="Go to slide ' + (i + 1) + '"></button>'; }).join('');
var idx = 0, timer = null, DELAY = 5000, paused = false, offscreen = false, n = posts.length;
prog.style.setProperty('--dur', DELAY + 'ms');
function go(i) {
idx = (i + n) % n;
track.style.transform = 'translateX(' + (-idx * 100) + '%)';
$$('button', dots).forEach(function (d, j) { d.classList.toggle('on', j === idx); d.setAttribute('aria-selected', j === idx); });
$$('.slide', track).forEach(function (s, j) { s.setAttribute('aria-hidden', j !== idx); $$('a', s).forEach(function (a) { a.tabIndex = j === idx ? 0 : -1; }); });
restart();
}
function restart() {
clearTimeout(timer); prog.classList.remove('run'); void prog.offsetWidth;
if (paused || offscreen || n < 2) return;
prog.classList.add('run'); timer = setTimeout(function () { go(idx + 1); }, DELAY);
}
$('#s-next').onclick = function () { go(idx + 1); };
$('#s-prev').onclick = function () { go(idx - 1); };
dots.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) go($$('button', dots).indexOf(b)); });
if (matchMedia('(hover:hover)').matches) {
slider.addEventListener('mouseenter', function () { paused = true; restart(); });
slider.addEventListener('mouseleave', function () { paused = false; restart(); });
slider.addEventListener('focusin', function () { paused = true; restart(); });
slider.addEventListener('focusout', function () { paused = false; restart(); });
}
slider.tabIndex = 0;
slider.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(idx + 1); if (e.key === 'ArrowLeft') go(idx - 1); });
var x0 = null, y0 = 0;
slider.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; paused = true; restart(); }, { passive: true });
slider.addEventListener('touchend', function (e) {
if (x0 === null) return;
var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; paused = false;
if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? idx + 1 : idx - 1); else restart();
}, { passive: true });
slider.addEventListener('touchcancel', function () { x0 = null; paused = false; restart(); }, { passive: true });
document.addEventListener('visibilitychange', function () { paused = document.hidden; restart(); });
if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { offscreen = !es[0].isIntersecting; restart(); }).observe(slider);
go(0);
}
function buildCategoryBlocks() {
var box = $('#cat-blocks'); if (!box) return;
var COLORS = ['#001f51', '#0b5cad', '#14833b', '#c2185b', '#6d4c41', '#ef6c00', '#00838f', '#37474f'];
var wanted = (box.dataset.labels || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
var maxSections = parseInt(box.dataset.max, 10) || 8;
function render(el, label, posts) {
if (!posts.length) { el.hidden = true; return; }
var lead = posts[0], more = ORIGIN + '/search/label/' + encodeURIComponent(label);
el.classList.remove('pending');
el.innerHTML = '<div class="sec-head"><h2>' + esc(label) + '</h2><a class="more" href="' + esc(more) + '">View all ' + esc(label) + ' \u203A</a></div>' +
'<div class="desk-body"><a class="desk-lead" href="' + esc(lead.url) + '"><img loading="lazy" alt="" src="' + esc(img(lead.image, 900, 620)) + '"><div class="cap"><h3>' + esc(lead.title) + '</h3><p>' + esc(lead.summary) + '</p></div></a>' +
'<div class="desk-grid">' + posts.slice(1, 5).map(function (p) { return '<a href="' + esc(p.url) + '"><img loading="lazy" alt="" src="' + esc(img(p.image, 400, 250)) + '"><h4>' + esc(p.title) + '</h4><time class="rel-time">' + ago(p.date) + '</time></a>'; }).join('') + '</div>' +
(posts.length > 5 ? '<div class="desk-list">' + posts.slice(5, 11).map(function (p) { return '<a href="' + esc(p.url) + '">' + esc(p.title) + '</a>'; }).join('') + '</div>' : '') +
'</div>';
}
function make(label, n) {
var el = document.createElement('section'); el.className = 'desk pending' + (n % 2 ? ' alt' : '');
el.style.setProperty('--desk', COLORS[n % COLORS.length]);
el.innerHTML = '<div class="sec-head"><h2>' + esc(label) + '</h2></div><div class="skel" style="height:110px"></div>';
box.appendChild(el);
var started = false;
el._load = function () { if (started) return; started = true; feed(label, 10).then(function (p) { render(el, label, p); }); };
return el;
}
allLabels().then(function (all) {
var labels = wanted;
if (all.length) {
var byLower = {}; all.forEach(function (l) { byLower[l.toLowerCase()] = l; });
labels = wanted.map(function (w) { return byLower[w.toLowerCase()]; }).filter(Boolean);
if (!labels.length) labels = all.slice();
}
var els = labels.slice(0, maxSections).map(make);
if ('IntersectionObserver' in window) {
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); en.target._load(); } });
}, { rootMargin: '800px 0px' });
els.forEach(function (el) { io.observe(el); });
} else els.forEach(function (el) { el._load(); });
if (els.length > 1) {
var band = document.createElement('div'); band.className = 'nl-slot only-m'; band.dataset.nl = 'band';
els[1].parentNode.insertBefore(band, els[1].nextSibling); fillNewsletter(band);
}
});
}
function initMarkets() {
var box = $('#markets'); if (!box) return;
var IDX = [['SENSEX', 'in%3BSEN'], ['NIFTY 50', 'in%3BNSX'], ['BANK NIFTY', 'in%3Bnbx']];
function fmt(n) { return (+n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }); }
function load() {
Promise.all(IDX.map(function (x) {
return fetch('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/' + x[1]).then(function (r) { return r.json(); }).then(function (j) { return j.data; }).catch(function () { return null; });
})).then(function (rows) {
if (!rows.some(Boolean)) { $('#mkt-time').textContent = 'Market data unavailable'; return; }
box.innerHTML = rows.map(function (d, i) {
if (!d) return '<div><b>' + IDX[i][0] + '</b>—</div>';
var ch = +d.pricechange, cls = ch >= 0 ? 'up' : 'down', ar = ch >= 0 ? '▲' : '▼';
return '<div><b>' + IDX[i][0] + '</b><span class="v">' + fmt(d.pricecurrent) + '</span><br><span class="' + cls + '">' + ar + ' ' + fmt(Math.abs(ch)) + ' (' + (+d.pricepercentchange).toFixed(2) + '%)</span></div>';
}).join('');
$('#mkt-time').innerHTML = '<span class="dot-live"></span>Updated ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
});
}
load(); setInterval(function () { if (!document.hidden) load(); }, 60000);
}
function initCricket() {
var box = $('#cricket'); if (!box) return;
var matches = [], cur = 0, rot;
function teamRow(c, batId) {
return '<div class="t' + (String(c.id) === String(batId) ? ' bat' : '') + '"><span>' + (c.logo ? '<img alt="" src="' + esc(c.logo) + '">' : '') + esc(c.abbreviation || c.name) + '</span><span>' + esc(c.score || 'Yet to bat') + '</span></div>';
}
function show() {
if (!matches.length) { box.innerHTML = '<div class="sum" style="color:var(--muted)">No live matches right now</div>'; $('#cric-meta').textContent = ''; return; }
cur = (cur + matches.length) % matches.length;
var m = matches[cur], fs = m.fullStatus || {}, st = (fs.type || {}).state;
box.innerHTML = '<div class="cric-open" role="button" tabindex="0" aria-label="Open full scorecard"><div class="teams">' + (m.competitors || []).map(function (c) { return teamRow(c, fs.battingTeamId); }).join('') + '</div>' +
'<div class="cric-row"><div class="sum">' + esc(fs.summary || m.summary || '') + '</div><span class="cric-more">Scorecard &rsaquo;</span></div></div>';
$('#cric-meta').innerHTML = (st === 'in' ? '<span class="dot-live"></span>LIVE · ' : st === 'post' ? 'RESULT · ' : 'UPCOMING · ') + esc(m.league || '').slice(0, 26) + ' (' + (cur + 1) + '/' + matches.length + ')';
}
function load() {
fetch('https://site.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&region=in&lang=en').then(function (r) { return r.json(); }).then(function (d) {
var all = [];
((d.sports || [])[0] || {}).leagues && d.sports[0].leagues.forEach(function (l) { (l.events || []).forEach(function (e) { e.league = l.shortName || l.name; all.push(e); }); });
var score = function (e) {
var st = ((e.fullStatus || {}).type || {}).state, india = /india|ind\b/i.test(e.name) ? 0 : 1, intl = (e.competitors || []).some(function (c) { return c.isNational; }) ? 0 : 1;
return (st === 'in' ? 0 : st === 'post' ? 1 : 2) * 10 + india * 2 + intl;
};
var openId = sheet && !sheet.hidden && curM ? String(curM.id) : null;
matches = all.sort(function (a, b) { return score(a) - score(b); }).slice(0, 10);
if (openId) matches.forEach(function (m) { if (String(m.id) === openId) { curM = m; renderSheet(); } });
if (!sheet || sheet.hidden) show();
}).catch(function () { box.innerHTML = '<div class="sum" style="color:var(--muted)">Scores unavailable</div>'; });
}
$('#cric-next').onclick = function () { cur++; show(); restart(); };
$('#cric-prev').onclick = function () { cur--; show(); restart(); };
function restart() { clearInterval(rot); rot = setInterval(function () { if (!sheet || sheet.hidden) { cur++; show(); } }, 8000); }

/* ---------- Match detail sheet (opens instead of redirecting to ESPN) ---------- */
var sheet, curM, detail, tab = 'sum', poll, lastUp;
function opn() { if (matches[cur]) openSheet(matches[cur]); }
box.addEventListener('click', function (e) { if (e.target.closest('.cric-open')) opn(); });
box.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.cric-open')) { e.preventDefault(); opn(); } });
function ensureSheet() {
if (sheet) return sheet;
sheet = document.createElement('div'); sheet.className = 'cs notranslate'; sheet.hidden = true;
sheet.innerHTML = '<div class="cs-bg" data-x></div><div aria-label="Match details" aria-modal="true" class="cs-panel" role="dialog"><div class="cs-grab"></div><button aria-label="Close" class="cs-x" data-x type="button">&times;</button><div class="cs-body" id="cs-body"></div></div>';
document.body.appendChild(sheet);
sheet.addEventListener('click', function (e) {
if (e.target.closest('[data-x]')) return closeSheet();
var tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; renderSheet(); return; }
if (e.target.closest('[data-refresh]')) loadDetail();
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet && !sheet.hidden) closeSheet(); });
return sheet;
}
function isLive(m) { return (((m.fullStatus || {}).type || {}).state) === 'in'; }
function openSheet(m) {
ensureSheet(); curM = m; detail = null; tab = 'sum'; sheet.hidden = false;
document.documentElement.style.overflow = 'hidden'; clearInterval(rot);
renderSheet(); loadDetail();
clearInterval(poll); poll = setInterval(function () { if (!document.hidden && isLive(curM)) loadDetail(); }, 30000);
setTimeout(function () { var x = sheet.querySelector('.cs-x'); x && x.focus(); }, 50);
}
function closeSheet() { sheet.hidden = true; clearInterval(poll); document.documentElement.style.overflow = ''; restart(); show(); }
function loadDetail() {
var m = curM, lg = /l:(\d+)/.exec(m.uid || ''); if (!lg) { detail = { none: true }; renderSheet(); return; }
fetch('https://site.api.espn.com/apis/site/v2/sports/cricket/' + lg[1] + '/summary?event=' + encodeURIComponent(m.id))
.then(function (r) { if (!r.ok) throw 0; return r.json(); })
.then(function (d) { if (curM !== m) return; detail = parseDetail(d); lastUp = new Date(); renderSheet(); })
.catch(function () { if (curM !== m) return; detail = detail && !detail.none ? detail : { none: true }; renderSheet(); });
}
function flat(ls) {
var o = {}, s = ls && ls.statistics || {}, cats = s.categories || (s.splits && s.splits.categories) || [];
cats.forEach(function (c) { (c.stats || []).forEach(function (x) { o[x.name] = x.displayValue != null ? x.displayValue : x.value; }); });
return o;
}
function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
function parseDetail(d) {
var o = { info: [], notes: [], bat: [], bowl: [], squads: [] };
var hdr = d.header || {}, comp = (hdr.competitions || [])[0] || {}, gi = d.gameInfo || {};
var v = gi.venue || comp.venue || {};
if (v.fullName) { var ad = v.address || {}; o.info.push(['Venue', [v.fullName, ad.city, ad.country].filter(Boolean).join(', ')]); }
if (gi.attendance) o.info.push(['Attendance', Number(gi.attendance).toLocaleString('en-IN')]);
(gi.officials || []).forEach(function (u) { var n = u.displayName || u.fullName; if (n) o.info.push([(u.position && (u.position.displayName || u.position.name)) || 'Official', n]); });
if (gi.weather && (gi.weather.displayValue || gi.weather.temperature)) o.info.push(['Weather', gi.weather.displayValue || (gi.weather.temperature + '°')]);
(comp.notes || d.notes || []).forEach(function (n) { var x = typeof n === 'string' ? n : (n.text || n.headline); if (x) o.notes.push(x); });
if (comp.class && comp.class.generalClassCard) o.info.unshift(['Format', comp.class.generalClassCard]);
(d.rosters || []).forEach(function (r) {
var tn = (r.team || {}).displayName || (r.team || {}).name || 'Team', bats = [], bowls = [], sq = [];
(r.roster || []).forEach(function (p, idx) {
var a = p.athlete || {}, nm = a.displayName || a.fullName || a.shortName; if (!nm) return;
var pos = (p.position || a.position || {}).abbreviation || (p.position || a.position || {}).displayName || '';
sq.push({ n: nm, pos: pos, c: !!p.captain, k: !!p.keeper, sub: p.starter === false });
(p.linescores || []).forEach(function (ls) {
var s = flat(ls), inn = ls.period || 1;
var isBowl = s.overs != null || s.conceded != null, isBat = !isBowl && (s.runs != null || s.ballsFaced != null);
if (isBat && (num(s.ballsFaced) > 0 || num(s.runs) > 0 || ls.isBatting || ls.outDetails || ls.dismissal)) bats.push({ n: nm, idx: idx, inn: inn, runs: s.runs, b: s.ballsFaced, f: s.fours, s6: s.sixes, sr: s.strikeRate, out: ls.outDetails || ls.dismissal || (ls.isBatting ? 'batting' : 'not out') });
if (isBowl && num(s.overs) > 0) bowls.push({ n: nm, idx: idx, inn: inn, o: s.overs, m: s.maidens, r: s.conceded, w: s.wickets, e: s.economyRate });
});
});
var byInn = function (x, y) { return x.inn - y.inn || x.idx - y.idx; };
if (bats.length) o.bat.push({ team: tn, rows: bats.sort(byInn) });
if (bowls.length) o.bowl.push({ team: tn, rows: bowls.sort(byInn) });
if (sq.length) o.squads.push({ team: tn, rows: sq });
});
return o;
}
function cell(v) { return v == null || v === '' ? '–' : esc(String(v)); }
function table(head, rows) {
return '<div class="cs-tw"><table class="cs-tb"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
}
function scorecardHtml() {
if (!detail) return '<span class="cs-load"></span><span class="cs-load" style="width:80%"></span><span class="cs-load" style="width:60%"></span>';
var out = '';
detail.bat && detail.bat.forEach(function (g) {
out += '<div class="cs-h">' + esc(g.team) + ' · Batting</div>' + table(['Batter', 'R', 'B', '4s', '6s', 'SR'], g.rows.map(function (r) {
var dim = r.out && !/^(not out|batting)$/i.test(r.out);
return '<tr><td><b>' + esc(r.n) + '</b>' + (r.inn > 1 ? ' <small style="display:inline">(inn ' + r.inn + ')</small>' : '') + '<small>' + esc(dim ? r.out : (r.out || '')) + '</small></td><td><b>' + cell(r.runs) + '</b></td><td>' + cell(r.b) + '</td><td>' + cell(r.f) + '</td><td>' + cell(r.s6) + '</td><td>' + cell(r.sr) + '</td></tr>';
}));
});
detail.bowl && detail.bowl.forEach(function (g) {
out += '<div class="cs-h">' + esc(g.team) + ' · Bowling</div>' + table(['Bowler', 'O', 'M', 'R', 'W', 'Econ'], g.rows.map(function (r) {
return '<tr><td><b>' + esc(r.n) + '</b>' + (r.inn > 1 ? ' <small style="display:inline">(inn ' + r.inn + ')</small>' : '') + '</td><td>' + cell(r.o) + '</td><td>' + cell(r.m) + '</td><td>' + cell(r.r) + '</td><td><b>' + cell(r.w) + '</b></td><td>' + cell(r.e) + '</td></tr>';
}));
});
if (!out) out = '<div class="cs-empty">' + (detail.none ? 'The detailed scorecard isn’t available for this match right now.' : 'Batting and bowling figures will appear here once play begins.') + '</div>';
return out;
}
function squadsHtml() {
if (!detail) return '<span class="cs-load"></span><span class="cs-load" style="width:70%"></span>';
if (!detail.squads || !detail.squads.length) return '<div class="cs-empty">Squads haven’t been announced yet.</div>';
return detail.squads.map(function (s) {
return '<div class="cs-h">' + esc(s.team) + '</div><ul class="cs-sq">' + s.rows.map(function (p) { return '<li>' + esc(p.n) + (p.c ? ' (c)' : '') + (p.k ? ' †' : '') + (p.pos ? ' <small>' + esc(p.pos) + '</small>' : '') + '</li>'; }).join('') + '</ul>';
}).join('');
}
function infoHtml() {
var m = curM, fs = m.fullStatus || {}, rows = [];
rows.push(['Match', m.name || m.shortName]);
if (m.league) rows.push(['Series', m.league]);
if (fs.type && (fs.type.detail || fs.type.description)) rows.push(['Status', fs.type.detail || fs.type.description]);
if (m.date) { var dt = new Date(m.date); if (!isNaN(dt)) rows.push(['Date', dt.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })]); }
if (!(detail && detail.info && detail.info.some(function (r) { return r[0] === 'Venue'; })) && (m.venue || m.location)) rows.push(['Venue', typeof (m.venue || m.location) === 'string' ? (m.venue || m.location) : ((m.venue || m.location).fullName || (m.venue || m.location).name || '')]);
if (detail && detail.info) rows = rows.concat(detail.info);
rows = rows.filter(function (r) { return r[1]; });
var h = '<dl class="cs-info">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>';
if (detail && detail.notes) detail.notes.forEach(function (n) { h += '<p class="cs-note">' + esc(n) + '</p>'; });
if (!detail) h += '<span class="cs-load" style="margin-top:14px"></span>';
return h;
}
function renderSheet() {
if (!sheet || sheet.hidden || !curM) return;
var m = curM, fs = m.fullStatus || {}, st = (fs.type || {}).state, body = $('#cs-body'), keep = body.scrollTop;
var head = '<div class="cs-head">' + (st === 'in' ? '<span class="live-badge">LIVE</span>' : st === 'post' ? '<span>Result</span>' : '<span>Upcoming</span>') + '<span>' + esc(m.league || '') + '</span></div>';
var teams = '<div class="cs-teams">' + (m.competitors || []).map(function (c) {
return '<div class="cs-team' + (String(c.id) === String(fs.battingTeamId) ? ' bat' : '') + '"><div class="cs-tn">' + (c.logo ? '<img alt="" src="' + esc(c.logo) + '">' : '') + '<span>' + esc(c.name || c.abbreviation) + '</span></div><div class="cs-sc">' + esc(c.score || (st === 'pre' ? '' : 'Yet to bat')) + '</div></div>';
}).join('') + '</div>';
var res = '<div class="cs-res">' + esc(fs.summary || m.summary || '') + '</div>';
var tabs = '<div class="cs-tabs" role="tablist">' + [['sum', 'Info'], ['sc', 'Scorecard'], ['sq', 'Squads']].map(function (x) { return '<button aria-selected="' + (tab === x[0]) + '" class="' + (tab === x[0] ? 'on' : '') + '" data-tab="' + x[0] + '" role="tab" type="button">' + x[1] + '</button>'; }).join('') + '</div>';
var panes = '<div class="cs-pane' + (tab === 'sum' ? ' on' : '') + '">' + infoHtml() + '</div><div class="cs-pane' + (tab === 'sc' ? ' on' : '') + '">' + scorecardHtml() + '</div><div class="cs-pane' + (tab === 'sq' ? ' on' : '') + '">' + squadsHtml() + '</div>';
var foot = '<div class="cs-foot"><span>' + (isLive(m) ? '<span class="dot-live"></span>Auto-updates every 30s' : '') + (lastUp ? (isLive(m) ? ' · ' : '') + 'Updated ' + lastUp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '') + '</span><button data-refresh type="button">Refresh</button></div>';
body.innerHTML = head + teams + res + tabs + panes + foot;
body.scrollTop = keep;
}
load(); restart(); setInterval(function () { if (!document.hidden) load(); }, 60000);
}
/* ---------- Most Read (NDTV style): headline + thumbnail rows with category and comments ---------- */
(function () {
var ol = $('#mr-pop'); if (!ol) return;
var CM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/></svg>';
function key(u) { try { return new URL(u, location.href).pathname; } catch (e) { return ''; } }
function build() {
if (ol.classList.contains('mr-ready')) return;
var items = $$('#mr-pop > li');
if (!items.length) { var w = ol.closest('.widget'); if (w) w.hidden = true; return; }
items.slice(6).forEach(function (li) { li.remove(); });
items.slice(0, 6).forEach(function (li) {
var a = li.querySelector('a.t'), im = li.querySelector('.im img'); if (!a) return;
var href = esc(a.getAttribute('href')), src = im && im.getAttribute('src');
li.className = 'mr-item' + (src ? '' : ' mr-noimg');
li.innerHTML = '<a class="mr-a" href="' + href + '"><span class="mr-tt">' + esc(a.textContent) + '</span></a>' +
(src ? '<a class="mr-th" href="' + href + '" tabindex="-1" aria-hidden="true"><img loading="lazy" decoding="async" alt="" width="320" height="180" src="' + esc(img(src, 320, 180)) + '"></a>' : '') +
'<div class="mr-meta"><span class="mr-cat"></span><i></i><a class="mr-cm" href="' + href + '#comments" aria-label="Comments">' + CM + '</a><i></i></div>';
});
ol.classList.add('mr-ready');
/* category label per story, taken from the latest posts feed (hidden when a story is older than the feed window) */
feed('', 100).then(function (posts) {
var m = {};
(posts || []).forEach(function (p) {
var l = (p.labels || []).filter(function (t) { return !isVideoLabel(t) && !/^membership$/i.test(t); })[0];
if (l) m[key(p.url)] = l;
});
$$('#mr-pop > li.mr-item').forEach(function (li) {
var a = li.querySelector('.mr-a'), c = li.querySelector('.mr-cat'), l = a && m[key(a.getAttribute('href'))];
if (c && l) c.textContent = l;
});
});
}
Promise.all([feed('Membership', 40), feed(VIDEO_LABEL, 40)]).then(function (r) {
var set = {};
r.forEach(function (list) { (list || []).forEach(function (p) { try { set[new URL(p.url).pathname] = 1; } catch (e) {} }); });
$$('#mr-pop > li').forEach(function (li) { var a = li.querySelector('a[href]'); try { if (a && set[new URL(a.href).pathname]) li.remove(); } catch (e) {} });
build();
}, build);
})();

/* ---------- Up Next: slide-in card with the next story once ~60% of the article has been read ---------- */
(function () {
var art = $('#article'); if (!art || art.getAttribute('data-type') !== 'post') return;
var post = null, box = null, closed = false, ticking = false;
try { closed = sessionStorage.getItem('sr7_un') === '1'; } catch (e) {}
if (closed) return;
function pickPost() {
var list = window.sr7Related || [];
post = list.filter(function (p) { return p && p.url && !(p.labels || []).some(function (t) { return /^membership$/i.test(t) || isVideoLabel(t); }); })[0] || null;
}
function make() {
if (box || !post) return;
box = document.createElement('aside'); box.className = 'sr7-un'; box.setAttribute('aria-label', 'Up next');
box.innerHTML = '<a class="un-a" href="' + esc(post.url) + '">' + (post.image ? '<img class="un-th" alt="" width="64" height="48" loading="lazy" src="' + esc(img(post.image, 160, 120)) + '">' : '') + '<span><span class="un-k">Up next</span><span class="un-t">' + esc(post.title) + '</span></span></a><button type="button" class="un-x" aria-label="Dismiss">&times;</button>';
box.querySelector('.un-x').addEventListener('click', function () { box.classList.remove('on'); closed = true; try { sessionStorage.setItem('sr7_un', '1'); } catch (e) {} setTimeout(function () { if (box) box.remove(); }, 400); });
document.body.appendChild(box);
}
function check() {
ticking = false; if (closed) return;
var r = art.getBoundingClientRect(), total = r.height - innerHeight, done = total > 0 ? -r.top / total : 0, rel = $('#related'), rr = rel && !rel.hidden ? rel.getBoundingClientRect() : null;
var show = done > 0.6 && !(rr && rr.top < innerHeight * 0.7);
if (show) make();
if (box) box.classList.toggle('on', show);
}
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(check); } }
function start() { pickPost(); if (!post) return; addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); check(); }
if (window.sr7Related) start(); else document.addEventListener('sr7:related', start, { once: true });
})();

/* ---------- End of every article: "Featured Video Of The Day" + search.
   Technology stories also keep loading the next story while the reader scrolls (endless reading).
   SEO: every story keeps its own real URL and canonical; nothing is injected until a real scroll/touch/key event,
   so crawlers only ever see the clean single-article page. The address bar + title follow the story being read. ---------- */
(function () {
var art = $('#article');
if (!art || art.getAttribute('data-type') !== 'post') return;
var LOGO_DARK = 'https://raw.githubusercontent.com/sr7themes/sr7themes-icon/refs/heads/main/The-orpte-header-logo-red-gradient-1.svg';
var isMb = function (l) { return /^membership$/i.test(String(l || '').trim()); };
var vids = null;
function fvdFind(html) {
var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
var first = doc.querySelector('iframe, video, a[href*="youtube.com/watch"], a[href*="youtu.be/"], a[href*="youtube.com/shorts/"], a[href*=".mp4"], a[href*=".webm"], a[href*=".m3u8"]');
if (!first) return null;
var tag = first.tagName, src = '';
if (tag === 'IFRAME') src = first.getAttribute('src') || first.getAttribute('data-src') || '';
else if (tag === 'VIDEO') { var so = first.querySelector('source'); src = first.getAttribute('src') || (so && so.getAttribute('src')) || ''; }
else src = first.getAttribute('href') || '';
if (!src) return null;
var id = ytId(src);
if (id) return { kind: 'yt', id: id, src: src, poster: 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg' };
if (tag === 'IFRAME') return { kind: 'embed', src: src };
return { kind: 'file', id: '', src: src, poster: (first.getAttribute && first.getAttribute('poster')) || '' };
}
function fvdVideos() {
if (vids) return vids;
vids = fetch(ORIGIN + '/feeds/posts/default/-/' + encodeURIComponent(VIDEO_LABEL) + '?alt=json&max-results=12')
.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
.then(function (data) {
return ((data.feed || {}).entry || []).map(function (e) {
var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0] || {};
return 
