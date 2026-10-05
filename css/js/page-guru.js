// ============================================
// page-guru.js — Beranda Guru: jadwal hari ini, stepper Absensi→Jurnal→Asesmen (US-02–07)
// ============================================
registerPage('beranda', {
  auth: 'guru',
  template: () => `
    <div class="page-head">
      <h1 class="headline-lg">Jadwal Mengajar Hari Ini</h1>
      <p class="body-md text-muted" id="beranda-sub"></p>
    </div>
    <div id="gerbang-alert"></div>
    <div id="daftar-sesi" class="sesi-grid"></div>`,
  show(el) {
    swr('beranda', 'guruBootstrap', {}, (data, fromCache) => renderBeranda(el, data), { fresh: 45000 });
  }
});

function renderBeranda(el, data) {
  el.querySelector('#beranda-sub').textContent = data.hariIni + ', ' + data.tanggalHariIni;
  const alertBox = el.querySelector('#gerbang-alert');
  if (!data.gerbangAksesTerbuka) {
    alertBox.innerHTML = `<div class="banner banner-danger">🔒 Anda belum tercatat hadir hari ini. Minta Waka Kurikulum men-scan barcode Anda untuk membuka akses jurnal.</div>`;
  } else {
    alertBox.innerHTML = `<div class="banner banner-success">✅ Kehadiran Anda hari ini sudah tervalidasi. Menu jurnal aktif.</div>`;
  }

  const grid = el.querySelector('#daftar-sesi');
  if (!data.jadwalHariIni.length) { grid.innerHTML = '<p class="body-md text-muted">Tidak ada jadwal mengajar hari ini.</p>'; return; }

  grid.innerHTML = data.jadwalHariIni.map(j => `
    <div class="card sesi-card">
      <div class="sesi-card-head">
        <span class="chip chip-info">${esc(j.JamMulai)}–${esc(j.JamSelesai)}</span>
        <span class="chip ${j.jurnalSudahDiisi ? 'chip-success' : 'chip-warning'}">${j.jurnalSudahDiisi ? 'Jurnal Selesai' : (j.jurnalTerbuka ? 'Jurnal Terbuka' : 'Menunggu Absensi')}</span>
      </div>
      <h3 class="headline-sm">${esc(j.Mapel)} — ${esc(j.Kelas)}</h3>
      <div class="stepper">
        <div class="step ${j.statusAbsensi === 'Selesai' ? 'step-done' : 'step-active'}">1. Absensi Sesi</div>
        <div class="step ${j.jurnalSudahDiisi ? 'step-done' : (j.jurnalTerbuka ? 'step-active' : 'step-locked')}">2. Isi Jurnal</div>
        <div class="step ${j.jurnalSudahDiisi ? 'step-active' : 'step-locked'}">3. Asesmen (opsional)</div>
      </div>
      <div class="sesi-actions">
        ${j.statusAbsensi !== 'Selesai'
          ? `<button class="btn btn-primary" data-aksi="absensi" data-id="${esc(j.ID)}">Isi Absensi Siswa</button>`
          : (!j.jurnalSudahDiisi
            ? `<button class="btn btn-accent" data-aksi="jurnal" data-sesi="${esc(j.absensiSesiId)}">Isi Jurnal Mengajar</button>`
            : `<button class="btn btn-ghost" data-aksi="asesmen" data-kelas="${esc(j.Kelas)}" data-mapel="${esc(j.Mapel)}">Input Nilai Asesmen</button>`)}
      </div>
    </div>`).join('');

  grid.querySelectorAll('[data-aksi]').forEach(btn => {
    btn.onclick = () => {
      const aksi = btn.dataset.aksi;
      if (aksi === 'absensi') go('absensi-sesi', btn.dataset.id);
      if (aksi === 'jurnal') go('isi-jurnal', btn.dataset.sesi);
      if (aksi === 'asesmen') go('asesmen', btn.dataset.kelas + '|' + btn.dataset.mapel);
    };
  });
}

