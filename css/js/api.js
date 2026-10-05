// ============================================
// api.js — fetch tahan jaringan HP (timeout, retry, reqId idempoten)
// Pola gas-instant-ux-pro Prinsip 8
// ============================================

const AppState = {
  token: '', nip: '', nama: '', role: '', isGuruWali: false,
  tables: {}
};

const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) {
    try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); }
    catch (e) {
      // kuota penuh → buang cache lama, coba sekali lagi
      try {
        Object.keys(localStorage).filter(x => x.indexOf(LS_PREFIX) === 0).slice(0, 5).forEach(x => localStorage.removeItem(x));
        localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
      } catch (e2) { /* tetap jalan tanpa cache */ }
    }
  },
  del(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) {} }
};
function userKey(k) { return 'u:' + (AppState.nip || 'anon') + ':' + k; }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }

const Perf = {
  rows: [],
  add(action, total, server) {
    this.rows.push({ action, total, server: server ?? null, net: server != null ? total - server : null, at: Date.now() });
    if (this.rows.length > 200) this.rows.shift();
  },
  table() { console.table(this.rows.slice(-30)); }
};

const READ_ACTIONS = /^(guruBootstrap|wakaBootstrap|riwayatJurnal|daftarAsesmen|daftarJurnalWali|daftarPemetaanMurid|rekapKehadiranBinaan|daftarCatatanKarakter|daftarKomunikasiOrtu|daftarProgramBimbingan|monitorJurnal|laporanRekap|daftarGuru|daftarJadwalSemua|migrasi\.pindai|migrasi\.log|notif\.config|notif\.queue|wa\.device|wa\.audience|wa\.blastList|crm\.list|crm\.stats|de\.templateList|de\.riwayatDokumen)$/;

async function apiOnce(action, data, timeout, reqId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight
      body: JSON.stringify({ action, token: AppState.token || '', reqId, data: data || {} })
    });
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      Perf.add(action, Math.round(performance.now() - t0), j.ms);
      return j;
    } catch (e) {
      return { success: false, network: true, retryable: res.status >= 500 || res.status === 429, message: 'Server membalas HTTP ' + res.status + ' (bukan JSON).' };
    }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus.' };
  } finally { clearTimeout(timer); }
}

async function api(action, data, opt) {
  opt = opt || {};
  const isRead = READ_ACTIONS.test(action);
  const reqId = isRead ? '' : (opt.reqId || (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()));
  const tries = isRead ? 3 : 2;
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) { await new Promise(r => setTimeout(r, 1200 * i)); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, isRead ? (i ? 40000 : 25000) : 90000, reqId);
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.code === 'AUTH') onSessionExpired();
  return res;
}
function waitOnline(ms) {
  return new Promise(r => {
    if (navigator.onLine !== false) return r();
    const t = setTimeout(done, ms);
    function done() { clearTimeout(t); removeEventListener('online', done); r(); }
    addEventListener('online', done);
  });
}
function warmUpServer() { fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); }

/** GET sederhana (tanpa token, untuk cek status publik) */
async function apiGet(action, params) {
  const qs = new URLSearchParams(Object.assign({ action }, params || {})).toString();
  try {
    const res = await fetch(GAS_URL + '?' + qs, { method: 'GET', cache: 'no-store' });
    return await res.json();
  } catch (e) { return { success: false, message: 'Koneksi gagal.' }; }
}

// ============================================
// SWR — stale-while-revalidate (gas-instant-ux-pro Prinsip 2)
// ============================================
async function swr(key, action, payload, render, opt) {
  opt = opt || {};
  const fresh = opt.fresh ?? 60000;
  const c = Store.get(userKey(key), null);
  if (c) render(c.data, true);
  if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
  const res = await api(action, payload);
  if (res.success) {
    const h = hashStr(JSON.stringify(res.data));
    Store.set(userKey(key), { t: Date.now(), h, data: res.data });
    if (!c || c.h !== h) render(res.data, false);
  } else if (!c && opt.onError) opt.onError(res);
  return res;
}

function onSessionExpired() {
  AppState.token = ''; Store.del(userKey('session'));
  showToast('Sesi berakhir, silakan login kembali.', 'error');
  go('login');
}
