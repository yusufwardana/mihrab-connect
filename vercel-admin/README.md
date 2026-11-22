# Mihrab Connect Admin — Vercel + Supabase

Dashboard pengurus masjid (Admin) yang tersambung ke Supabase. Tanpa
framework: Vercel Serverless Functions (Node) + satu file HTML statis.

Sumber: prototipe Admin P0 (`../frontend/mihrab-connect-admin.html`),
spesifikasi backend (`../docs/backend-spec.md`), dan skema Supabase
(`../docs/supabase-schema.sql`, 14 tabel, sudah diterapkan di proyek
Supabase `mihrab-connect`).

> **Belum di-deploy dan belum di-push.** Direktori ini hanya berisi kode
> siap deploy. Tidak ada kunci apa pun di dalam file-file di sini.

## Struktur

```
vercel-admin/
├── package.json          # dependensi: @supabase/supabase-js saja
├── vercel.json           # static dari public/, /api/* ke functions
├── README.md             # file ini
├── lib/
│   ├── supabase.js       # klien service-role + helper masjid/ketua/log
│   ├── http.js           # helper respons & baca body JSON
│   └── prayer.js         # hitung jadwal sholat Kemenag + tanggal Hijriyah
├── api/
│   ├── pengumuman.js                 # GET /api/pengumuman
│   ├── pengumuman/[id]/setujui.js   # POST /api/pengumuman/:id/setujui
│   ├── pengumuman/[id]/tolak.js     # POST /api/pengumuman/:id/tolak
│   ├── kas.js                        # GET/POST /api/kas
│   ├── jadwal.js                     # GET/PUT /api/jadwal
│   ├── pengurus.js                   # GET /api/pengurus
│   ├── log.js                        # GET /api/log
│   └── board.js                      # GET /api/board (paket tayang)
└── public/
    └── index.html        # Admin (6 layar), data dari /api/*, tanpa data contoh
```

## Environment variables (diatur di Vercel, bukan di file)

