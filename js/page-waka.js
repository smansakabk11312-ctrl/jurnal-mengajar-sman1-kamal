// ============================================
// page-waka.js — Dashboard & alat Waka Kurikulum/Kepala Sekolah (US-02a/b/c, US-09, US-10, US-11)
// ============================================
registerPage('waka-dashboard', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Dashboard Waka Kurikulum</h1></div>
    <div id="waka-kpi" class="kpi-grid"></div>
    <div class="card"><h3 class="headline-sm">Jurnal Terbaru</h3><div id="waka-jurnal-terbaru"></div></div>`,
  show(el) {
    swr('waka-dash', 'wakaBootstrap', {}, data => renderWakaDash(el, data), { fresh: 30000 });
  }
});
function renderWakaDash(el, data) {
  const k = data.ringkasan;
  el.querySelector('#waka-kpi').innerHTML = `
    <div class="kpi-card"><span class="kpi-num">${k.totalGuru}</span><span class="kpi-label">Total Guru</span></div>
    <div class="kpi-card"><span class="kpi-num">${k.guruSudahAbsenHariIni}</span><span class="kpi-label">Hadir Hari Ini</span></div>
    <div class="kpi-card"><span class="kpi-num">${k.jurnalHariIni}</span><span class="kpi-label">Jurnal Hari Ini</span></div>
    <div class="kpi-card kpi-warning"><span class="kpi-num">${k.menungguValidasi}</span><span class="kpi-label">Menunggu Validasi</span></div>
    <div class="kpi-card kpi-success"><span class="kpi-num">${k.tervalidasi}</span><span class="kpi-label">Tervalidasi</span></div>`;
  el.querySelector('#waka-jurnal-terbaru').innerHTML = data.jurnalTerbaru.length ? `<table class="table"><thead><tr><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Status</th></tr></thead><tbody>
    ${data.jurnalTerbaru.map(j => `<tr><td>${esc(j.NamaGuru)}</td><td>${esc(j.Kelas)}</td><td>${esc(j.Mapel)}</td>
    <td><span class="chip ${j.Status === 'Tervalidasi' ? 'chip-success' : (j.Status === 'Ditolak' ? 'chip-danger' : 'chip-warning')}">${esc(j.Status)}</span></td></tr>`).join('')}
    </tbody></table>` : emptyState('📊', 'Belum ada jurnal masuk hari ini.');
}

// ============================================
// Scan Barcode Guru + Geofencing (US-02a, US-02b)
// ============================================
registerPage('scan-barcode', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Absen Guru via Barcode</h1></div>
    <div class="card scan-card">
      <div class="scanner-view">
        <span class="scanner-icon">📷</span>
        <div class="scanner-reticle"><div class="scanner-laser"></div></div>
      </div>
      <input type="text" id="kode-barcode" placeholder="Scan / ketik kode barcode guru…" autofocus>
      <button class="btn btn-secondary btn-block" id="btn-scan">Catat Kehadiran</button>
      <p class="body-sm text-muted" id="geo-status">Mendapatkan lokasi…</p>
    </div>
    <div id="hasil-scan"></div>`,
  show(el) {
    let lat = null, lng = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => {
        lat = p.coords.latitude; lng = p.coords.longitude;
        el.querySelector('#geo-status').textContent = 'Lokasi terdeteksi ✓';
      }, () => { el.querySelector('#geo-status').textContent = 'Lokasi tidak tersedia — aktifkan GPS.'; });
    }
    const scan = async () => {
      const kode = el.querySelector('#kode-barcode').value.trim();
      if (!kode) return;
      const res = await api('scanBarcodeGuru', { kodeBarcode: kode, lat, long: lng });
      const box = el.querySelector('#hasil-scan');
      box.innerHTML = `<div class="banner ${res.success ? 'banner-success' : 'banner-danger'}">${esc(res.message)}</div>`;
      if (res.success) showToast(res.message);
      el.querySelector('#kode-barcode').value = '';
      el.querySelector('#kode-barcode').focus();
    };
    el.querySelector('#btn-scan').onclick = scan;
    el.querySelector('#kode-barcode').onkeydown = e => { if (e.key === 'Enter') scan(); };
  }
});

