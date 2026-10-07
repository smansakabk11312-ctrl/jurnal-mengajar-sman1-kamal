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
  // PENTING: sesi disimpan di localStorage dengan key polos 'session' (lihat simpanSesi()/
  // restoreSession()), BUKAN userKey('session'). Dulu baris ini salah menghapus userKey('session')
  // (jadi 'u:anon:session' karena nip sudah dikosongkan duluan) sehingga sesi lama tidak pernah
  // benar-benar terhapus — begitu halaman dibuka/refresh lagi, restoreSession() menemukan sesi
  // lama masih valid dan otomatis login ulang ke dashboard sebelumnya.
  Store.del('session');
  AppState.token = ''; AppState.nip = ''; AppState.role = ''; AppState.isGuruWali = false;
  document.querySelectorAll('.page').forEach(p => p.remove());
  document.body.dataset.role = '';
  go('login');
}

// ============================================
// Empty-state helper (tabel/daftar kosong) — konsisten di semua modul
// ============================================
function emptyState(icon, text) {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span>${esc(text)}</div>`;
}

// ============================================
// Photo Capture & Verification Module (DESIGN.md)
// Modal kamera 16:9 + watermark (timestamp, lat/long, nama guru), dipakai
// saat mengisi jurnal (foto selfie bukti mengajar) — gas-instant-ux-pro:
// semua akses kamera/geolokasi dilakukan client-side, tanpa menunggu server.
// ============================================
async function openCameraModal(onCapture) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3 class="headline-sm">📷 Ambil Foto Selfie</h3><button class="modal-close" id="cm-close">✕</button></div>
      <div class="camera-preview">
        <video id="cm-video" autoplay playsinline muted></video>
        <div class="camera-watermark" id="cm-watermark">Menyiapkan kamera…</div>
      </div>
      <canvas id="cm-canvas" hidden></canvas>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-ghost" id="cm-cancel">Batal</button>
        <button class="btn btn-accent" id="cm-shoot" disabled>📸 Ambil Foto</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  let lat = null, lng = null;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(p => { lat = p.coords.latitude; lng = p.coords.longitude; }, () => {});
  }

  const video = backdrop.querySelector('#cm-video');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    backdrop.querySelector('#cm-shoot').disabled = false;
  } catch (e) {
    showToast('Kamera tidak dapat diakses — periksa izin browser.', 'error');
    backdrop.remove();
    return;
  }

  const wmInterval = setInterval(() => {
    const wm = backdrop.querySelector('#cm-watermark');
    if (!wm) return;
    const now = new Date();
    wm.innerHTML = `<span>${esc(AppState.nama || '')}</span><span>${esc(now.toLocaleString('id-ID'))}</span>` +
      `<span>${lat != null ? esc(lat.toFixed(5) + ', ' + lng.toFixed(5)) : 'Mencari lokasi…'}</span>`;
  }, 1000);

  function closeModal() {
    clearInterval(wmInterval);
    stream?.getTracks().forEach(t => t.stop());
    backdrop.remove();
  }
  backdrop.querySelector('#cm-close').onclick = closeModal;
  backdrop.querySelector('#cm-cancel').onclick = closeModal;
  backdrop.querySelector('#cm-shoot').onclick = () => {
    const canvas = backdrop.querySelector('#cm-canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Bakar watermark langsung ke foto (timestamp, lat/long, nama) sesuai DESIGN.md.
    const barH = Math.round(canvas.height * 0.09);
    ctx.fillStyle = 'rgba(26,26,46,.55)';
    ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
    ctx.fillStyle = '#fff';
    ctx.font = Math.round(canvas.width * 0.026) + 'px Inter, sans-serif';
    const now = new Date();
    const line1 = `${AppState.nama || ''} · ${now.toLocaleString('id-ID')}`;
    const line2 = lat != null ? `Lat ${lat.toFixed(5)}, Long ${lng.toFixed(5)}` : 'Lokasi tidak tersedia';
    ctx.fillText(line1, 12, canvas.height - barH * 0.52);
    ctx.fillText(line2, 12, canvas.height - barH * 0.16);
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    closeModal();
    onCapture(base64, 'image/jpeg');
  };
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
  // Gerbang konfigurasi: jika config.js belum diisi URL /exec yang benar,
  // tampilkan peringatan yang jelas di layar (bukan dibiarkan gagal diam-diam
  // sebagai error CORS/404 yang membingungkan di console).
  if (typeof GAS_URL_BELUM_DIISI !== 'undefined' && GAS_URL_BELUM_DIISI) {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999;background:#EF4444;color:#fff;padding:10px 16px;font-size:13px;font-weight:600;text-align:center;';
    bar.textContent = '⚠️ js/config.js belum diisi URL /exec Apps Script Anda (masih placeholder GANTI_DENGAN_DEPLOYMENT_ID_ANDA) — semua pemanggilan API akan gagal sampai ini diperbaiki.';
    document.body.prepend(bar);
  } else {
    warmUpServer();
  }
  const sesiAda = restoreSession();
  window.addEventListener('hashchange', route);
  if (!location.hash) location.hash = '#/' + defaultPage();
  route();
  if (sesiAda) updateNav(location.hash.replace(/^#\/?/, '').split('/')[0]);

  document.getElementById('btn-logout')?.addEventListener('click', logout);

  // Sidebar collapsible (mobile/tablet <1024px) — DESIGN.md "persistent collapsible sidebar"
  const sidebarEl = document.getElementById('sidebar');
  const scrimEl = document.getElementById('sidebar-scrim');
  document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
    sidebarEl?.classList.toggle('open');
    if (scrimEl) scrimEl.hidden = !sidebarEl?.classList.contains('open');
  });
  scrimEl?.addEventListener('click', () => {
    sidebarEl?.classList.remove('open');
    scrimEl.hidden = true;
  });

  // Warm-up ping saat kembali dari latar belakang > 2 menit
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 120000) warmUpServer();
  });
});