| Variabel | Isi |
| --- | --- |
| `SUPABASE_URL` | URL proyek Supabase, mis. `https://rxslkuavzquhfqpycthb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key proyek (Settings → API Keys). **Rahasia.** Jangan pernah menaruhnya di kode, di `public/`, atau di repo. |

API memakai service role key (melewati RLS) karena ini backend dashboard,
bukan klien browser. Frontend (`public/index.html`) tidak memegang kunci
apa pun — semua data lewat `/api/*`.

## Cara deploy

### Opsi A — Vercel CLI (dari direktori ini)

```bash
npm install
vercel login
vercel --prod
# saat diminta env, isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY
# atau: vercel env add SUPABASE_URL production
#       vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### Opsi B — Dashboard Vercel

1. Import repo GitHub `yusufwardana/mihrab-connect`, **Root Directory:
   `vercel-admin`** (atau deploy folder ini sebagai proyek sendiri).
2. Framework Preset: **Other**. Build Command: kosong. Output: `public`.
3. Tambah Environment Variables `SUPABASE_URL` dan
   `SUPABASE_SERVICE_ROLE_KEY` (Production).
4. Deploy. Admin tampil di `/`, API di `/api/*`.

### Cek cepat setelah deploy

```bash
curl https://<domain>/api/board
curl https://<domain>/api/pengumuman
curl -X POST https://<domain>/api/kas \
  -H 'Content-Type: application/json' \
  -d '{"jenis":"masuk","kategori_id":"<uuid kategori>","jumlah":100000,"keterangan":"Infaq Jumat"}'
```

Perintah di atas memakai contoh angka; ganti `kategori_id` dengan UUID
kategori dari `GET /api/kas`.

## Endpoint & tabel yang dipakai

| Endpoint | Tabel | Keterangan |
| --- | --- | --- |
| `GET /api/pengumuman` | `pengumuman`, `pengurus` | Semua pengumuman (+ nama/peran pengirim). `?status=menunggu\|tayang\|draft\|selesai`. |
| `POST /api/pengumuman/:id/setujui` | `pengumuman`, `pengurus`, `log_aktivitas` | `menunggu` → `tayang`; `disetujui_oleh` = ketua, `disetujui_pada` = now. Hanya status `menunggu` (409 bila bukan). |
| `POST /api/pengumuman/:id/tolak` | `pengumuman`, `pengurus`, `log_aktivitas` | Lihat catatan “Tolak” di bawah. Hanya status `menunggu`. |
| `GET /api/kas` | `kas_kategori`, `kas_transaksi`, `pengurus` | Kategori + transaksi (100 terakhir) + saldo per kategori. Saldo `null` bila kategori belum punya transaksi. |
| `POST /api/kas` | `kas_transaksi`, `kas_kategori`, `pengurus`, `log_aktivitas` | Dashboard saja. Validasi: `jenis` masuk/keluar, `jumlah` angka ≥ 0, `kategori_id` ada, `keterangan` wajib. Pencatat harus ketua/bendahara (default: ketua). |
| `GET /api/jadwal` | `masjid`, `jadwal_settings`, `iqomah_durations`, `jadwal_petugas`, `murotal_settings` | Settings + iqomah + petugas + murotal + jadwal sholat terhitung + tanggal Masehi/Hijriyah. |
| `PUT /api/jadwal` | sama + `log_aktivitas` | Ubah `koreksi_menit` (-60..60), `offset_hijriyah` (-2..2), `iqomah` {waktu: 0..30}, `petugas` (array, ganti seluruh daftar), `murotal.aktif`. |
| `GET /api/pengurus` | `pengurus` | Daftar pengurus + nomor WhatsApp terdaftar. |
| `GET /api/log` | `log_aktivitas`, `pengurus` | 50 terakhir (`?limit=` maks 100). |
| `GET /api/board` | `masjid`, `jadwal_settings`, `iqomah_durations`, `pengumuman`, `pengurus`, `kas_kategori`, `kas_transaksi`, `event`, `murotal_settings` | Paket tayang: hanya pengumuman `tayang`, ringkasan kas (bukan detail transaksi), QRIS, countdown event, murotal. Baca-saja. |

Setiap aksi tulis (setujui / tolak / tambah kas / ubah jadwal) menulis
satu baris ke `log_aktivitas` (`sumber: "dashboard"`).

## Penyimpangan dari prototipe & skema (sengaja, dicatat di sini)

Semua ini muncul karena skema database yang sudah ada berbeda dengan
model data contoh di prototipe. UI dipertahankan tampilannya, tetapi
bagian yang terikat data mengikuti skema.

1. **Tolak bukan status `ditolak`.** Check constraint `pengumuman.status`
   hanya mengizinkan `draft|menunggu|tayang|selesai`, jadi tidak ada nilai
   `ditolak` di database. `POST .../tolak` memakai status `selesai`
   (terminal, tidak pernah tayang) dan mencatat penolakan di
   `log_aktivitas` (`aksi: "Menolak kiriman"`). Frontend menampilkan
   badge **Ditolak** bila `status=selesai` dan `disetujui_pada` kosong;
   `selesai` + `disetujui_pada` terisi berarti masa tayang habis.
   Bila ingin status `ditolak` eksplisit, perlu migrasi:
   ```sql
   alter table pengumuman drop constraint pengumuman_status_check;
   alter table pengumuman add constraint pengumuman_status_check
     check (status in ('draft','menunggu','tayang','selesai','ditolak'));
   ```
   (lalu ubah `api/pengumuman/[id]/tolak.js` memakai `'ditolak'`).
2. **Pengumuman tidak punya kolom judul/poster/prioritas.** Tabel hanya
   punya `isi`, `jenis`, `sumber`, `pengirim_id`. Frontend memakai judul
   turunan = baris pertama `isi` (maks 80 karakter); “Prioritas tampil”
   diturunkan dari `jenis` yang mengandung “duka”; tidak ada blok visual
   poster (tidak ada `poster_url` di tabel pengumuman).
3. **Koreksi menit tunggal.** Skema menyimpan satu `koreksi_menit` di
   `jadwal_settings`, bukan per waktu. Kartu “Koreksi Menit per Waktu”
   di layar Jadwal diubah menjadi satu field “Koreksi menit (semua
   waktu)”.
4. **Jadwal sholat dihitung, bukan disimpan.** Tidak ada tabel waktu
   sholat; API menghitungnya dari koordinat masjid (metode Kemenag:
   Subuh −20°, Isya −18°, Ashar Syafi'i, ihtiyat +2 menit, WIB).
   Divalidasi terhadap jadwal resmi Kemenag Jakarta 22 Nov 2026:
   Subuh 04:05, Dzuhur 11:41, Ashar 15:04, Maghrib 17:53, Isya 19:08
   (resmi: 04:05 / 11:42 / 15:05 / 17:54 / 19:08 — selisih 0–2 menit;
   Terbit 05:26 vs resmi 05:23). Bila koordinat masjid masih `null`
   (seperti pada seed saat ini), API mengembalikan `waktu: null` dan UI
   menampilkan pemberitahuan, bukan jam palsu.
5. **Tanggal Hijriyah tabular ±1 hari.** Dihitung dengan algoritme
   Kuwaiti; terhadap kalender resmi Kemenag bisa selisih ±1 hari
   (22 Nov 2026 → 11 Jumadilakhir 1448 H, resmi 12). Gunakan
   `offset_hijriyah` di layar Jadwal untuk mengoreksi.
6. **Form kas mendapat input Jumlah (Rp).** Prototipe sengaja tidak
   menampilkan nominal dan tidak punya input jumlah; `POST /api/kas`
   butuh `jumlah` (validasi ≥ 0), jadi field ini ditambahkan. Jumlah
   tampil sebagai Rupiah asli; `null` tetap tampil “Rp —”.
7. **Edit jadwal petugas hanya lewat API.** `PUT /api/jadwal` menerima
   `petugas` (array, mengganti seluruh daftar). UI layar Jadwal hanya
   menampilkan tabel petugas; belum ada form editor petugas.
8. **Tanpa autentikasi (untuk saat ini).** Siapa pun yang tahu URL bisa
   memanggil endpoint tulis. Ini disengaja untuk P0 agar pilot bisa
   jalan; tambahkan auth (mis. Supabase Auth + cek peran) sebelum
   dipakai jamaah/publik. Service role key juga berarti RLS starter
   tidak membatasi API ini.
9. **Satu masjid.** API memakai baris `masjid` pertama (paling lama
   dibuat). Bila nanti ada banyak masjid, ganti dengan `masjid_id` dari
   sesi pengguna (`lib/supabase.js: getMasjid`).
10. **Tidak ada endpoint WhatsApp.** Penyedia WhatsApp belum dipilih;
    tidak ada `POST /whatsapp/*` di sini, sesuai spesifikasi backend.
11. **Data seed kosong untuk antrean/kas/petugas/log.** Seed Supabase
    tidak mengisi `pengumuman`, `kas_transaksi`, `jadwal_petugas`, dan
    `log_aktivitas`, jadi layar-layar itu menampilkan keadaan kosong
    (“Antrean kosong”, “Belum ada transaksi”, dsb.) — bukan data contoh.

## Yang sudah diverifikasi (saat build, 22 Nov 2026)

- `npm run check` — `node --check` lolos untuk 8 file `api/*`, 3 file
  `lib/*`, dan script inline `public/index.html`.
- `npm install` berhasil (`@supabase/supabase-js` 2.119.2).
- Fungsi murni `lib/prayer.js` diuji langsung: jadwal Kemenag Jakarta
  22 Nov 2026 (lihat butir 4 di atas) dan tanggal Hijriyah pada
  1 Jan 2026 (12 Rajab 1447 H) & 1 Mar 2025 (1 Ramadan 1446 H) cocok
  dengan kalender resmi.
- Struktur `public/index.html`: 6 layar (beranda, persetujuan, jadwal,
  kas, pengurus, board) utuh; semua `data-*` yang dipakai script ada;
  tidak ada lagi nama/nomor/jadwal/angka contoh hardcoded (dicek
  otomatis saat transformasi).

## Yang belum bisa diverifikasi (butuh langkah berikut)

- **Belum ada end-to-end test ke Supabase asli.** Service role key
  tidak tersedia saat build, jadi endpoint belum pernah dipanggil
  melawan proyek `mihrab-connect`. Setelah deploy + isi env vars,
  jalankan cek cepat di atas dan periksa: `GET /api/board` (paket
  tayang), `GET /api/pengumuman` (saat ini kosong — wajar), lalu uji
  `POST /api/kas` dengan satu transaksi contoh dan lihat masuk ke
  `log_aktivitas`.
- **Koordinat masjid masih kosong di seed** (`koordinat_lat/lng`
  `null`), jadi jadwal sholat akan tampil sebagai pemberitahuan
  sampai koordinat diisi di tabel `masjid` (atau lewat endpoint
  profil yang belum dibuat).
- **Tidak ada data pengumuman untuk menguji alur setujui/tolak.**
  Butuh satu baris `pengumuman` berstatus `menunggu` (dari intake
  WhatsApp nanti, atau insert manual di SQL Editor) sebelum tombol
  Setujui/Tolak bisa diuji ujung-ke-ujung.
