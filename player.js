
<script>
(function () {
  /* =====================================================================
     SETTINGS  -  edit only this block
     ===================================================================== */

  /* Pre-roll ad (plays before the video, skippable after 5s).
     Set to null for no ad. `link` is optional ("Learn more" button). */
  var AD = {
    src:    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    poster: '',
    link:   'https://example.com'
  };

  /* The video itself.
     YouTube : { kind: 'yt',   id: 'VIDEO_ID' }
     MP4/HLS : { kind: 'file', src: 'https://.../video.mp4' }  (.m3u8 works too) */
  var VIDEO = {
    kind: 'file',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/640px-Big_buck_bunny_poster_big.jpg',
    title: 'SR7 Player'
  };

  /* ===================================================================== */

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  /* ad source for the player (the theme version reads this from Firestore) */
  window.sr7Ads = {
    pre: function (cb) { cb(AD && AD.src ? { id: 'preroll', p: { vid: AD.src, img: AD.poster || '', url: AD.link || '' } } : null); },
    bump: function () {},
    click: function () {}
  };

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
  function vpAttach(v, src, cb) {
    if (/\.m3u8(\?|$)/i.test(src) && !(v.canPlayType && v.canPlayType('application/vnd.apple.mpegurl'))) {
      vpScript('https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js', function () {
        if (window.Hls && window.Hls.isSupported()) { var h = new window.Hls(); h.loadSource(src); h.attachMedia(v); } else v.src = src;
        cb();
      });
    } else { v.src = src; cb(); }
  }
  function vpVideo() {
    var v = document.createElement('video');
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'none'; v.controls = false;
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
      '<div class="vp-spin"></div><div class="vp-msg" hidden></div>';

    var q = function (s) { return box.querySelector(s); };
    var stage = q('.vp-stage'), poster = q('.vp-poster'), mute = q('.vp-mute'), big = q('.vp-big'),
        pp = q('.vp-pp'), bk = q('.vp-bk'), fw = q('.vp-fw'), seek = q('.vp-seek'), fill = q('.vp-fill'),
        buf = q('.vp-buf'), knob = q('.vp-knob'), tm = q('.vp-time'), fsb = q('.vp-fsb'),
        adrow = q('.vp-adrow'), adt = q('.vp-adt'), learn = q('.vp-learn'), skip = q('.vp-skipad'), msg = q('.vp-msg');
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
        spinner(0); clearTimeout(blockT); box.classList.add('vp-nop'); box.classList.remove('vp-end'); setPlaying(true); syncMute();
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
    function contentEnd() {
      S.mode = 'end'; box.classList.add('vp-end'); box.classList.remove('vp-nop'); spinner(0); setPlaying(false);
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
     
