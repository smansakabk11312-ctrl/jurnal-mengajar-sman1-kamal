// ============================================
// app.js — SPA router, UI helpers, bootstrap aplikasi
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
  document.querySelector('.navlink[data-page="guru-wali"]')?.closest('a')?.toggleAttribute('hidden', !AppState.isGuruWali);
  const guruWaliLink = document.querySelector('a[data-page="guru-wali"]');
  if (guruWaliLink) guruWaliLink.hidden = !AppState.isGuruWali;
  const nav = document.getElementById('main-nav');
  if (nav) nav.hidden = !AppState.token;
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.hidden = !AppState.token;
}

// ============================================
// UI helpers
// ============================================
function showToast(message, type) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'toast show toast-' + (type || 'success');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}
function showLoading(show) {
  document.getElementById('global-loading').style.display = show ? 'flex' : 'none';
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function logout() {
  AppState.token = ''; AppState.nip = ''; AppState.role = ''; AppState.isGuruWali = false;
  Store.del(userKey('session'));
  document.querySelectorAll('.page').forEach(p => p.remove());
  go('login');
}

// ============================================
// Restore sesi dari localStorage (agar refresh tidak logout)
// ============================================
function restoreSession() {
  const sesi = Store.get('session', null);
  if (sesi && sesi.exp > Date.now()) {
    AppState.token = sesi.token; AppState.nip = sesi.nip; AppState.nama = sesi.nama;
    AppState.role = sesi.role; AppState.isGuruWali = sesi.isGuruWali;
    document.getElementById('user-name').textContent = sesi.nama + (sesi.role === 'WAKA' ? ' (Waka Kurikulum)' : '');
    return true;
  }
  return false;
}
function simpanSesi(res) {
  AppState.token = res.data.token; AppState.nip = res.data.nip; AppState.nama = res.data.nama;
  AppState.role = res.data.role; AppState.isGuruWali = res.data.isGuruWali;
  Store.set('session', { token: res.data.token, nip: res.data.nip, nama: res.data.nama,
    role: res.data.role, isGuruWali: res.data.isGuruWali, exp: Date.now() + 12 * 3600e3 });
  document.getElementById('user-name').textContent = res.data.nama + (res.data.role === 'WAKA' ? ' (Waka Kurikulum)' : '');
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  warmUpServer();
  const sesiAda = restoreSession();
  window.addEventListener('hashchange', route);
  if (!location.hash) location.hash = '#/' + defaultPage();
  route();
  if (sesiAda) updateNav(location.hash.replace(/^#\/?/, '').split('/')[0]);

  document.getElementById('btn-logout')?.addEventListener('click', logout);

  // Warm-up ping saat kembali dari latar belakang > 2 menit
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 120000) warmUpServer();
  });
});
