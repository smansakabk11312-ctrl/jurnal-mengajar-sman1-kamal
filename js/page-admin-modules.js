// ============================================
// page-admin-modules.js — Migrasi Database, Notifikasi WA & CRM, Template Dokumen (Waka)
// ============================================

// --- Migrasi Database ---
registerPage('migrasi', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Migrasi Database</h1>
      <p class="body-sm text-muted">Sinkronkan data master siswa/kelas dari Spreadsheet Absensi Siswa (atau app lama). Sumber hanya dibaca, tidak pernah ditulis.</p></div>
    <div class="card form-stack">
      <label class="label-lg">URL/ID Spreadsheet Sumber</label>
      <input type="text" id="mg-url" placeholder="https://docs.google.com/spreadsheets/d/....">
      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-pindai">🔍 Pindai (Dry-run)</button>
        <button class="btn btn-primary" id="btn-jalankan">▶ Jalankan Import</button>
      </div>
    </div>
    <div id="hasil-migrasi"></div>
    <div class="card"><h3 class="headline-sm">Riwayat Import</h3><div id="log-migrasi"></div></div>`,
  show(el) {
    el.querySelector('#btn-pindai').onclick = async () => {
      showLoading(true);
      const res = await api('migrasi.pindai', { sumberUrl: el.querySelector('#mg-url').value });
      showLoading(false);
      renderHasilMigrasi(el, res, true);
    };
    el.querySelector('#btn-jalankan').onclick = async () => {
      if (!confirm('Jalankan import nyata? Data akan ditambah/diperbarui di aplikasi ini.')) return;
      showLoading(true);
      const res = await api('migrasi.jalankan', { sumberUrl: el.querySelector('#mg-url').value });
      showLoading(false);
      renderHasilMigrasi(el, res, false);
      muatLog();
    };
    function muatLog() {
      api('migrasi.log', {}).then(res => {
        if (!res.success) return;
        el.querySelector('#log-migrasi').innerHTML = `<table class="table"><thead><tr><th>Tanggal</th><th>Ringkasan</th><th>Oleh</th></tr></thead><tbody>
          ${res.data.rows.map(r => `<tr><td>${esc(r.Tanggal)}</td><td class="mono">${esc(r.Ringkasan).slice(0, 120)}…</td><td>${esc(r.Oleh)}</td></tr>`).join('')}
          </tbody></table>`;
      });
    }
    muatLog();
  }
});
function renderHasilMigrasi(el, res, dryRun) {
  const box = el.querySelector('#hasil-migrasi');
  if (!res.success) { box.innerHTML = `<div class="banner banner-danger">${esc(res.message)}</div>`; return; }
  const rows = Object.entries(res.data.report).map(([sheet, r]) => `
    <tr><td>${esc(sheet)}</td><td>${esc(r.sumber)}</td><td>${r.ditambah}</td><td>${r.diperbarui}</td><td>${r.dilewati}</td></tr>`).join('');
  box.innerHTML = `<div class="banner ${dryRun ? 'banner-info' : 'banner-success'}">${dryRun ? 'Hasil Pindai (belum ada data ditulis):' : 'Import selesai.'}</div>
    <table class="table"><thead><tr><th>Target</th><th>Sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// --- Notifikasi WA & Konfigurasi ---
registerPage('notifikasi', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">WhatsApp &amp; Notifikasi</h1></div>
    <div class="wali-tabs">
      <button class="tab-btn active" data-tab="blast">📣 Blast WA</button>
      <button class="tab-btn" data-tab="antrean">📬 Antrean</button>
      <button class="tab-btn" data-tab="config">⚙️ Konfigurasi</button>
    </div>
    <div id="notif-content"></div>`,
  show(el) {
    const tabs = el.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); renderNotifTab(el, t.dataset.tab); });
    renderNotifTab(el, 'blast');
  }
});
function renderNotifTab(el, tab) {
  const box = el.querySelector('#notif-content');
  if (tab === 'config') return renderNotifConfig(box);
  if (tab === 'antrean') return renderNotifAntrean(box);
  return renderNotifBlast(box);
}
function renderNotifConfig(box) {
  box.innerHTML = `<p class="text-muted">Memuat…</p>`;
  api('notif.config', {}).then(res => {
    if (!res.success) return;
    const d = res.data;
    box.innerHTML = `
      <div class="card form-stack">
        <label class="switch-row"><input type="checkbox" id="cf-wa" ${d.waAktif ? 'checked' : ''}> Notifikasi WhatsApp Aktif</label>
        <input type="password" id="cf-token" placeholder="Token Fonnte (${d.tokenMask || 'belum diisi'})">
        <button class="btn btn-ghost" id="btn-cek-device">📡 Cek Perangkat</button>
        <label class="switch-row"><input type="checkbox" id="cf-email" ${d.emailAktif ? 'checked' : ''}> Notifikasi Email Aktif (sisa kuota: ${d.sisaKuotaEmail})</label>
        <label class="label-lg">Ukuran Batch Blast</label>
        <select id="cf-batch"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select>
        <label class="label-lg">Jeda Antarpesan (detik)</label>
        <input type="text" id="cf-jeda" value="${esc(d.jeda)}">
        <button class="btn btn-primary" id="btn-simpan-cf">💾 Simpan Konfigurasi</button>
      </div>`;
    box.querySelector('#cf-batch').value = d.batchDefault;
    box.querySelector('#btn-cek-device').onclick = async () => { const r = await api('wa.device', {}); showToast(JSON.stringify(r.data || r.message)); };
    box.querySelector('#btn-simpan-cf').onclick = async () => {
      const res2 = await api('notif.configSave', {
        waAktif: box.querySelector('#cf-wa').checked, emailAktif: box.querySelector('#cf-email').checked,
        token: box.querySelector('#cf-token').value || undefined, batchDefault: box.querySelector('#cf-batch').value,
        jeda: box.querySelector('#cf-jeda').value
      });
      showToast(res2.message, res2.success ? 'success' : 'error');
    };
  });
}
function renderNotifAntrean(box) {
  box.innerHTML = `<div class="card"><button class="btn btn-ghost" id="btn-proses-now">⚡ Proses Sekarang</button><div id="tabel-antrean"></div></div>`;
  function muat() {
    api('notif.queue', {}).then(res => {
      if (!res.success) return;
      box.querySelector('#tabel-antrean').innerHTML = `<table class="table"><thead><tr><th>Kanal</th><th>Tujuan</th><th>Status</th><th>Event</th></tr></thead><tbody>
        ${res.data.rows.slice(-50).map(r => `<tr><td>${esc(r.Kanal)}</td><td class="mono">${esc(r.Tujuan)}</td><td>${esc(r.Status)}</td><td>${esc(r.Event)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  }
  box.querySelector('#btn-proses-now').onclick = async () => { await api('notif.processNow', {}); muat(); };
  muat();
}
function renderNotifBlast(box) {
  box.innerHTML = `
    <div class="card form-stack">
      <h3 class="headline-sm">Blast WhatsApp</h3>
      <select id="bl-segmen"><option value="">Semua Segmen</option><option>Guru</option><option>Orang Tua/Wali</option></select>
      <button class="btn btn-ghost" id="btn-muat-audience">👥 Muat Penerima</button>
      <div id="audience-ringkas"></div>
      <input type="text" id="bl-judul" placeholder="Judul internal blast">
      <textarea id="bl-pesan" rows="3" placeholder="Isi pesan… gunakan {nama} untuk personalisasi"></textarea>
      <button class="btn btn-accent" id="btn-mulai-blast">🚀 Mulai Blast</button>
    </div>
    <div id="riwayat-blast" class="card"></div>`;
  let penerima = [];
  box.querySelector('#btn-muat-audience').onclick = async () => {
    const res = await api('wa.audience', { segmen: box.querySelector('#bl-segmen').value });
    if (!res.success) return;
    penerima = res.data.rows;
    box.querySelector('#audience-ringkas').innerHTML = `<div class="chip chip-info">Total valid: ${res.data.ringkas.valid}</div>`;
  };
  box.querySelector('#btn-mulai-blast').onclick = async () => {
    const res = await api('wa.blastCreate', { judul: box.querySelector('#bl-judul').value, pesan: box.querySelector('#bl-pesan').value, ukuranBatch: 20, jeda: '5', penerima });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) muatBlastList();
  };
  function muatBlastList() {
    api('wa.blastList', {}).then(res => {
      if (!res.success) return;
      box.querySelector('#riwayat-blast').innerHTML = `<h3 class="headline-sm">Riwayat Blast</h3><table class="table"><thead><tr><th>Judul</th><th>Total</th><th>Terkirim</th><th>Status</th></tr></thead><tbody>
        ${res.data.rows.map(r => `<tr><td>${esc(r.Judul)}</td><td>${r.Total}</td><td>${r.Terkirim}</td><td>${esc(r.Status)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  }
  muatBlastList();
}

// --- CRM Kontak ---
registerPage('crm', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">CRM Kontak</h1></div>
    <div id="crm-kpi" class="kpi-grid"></div>
    <div class="filter-bar">
      <input type="text" id="crm-cari" placeholder="Cari nama/email/WA…">
      <button class="btn btn-ghost" id="btn-sinkron">↻ Sinkron Sekarang</button>
      <button class="btn btn-ghost" id="btn-deteksi-massal">📱 Deteksi WA (50 teratas)</button>
    </div>
    <div id="tabel-crm" class="card"></div>`,
  show(el) {
    function muatStats() { api('crm.stats', {}).then(res => { if (res.success) renderCrmKpi(el, res.data); }); }
    function muatList() {
      api('crm.list', { cari: el.querySelector('#crm-cari').value }).then(res => { if (res.success) renderCrmTabel(el, res.data.rows); });
    }
    el.querySelector('#crm-cari').oninput = debounce(muatList, 350);
    el.querySelector('#btn-sinkron').onclick = async () => { const r = await api('crm.sync', {}); showToast(r.message, r.success ? 'success' : 'error'); muatStats(); muatList(); };
    el.querySelector('#btn-deteksi-massal').onclick = async () => {
      const listRes = await api('crm.list', { statusWA: '' });
      const nomor = (listRes.data?.rows || []).filter(r => !r.StatusWA).slice(0, 50).map(r => r.NoWA);
      const r = await api('wa.validate', { nomor });
      showToast(r.message || 'Deteksi selesai.', 'success'); muatList();
    };
    muatStats(); muatList();
  }
});
function renderCrmKpi(el, d) {
  el.querySelector('#crm-kpi').innerHTML = `
    <div class="kpi-card"><span class="kpi-num">${d.total}</span><span class="kpi-label">Total Kontak</span></div>
    <div class="kpi-card kpi-success"><span class="kpi-num">${d.terdaftarWA}</span><span class="kpi-label">WA Terverifikasi</span></div>
    <div class="kpi-card"><span class="kpi-num">${d.emailValid}</span><span class="kpi-label">Email Valid</span></div>
    <div class="kpi-card kpi-warning"><span class="kpi-num">${d.belumDicekWA}</span><span class="kpi-label">Belum Dicek WA</span></div>
    <div class="kpi-card kpi-danger"><span class="kpi-num">${d.optOut}</span><span class="kpi-label">Opt-out</span></div>`;
}
function renderCrmTabel(el, rows) {
  el.querySelector('#tabel-crm').innerHTML = `<table class="table"><thead><tr><th>Nama</th><th>Segmen</th><th>WA</th><th>Status WA</th><th>Email</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(r.Nama)}</td><td>${esc(r.Segmen)}</td><td class="mono">${esc(r.NoWA)}</td>
    <td><span class="chip ${r.StatusWA === 'Terdaftar' ? 'chip-success' : (r.StatusWA ? 'chip-danger' : 'chip-info')}">${esc(r.StatusWA || '?')}</span></td><td>${esc(r.Email)}</td></tr>`).join('')}
    </tbody></table>`;
}

// --- Template Dokumen (gas-doc-engine) ---
registerPage('template-dokumen', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Template Dokumen Cetak</h1>
      <p class="body-sm text-muted">Buat template di Google Docs dengan placeholder {{KUNCI}}, lalu tempel URL-nya di sini untuk dipindai.
      Kode wajib: <code>JURNAL_CETAK</code> (untuk rekap jurnal guru) dan <code>REKAP_WALI</code> (untuk rekap Guru Wali).</p></div>
    <div class="card form-stack">
      <input type="text" id="td-kode" placeholder="Kode template, mis. JURNAL_CETAK">
      <input type="text" id="td-url" placeholder="URL Google Docs template…">
      <button class="btn btn-primary" id="btn-pindai-template">🔍 Pindai Template</button>
    </div>
    <div id="hasil-pindai"></div>
    <div class="card"><h3 class="headline-sm">Template Terdaftar</h3><div id="tabel-template"></div></div>`,
  show(el) {
    el.querySelector('#btn-pindai-template').onclick = async () => {
      const res = await api('de.pindaiTemplate', { kode: el.querySelector('#td-kode').value, url: el.querySelector('#td-url').value });
      el.querySelector('#hasil-pindai').innerHTML = res.success
        ? `<div class="banner banner-success">Ditemukan ${res.data.bidang.length} kolom: ${res.data.bidang.join(', ')}</div>`
        : `<div class="banner banner-danger">${esc(res.message)}</div>`;
      if (res.success) muat();
    };
    function muat() {
      api('de.templateList', {}).then(res => {
        if (!res.success) return;
        el.querySelector('#tabel-template').innerHTML = `<table class="table"><thead><tr><th>Kode</th><th>Versi</th><th>Kolom</th></tr></thead><tbody>
          ${res.data.rows.map(t => `<tr><td>${esc(t.kode)}</td><td>${esc(t.versi)}</td><td>${esc((JSON.parse(t.bidang || '[]')).join(', '))}</td></tr>`).join('')}
          </tbody></table>`;
      });
    }
    muat();
  }
});
