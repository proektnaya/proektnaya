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

  var fxQueue = [];
  var fxIO = null;
  var fxRaf = 0;

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
    reveals();
    splitHeadings();
    stamps();
    kenBurns();
    if (!reduced) {
      magnetic();
      heroParallax();
      scrollRush();
      railNav();
      scrambleEyes();
      if (fine) tilt();
      counters();
    } else {
      counters(true);
    }
  }

  /* ---------- header state, progress bar, hero parallax ---------- */
  function scrollFx(bar) {
    var heroMedia = d.querySelector('.hero-media');
    var heroText = d.querySelector('.hero-content');
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
      if (heroText && !reduced && y < innerHeight) {
        heroText.style.transform = 'translate3d(0,' + (y * -0.12).toFixed(1) + 'px,0)';
        heroText.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.75)));
      }
    }
    // rAF-троттлинг: не больше одного пересчёта на кадр
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(tick); }
    }, { passive: true });
    addEventListener('resize', tick);
    tick();
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

  /* ---------- общий наблюдатель за .fx-init ----------
     clip-path оставляет от блока 4px полосы: узкая мишень не всегда
     попадает в кадр IntersectionObserver, поэтому дублируем сводкой по rect. */
  function dropFx(el) {
    var i = fxQueue.indexOf(el);
    if (i > -1) fxQueue.splice(i, 1);
  }

  function showFx(el) {
    if (el.classList.contains('fx-show')) return;
    el.classList.add('fx-show');
    dropFx(el);
    if (fxIO) fxIO.unobserve(el);
    // вложенный .fx-init родитель клипает в ноль — сам он не пересечётся никогда
    el.querySelectorAll('.fx-init').forEach(function (k) {
      k.classList.add('fx-show');
      dropFx(k);
      if (fxIO) fxIO.unobserve(k);
    });
  }

  function queueFx() { if (!fxRaf) fxRaf = requestAnimationFrame(sweepFx); }

  function sweepFx() {
    fxRaf = 0;
    var lim = innerHeight * 0.92;
    for (var j = fxQueue.length - 1; j >= 0; j--) {
      var r = fxQueue[j].getBoundingClientRect();
      if (r.top < lim && r.bottom > 0) showFx(fxQueue[j]);
    }
  }

  function watchFx(el) {
    if (reduced || !('IntersectionObserver' in window)) { showFx(el); return; }
    if (!fxIO) {
      fxIO = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) showFx(en.target); });
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
      addEventListener('scroll', queueFx, { passive: true });
      addEventListener('resize', queueFx, { passive: true });
    }
    fxQueue.push(el);
    fxIO.observe(el);
    queueFx();
  }

  /* ---------- generic scroll reveal ---------- */
  function reveals() {
    var els = d.querySelectorAll('.section-head, .project-grid>*, .photo-grid>*, .photo-grid figure, .video-frame, .presentation-embed, .faq-item, .faq-cta, .void-inner, .hero-content>*, .detail-head .eyebrow, .achievement, .manifesto-text, .profile-copy, .profile-photo, .marquee');
    var list = [];
    els.forEach(function (el) { if (!el.classList.contains('reveal')) list.push(el); });

    list.forEach(function (el, i) {
      el.classList.add('fx-init');
      el.style.setProperty('--fx-d', (i % 4) * 90 + 'ms');
      watchFx(el);
    });
    // страховка: ничего не должно остаться спрятанным
    setTimeout(function () { list.forEach(showFx); }, 4000);
  }

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

      head.classList.add('fx-init', 'fx-misreg');
      watchFx(head);
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

  /* ---------- штампы: «припечатывание» плашек при появлении ---------- */
  function stamps() {
    var els = d.querySelectorAll('.stamp');
    if (!els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('fx-stamp-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- дыхание Ken Burns на крупных фото ---------- */
  function kenBurns() {
    d.querySelectorAll('.profile-photo, .person-photo, .frame-photo').forEach(function (el) {
      el.classList.add('fx-kb');
    });
  }

  /* ---------- 3D tilt + блик за курсором ---------- */
  function tilt() {
    d.querySelectorAll('.project-card, .video-frame, .presentation-embed, .frame-photo').forEach(function (card) {
      card.classList.add('fx-glare');
      var pending = false, mx = 0, my = 0;

      function apply() {
        pending = false;
        var r = card.getBoundingClientRect();
        var px = (mx - r.left) / r.width - 0.5;
        var py = (my - r.top) / r.height - 0.5;
        card.classList.add('fx-tilt');
        card.style.setProperty('--ty', (px * 5).toFixed(2) + 'deg');
        card.style.setProperty('--tx', (-py * 5).toFixed(2) + 'deg');
        card.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
      }

      card.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY;
        if (!pending) { pending = true; requestAnimationFrame(apply); }
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--ty', '0deg');
        card.style.setProperty('--tx', '0deg');
      });
    });
  }

  /* ---------- докрутка чисел в статистике (исходный текст восстанавливается точно) ---------- */
  function counters(instant) {
    var els = d.querySelectorAll('.stats b, .person-stat b, .stat-box b, .target-card strong');
    Array.prototype.slice.call(els).forEach(function (el) {
      var raw = el.textContent;
      var m = raw.match(/^(\d+(?:[.,]\d+)?)([\s\S]*)$/);
      if (!m) return;
      var dec = (m[1].split(/[.,]/)[1] || '').length;
      var target = parseFloat(m[1].replace(',', '.'));
      var sep = /[.,]/.test(m[1]) ? m[1].replace(/\d/g, '') : '';
      if (!isFinite(target) || instant) return;

      el.dataset.countTo = target;
      el._restore = raw;

      function run() {
        var start = performance.now(), dur = 950;
        function step(t) {
          var p = Math.min(1, (t - start) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          var val = (target * e).toFixed(dec).replace('.', sep || '.');
          el.textContent = val + m[2];
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = raw; // ровно исходная строка
        }
        el.classList.add('fx-counting');
        requestAnimationFrame(step);
        setTimeout(function () { el.classList.remove('fx-counting'); }, dur + 80);
      }

      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { run(); io.disconnect(); } });
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  /* ---------- v4: параллакс героя от курсора (по самому видео, не по контейнеру) ---------- */
  function heroParallax() {
    var v = d.querySelector('.hero-media video, .hero-media img');
    if (!v || !fine || reduced) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, run = false;
    addEventListener('pointermove', function (e) {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
      if (!run) { run = true; requestAnimationFrame(loop); }
    }, { passive: true });
    function loop() {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      v.style.transform = 'translate3d(' + (cx * -22).toFixed(1) + 'px,' + (cy * -14).toFixed(1) + 'px,0) scale(1.08)';
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) requestAnimationFrame(loop);
      else run = false;
    }
  }

  /* ---------- v4: разгон бегущей строки от скорости скролла ---------- */
  function scrollRush() {
    var tracks = d.querySelectorAll('.marquee-track');
    if (!tracks.length || reduced) return;
    var last = 0, vel = 0, ticking = false;
    addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.pageYOffset || h.scrollTop || 0;
        vel = Math.min(1, Math.abs(y - last) / 60);
        last = y;
        for (var i = 0; i < tracks.length; i++) {
          tracks[i].style.setProperty('--marquee-speed', (22 - vel * 15).toFixed(1) + 's');
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- v4: боковой реестр разделов (только указательные устройства) ---------- */
  function railNav() {
    if (!fine || reduced) return;
    var secs = d.querySelectorAll('main > section, .section, .hero, .void, .detail-head, .portfolio-hero');
    if (secs.length < 2) return;
    var rail = mk('nav', 'fx-rail');
    rail.setAttribute('aria-hidden', 'true');
    var dots = [];
    Array.prototype.forEach.call(secs, function (s, i) {
      var b = mk('button', 'fx-rail-dot');
      b.type = 'button';
      b.tabIndex = -1;
      b.style.setProperty('--i', i);
      b.addEventListener('click', function () { s.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      rail.appendChild(b);
      dots.push(b);
    });
    d.body.appendChild(rail);

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = Array.prototype.indexOf.call(secs, en.target);
        for (var k = 0; k < dots.length; k++) dots[k].classList.toggle('is-now', k === i);
      });
    }, { threshold: 0.45 });
    Array.prototype.forEach.call(secs, function (s) { io.observe(s); });
  }
})();
