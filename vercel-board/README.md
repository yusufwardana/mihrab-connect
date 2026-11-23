# Mihrab Connect Board — Live (Vercel)

Papan informasi digital TV (16:9) yang tersambung ke data live. **Redesign
23 Nov 2026: React + Vite + Tailwind CSS 4** (sebelumnya satu file HTML
vanilla ES5 — salinan lamanya di `/tmp/board-vanilla-backup.html`, BUKAN di
repo). Build output `dist/` + satu function baca-saja `api/board.js` yang
mengambil paket tayang dari Supabase.

> **Belum di-deploy dan belum di-push.** Direktori ini hanya berisi kode
> siap deploy. Tidak ada kunci apa pun di dalam file-file di sini.

## Struktur

```
vercel-board/
├── package.json     # react, react-dom, vite, tailwindcss (+ @supabase/supabase-js untuk api/board.js)
├── vite.config.mjs  # plugin React + Tailwind; build -> dist/
├── vercel.json      # framework vite, buildCommand npm run build, outputDirectory dist
├── index.html       # entry Vite (skrip tema inline di <head>)
├── src/
│   ├── main.jsx     # entry React
│   ├── App.jsx      # fetch /api/board + polling 60 dtk + jam 1 dtk + tema
│   ├── data.js      # MOCK_PAYLOAD (referensi bentuk/fixture saja) + computeBoardState
│   ├── index.css    # token tema + pola geometris + marquee
│   ├── assets/fonts.css  # font self-hosted (Plus Jakarta Sans, Cormorant Garamond)
│   └── components/  # Header, PrayerSchedule, HeroCountdown, FinancePanel, Ticker, icons
├── lib/             # klien Supabase + hitung jadwal (salinan dari vercel-admin)
└── api/
    └── board.js     # GET /api/board (paket tayang) — TIDAK BERUBAH
```

## Build & cek lokal

```
npm install
npm run build     # -> dist/ (dipakai Vercel)
npm run check     # node --check api/board.js + lib/*
npm run dev       # dev server (butuh /api/board — pakai fixture /tmp/mock-api.mjs)
npm run preview   # sajikan dist/ di :4173 (proxy /api/board -> :8787, lokal saja)
```

Verifikasi render 23 Nov 2026: `npm run build` lolos; screenshot headless
Chromium 1920×1080 + 1366×768 untuk tema biru-malam (default), gelap,
terang, emas — tanpa overflow X/Y, tanpa console error, keenam baris jadwal
terbaca, countdown jalan. Fixture: `/tmp/mock-api.mjs` + `/tmp/shot-board.mjs`
(tidak ikut di-push).

## Perubahan dari Board vanilla (redesign 23 Nov 2026)

- Layout tetap 3 kolom + header + footer, tapi mengikuti spek founder:
  header 3 bagian (brand+badges / nama masjid serif emas / jam besar +
  detik), hero countdown 65% + duo event/murotal 35%, kanan kas + QRIS,
  footer ticker **marquee berjalan** (dulu rotasi di tempat).