// ============================================
// Absensi Sesi (gerbang wajib sebelum jurnal) — US-03
// ============================================
registerPage('absensi-sesi', {
  auth: 'guru',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Absensi Siswa</h1></div>
    <div id="roster" class="card"></div>`,
  show(el, jadwalId) {
    // Ambil daftar siswa dari cache beranda (sudah tahu kelas), lalu panggil master siswa via bootstrap sederhana.
    const cacheBeranda = Store.get(userKey('beranda'), null);
    const jadwal = cacheBeranda ? cacheBeranda.data.jadwalHariIni.find(j => String(j.ID) === String(jadwalId)) : null;
    if (!jadwal) { el.querySelector('#roster').innerHTML = '<p>Jadwal tidak ditemukan, kembali ke beranda.</p>'; return; }
    renderRosterForm(el, jadwal, jadwalId);
  }
});

function renderRosterForm(el, jadwal, jadwalId) {
  // Siswa diambil dari master siswa yg disinkronkan modul migrasi; fallback: input manual bila kosong.
  const box = el.querySelector('#roster');
  box.innerHTML = `
    <h3 class="headline-sm">${esc(jadwal.Mapel)} — ${esc(jadwal.Kelas)}</h3>
    <p class="body-sm text-muted">Tandai kehadiran setiap siswa, lalu simpan. Jurnal akan terbuka otomatis setelah ini.</p>
    <div id="roster-list" class="roster-list"><p class="text-muted">Memuat daftar siswa…</p></div>
    <div class="roster-footer">
      <span id="roster-summary" class="body-md-medium"></span>
      <button class="btn btn-primary" id="btn-simpan-absensi">Simpan Absensi &amp; Buka Jurnal</button>
    </div>`;

  api('daftarGuru', {}).then(() => {}); // noop warm, nyata di bawah pakai aksi khusus bila ada endpoint siswa per kelas
  // Endpoint ringan: pakai action 'daftarGuru' tidak relevan — gunakan cache master siswa bila sudah tersedia dari migrasi.
  const siswa = Store.get('masterSiswaKelas_' + jadwal.Kelas, []);
  tampilkanRoster(box, siswa.length ? siswa : [{ NISN: '-', Nama: '(Belum ada data master siswa — hubungi Waka untuk jalankan migrasi)' }]);

  box.querySelector('#btn-simpan-absensi').onclick = async () => {
    const rows = Array.from(box.querySelectorAll('.roster-row')).map(r => ({
      nisn: r.dataset.nisn, nama: r.dataset.nama, status: r.querySelector('.seg-active')?.dataset.status || 'A'
    }));
    const btn = box.querySelector('#btn-simpan-absensi');
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    const res = await api('simpanAbsensiSesi', { jadwalId: jadwalId, detail: rows });
    btn.disabled = false; btn.textContent = 'Simpan Absensi & Buka Jurnal';
    if (!res.success) { showToast(res.message, 'error'); return; }
    showToast(res.message);
    Store.del(userKey('beranda')); bumpLocalVersion();
    go('isi-jurnal', res.data.absensiSesiId);
  };
}

function tampilkanRoster(box, siswa) {
  const list = box.querySelector('#roster-list');
  list.innerHTML = siswa.map(s => `
    <div class="roster-row" data-nisn="${esc(s.NISN)}" data-nama="${esc(s.Nama)}">
      <span class="roster-name">${esc(s.Nama)}</span>
      <div class="seg-4">
        <button class="seg-btn seg-h" data-status="H">H</button>
        <button class="seg-btn seg-s" data-status="S">S</button>
        <button class="seg-btn seg-i" data-status="I">I</button>
        <button class="seg-btn seg-a seg-active" data-status="A">A</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('.roster-row').forEach(row => {
    row.querySelectorAll('.seg-btn').forEach(b => b.onclick = () => {
      row.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('seg-active'));
      b.classList.add('seg-active');
      updateRosterSummary(box);
    });
  });
  updateRosterSummary(box);
}
function updateRosterSummary(box) {
  const rows = Array.from(box.querySelectorAll('.roster-row'));
  const cnt = { H: 0, S: 0, I: 0, A: 0 };
  rows.forEach(r => { const s = r.querySelector('.seg-active')?.dataset.status || 'A'; cnt[s]++; });
  box.querySelector('#roster-summary').textContent = `Hadir ${cnt.H} · Sakit ${cnt.S} · Izin ${cnt.I} · Alfa ${cnt.A}`;
}
function bumpLocalVersion() { /* placeholder: memaksa swr fetch ulang di beranda */ }

