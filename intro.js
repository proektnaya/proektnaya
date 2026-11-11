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
  // пока играем — страничная «камера» подождёт до конца интро
  window.__introPlaying = true;

  var ctx = canvas.getContext('2d');
  var INK = '#101216';
  var BLUE = '#1b34e8';
  var PINK = '#ff1f5a';
  var ACID = '#d7f23c';
  var COLS = 28;
  var ROWS = 16;
  var HOLD_MS = 420;

  function resize() {
    canvas.width = overlay.clientWidth;
    canvas.height = overlay.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function cellW() { return canvas.width / COLS; }
  function cellH() { return canvas.height / ROWS; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // riso-сепарация: каждый блок получает свой печатный цвет
  function plate(col, row) {
    var k = (col * 7 + row * 13) % 9;
    if (k === 0) return BLUE;
    if (k === 3) return PINK;
    if (k === 6) return ACID;
    return INK;
  }

  // Каждый «пиксель» летит справа налево в свою ячейку сетки.
  // Столбцы справа стартуют первыми — так рождается волна.
  var particles = [];
  for (var c = 0; c < COLS; c++) {
    for (var r = 0; r < ROWS; r++) {
      particles.push({
        col: c,
        row: r,
        color: plate(c, r),
        delay: (COLS - 1 - c) * 16 + Math.random() * 40,
        dur: 200 + Math.random() * 120
      });
    }
  }

  var phase = 'in'; // in -> hold -> out -> done
  var startTime = null;
  var phaseStart = 0;

  // мисрегистрация: цветной сдвиг-дубль поверх основного блока
  function offsetPlate(x, y, w, h, color, dx, dy, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + dx, y + dy, w, h);
  }

  function step(ts) {
    if (startTime === null) startTime = ts;
    var t = (ts - startTime) * 2;
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
        var w = cellW() + 1, h = cellH() + 1;

        offsetPlate(x, y, w, h, p.color === INK ? PINK : BLUE, 3 * (1 - eased), -2 * (1 - eased), 0.55);
        ctx.globalAlpha = 0.85 + 0.15 * eased;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = 1;
      if (allDone) {
        phase = 'hold';
        phaseStart = t;
      }
    } else if (phase === 'hold') {
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // кислотная полоса-проявка проходит сверху вниз
      var ht = (t - phaseStart) / HOLD_MS;
      var band = canvas.height * (ht * 1.4 - 0.2);
      ctx.fillStyle = ACID;
      ctx.fillRect(0, band, canvas.width, Math.max(2, canvas.height * 0.04));
      ctx.fillStyle = PINK;
      ctx.fillRect(0, band - canvas.height * 0.05, canvas.width, 2);
      if (t - phaseStart >= HOLD_MS) {
        overlay.style.background = 'transparent'; // бумажная подложка уходит вместе с пикселями
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
        ctx.fillStyle = q.color;
        ctx.fillRect(q.col * cellW() + ez * 40, q.row * cellH(), cellW() + 1, cellH() + 1);
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
      setTimeout(function () {
        overlay.remove();
        window.__introPlaying = false;
        if (window.__ptPlayEntrance) window.__ptPlayEntrance();
      }, 220);
    }
  }

  requestAnimationFrame(step);
})();
