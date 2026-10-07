// ============================================
// page-pengaturan-akun.js — Menu "Pengaturan Akun" (Waka)
// Fokus khusus: Tambah Akun Guru baru + Reset Kata Sandi akun.
// Pakai route backend yang SUDAH ADA (kelolaGuru aksi 'tambah'/'resetPassword' di Waka.gs)
// — tidak ada perubahan backend, dan halaman Kelola Guru yang sudah ada TIDAK disentuh.
// ============================================
registerPage('pengaturan-akun', {
  auth: 'waka',
  template: () => `
    <div class="page-head"><h1 class="headline-lg">Pengaturan Akun</h1>
      <p class="body-sm text-muted">Tambah akun Guru baru, atau reset kata sandi akun yang sudah ada.</p></div>

    <div class="card form-stack">
      <h3 class="headline-sm">Tambah Akun Guru Baru</h3>
      <input type="text" id="pa-nip" placeholder="NIP">
      <input type="text" id="pa-nama" placeholder="Nama Lengkap">
      <input type="email" id="pa-email" placeholder="Email">
      <input type="text" id="pa-wa" placeholder="No. WA (08xxxx)">
      <input type="text" id="pa-password" placeholder="Kata sandi awal (kosongkan = 12345678)">
      <label><input type="checkbox" id="pa-wali"> Tandai sebagai Guru Wali</label>
      <input type="text" id="pa-kelasbinaan" placeholder="Kelas binaan (jika Guru Wali)">
      <button class="btn btn-primary" id="btn-tambah-akun">Tambah Akun</button>
    </div>

    <div class="card form-stack">
      <h3 class="headline-sm">Reset Kata Sandi Akun</h3>
      <p class="body-sm text-muted">Pilih guru, lalu atur kata sandi barunya (kosongkan untuk kembali ke default 12345678).</p>
      <select id="pa-reset-nip"><option value="">— Pilih Guru —</option></select>
      <input type="text" id="pa-password-baru" placeholder="Kata sandi baru (kosongkan = 12345678)">
      <button class="btn btn-primary" id="btn-reset-akun">Reset Kata Sandi</button>
    </div>`,
  show(el) {
    function muatDaftarGuru() {
      api('daftarGuru', {}).then(res => {
        if (!res.success) return;
        const sel = el.querySelector('#pa-reset-nip');
        sel.innerHTML = '<option value="">— Pilih Guru —</option>' +
          res.data.rows.map(g => `<option value="${esc(g.nip)}">${esc(g.nama)} — ${esc(g.nip)} (${esc(g.status)})</option>`).join('');
      });
    }

    el.querySelector('#btn-tambah-akun').onclick = async () => {
      const nip = el.querySelector('#pa-nip').value;
      const nama = el.querySelector('#pa-nama').value;
      if (!nip || !nama) return showToast('NIP dan Nama wajib diisi.', 'error');
      const res = await api('kelolaGuru', {
        aksi: 'tambah', nip: nip, nama: nama,
        email: el.querySelector('#pa-email').value,
        noWA: el.querySelector('#pa-wa').value,
        passwordAwal: el.querySelector('#pa-password').value || undefined,
        isGuruWali: el.querySelector('#pa-wali').checked,
        kelasBinaan: el.querySelector('#pa-kelasbinaan').value
      });
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        ['#pa-nip', '#pa-nama', '#pa-email', '#pa-wa', '#pa-password', '#pa-kelasbinaan'].forEach(s => el.querySelector(s).value = '');
        el.querySelector('#pa-wali').checked = false;
        muatDaftarGuru();
      }
    };

    el.querySelector('#btn-reset-akun').onclick = async () => {
      const nip = el.querySelector('#pa-reset-nip').value;
      if (!nip) return showToast('Pilih guru dulu.', 'error');
      const sandiBaru = el.querySelector('#pa-password-baru').value;
      if (!confirm('Reset kata sandi akun ini? Guru harus login pakai kata sandi baru.')) return;
      const res = await api('kelolaGuru', { aksi: 'resetPassword', nip: nip, passwordBaru: sandiBaru || undefined });
      showToast(res.success ? (sandiBaru ? 'Kata sandi direset.' : 'Kata sandi direset ke default: 12345678') : res.message, res.success ? 'success' : 'error');
      if (res.success) el.querySelector('#pa-password-baru').value = '';
    };

    muatDaftarGuru();
  }
});
