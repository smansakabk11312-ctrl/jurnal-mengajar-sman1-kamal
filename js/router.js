// ============================================
// router.js — Pages registry & SPA hash router
// HARUS dimuat SEBELUM semua file js/page-*.js, karena file-file itu memanggil
// registerPage(...) di baris paling atas saat script dijalankan (bukan di dalam event listener).
// Pola gas-instant-ux-pro Prinsip 1 (SPA hash router, halaman "hidup")
// ============================================

const Pages = {};
function registerPage(name, def) { Pages[name] = Object.assign({ auth: 'guest' }, def); }

function go(name, param) {
  const h = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
  if (location.hash === h) route(); else location.hash = h;
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const name = parts[0] || defaultPage();
  const param = parts[1];
  const def = Pages[name] || Pages[defaultPage()];

  // Penjaga akses berbasis peran
  if (def.auth === 'guru' && (!AppState.token || AppState.role !== 'GURU')) { go('login'); return; }
  if (def.auth === 'waka' && (!AppState.token || AppState.role !== 'WAKA')) { go('login'); return; }
  if (def.auth === 'guru-wali' && (!AppState.token || !AppState.isGuruWali)) { go('beranda'); return; }

  let el = document.querySelector('.page[data-page="' + name + '"]');
  if (!el) {
    el = document.createElement('section');
    el.className = 'page';
    el.dataset.page = name;
    el.innerHTML = def.template();
    document.getElementById('app-content').appendChild(el);
  }
  document.querySelectorAll('.page').forEach(p => p.hidden = p !== el);
  updateNav(name);
  def.show && def.show(el, param && decodeURIComponent(param));
}

function defaultPage() {
  if (!AppState.token) return 'login';
  return AppState.role === 'WAKA' ? 'waka-dashboard' : 'beranda';
}

function updateNav(active) {
  document.querySelectorAll('.navlink').forEach(a => a.classList.toggle('active', a.dataset.page === active));
  document.querySelectorAll('.nav-section').forEach(s => s.hidden = s.dataset.role !== AppState.role);
  const guruWaliLink = document.querySelector('a[data-page="guru-wali"]');
  if (guruWaliLink) guruWaliLink.hidden = !AppState.isGuruWali;
  const nav = document.getElementById('main-nav');
  if (nav) nav.hidden = !AppState.token;
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.hidden = !AppState.token;
}