- Tema `?tema=` dipertahankan (gelap/terang/emas/biru-malam, default
  biru-malam); token baru menyesuaikan tiap tema. Tema gelap = spek persis
  (#05261B / #0A3D2D / emas #D4AF37 / #F5D061). Perbaikan kontras baris
  passed tema terang (5,90:1) ikut dibawa.
- Pola geometris Islami halus (opacity ~5%) + siluet lengkung mihrab di
  kartu hero + ornamen pembatas emas di bawah nama masjid.
- **Dihapus mengikuti layout baru:** slide poster pengumuman (pengumuman
  sudah tampil di ticker marquee). Label kejujuran "Nama kerja — branding
  belum final" di bawah logo juga tidak ada di layout baru.
- **Slide dikembalikan 23 Nov 2026 (23:xx WIB, belum deploy):** strip slide
  berotasi di antara kolom utama dan ticker (`src/components/SlideStage.jsx`,
  rotasi 9 detik + dot, jeda saat mode sholat) — slide KAJIAN BERIKUTNYA
  (hanya bila ada kajian tayang) dan slide PETUGAS JUMAT (tanggal +
  khutbah mulai + khatib/imam/muadzin dari `petugas_jumat` di payload;
  empty state "Belum ada petugas Jumat" bila data kosong). Strip setinggi
  `clamp(96px, 13.5vh, 152px)`; ketiga kolom tetap utuh, tanpa scroll.
- Mode sholat: layar meredup + hero menampilkan status (overlay penuh
  lama diganti peredupan saja). Mode Jumat (Dzuhur → Jumat, khutbah)
  dipertahankan.
- **Batasan jujur:** build React+Tailwind butuh browser modern. WebView
  bawaan Android 6 di STB ZTE B860H TIDAK BISA menjalankan build ini
  (butuh update WebView/Chrome di STB). Fallback CSS WebView lama dari
  Board vanilla tidak berlaku untuk build ini.


## Sumber data

```
GET /api/board   (same-origin, function di proyek ini)
```

Kenapa bukan langsung ke proyek Admin: Admin dilindungi Vercel
Authentication (login Vercel), jadi browser TV tanpa login tidak bisa
memanggil `https://mihrab-connect-admin-…/api/board` — permintaan akan
dialihkan ke halaman login sebelum sampai ke function. Karena itu Board
memiliki `api/board.js` sendiri yang membaca Supabase langsung dengan
service-role key (env var server, tidak pernah ke browser). CORS di
`../vercel-admin/api/board.js` tetap ada untuk pemakaian lain, tetapi
Board live tidak memakainya.

```json
{
  "masjid": { "nama", "alamat", "koordinat_lat", "koordinat_lng", "logo_url", "foto_url", "kontak" },
  "jadwal": { "metode", "koreksi_menit", "offset_hijriyah",
              "waktu": null | [{ "nama": "Subuh|Terbit|Dzuhur|Ashar|Maghrib|Isya", "jam": "HH:MM", "iqomah": null | menit }] },
  "pengumuman_tayang": [{ "id", "jenis", "isi", "sumber", "pengirim": { "nama", "peran" } | null, "created_at" }],
  "ringkasan_kas": { "per_kategori": [{ "id", "nama", "saldo": null | angka }], "total": 0 },
  "qris": [{ "kategori", "qris_url": null | "https://…" }],
  "event": [{ "id", "nama", "tanggal": "YYYY-MM-DD" }],
  "countdown_berikutnya": { "id", "nama", "tanggal" } | null,
  "kajian": [{ "id", "judul", "tanggal": "YYYY-MM-DD", "waktu": "HH:MM" | null, "pemateri": "…" | null }],
  "petugas_jumat": { "tanggal": "YYYY-MM-DD", "khutbah_mulai": "HH:MM" | null, "khatib": "…" | null, "imam": "…" | null, "muadzin": "…" | null } | null,
  "murotal": { "surah", "qari", "durasi_menit", "volume", "aktif" } | null,
  "tanggal": { "masehi": "…", "hijriyah": "…" }
}
```

## Polling & perilaku saat putus

- Fetch saat halaman dibuka, lalu ulang tiap **60 detik**. Jam real-time
  tetap jalan tiap detik dari jam perangkat TV.
- Payload terakhir disimpan di memori. Bila fetch gagal, Board tetap
  menampilkan data terakhir dan chip **DATA** di strip status berubah
  menjadi **DATA TERAKHIR** (atau **TIDAK TERHUBUNG** bila belum pernah
  berhasil). Tidak ada data palsu yang ditampilkan saat putus.
- Mode Normal / Iqomah / Sholat / Jumat diturunkan dari jam nyata +
  jadwal API — tidak ada kontrol simulasi di Board live.

## Aturan tayang yang dipertahankan

- Hanya pengumuman berstatus **tayang** yang tampil di ticker. Bila tidak
  ada, ticker menampilkan satu baris netral
  `Mihrab Connect Board — <nama masjid>` (bukan teks karangan).
- **Bila `jadwal.waktu` null** (koordinat masjid belum diisi di Admin):
  jadwal, hero hitung mundur, dan jendela murotal menampilkan
  pemberitahuan — bukan jam palsu. Isi koordinat masjid di Admin agar
  jadwal tampil.
- Kas: saldo `null` tampil **“Rp —”**; total “Rp —” bila semua kategori
  belum punya transaksi. Hanya ringkasan, bukan detail transaksi.
- QRIS: hanya `qris_url` asli yang ditampilkan sebagai gambar. Bila
  `null`, tampil teks “QRIS belum tersedia” — tidak ada lagi pola QR
  dekoratif (pola palsu bisa dipindai jamaah).
- Murotal: status saja, tanpa audio asli. Jendela 10 menit sebelum
  Subuh & Maghrib, surah/qari dari pengaturan Admin; bila murotal
  nonaktif, status **NONAKTIF**.
- **Slide kajian:** hanya kajian status `tayang` dengan tanggal hari ini
  atau sesudahnya (maks 5) yang masuk payload `kajian`. Slide menampilkan
  kajian terdekat (judul, tanggal, jam, pemateri, "+N kajian lagi") dan
  hanya ada di rotasi bila daftar tidak kosong — bila kosong, slide +
  dot-nya hilang dan rotasi hanya 1 slide (petugas).
- **Slide petugas Jumat:** payload `petugas_jumat` = tanggal petugas
  terdekat (tanggal >= hari ini) + khutbah mulai (Dzuhur pada tanggal
  itu, dihitung) + nama khatib/imam/muadzin. Peran yang belum diisi
  tampil "—". Bila belum ada data petugas sama sekali (`null`), slide
  menampilkan empty state "Belum ada petugas Jumat".

## Cara deploy

### Opsi A — proyek Vercel baru dari repo (disarankan: publik, tanpa login)

1. Import repo GitHub `yusufwardana/mihrab-connect` sebagai proyek baru
   (mis. `mihrab-connect-board`), **Root Directory: `vercel-board`**.
2. Framework Preset: **Vite**. Build Command: `npm run build`. Output Directory: `dist` (sudah diatur di `vercel.json`).
3. Tambah Environment Variables `SUPABASE_URL` dan
   `SUPABASE_SERVICE_ROLE_KEY` (Production) — sama seperti proyek Admin.
4. Deploy. Board tampil di `/`.

Penting: proyek Board harus **terpisah dari Admin** dan **tanpa Vercel
Authentication** — TV di masjid harus bisa membuka URL tanpa login.
Jangan lindungi proyek ini dengan deployment protection.

### Opsi B — Vercel CLI (dari direktori ini)

```bash
vercel login
vercel --prod
```

## Yang berubah dari prototipe

- Panel simulasi dihapus sepenuhnya (HTML + CSS + logika skenario
  `virtualNow`/`setScenario`/tombol `.sim-btn`).
- Semua data contoh dihapus: jadwal contoh, pengumuman contoh, kas
  “Rp —” statis, petugas contoh, pola QRIS dekoratif, tanggal Hijriyah
  dari perangkat (kini dari `tanggal` API).
- Aturan TV (`html[data-hatch-target="tv"]`) dijadikan aturan dasar —
  Board live memang selalu tampil sebagai layar TV (rotasi ticker di
  tempat, bukan marquee).
- Ditambah chip **DATA** di strip status (MEMUAT… / TERBARU /
  DATA TERAKHIR / TIDAK TERHUBUNG).
- Slide petugas Jumat: waktu khutbah dari jadwal Dzuhur hari Jumat;
  nama Khatib/Imam/Muadzin menampilkan “—” (lihat bawah).
- Skrip `hatch-space-target` (scaffolding artifact) dihapus; font
  dan gambar tetap inline (tanpa dependensi eksternal).

## Yang belum bisa diverifikasi / celah yang diketahui

- **Belum ada end-to-end test ke API asli.** Belum di-deploy; skrip
  live baru dicek sintaksnya (`node --check`) dan semua id elemen
  terverifikasi ada. Setelah deploy, uji: Board memuat nama masjid
  asli, chip DATA jadi TERBARU, dan polling 60 detik berjalan.
- **Jadwal tampil setelah koordinat masjid diisi.** Koordinat contoh
  Jakarta (-6.2088, 106.8456) sudah diisi di tabel `masjid` 22 Nov 2026,
  jadi `jadwal.waktu` dari `/api/board` mengembalikan jam sholat nyata.
  Ganti dengan koordinat Masjid Al Furqon saat pilot.
- **Jadwal petugas Jumat belum ada di `/api/board`.** Endpoint hanya
  mengembalikan paket tayang tanpa `jadwal_petugas`, jadi slide Jumat
  menampilkan waktu khutbah + “—” untuk Khatib/Imam/Muadzin.
  Bila petugas harus tampil, perluas `api/board.js` (Admin) dengan
  `jadwal_petugas` minggu berjalan, lalu isi slide dari sana.
- **Tidak ada poster bergambar.** `pengumuman` tidak punya `poster_url`,
  jadi slide poster memakai teks pengumuman tayang pertama di atas
  gambar dekoratif prototipe. Bila Event menyediakan poster, perluas
  API + slide.
- **Satu masjid.** API memakai baris `masjid` pertama; Board tidak
  memilih masjid.
- **Tanpa autentikasi Board** — sengaja: TV harus bisa membuka tanpa
  login. Yang ditampilkan hanya konten tayang + ringkasan kas; tidak
  ada endpoint tulis di Board.