// ============================================
// Isi Jurnal Mengajar — US-04, US-05, US-06
// ============================================
registerPage('isi-jurnal', {
  auth: 'guru',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Isi Jurnal Mengajar</h1></div>
    <form id="form-jurnal" class="card form-stack">
      <label class="label-lg">Pertemuan Ke-</label>
      <input type="text" id="j-pertemuan" placeholder="Contoh: 5">
      <label class="label-lg">Tujuan Pembelajaran (TP) / Kompetensi Dasar (KD)</label>
      <textarea id="j-tp" rows="2" required></textarea>
      <label class="label-lg">Materi Pokok / Bahasan</label>
      <textarea id="j-materi" rows="2" required></textarea>
      <label class="label-lg">Kegiatan Pembelajaran (Pendahuluan–Inti–Penutup / Metode)</label>
      <textarea id="j-kegiatan" rows="4" required></textarea>
      <label class="label-lg">Catatan / Hambatan / Kendala</label>
      <textarea id="j-hambatan" rows="2"></textarea>
      <label class="label-lg">Rencana Perbaikan / Tindak Lanjut</label>
      <textarea id="j-tindaklanjut" rows="2"></textarea>
      <label class="label-lg">Foto Selfie di Kelas (bukti kehadiran mengajar)</label>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="btn-buka-kamera">📷 Ambil Foto Selfie</button>
        <label class="btn btn-ghost" for="j-foto-file" style="margin:0">📁 Unggah dari Galeri</label>
        <input type="file" id="j-foto-file" accept="image/*" hidden>
      </div>
      <div id="foto-preview"></div>
      <button type="submit" class="btn btn-accent btn-block" id="btn-simpan-jurnal">Simpan Jurnal</button>
    </form>`,
  show(el, absensiSesiId) {
    let fotoUrl = '';
    async function unggahFoto(base64, mimeType) {
      showLoading(true);
      const res = await api('uploadFotoSelfie', { base64: base64, mimeType: mimeType });
      showLoading(false);
      if (res.success) { fotoUrl = res.data.url; el.querySelector('#foto-preview').innerHTML = `<img src="${fotoUrl}" class="foto-thumb">`; }
      else showToast(res.message, 'error');
    }
    // Jalur utama: modal kamera 16:9 + watermark timestamp/lokasi/nama (DESIGN.md Photo Capture Module).
    el.querySelector('#btn-buka-kamera').onclick = () => openCameraModal(unggahFoto);
    // Jalur cadangan (desktop tanpa kamera / galeri): tetap tersedia sebagai fallback.
    el.querySelector('#j-foto-file').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => unggahFoto(reader.result.split(',')[1], file.type);
      reader.readAsDataURL(file);
    };

    el.querySelector('#form-jurnal').onsubmit = async (e) => {
      e.preventDefault();
      const btn = el.querySelector('#btn-simpan-jurnal');
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      const res = await api('simpanJurnal', {
        absensiSesiId: absensiSesiId,
        pertemuanKe: el.querySelector('#j-pertemuan').value,
        tujuanPembelajaran: el.querySelector('#j-tp').value,
        materiPokok: el.querySelector('#j-materi').value,
        kegiatanPembelajaran: el.querySelector('#j-kegiatan').value,
        catatanHambatan: el.querySelector('#j-hambatan').value,
        rencanaTindakLanjut: el.querySelector('#j-tindaklanjut').value,
        fotoSelfieUrl: fotoUrl
      }, { reqId: 'jurnal-' + absensiSesiId });
      btn.disabled = false; btn.textContent = 'Simpan Jurnal';
      if (!res.success) { showToast(res.message, 'error'); return; }
      showToast(res.message);
      Store.del(userKey('beranda'));
      go('riwayat-jurnal');
    };
  }
});

// ============================================
// Riwayat Jurnal — US-06
// ============================================
registerPage('riwayat-jurnal', {
  auth: 'guru',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Riwayat Jurnal Saya</h1></div>
    <div class="filter-bar">
      <input type="date" id="f-tanggal">
      <input type="text" id="f-kelas" placeholder="Filter kelas…">
      <button class="btn btn-ghost" id="btn-filter">Terapkan</button>
      <button class="btn btn-ghost" id="btn-cetak-jurnal">🖨️ Cetak Rekap (PDF)</button>
    </div>
    <div id="tabel-riwayat" class="card"></div>`,
  show(el) {
    const muat = () => {
      const d = { tanggal: el.querySelector('#f-tanggal').value, kelas: el.querySelector('#f-kelas').value };
      swr('riwayat:' + JSON.stringify(d), 'riwayatJurnal', d, data => renderTabelRiwayat(el, data), { fresh: 20000 });
    };
    el.querySelector('#btn-filter').onclick = muat;
    el.querySelector('#btn-cetak-jurnal').onclick = async () => {
      showLoading(true);
      const res = await api('de.terbitkanJurnal', {});
      showLoading(false);
      if (res.success) window.open(res.data.pdfUrl, '_blank');
      else showToast(res.message, 'error');
    };
    muat();
  }
});
function renderTabelRiwayat(el, data) {
  const box = el.querySelector('#tabel-riwayat');
  if (!data.rows.length) { box.innerHTML = '<p class="text-muted">Belum ada jurnal.</p>'; return; }
  box.innerHTML = `<table class="table"><thead><tr>
    <th>Tanggal</th><th>Kelas</th><th>Mapel</th><th>Materi</th><th>Status</th>
    </tr></thead><tbody>${data.rows.map(r => `
    <tr><td>${esc(r.Tanggal)}</td><td>${esc(r.Kelas)}</td><td>${esc(r.Mapel)}</td><td>${esc(r.MateriPokok)}</td>
    <td><span class="chip ${r.Status === 'Tervalidasi' ? 'chip-success' : (r.Status === 'Ditolak' ? 'chip-danger' : 'chip-warning')}">${esc(r.Status)}</span></td></tr>`).join('')}
    </tbody></table>`;
}

