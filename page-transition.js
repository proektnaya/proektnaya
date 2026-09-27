(function () {
  /*
   * Универсальный переход между страницами («наезд/отъезд камеры» на прицел в лого).
   * Достаточно подключить page-transition.css в <head> и этот файл первой же
   * строкой после <body> (без defer/async) — никакой ручной разметки не нужно,
   * скрипт сам оборачивает содержимое страницы и создаёт декоративный прицел.
   */

  // Прячем страницу до готовности обёртки — иначе будет вспышка «сырой» вёрстки.
  var hideStyle = document.createElement('style');
  hideStyle.textContent = 'body{visibility:hidden!important;}';
  document.head.appendChild(hideStyle);

  var DURATION_IN = 700;  // должно совпадать с transform-длительностью .pt-in в CSS
  var DURATION_OUT = 550; // должно совпадать с transform-длительностью .pt-out в CSS
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var content, mark;

  function buildScaffold() {
    if (document.getElementById('page-content')) {
      content = document.getElementById('page-content');
      return;
    }
    content = document.createElement('div');
    content.id = 'page-content';

    Array.prototype.slice.call(document.body.childNodes).forEach(function (node) {
      if (node.tagName === 'SCRIPT') return;                 // скрипты не трогаем
      if (node.id === 'intro-overlay') return;                // интро — отдельный слой поверх
      if (node.id === 'page-transition') return;               // на случай, если уже есть
      content.appendChild(node);
    });
    document.body.insertBefore(content, document.body.firstChild);

    var overlay = document.createElement('div');
    overlay.id = 'page-transition';
    overlay.setAttribute('aria-hidden', 'true');
    var reticle = document.createElement('span');
    reticle.className = 'pt-reticle';
    overlay.appendChild(reticle);
    document.body.appendChild(overlay);
  }

  function setOrigin() {
    mark = mark || document.querySelector('.site-header .crosshair');
    var rect = mark ? mark.getBoundingClientRect() : null;
    var x = rect ? rect.left + rect.width / 2 : 0;
    var y = rect ? rect.top + rect.height / 2 : 0;
    document.body.style.setProperty('--pt-x', x + 'px');
    document.body.style.setProperty('--pt-y', y + 'px');
  }

  function reveal() {
    hideStyle.remove();
  }

  function playEntrance() {
    if (window.__introPlaying || reduced) {
      document.body.classList.add('pt-open');
      reveal();
      return;
    }
    setOrigin();
    reveal();
    void content.offsetWidth; // форс рефлоу: фиксируем стартовое состояние (scale/opacity) до включения transition
    document.body.classList.add('pt-in');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.add('pt-open');
      });
    });
    setTimeout(function () {
      document.body.classList.remove('pt-in');
    }, DURATION_IN + 60);
  }

  function playExit(href) {
    if (reduced) {
      window.location.href = href;
      return;
    }
    setOrigin();
    document.body.classList.add('pt-out');
    void content.offsetWidth; // форс рефлоу: фиксируем текущее «открытое» состояние до включения transition
    document.body.classList.remove('pt-open');
    setTimeout(function () {
      window.location.href = href;
    }, DURATION_OUT);
  }

  function isInternalLink(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (a.origin !== window.location.origin) return false;
    if (a.href.split('#')[0] === window.location.href.split('#')[0]) return false;
    return a.protocol === 'http:' || a.protocol === 'https:';
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a');
    if (!isInternalLink(a)) return;
    e.preventDefault();
    playExit(a.href);
  });

  function init() {
    buildScaffold();
    playEntrance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
