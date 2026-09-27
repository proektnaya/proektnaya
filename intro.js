(function () {
  var STORAGE_KEY = 'introPlayed';
  var overlay = document.getElementById('intro-overlay');
  var canvas = document.getElementById('intro-canvas');
  if (!overlay || !canvas) return;

  var skip =
    sessionStorage.getItem(STORAGE_KEY) ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  if (skip) {
    overlay.remove();
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, '1');

  document.documentElement.classList.add('intro-lock');

  var ctx = canvas.getContext('2d');
  var RED = '#ff3b3b'; // «редлайн» поверх синего чертежа сайта
  var COLS = 28;
  var ROWS = 16;
  var HOLD_MS = 260;

  function resize() {
    canvas.width = overlay.clientWidth;
    canvas.height = overlay.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function cellW() { return canvas.width / COLS; }
  function cellH() { return canvas.height / ROWS; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // Каждый "пиксель" летит справа налево в свою ячейку сетки.
  // Столбцы справа стартуют первыми — так рождается волна.
  var particles = [];
  for (var c = 0; c < COLS; c++) {
    for (var r = 0; r < ROWS; r++) {
      particles.push({
        col: c,
        row: r,
        delay: (COLS - 1 - c) * 16 + Math.random() * 40,
        dur: 200 + Math.random() * 120
      });
    }
  }

  var phase = 'in'; // in -> hold -> out -> done
  var startTime = null;
  var phaseStart = 0;

  function step(ts) {
    if (startTime === null) startTime = ts;
    var t = ts - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (phase === 'in') {
      var allDone = true;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var localT = t - p.delay;
        var prog = localT <= 0 ? 0 : Math.min(1, localT / p.dur);
        if (prog < 1) allDone = false;
        if (prog <= 0) continue;

        var eased = easeOutCubic(prog);
        var targetX = p.col * cellW();
        var startX = canvas.width + cellW();
        var x = startX + (targetX - startX) * eased;
        var y = p.row * cellH();

        ctx.globalAlpha = 0.85 + 0.15 * eased;
        ctx.fillStyle = RED;
        ctx.fillRect(x, y, cellW() + 1, cellH() + 1);
      }
      ctx.globalAlpha = 1;
      if (allDone) {
        phase = 'hold';
        phaseStart = t;
      }
    } else if (phase === 'hold') {
      ctx.fillStyle = RED;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (t - phaseStart >= HOLD_MS) {
        overlay.style.background = 'transparent'; // белая подложка уходит вместе с пикселями
        phase = 'out';
        phaseStart = t;
      }
    } else if (phase === 'out') {
      var ot = t - phaseStart;
      var outDone = true;
      for (var j = 0; j < particles.length; j++) {
        var q = particles[j];
        if (q.outDelay === undefined) {
          q.outDelay = q.col * 16 + Math.random() * 40;
          q.outDur = 240 + Math.random() * 140;
        }
        var lt = ot - q.outDelay;
        var pr = lt <= 0 ? 0 : Math.min(1, lt / q.outDur);
        if (pr < 1) outDone = false;
        if (pr >= 1) continue;

        var ez = easeOutCubic(pr);
        ctx.globalAlpha = 1 - ez;
        ctx.fillStyle = RED;
        ctx.fillRect(q.col * cellW(), q.row * cellH(), cellW() + 1, cellH() + 1);
      }
      ctx.globalAlpha = 1;
      if (outDone) phase = 'done';
    }

    if (phase !== 'done') {
      requestAnimationFrame(step);
    } else {
      document.documentElement.classList.remove('intro-lock');
      overlay.style.transition = 'opacity .2s ease';
      overlay.style.opacity = '0';
      setTimeout(function () { overlay.remove(); }, 220);
    }
  }

  requestAnimationFrame(step);
})();
