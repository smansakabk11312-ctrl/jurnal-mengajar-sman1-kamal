# Jurnal Mengajar SMAN 1 Kamal Bangkalan — Frontend

Frontend statis (HTML/CSS/JS vanilla) untuk aplikasi Jurnal Mengajar, dideploy ke **GitHub Pages**.
Backend berjalan di **Google Apps Script** sebagai REST API murni (lihat `PANDUAN-INSTALASI.md`).

## Sebelum deploy

1. Isi `js/config.js` → ganti `GAS_URL` dengan URL `/exec` hasil Deploy Web App dari Apps Script.
2. Jangan ubah struktur folder (`css/`, `js/`) — `index.html` harus tetap di root.

## Struktur

```
index.html      ← root, wajib untuk GitHub Pages
css/style.css
js/config.js    ← isi GAS_URL di sini
js/api.js
js/app.js
js/page-*.js
```

Lihat `PANDUAN-INSTALASI.md` untuk langkah lengkap backend (Apps Script) + deploy ke GitHub Pages.
