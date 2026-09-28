// Мобильное меню: подключи перед </body>  →  <script src="menu.js"></script>
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav.primary-nav');
  if (!toggle || !nav) return;

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  }

  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 721px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
})();