// ============================================
// Asesmen — US-07
// ============================================
registerPage('asesmen', {
  auth: 'guru',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Input Nilai Asesmen</h1></div>
    <div class="card form-stack">
      <label class="label-lg">Jenis Asesmen</label>
      <select id="a-jenis">
        <option>UH1</option><option>UH2</option><option>UH3</option><option>UH4</option><option>UH5</option>
        <option>PTS</option><option>PAS</option><option>Tugas</option>
      </select>
      <div id="a-roster" class="roster-list"></div>
      <button class="btn btn-accent" id="btn-simpan-asesmen">Simpan Nilai</button>
    </div>`,
  show(el, param) {
    const [kelas, mapel] = (param || '|').split('|');
    const siswa = Store.get('masterSiswaKelas_' + kelas, [{ NISN: '-', Nama: '(data master siswa belum disinkronkan)' }]);
    el.querySelector('#a-roster').innerHTML = siswa.map(s => `
      <div class="roster-row" data-nisn="${esc(s.NISN)}" data-nama="${esc(s.Nama)}">
        <span class="roster-name">${esc(s.Nama)}</span>
        <input type="number" min="0" max="100" class="nilai-input" placeholder="0-100">
      </div>`).join('');
    el.querySelector('#btn-simpan-asesmen').onclick = async () => {
      const nilai = Array.from(el.querySelectorAll('.roster-row')).map(r => ({
        nisn: r.dataset.nisn, nama: r.dataset.nama, nilai: Number(r.querySelector('.nilai-input').value || 0)
      }));
      const res = await api('simpanAsesmen', { kelas, mapel, jenisAsesmen: el.querySelector('#a-jenis').value, nilai });
      showToast(res.success ? res.message : res.message, res.success ? 'success' : 'error');
    };
  }
});