registerPage('lokasi-sekolah', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Pengaturan Lokasi &amp; Radius Sekolah</h1></div>
    <div class="card form-stack">
      <label class="label-lg">Latitude</label><input type="text" id="lok-lat">
      <label class="label-lg">Longitude</label><input type="text" id="lok-long">
      <label class="label-lg">Radius Maksimum (meter)</label><input type="number" id="lok-radius">
      <button class="btn btn-primary" id="btn-simpan-lok">Simpan</button>
    </div>`,
  show(el) {
    el.querySelector('#btn-simpan-lok').onclick = async () => {
      const res = await api('aturLokasiSekolah', { lat: el.querySelector('#lok-lat').value, long: el.querySelector('#lok-long').value, radius: el.querySelector('#lok-radius').value });
      showToast(res.message, res.success ? 'success' : 'error');
    };
  }
});

registerPage('cetak-barcode', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Cetak Kartu Barcode Guru</h1></div>
    <div class="card">
      <div class="filter-bar">
        <select id="cb-mode"><option value="massal">Massal (semua guru)</option><option value="perorangan">Perorangan</option></select>
        <input type="text" id="cb-nip" placeholder="NIP (khusus perorangan)">
        <button class="btn btn-primary" id="btn-cetak">Tampilkan Kartu</button>
      </div>
      <div id="kartu-grid" class="kartu-grid"></div>
    </div>`,
  show(el) {
    el.querySelector('#btn-cetak').onclick = async () => {
      const mode = el.querySelector('#cb-mode').value;
      const res = await api('cetakBarcodeGuru', { mode, nip: el.querySelector('#cb-nip').value });
      if (!res.success) { showToast(res.message, 'error'); return; }
      el.querySelector('#kartu-grid').innerHTML = res.data.kartu.map(k => `
        <div class="kartu-guru">
          <div class="kartu-logo">🎓 SMAN 1 Kamal</div>
          <div class="kartu-nama">${esc(k.nama)}</div>
          <div class="kartu-nip">NIP: ${esc(k.nip)}</div>
          <div class="kartu-barcode">||| ${esc(k.kodeBarcode)} |||</div>
        </div>`).join('');
    };
  }
});

