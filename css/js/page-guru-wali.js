// ============================================
// page-guru-wali.js — Menu Guru Wali, terpisah dari jurnal reguler (US-08a–f)
// ============================================
registerPage('guru-wali', {
  auth: 'guru-wali',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Menu Guru Wali</h1></div>
    <div class="wali-tabs">
      <button class="tab-btn active" data-tab="jurnal">📓 Jurnal Wali</button>
      <button class="tab-btn" data-tab="pemetaan">🧭 Pemetaan Murid</button>
      <button class="tab-btn" data-tab="kehadiran">📊 Rekap Kehadiran</button>
      <button class="tab-btn" data-tab="karakter">🌱 Catatan Karakter</button>
      <button class="tab-btn" data-tab="komunikasi">💬 Komunikasi Ortu</button>
      <button class="tab-btn" data-tab="bimbingan">🎯 Program Bimbingan</button>
    </div>
    <div id="wali-content"></div>`,
  show(el) {
    const tabs = el.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); renderWaliTab(el, t.dataset.tab); });
    renderWaliTab(el, 'jurnal');
  }
});

function renderWaliTab(el, tab) {
  const box = el.querySelector('#wali-content');
  if (tab === 'jurnal') return renderWaliJurnal(box);
  if (tab === 'pemetaan') return renderWaliPemetaan(box);
  if (tab === 'kehadiran') return renderWaliKehadiran(box);
  if (tab === 'karakter') return renderWaliKarakter(box);
  if (tab === 'komunikasi') return renderWaliKomunikasi(box);
  if (tab === 'bimbingan') return renderWaliBimbingan(box);
}

function renderWaliJurnal(box) {
  box.innerHTML = `
    <div class="card form-stack">
      <h3 class="headline-sm">Catat Kegiatan Pendampingan</h3>
      <input type="text" id="wj-nisn" placeholder="NISN siswa">
      <input type="text" id="wj-nama" placeholder="Nama siswa">
      <input type="date" id="wj-tanggal">
      <select id="wj-jenis"><option>Konseling</option><option>Home Visit</option><option>Monitoring Kelas</option><option>Lainnya</option></select>
      <textarea id="wj-catatan" rows="3" placeholder="Catatan kegiatan…"></textarea>
      <textarea id="wj-tindaklanjut" rows="2" placeholder="Tindak lanjut…"></textarea>
      <button class="btn btn-accent" id="btn-simpan-wj">Simpan</button>
    </div>
    <div id="tabel-wj" class="card"></div>
    <button class="btn btn-ghost" id="btn-cetak-wj">🖨️ Cetak Rekap Jurnal Wali (PDF)</button>`;
  box.querySelector('#btn-simpan-wj').onclick = async () => {
    const res = await api('simpanJurnalWali', {
      nisn: box.querySelector('#wj-nisn').value, namaSiswa: box.querySelector('#wj-nama').value,
      tanggal: box.querySelector('#wj-tanggal').value, jenisKegiatan: box.querySelector('#wj-jenis').value,
      catatan: box.querySelector('#wj-catatan').value, tindakLanjut: box.querySelector('#wj-tindaklanjut').value
    });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) muatWj();
  };
  box.querySelector('#btn-cetak-wj').onclick = async () => {
    const res = await api('de.terbitkanRekapWali', {});
    if (res.success) window.open(res.data.pdfUrl, '_blank'); else showToast(res.message, 'error');
  };
  function muatWj() {
    api('daftarJurnalWali', {}).then(res => {
      if (!res.success) return;
      box.querySelector('#tabel-wj').innerHTML = `<table class="table"><thead><tr><th>Tanggal</th><th>Siswa</th><th>Jenis</th><th>Catatan</th></tr></thead><tbody>
        ${res.data.rows.map(r => `<tr><td>${esc(r.Tanggal)}</td><td>${esc(r.NamaSiswa)}</td><td>${esc(r.JenisKegiatan)}</td><td>${esc(r.Catatan)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  }
  muatWj();
}

function renderWaliPemetaan(box) {
  box.innerHTML = `
    <div class="card form-stack">
      <h3 class="headline-sm">Pemetaan Kebutuhan Murid</h3>
      <input type="text" id="pm-nisn" placeholder="NISN"><input type="text" id="pm-nama" placeholder="Nama siswa">
      <textarea id="pm-profil" rows="2" placeholder="Profil belajar (visual/auditori/kinestetik, dsb.)"></textarea>
      <textarea id="pm-minat" rows="2" placeholder="Minat siswa"></textarea>
      <select id="pm-kesiapan"><option>Siap</option><option>Perlu Pendampingan</option><option>Perlu Perhatian Khusus</option></select>
      <textarea id="pm-catatan" rows="2" placeholder="Catatan tambahan"></textarea>
      <button class="btn btn-accent" id="btn-simpan-pm">Simpan</button>
    </div>
    <div id="tabel-pm" class="card"></div>`;
  box.querySelector('#btn-simpan-pm').onclick = async () => {
    const res = await api('simpanPemetaanMurid', {
      nisn: box.querySelector('#pm-nisn').value, namaSiswa: box.querySelector('#pm-nama').value,
      profilBelajar: box.querySelector('#pm-profil').value, minat: box.querySelector('#pm-minat').value,
      tingkatKesiapan: box.querySelector('#pm-kesiapan').value, catatan: box.querySelector('#pm-catatan').value
    });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) muatPm();
  };
  function muatPm() {
    api('daftarPemetaanMurid', {}).then(res => {
      if (!res.success) return;
      box.querySelector('#tabel-pm').innerHTML = `<table class="table"><thead><tr><th>Siswa</th><th>Profil Belajar</th><th>Minat</th><th>Kesiapan</th></tr></thead><tbody>
        ${res.data.rows.map(r => `<tr><td>${esc(r.NamaSiswa)}</td><td>${esc(r.ProfilBelajar)}</td><td>${esc(r.Minat)}</td><td>${esc(r.TingkatKesiapan)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  }
  muatPm();
}

function renderWaliKehadiran(box) {
  box.innerHTML = `<div class="card"><div class="filter-bar"><input type="month" id="kh-bulan"><button class="btn btn-ghost" id="btn-muat-kh">Tampilkan</button></div><div id="tabel-kh"></div></div>`;
  box.querySelector('#btn-muat-kh').onclick = async () => {
    const res = await api('rekapKehadiranBinaan', { bulan: box.querySelector('#kh-bulan').value });
    if (!res.success) { showToast(res.message, 'error'); return; }
    box.querySelector('#tabel-kh').innerHTML = `<table class="table"><thead><tr><th>Siswa</th><th>H</th><th>S</th><th>I</th><th>A</th><th>% Hadir</th></tr></thead><tbody>
      ${res.data.rows.map(r => `<tr><td>${esc(r.nama)}</td><td>${r.H}</td><td>${r.S}</td><td>${r.I}</td><td>${r.A}</td><td>${r.persenHadir}%</td></tr>`).join('')}
      </tbody></table>`;
  };
}

function renderWaliKarakter(box) {
  box.innerHTML = `
    <div class="card form-stack">
      <h3 class="headline-sm">Catatan Akademik &amp; Karakter</h3>
      <input type="text" id="ck-nisn" placeholder="NISN"><input type="text" id="ck-nama" placeholder="Nama siswa">
      <select id="ck-jenis"><option>Akademik</option><option>Karakter</option><option>Umum</option></select>
      <textarea id="ck-isi" rows="3" placeholder="Isi catatan…"></textarea>
      <button class="btn btn-accent" id="btn-simpan-ck">Simpan</button>
    </div>
    <div id="tabel-ck" class="card"></div>`;
  box.querySelector('#btn-simpan-ck').onclick = async () => {
    const res = await api('simpanCatatanKarakter', {
      nisn: box.querySelector('#ck-nisn').value, namaSiswa: box.querySelector('#ck-nama').value,
      jenisCatatan: box.querySelector('#ck-jenis').value, isi: box.querySelector('#ck-isi').value
    });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) muatCk();
  };
  function muatCk() {
    api('daftarCatatanKarakter', {}).then(res => {
      if (!res.success) return;
      box.querySelector('#tabel-ck').innerHTML = `<table class="table"><thead><tr><th>Tanggal</th><th>Siswa</th><th>Jenis</th><th>Isi</th></tr></thead><tbody>
        ${res.data.rows.map(r => `<tr><td>${esc(r.Tanggal)}</td><td>${esc(r.NamaSiswa)}</td><td>${esc(r.JenisCatatan)}</td><td>${esc(r.Isi)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  }
  muatCk();
}

function renderWaliKomunikasi(box) {
  box.innerHTML = `
    <div class="card form-stack">
      <h3 class="headline-sm">Platform Komunikasi Orang Tua</h3>
      <input type="text" id="km-nisn" placeholder="NISN"><input type="text" id="km-nama" placeholder="Nama siswa">
      <input type="text" id="km-wa" placeholder="No. WA Orang Tua (08xxxx)">
      <input type="text" id="km-namaortu" placeholder="Nama orang tua">
      <textarea id="km-pesan" rows="3" placeholder="Tulis pesan untuk orang tua…"></textarea>
      <button class="btn btn-accent" id="btn-kirim-km">Kirim via WhatsApp</button>
    </div>
    <div id="tabel-km" class="card"></div>`;
  box.querySelector('#btn-kirim-km').onclick = async () => {
    const res = await api('kirimKomunikasiOrtu', {
      nisn: box.querySelector('#km-nisn').value, namaSiswa: box.querySelector('#km-nama').value,
      noWAOrtu: box.querySelector('#km-wa').value, namaOrtu: box.querySelector('#km-namaortu').value,
      pesan: box.querySelector('#km-pesan').value
    });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) muatKm();
  };
  function muatKm() {
    api('daftarKomunikasiOrtu', {}).then(res => {
      if (!res.success) return;
      box.querySelector('#tabel-km').innerHTML = `<table class="table"><thead><tr><th>Tanggal</th><th>Siswa</th><th>Pesan</th></tr></thead><tbody>
        ${res.data.rows.map(r => `<tr><td>${esc(r.Tanggal)}</td><td>${esc(r.NamaSiswa)}</td><td>${esc(r.Pesan)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  }
  muatKm();
}

function renderWaliBimbingan(box) {
  box.innerHTML = `
    <div class="card form-stack">
      <h3 class="headline-sm">Program Kegiatan Bimbingan</h3>
      <select id="pb-pilar"><option>Akademik</option><option>Kompetensi</option><option>Keterampilan</option><option>Karakter</option></select>
      <input type="text" id="pb-nama" placeholder="Nama program">
      <textarea id="pb-deskripsi" rows="2" placeholder="Deskripsi program"></textarea>
      <input type="text" id="pb-target" placeholder="Target/sasaran">
      <button class="btn btn-accent" id="btn-simpan-pb">Simpan</button>
    </div>
    <div id="tabel-pb" class="card"></div>`;
  box.querySelector('#btn-simpan-pb').onclick = async () => {
    const res = await api('simpanProgramBimbingan', {
      pilar: box.querySelector('#pb-pilar').value, namaProgram: box.querySelector('#pb-nama').value,
      deskripsi: box.querySelector('#pb-deskripsi').value, target: box.querySelector('#pb-target').value
    });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) muatPb();
  };
  function muatPb() {
    api('daftarProgramBimbingan', {}).then(res => {
      if (!res.success) return;
      box.querySelector('#tabel-pb').innerHTML = `<table class="table"><thead><tr><th>Pilar</th><th>Program</th><th>Target</th><th>Status</th></tr></thead><tbody>
        ${res.data.rows.map(r => `<tr><td>${esc(r.Pilar)}</td><td>${esc(r.NamaProgram)}</td><td>${esc(r.Target)}</td><td>${esc(r.Status)}</td></tr>`).join('')}
        </tbody></table>`;
    });
  }
  muatPb();
}
