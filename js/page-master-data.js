// ============================================
// page-master-data.js — Kelola Data Siswa & Kelola Data Kelas
// CRUD data LOKAL Master_Siswa/Master_Kelas (hasil import dari DB_AbsensiSiswa lewat
// menu Migrasi). Menu ini TIDAK menyentuh spreadsheet sumber DB_AbsensiSiswa.
// ============================================

// ---------- Kelola Data Siswa ----------
registerPage('kelola-siswa', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Kelola Data Siswa</h1>
      <p class="body-sm text-muted">Data master siswa aplikasi ini (hasil sinkron dari Absensi Siswa lewat menu Migrasi). Ubah di sini tidak mengubah data sumber.</p></div>
    <div class="card form-stack">
      <h3 class="headline-sm" id="ks-form-title">Tambah Siswa</h3>
      <input type="hidden" id="ks-edit-nisn-asli">
      <input type="text" id="ks-nisn" placeholder="NISN">
      <input type="text" id="ks-nis" placeholder="NIS">
      <input type="text" id="ks-nama" placeholder="Nama Lengkap">
      <input type="text" id="ks-kelas" placeholder="Kelas (mis. X-1)">
      <select id="ks-jk"><option value="">— Jenis Kelamin —</option><option>Laki-laki</option><option>Perempuan</option></select>
      <input type="text" id="ks-wa-ortu" placeholder="No. WA Orang Tua (08xxxx)">
      <input type="text" id="ks-nama-ortu" placeholder="Nama Orang Tua/Wali">
      <select id="ks-status"><option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option></select>
      <div class="btn-row">
        <button class="btn btn-primary" id="btn-simpan-siswa">Tambah</button>
        <button class="btn btn-ghost" id="btn-batal-siswa" hidden>Batal</button>
      </div>
    </div>
    <div class="card">
      <div class="btn-row"><input type="text" id="ks-cari" placeholder="Cari nama/NISN/kelas…" class="input-grow"></div>
      <div id="tabel-siswa"></div>
    </div>`,
  show(el) {
    function resetForm() {
      el.querySelector('#ks-edit-nisn-asli').value = '';
      ['#ks-nisn', '#ks-nis', '#ks-nama', '#ks-kelas', '#ks-wa-ortu', '#ks-nama-ortu'].forEach(s => el.querySelector(s).value = '');
      el.querySelector('#ks-jk').value = ''; el.querySelector('#ks-status').value = 'Aktif';
      el.querySelector('#ks-nisn').disabled = false;
      el.querySelector('#ks-form-title').textContent = 'Tambah Siswa';
      el.querySelector('#btn-simpan-siswa').textContent = 'Tambah';
      el.querySelector('#btn-batal-siswa').hidden = true;
    }
    el.querySelector('#btn-batal-siswa').onclick = resetForm;

    el.querySelector('#btn-simpan-siswa').onclick = async () => {
      const nisnAsli = el.querySelector('#ks-edit-nisn-asli').value;
      const res = await api('siswaSave', {
        nisn: nisnAsli || el.querySelector('#ks-nisn').value,
        nis: el.querySelector('#ks-nis').value,
        nama: el.querySelector('#ks-nama').value,
        kelas: el.querySelector('#ks-kelas').value,
        jenisKelamin: el.querySelector('#ks-jk').value,
        noWAOrtu: el.querySelector('#ks-wa-ortu').value,
        namaOrtu: el.querySelector('#ks-nama-ortu').value,
        status: el.querySelector('#ks-status').value
      });
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) { resetForm(); muat(); }
    };

    el.querySelector('#ks-cari').addEventListener('input', debounce(() => muat(), 300));

    function muat() {
      const q = el.querySelector('#ks-cari').value;
      api('siswaList', { q: q }).then(res => {
        if (!res.success) return;
        el.querySelector('#tabel-siswa').innerHTML = res.data.rows.length
          ? `<table class="table"><thead><tr><th>NISN</th><th>Nama</th><th>Kelas</th><th>JK</th><th>No. WA Ortu</th><th>Status</th><th></th></tr></thead><tbody>
          ${res.data.rows.map(s => `<tr>
            <td class="mono">${esc(s.NISN)}</td><td>${esc(s.Nama)}</td><td>${esc(s.Kelas)}</td><td>${esc(s.JenisKelamin)}</td>
            <td class="mono">${esc(s.NoWAOrtu)}</td><td>${esc(s.Status)}</td>
            <td class="btn-row">
              <button class="btn btn-ghost btn-sm" data-edit="${esc(s.NISN)}">Edit</button>
              <button class="btn btn-danger btn-sm" data-hapus="${esc(s.NISN)}">Hapus</button>
            </td>
          </tr>`).join('')}
          </tbody></table>`
          : emptyState('🧑‍🎓', q ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Belum ada data siswa. Import lewat menu Migrasi atau tambah manual di atas.');

        el.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => {
          const s = res.data.rows.find(x => String(x.NISN) === btn.dataset.edit);
          if (!s) return;
          el.querySelector('#ks-edit-nisn-asli').value = s.NISN;
          el.querySelector('#ks-nisn').value = s.NISN; el.querySelector('#ks-nisn').disabled = true;
          el.querySelector('#ks-nis').value = s.NIS || '';
          el.querySelector('#ks-nama').value = s.Nama || '';
          el.querySelector('#ks-kelas').value = s.Kelas || '';
          el.querySelector('#ks-jk').value = s.JenisKelamin || '';
          el.querySelector('#ks-wa-ortu').value = s.NoWAOrtu || '';
          el.querySelector('#ks-nama-ortu').value = s.NamaOrtu || '';
          el.querySelector('#ks-status').value = s.Status || 'Aktif';
          el.querySelector('#ks-form-title').textContent = 'Edit Siswa — ' + s.Nama;
          el.querySelector('#btn-simpan-siswa').textContent = 'Simpan Perubahan';
          el.querySelector('#btn-batal-siswa').hidden = false;
          el.scrollIntoView({ behavior: 'smooth' });
        });
        el.querySelectorAll('[data-hapus]').forEach(btn => btn.onclick = async () => {
          if (!confirm('Hapus data siswa ini? Tindakan ini tidak bisa dibatalkan.')) return;
          const res2 = await api('siswaHapus', { nisn: btn.dataset.hapus });
          showToast(res2.message, res2.success ? 'success' : 'error');
          if (res2.success) muat();
        });
      });
    }
    muat();
  }
});

// ---------- Kelola Data Kelas ----------
registerPage('kelola-kelas', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Kelola Data Kelas</h1>
      <p class="body-sm text-muted">Data master kelas aplikasi ini (hasil sinkron dari Absensi Siswa lewat menu Migrasi). Ubah di sini tidak mengubah data sumber.</p></div>
    <div class="card form-stack">
      <h3 class="headline-sm" id="kk-form-title">Tambah Kelas</h3>
      <input type="hidden" id="kk-edit-kode-asli">
      <input type="text" id="kk-kode" placeholder="Kode Kelas">
      <input type="text" id="kk-nama" placeholder="Nama Kelas (mis. X-1)">
      <input type="text" id="kk-fase" placeholder="Fase/Tingkat (mis. E / X)">
      <input type="text" id="kk-wali-nip" placeholder="NIP Wali Kelas (opsional)">
      <input type="number" id="kk-jumlah" placeholder="Jumlah Siswa">
      <div class="btn-row">
        <button class="btn btn-primary" id="btn-simpan-kelas">Tambah</button>
        <button class="btn btn-ghost" id="btn-batal-kelas" hidden>Batal</button>
      </div>
    </div>
    <div class="card">
      <div class="btn-row"><input type="text" id="kk-cari" placeholder="Cari nama/kode kelas…" class="input-grow"></div>
      <div id="tabel-kelas"></div>
    </div>`,
  show(el) {
    function resetForm() {
      el.querySelector('#kk-edit-kode-asli').value = '';
      ['#kk-kode', '#kk-nama', '#kk-fase', '#kk-wali-nip', '#kk-jumlah'].forEach(s => el.querySelector(s).value = '');
      el.querySelector('#kk-kode').disabled = false;
      el.querySelector('#kk-form-title').textContent = 'Tambah Kelas';
      el.querySelector('#btn-simpan-kelas').textContent = 'Tambah';
      el.querySelector('#btn-batal-kelas').hidden = true;
    }
    el.querySelector('#btn-batal-kelas').onclick = resetForm;

    el.querySelector('#btn-simpan-kelas').onclick = async () => {
      const kodeAsli = el.querySelector('#kk-edit-kode-asli').value;
      const res = await api('kelasSave', {
        kodeKelas: kodeAsli || el.querySelector('#kk-kode').value,
        namaKelas: el.querySelector('#kk-nama').value,
        fase: el.querySelector('#kk-fase').value,
        waliKelasNip: el.querySelector('#kk-wali-nip').value,
        jumlahSiswa: el.querySelector('#kk-jumlah').value
      });
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) { resetForm(); muat(); }
    };

    el.querySelector('#kk-cari').addEventListener('input', debounce(() => muat(), 300));

    function muat() {
      const q = el.querySelector('#kk-cari').value;
      api('kelasList', { q: q }).then(res => {
        if (!res.success) return;
        el.querySelector('#tabel-kelas').innerHTML = res.data.rows.length
          ? `<table class="table"><thead><tr><th>Kode</th><th>Nama Kelas</th><th>Fase</th><th>Wali (NIP)</th><th>Jml Siswa</th><th></th></tr></thead><tbody>
          ${res.data.rows.map(k => `<tr>
            <td class="mono">${esc(k.KodeKelas)}</td><td>${esc(k.NamaKelas)}</td><td>${esc(k.Fase)}</td>
            <td class="mono">${esc(k.WaliKelasNIP)}</td><td>${esc(k.JumlahSiswa)}</td>
            <td class="btn-row">
              <button class="btn btn-ghost btn-sm" data-edit="${esc(k.KodeKelas)}">Edit</button>
              <button class="btn btn-danger btn-sm" data-hapus="${esc(k.KodeKelas)}">Hapus</button>
            </td>
          </tr>`).join('')}
          </tbody></table>`
          : emptyState('🏫', q ? 'Tidak ada kelas yang cocok dengan pencarian.' : 'Belum ada data kelas. Import lewat menu Migrasi atau tambah manual di atas.');

        el.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => {
          const k = res.data.rows.find(x => String(x.KodeKelas) === btn.dataset.edit);
          if (!k) return;
          el.querySelector('#kk-edit-kode-asli').value = k.KodeKelas;
          el.querySelector('#kk-kode').value = k.KodeKelas; el.querySelector('#kk-kode').disabled = true;
          el.querySelector('#kk-nama').value = k.NamaKelas || '';
          el.querySelector('#kk-fase').value = k.Fase || '';
          el.querySelector('#kk-wali-nip').value = k.WaliKelasNIP || '';
          el.querySelector('#kk-jumlah').value = k.JumlahSiswa || '';
          el.querySelector('#kk-form-title').textContent = 'Edit Kelas — ' + k.NamaKelas;
          el.querySelector('#btn-simpan-kelas').textContent = 'Simpan Perubahan';
          el.querySelector('#btn-batal-kelas').hidden = false;
          el.scrollIntoView({ behavior: 'smooth' });
        });
        el.querySelectorAll('[data-hapus]').forEach(btn => btn.onclick = async () => {
          if (!confirm('Hapus data kelas ini? Tindakan ini tidak bisa dibatalkan.')) return;
          const res2 = await api('kelasHapus', { kodeKelas: btn.dataset.hapus });
          showToast(res2.message, res2.success ? 'success' : 'error');
          if (res2.success) muat();
        });
      });
    }
    muat();
  }
});