// ============================================
// Monitoring + Validasi Jurnal (US-09, US-10)
// ============================================
registerPage('monitor-jurnal', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Monitoring Jurnal Real-time</h1></div>
    <div class="filter-bar">
      <input type="text" id="mf-guru" placeholder="Cari nama/NIP guru…">
      <input type="text" id="mf-kelas" placeholder="Kelas…">
      <select id="mf-status"><option value="">Semua Status</option><option>Menunggu Validasi</option><option>Tervalidasi</option><option>Ditolak</option></select>
      <button class="btn btn-ghost" id="mf-terapkan">Terapkan</button>
    </div>
    <div id="tabel-monitor" class="card"></div>`,
  show(el) {
    const muat = () => {
      const d = { guruNip: '', kelas: el.querySelector('#mf-kelas').value, status: el.querySelector('#mf-status').value };
      api('monitorJurnal', d).then(res => { if (res.success) renderMonitor(el, res.data.rows); });
    };
    el.querySelector('#mf-terapkan').onclick = muat;
    muat();
    setInterval(muat, 30000); // polling ringan admin saja
  }
});
function renderMonitor(el, rows) {
  el.querySelector('#tabel-monitor').innerHTML = rows.length ? `<table class="table"><thead><tr>
    <th>Guru</th><th>Kelas</th><th>Mapel</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${rows.map(r => `<tr>
      <td>${esc(r.NamaGuru)}</td><td>${esc(r.Kelas)}</td><td>${esc(r.Mapel)}</td><td>${esc(r.Tanggal)}</td>
      <td><span class="chip ${r.Status === 'Tervalidasi' ? 'chip-success' : (r.Status === 'Ditolak' ? 'chip-danger' : 'chip-warning')}">${esc(r.Status)}</span></td>
      <td>${r.Status === 'Menunggu Validasi' ? `<button class="btn btn-sm btn-success" data-id="${esc(r.ID)}" data-aksi="setuju">✓ Setuju</button>
        <button class="btn btn-sm btn-danger" data-id="${esc(r.ID)}" data-aksi="tolak">✕ Tolak</button>` : '—'}</td>
    </tr>`).join('')}</tbody></table>` : emptyState('🔎', 'Belum ada jurnal yang cocok dengan filter ini.');
  el.querySelectorAll('[data-aksi]').forEach(btn => btn.onclick = async () => {
    const catatan = btn.dataset.aksi === 'tolak' ? prompt('Catatan penolakan:') || '' : '';
    const res = await api('validasiJurnal', { jurnalId: btn.dataset.id, status: btn.dataset.aksi === 'setuju' ? 'Tervalidasi' : 'Ditolak', catatan });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) el.querySelector('#mf-terapkan').click();
  });
}

// ============================================
// Laporan grafik + tabel (US-11)
// ============================================
registerPage('laporan', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Laporan &amp; Rekap</h1></div>
    <div class="filter-bar">
      <input type="text" id="lf-kelas" placeholder="Kelas…">
      <input type="text" id="lf-mapel" placeholder="Mapel…">
      <button class="btn btn-ghost" id="lf-terapkan">Terapkan</button>
    </div>
    <div class="card"><h3 class="headline-sm">Distribusi Status Jurnal</h3><canvas id="chart-status" height="120"></canvas></div>
    <div class="card"><h3 class="headline-sm">Rata-rata Nilai per Jenis Asesmen</h3><canvas id="chart-nilai" height="120"></canvas></div>
    <div class="card"><h3 class="headline-sm">Tabel Jurnal</h3><div id="tabel-laporan"></div></div>`,
  show(el) {
    const muat = () => {
      api('laporanRekap', { kelas: el.querySelector('#lf-kelas').value, mapel: el.querySelector('#lf-mapel').value }).then(res => {
        if (!res.success) return;
        gambarBarChart(el.querySelector('#chart-status'), res.data.statusJurnal);
        gambarBarChart(el.querySelector('#chart-nilai'), Object.fromEntries(res.data.rataNilaiAsesmen.map(x => [x.jenis, x.rata])));
        el.querySelector('#tabel-laporan').innerHTML = `<table class="table"><thead><tr><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>
          ${res.data.tabelJurnal.map(j => `<tr><td>${esc(j.NamaGuru)}</td><td>${esc(j.Kelas)}</td><td>${esc(j.Mapel)}</td><td>${esc(j.Tanggal)}</td><td>${esc(j.Status)}</td></tr>`).join('')}
          </tbody></table>`;
      });
    };
    el.querySelector('#lf-terapkan').onclick = muat;
    muat();
  }
});
// Chart ringan tanpa library eksternal — bar chart sederhana via canvas 2D
function gambarBarChart(canvas, dataObj) {
  const ctx = canvas.getContext('2d');
  const keys = Object.keys(dataObj), vals = Object.values(dataObj).map(Number);
  const max = Math.max(1, ...vals);
  const w = canvas.width = canvas.clientWidth; const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const barW = w / (keys.length * 1.6);
  keys.forEach((k, i) => {
    const x = i * (w / keys.length) + (w / keys.length - barW) / 2;
    const barH = (vals[i] / max) * (h - 30);
    ctx.fillStyle = '#1E3A5F';
    ctx.fillRect(x, h - barH - 20, barW, barH);
    ctx.fillStyle = '#1A1A2E'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
    ctx.fillText(k, x + barW / 2, h - 5);
    ctx.fillText(String(vals[i]), x + barW / 2, h - barH - 24);
  });
}

// ============================================
// Kelola Guru & Jadwal
// ============================================
// Unduh file dari base64 yang dikembalikan backend (dipakai Export Template/Data Guru).
function downloadBase64File(base64, filename, mime) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

