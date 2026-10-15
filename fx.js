/* =========================================================
   FX-слой ПРОЕКТНОЙ: курсор, зерно, прогресс, reveal,
   пословные заголовки, scramble-декод, магнитные кнопки,
   параллакс героя. Ничего в контенте не меняет.
   ========================================================= */
(function () {
  'use strict';

  var d = document, h = d.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;

  /* ↓ впиши URL своего Cloudflare Worker (см. worker.js). Пусто = маячок молчит. */
  var WORKER_URL = '';

  /* ↓ проще вариант: URL веб-приложения Google Apps Script (см. apps-script.gs),
       тот же адрес, что впишешь в stats.html. Заполнен хотя бы один = маячок работает. */
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbziPtoA2-5mOmTui5G3XL5eP6Podk8cnWFeT_R5fC46zv5PkObBLNz5PTXJA5pi1ipA/exec';

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();

  function mk(tag, cls) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function init() {
    if (!d.body) return;

    d.body.appendChild(mk('div', 'fx-grain'));
    var bar = mk('div', 'fx-progress');
    d.body.appendChild(bar);

    scrollFx(bar);
    lazyVideo();
    telemetry();
    if (fine && !reduced) { cursorGlow(); reticle(); }
    reveals();
    splitHeadings();
    if (!reduced) { magnetic(); scrambleEyes(); }
  }

  /* ---------- header state, progress bar, hero parallax ---------- */
  function scrollFx(bar) {
    var heroMedia = d.querySelector('.hero-media');
    var ticking = false;
    function tick() {
      ticking = false;
      var y = window.pageYOffset || h.scrollTop || 0;
      h.classList.toggle('is-scrolled', y > 28);
      var max = d.body.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      if (heroMedia && y < innerHeight * 1.2) {
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(1) + 'px,0)';
      }
    }
    // rAF-троттлинг: не больше одного пересчёта на кадр
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(tick); }
    }, { passive: true });
    addEventListener('resize', tick);
    tick();
  }

  /* ---------- light spot following the pointer (transform = compositor, no repaint) ---------- */
  function cursorGlow() {
    var g = mk('div', 'fx-cursor-glow');
    d.body.appendChild(g);
    addEventListener('pointermove', function (e) {
      g.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    }, { passive: true });
  }

  /* ---------- маячок визита для stats.html (Cloudflare Worker или Google Apps Script) ---------- */
  function telemetry() {
    var backend = WORKER_URL ? 'worker' : (GAS_URL ? 'gas' : '');
    if (!backend) return;
    if (location.pathname.indexOf('stats.html') !== -1) return; // админ-страницу не пишем
    var page = location.pathname.split('/').pop() || 'index.html';

    if (backend === 'worker') {
      try {
        fetch(WORKER_URL + '/log?p=' + encodeURIComponent(page), { method: 'POST', keepalive: true });
      } catch (e) {}
      return;
    }

    // GAS: устройство/браузер парсим здесь, IP берём с ipify, пишем GET-маячком (JSONP-friendly)
    try {
      var ua = navigator.userAgent;
      fetch('https://api.ipify.org?format=json')
        .then(function (r) { return r.json(); })
        .then(function (j) { send(j.ip || '?'); })
        .catch(function () { send('?'); });

      function send(ip) {
        var q = '?task=log&ip=' + encodeURIComponent(ip) +
          '&device=' + encodeURIComponent(deviceName(ua)) +
          '&os=' + encodeURIComponent(osName(ua)) +
          '&browser=' + encodeURIComponent(browserName(ua)) +
          '&path=' + encodeURIComponent(page);
        new Image().src = GAS_URL + q;
      }
    } catch (e) {}
  }

  function deviceName(ua) {
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/iPod/.test(ua)) return 'iPod';
    if (/Android/.test(ua)) {
      var m = ua.match(/Android[^;]*;\s*([^;)]+)\s*(?:Build|;|\))/);
      return m ? m[1].trim().slice(0, 40) : 'Android';
    }
    if (/Mac OS X/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Другое';
  }
  function osName(ua) {
    var m = ua.match(/(?:Android|iPhone OS|Windows NT|Mac OS X) [\d_.]+/);
    return m ? m[0].replace(/_/g, '.') : '—';
  }
  function browserName(ua) {
    if (/OPR|Opera/.test(ua)) return 'Opera';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/SamsungBrowser/.test(ua)) return 'Samsung';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Другой';
  }

  /* ---------- pause the hero video when it is off-screen or tab hidden ---------- */
  function lazyVideo() {
    var v = d.querySelector('.hero-media video');
    if (!v) return;
    var visible = true;
    function play() { if (visible && !d.hidden) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
    function pause() { v.pause(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { visible = en.isIntersecting; visible ? play() : pause(); });
      }, { threshold: 0.05 }).observe(v);
    }
    d.addEventListener('visibilitychange', function () { d.hidden ? pause() : play(); });
  }

  /* ---------- reticle cursor: dot + trailing ring ---------- */
  function reticle() {
    var dot = mk('div', 'fx-cdot');
    var ring = mk('div', 'fx-cring');
    d.body.appendChild(dot);
    d.body.appendChild(ring);

    var x = -100, y = -100, rx = x, ry = y, link = false, press = false;

    addEventListener('pointermove', function (e) {
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      link = !!(e.target.closest && e.target.closest('a,button,input,summary,[data-tilt]'));
      ring.classList.toggle('fx-cursor-link', link);
    }, { passive: true });
    addEventListener('pointerdown', function () { press = true; });
    addEventListener('pointerup', function () { press = false; });

    (function loop() {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      var s = (press ? 0.78 : 1) * (link ? 1.35 : 1);
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0) scale(' + s + ')';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- generic scroll reveal ---------- 
  function reveals() {
    var els = d.querySelectorAll('.section-head, .project-grid>*, .photo-grid>*, .video-frame, .presentation-embed, .faq-item, .faq-cta, .void-inner, .hero-content>*, .detail-head .eyebrow, .achievement, .manifesto-text, .profile-copy, .profile-photo');
    var list = [];
    els.forEach(function (el) { if (!el.classList.contains('reveal')) list.push(el); });

    if (reduced) {
      list.forEach(function (el) { el.classList.add('fx-show'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('fx-show'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    list.forEach(function (el, i) {
      el.classList.add('fx-init');
      el.style.setProperty('--fx-d', (i % 3) * 110 + 'ms');
      io.observe(el);
    });
  }*/

  /* ---------- word-by-word h1 entrance ---------- */
  function splitHeadings() {
    d.querySelectorAll('h1').forEach(function (head) {
      if (reduced) return;
      var idx = 0;
      Array.prototype.slice.call(head.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = d.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(p)); return; }
            var s = mk('span', 'fx-word');
            s.textContent = p;
            s.style.setProperty('--fx-w', idx++);
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          n.classList.add('fx-word');
          n.style.setProperty('--fx-w', idx++);
        }
      });

      head.classList.add('fx-init');
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('fx-show'); io.unobserve(en.target); }
        });
      }, { threshold: 0.2 });
      io.observe(head);
    });
  }

  /* ---------- magnetic buttons ---------- */
  function magnetic() {
    d.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.22;
        var dy = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- telemetry «decode» for .eyebrow labels ---------- */
  var CHARS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789#/<>*·—';

  function scrambleEyes() {
    var eyes = [];
    d.querySelectorAll('.eyebrow').forEach(function (el) {
      if (el.children.length === 0 && el.textContent.trim().length > 2) eyes.push(el);
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { decode(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    eyes.forEach(function (el) { io.observe(el); });
  }

  function decode(el) {
    var txt = el.textContent;
    var arr = txt.split('');
    var start = performance.now();
    var dur = 420 + arr.length * 34;
    function step(t) {
      var p = Math.min(1, (t - start) / dur);
      var done = Math.floor(p * p * arr.length);
      el.textContent = arr.map(function (c, i) {
        if (i < done || c === ' ' || c === '·') return c;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = txt;
    }
    requestAnimationFrame(step);
  }
})();
