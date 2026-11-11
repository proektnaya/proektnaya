(function () {
  var btn = document.getElementById('soundToggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'soundToggle';
    btn.type = 'button';
    btn.className = 'sound-toggle march-floating';
    btn.setAttribute('aria-pressed', 'true');
    btn.hidden = true;
    var st = document.createElement('style');
    st.textContent = '.sound-toggle.march-floating{position:fixed;right:16px;bottom:16px;z-index:9999;padding:10px 14px;font-family:inherit;font-size:12px;font-weight:700;line-height:1;letter-spacing:.08em;text-transform:uppercase;color:var(--ink,#101216);background:var(--bg-elevated,#f7f2e5);border:2px solid var(--ink,#101216);border-radius:0;box-shadow:4px 4px 0 var(--ink,#101216);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,opacity .15s ease}.sound-toggle.march-floating:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink,#101216)}.sound-toggle.march-floating:active{transform:translate(0,0);box-shadow:2px 2px 0 var(--ink,#101216)}.sound-toggle.march-floating[aria-pressed="false"]{opacity:.6;text-decoration:line-through}';
    document.head.appendChild(st);
    document.body.appendChild(btn);
  }
  var page = (location.pathname.split('/').pop() || '').replace(/\.html?$/i, '');
  var src = btn.getAttribute('data-music') || ('music-' + (page || 'index') + '.mp3');
  var audio = new Audio(src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.4;
  var muted = sessionStorage.getItem('pj_mute') === '1';
  var missing = false;
  var silent = false;
  var restored = false;
  var posKey = 'pj_t_' + src;
  audio.muted = muted;

  function paint() {
    btn.textContent = muted ? 'ЗВУК: ВЫКЛ' : 'ЗВУК: ВКЛ';
    btn.setAttribute('aria-pressed', String(!muted));
  }
  function play() {
    if (missing || audio.readyState < 3 || !audio.paused) return;
    var p = audio.play();
    if (p && p.catch) p.catch(function (e) {
      if (e && e.name === 'NotAllowedError' && !muted && !silent) {
        silent = true;
        audio.muted = true;
        play();
      }
    });
  }
  function gesture() {
    if (silent && !muted) {
      silent = false;
      audio.muted = false;
    }
    play();
  }
  audio.addEventListener('canplay', function () {
    btn.hidden = false;
    paint();
    if (!restored) {
      restored = true;
      var t = parseFloat(sessionStorage.getItem(posKey) || '0');
      if (t > 0 && isFinite(audio.duration) && t < audio.duration - 1) {
        audio.currentTime = t;
        return;
      }
    }
    play();
  });
  audio.addEventListener('seeked', function () {
    play();
  });
  audio.addEventListener('error', function () {
    missing = true;
    btn.hidden = true;
  });
  addEventListener('pagehide', function () {
    if (!missing) sessionStorage.setItem(posKey, String(audio.currentTime || 0));
  });
  addEventListener('pageshow', function () {
    paint();
    play();
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) gesture();
  });
  btn.addEventListener('click', function () {
    muted = !muted;
    audio.muted = muted;
    silent = false;
    sessionStorage.setItem('pj_mute', muted ? '1' : '0');
    paint();
    play();
  });
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  document.addEventListener('touchstart', gesture, true);
  document.addEventListener('wheel', gesture, { passive: true });
  paint();
  window.__march = {
    state: function () { return missing ? 'missing' : (audio.paused ? 'paused' : 'playing'); },
    visible: function () { return !btn.hidden; },
    src: function () { return src; },
    audible: function () { return !audio.muted && !audio.paused; }
  };
})();