registerPage('kelola-guru', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Kelola Akun Guru</h1>
      <p class="body-sm text-muted">Tambah guru satu-satu lewat form, atau massal lewat Import Excel.</p></div>
    <div class="card form-stack">
      <h3 class="headline-sm" id="kg-form-title">Tambah Guru Baru</h3>
      <input type="hidden" id="kg-edit-nip-asli">
      <input type="text" id="kg-nip" placeholder="NIP">
      <input type="text" id="kg-nama" placeholder="Nama Lengkap">
      <input type="email" id="kg-email" placeholder="Email">
      <input type="text" id="kg-wa" placeholder="No. WA (08xxxx)">
      <label><input type="checkbox" id="kg-wali"> Tandai sebagai Guru Wali</label>
      <input type="text" id="kg-kelasbinaan" placeholder="Kelas binaan (jika Guru Wali)">
      <div class="btn-row">
        <button class="btn btn-primary" id="btn-simpan-guru">Tambah</button>
        <button class="btn btn-ghost" id="btn-batal-edit-guru" hidden>Batal</button>
      </div>
    </div>
    <div class="card form-stack">
      <h3 class="headline-sm">Export / Import Excel (.xlsx)</h3>
      <p class="body-sm text-muted">Import mencocokkan baris berdasarkan kolom NIP — NIP yang sudah ada akan diperbarui, yang belum ada otomatis jadi akun baru (password default 12345678).</p>
      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-export-template">⬇️ Unduh Template Excel</button>
        <button class="btn btn-ghost" id="btn-export-data">⬇️ Export Semua Data Guru</button>
      </div>
      <div class="btn-row">
        <input type="file" id="kg-file-import" accept=".xlsx">
        <button class="btn btn-primary" id="btn-import-guru">⬆️ Import Excel</button>
      </div>
      <div id="hasil-import-guru"></div>
    </div>
    <div id="tabel-guru" class="card"></div>`,
  show(el) {
    function resetForm() {
      el.querySelector('#kg-edit-nip-asli').value = '';
      ['#kg-nip', '#kg-nama', '#kg-email', '#kg-wa', '#kg-kelasbinaan'].forEach(s => el.querySelector(s).value = '');
      el.querySelector('#kg-wali').checked = false;
      el.querySelector('#kg-nip').disabled = false;
      el.querySelector('#kg-form-title').textContent = 'Tambah Guru Baru';
      el.querySelector('#btn-simpan-guru').textContent = 'Tambah';
      el.querySelector('#btn-batal-edit-guru').hidden = true;
    }
    el.querySelector('#btn-batal-edit-guru').onclick = resetForm;

    el.querySelector('#btn-simpan-guru').onclick = async () => {
      const nipAsli = el.querySelector('#kg-edit-nip-asli').value;
      const payload = {
        aksi: nipAsli ? 'ubah' : 'tambah',
        nip: nipAsli || el.querySelector('#kg-nip').value,
        nama: el.querySelector('#kg-nama').value,
        email: el.querySelector('#kg-email').value,
        noWA: el.querySelector('#kg-wa').value,
        isGuruWali: el.querySelector('#kg-wali').checked,
        kelasBinaan: el.querySelector('#kg-kelasbinaan').value
      };
      const res = await api('kelolaGuru', payload);
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) { resetForm(); muat(); }
    };

    el.querySelector('#btn-export-template').onclick = async () => {
      showLoading(true);
      const res = await api('guru.exportTemplate', {});
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      downloadBase64File(res.data.base64, res.data.filename);
    };
    el.querySelector('#btn-export-data').onclick = async () => {
      showLoading(true);
      const res = await api('guru.export', {});
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      downloadBase64File(res.data.base64, res.data.filename);
    };
    el.querySelector('#btn-import-guru').onclick = async () => {
      const file = el.querySelector('#kg-file-import').files[0];
      if (!file) return showToast('Pilih file .xlsx dulu.', 'error');
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        showLoading(true);
        const res = await api('guru.import', { base64: base64, filename: file.name });
        showLoading(false);
        const box = el.querySelector('#hasil-import-guru');
        box.innerHTML = `<div class="banner ${res.success ? 'banner-success' : 'banner-danger'}">${esc(res.message)}</div>`;
        if (res.success) { el.querySelector('#kg-file-import').value = ''; muat(); }
      };
      reader.readAsDataURL(file);
    };

    function muat() {
      api('daftarGuru', {}).then(res => {
        if (!res.success) return;
        el.querySelector('#tabel-guru').innerHTML = res.data.rows.length
          ? `<table class="table"><thead><tr><th>NIP</th><th>Nama</th><th>Guru Wali</th><th>Barcode</th><th>Status</th><th></th></tr></thead><tbody>
          ${res.data.rows.map(g => `<tr>
            <td>${esc(g.nip)}</td><td>${esc(g.nama)}</td><td>${g.isGuruWali ? 'Ya' : '—'}</td>
            <td class="mono">${esc(g.kodeBarcode)}</td><td>${esc(g.status)}</td>
            <td class="btn-row">
              <button class="btn btn-ghost btn-sm" data-edit="${esc(g.nip)}">Edit</button>
              ${g.status === 'Aktif' ? `<button class="btn btn-danger btn-sm" data-hapus="${esc(g.nip)}">Nonaktifkan</button>` : ''}
            </td>
          </tr>`).join('')}
          </tbody></table>`
          : emptyState('👥', 'Belum ada guru terdaftar. Tambahkan guru pertama lewat form di atas.');

        el.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => {
          const g = res.data.rows.find(x => x.nip === btn.dataset.edit);
          if (!g) return;
          el.querySelector('#kg-edit-nip-asli').value = g.nip;
          el.querySelector('#kg-nip').value = g.nip; el.querySelector('#kg-nip').disabled = true;
          el.querySelector('#kg-nama').value = g.nama;
          el.querySelector('#kg-email').value = g.email;
          el.querySelector('#kg-wa').value = g.noWA;
          el.querySelector('#kg-wali').checked = g.isGuruWali;
          el.querySelector('#kg-kelasbinaan').value = g.kelasBinaan;
          el.querySelector('#kg-form-title').textContent = 'Edit Guru — ' + g.nama;
          el.querySelector('#btn-simpan-guru').textContent = 'Simpan Perubahan';
          el.querySelector('#btn-batal-edit-guru').hidden = false;
          el.scrollIntoView({ behavior: 'smooth' });
        });
        el.querySelectorAll('[data-hapus]').forEach(btn => btn.onclick = async () => {
          if (!confirm('Nonaktifkan akun guru ini? Guru tidak akan bisa login lagi, tapi riwayat jurnalnya tetap aman.')) return;
          const res2 = await api('kelolaGuru', { aksi: 'hapus', nip: btn.dataset.hapus });
          showToast(res2.message, res2.success ? 'success' : 'error');
          if (res2.success) muat();
        });
      });
    }
    muat();
  }
});

registerPage('kelola-jadwal', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Kelola Jadwal Mengajar</h1></div>
    <div class="card form-stack">
      <input type="text" id="kj-nip" placeholder="NIP Guru">
      <input type="text" id="kj-mapel" placeholder="Mapel">
      <input type="text" id="kj-kelas" placeholder="Kelas">
      <select id="kj-hari"><option>Senin</option><option>Selasa</option><option>Rabu</option><option>Kamis</option><option>Jumat</option><option>Sabtu</option></select>
      <input type="time" id="kj-mulai"><input type="time" id="kj-selesai">
      <button class="btn btn-primary" id="btn-tambah-jadwal">Tambah Jadwal</button>
    </div>
    <div id="tabel-jadwal" class="card"></div>`,
  show(el) {
    el.querySelector('#btn-tambah-jadwal').onclick = async () => {
      const res = await api('kelolaJadwal', {
        aksi: 'tambah', nip: el.querySelector('#kj-nip').value, mapel: el.querySelector('#kj-mapel').value,
        kelas: el.querySelector('#kj-kelas').value, hari: el.querySelector('#kj-hari').value,
        jamMulai: el.querySelector('#kj-mulai').value, jamSelesai: el.querySelector('#kj-selesai').value
      });
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) muat();
    };
    function muat() {
      api('daftarJadwalSemua', {}).then(res => {
        if (!res.success) return;
        el.querySelector('#tabel-jadwal').innerHTML = res.data.rows.length
          ? `<table class="table"><thead><tr><th>Guru</th><th>Mapel</th><th>Kelas</th><th>Hari</th><th>Jam</th></tr></thead><tbody>
          ${res.data.rows.map(j => `<tr><td>${esc(j.NamaGuru)}</td><td>${esc(j.Mapel)}</td><td>${esc(j.Kelas)}</td><td>${esc(j.Hari)}</td><td>${esc(j.JamMulai)}-${esc(j.JamSelesai)}</td></tr>`).join('')}
          </tbody></table>`
          : emptyState('🗓️', 'Belum ada jadwal mengajar. Tambahkan jadwal pertama lewat form di atas.');
      });
    }
    muat();
  }
});
