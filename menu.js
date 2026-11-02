// Top menu: on phones a button opens the list; links close it. On wide screens the list is always shown (CSS).
(function () {
  var btn = document.getElementById('menu-btn');
  var menu = document.getElementById('menu');
  if (!btn || !menu) return;
  function set(open) {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function () { set(!menu.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); btn.focus(); } });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) set(false); });
})();
