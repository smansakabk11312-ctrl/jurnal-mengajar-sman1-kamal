// ============================================
// app.js — UI helpers, bootstrap aplikasi
// Router inti (Pages/registerPage/go/route/defaultPage/updateNav) dipindah
// ke js/router.js agar dimuat SEBELUM file js/page-*.js (lihat router.js).
// Pola gas-instant-ux-pro Prinsip 1 (SPA hash router, halaman "hidup")
// ============================================

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
