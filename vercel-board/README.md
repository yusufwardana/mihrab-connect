# Mihrab Connect Board — Live (Vercel statis)

Papan informasi digital TV (16:9) yang tersambung ke data live. Tanpa
framework, tanpa serverless functions: satu file HTML statis di `public/`
yang mengambil paket tayang dari Admin.

Sumber: prototipe Board P0 (`../frontend/mihrab-connect-board.html`) yang
diubah lewat skrip transformasi (`/tmp/transform-board.py`, skrip live di
`/tmp/board-live-script.js`) — panel simulasi dihapus, semua data contoh
dihapus, data layer diganti `fetch()` ke API.

> **Belum di-deploy dan belum di-push.** Direktori ini hanya berisi kode
> siap deploy. Tidak ada kunci apa pun di dalam file-file di sini.

## Struktur

```
vercel-board/
├── vercel.json      # static murni dari public/ (tanpa functions)
├── README.md        # file ini
└── public/
    └── index.html   # Board live (font/gambar inline, ~944 KB)
```

## Sumber data

```
GET https://mihrab-connect-admin-0xs-projects-798a67b4.vercel.app/api/board
```

Endpoint baca-saja di proyek Vercel Admin; CORS sudah dibuka di
`../vercel-admin/api/board.js` (`Access-Control-Allow-Origin: *` + tangani
`OPTIONS`) karena Board di-deploy di domain yang berbeda. Bentuk respons
yang dipakai (lihat `api/board.js`):

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

- Hanya pengumuman berstatus **tayang** yang tampil (ticker + slide
  poster). Bila tidak ada, ticker menampilkan satu baris netral
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
- Slide poster memakai pengumuman tayang pertama (judul = baris pertama
  `isi`, maks 80 karakter). Bila tidak ada, slide menampilkan nama
  masjid + “Belum ada pengumuman tayang.”

## Cara deploy

### Opsi A — proyek Vercel baru dari repo (disarankan: publik, tanpa login)

1. Import repo GitHub `yusufwardana/mihrab-connect` sebagai proyek baru
   (mis. `mihrab-connect-board`), **Root Directory: `vercel-board`**.
2. Framework Preset: **Other**. Build Command: kosong. Output: `public`.
3. **Tidak perlu environment variable.**
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
- **Jadwal masih null sampai koordinat masjid diisi.** Seed Supabase
  (`koordinat_lat/lng`) masih `null`, jadi `jadwal.waktu` dari
  `/api/board` masih `null` dan Board akan menampilkan pemberitahuan
  jadwal, bukan jam. Isi koordinat di tabel `masjid` (atau lewat
  endpoint profil yang belum dibuat) sebelum uji tampilan jadwal.
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
