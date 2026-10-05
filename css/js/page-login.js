// ============================================
// page-login.js — Login Guru/Waka (US-01)
// ============================================
registerPage('login', {
  auth: 'guest',
  template: () => `
    <div class="login-wrap">
      <div class="login-card card">
        <div class="login-logo">🎓</div>
        <h1 class="headline-lg">Jurnal Mengajar</h1>
        <p class="body-md text-muted">SMAN 1 Kamal Bangkalan — Portal Resmi Tenaga Pendidik</p>
        <form id="form-login">
          <label class="label-lg">Email</label>
          <input type="email" id="login-email" required placeholder="nama@sman1kamal.sch.id">
          <label class="label-lg">Kata Sandi</label>
          <input type="password" id="login-password" required placeholder="••••••••">
          <button type="submit" class="btn btn-primary btn-block" id="btn-login-submit">Masuk</button>
        </form>
        <p class="body-sm text-muted login-footnote">Guru: pastikan sudah di-absen barcode oleh Waka Kurikulum hari ini sebelum login.</p>
      </div>
    </div>`,
  show(el) {
    const form = el.querySelector('#form-login');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = el.querySelector('#btn-login-submit');
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      const res = await api('login', {
        email: el.querySelector('#login-email').value.trim(),
        password: el.querySelector('#login-password').value
      });
      btn.disabled = false; btn.textContent = 'Masuk';
      if (!res.success) { showToast(res.message, 'error'); return; }
      simpanSesi(res);
      showToast('Selamat datang, ' + res.data.nama + '!');
      go(res.data.role === 'WAKA' ? 'waka-dashboard' : 'beranda');
    };
  }
});
