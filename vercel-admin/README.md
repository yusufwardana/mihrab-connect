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
│   ├── auth.js           # PIN scrypt + token sesi HMAC + butuhAuth
│   └── prayer.js         # hitung jadwal sholat Kemenag + tanggal Hijriyah
├── api/                              # 11 Serverless Functions (batas Hobby: 12 — lihat deviasi 24)
│   ├── auth.js                       # dispatcher /api/auth?aksi=pengurus|login|saya|logout|ubah-pin|reset-pin
│   ├── pengumuman.js                 # GET/POST/PUT /api/pengumuman
│   ├── pengumuman/[id]/aksi.js       # dispatcher POST /api/pengumuman/:id/setujui|tolak|akhiri
│   ├── kas.js                        # GET/POST/PUT /api/kas
│   ├── serah-terima.js               # GET/POST /api/serah-terima
│   ├── event.js                      # GET/POST/PUT/DELETE /api/event
│   ├── jadwal.js                     # GET/PUT /api/jadwal
│   ├── pengurus.js                   # GET /api/pengurus
│   ├── log.js                        # GET /api/log
│   ├── arsip.js                      # GET /api/arsip
│   └── board.js                      # GET /api/board (paket tayang, publik)
└── public/
    └── index.html        # Admin (7 layar), data dari /api/*, tanpa data contoh
```

## Environment variables (diatur di Vercel, bukan di file)

| Variabel | Isi |
| --- | --- |
| `SUPABASE_URL` | URL proyek Supabase, mis. `https://rxslkuavzquhfqpycthb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key proyek (Settings → API Keys). **Rahasia.** Jangan pernah menaruhnya di kode, di `public/`, atau di repo. |
| `ADMIN_SESSION_SECRET` | Rahasia penanda sesi login (string acak panjang, mis. hasil `openssl rand -hex 32`). **Rahasia.** Tanpa ini semua endpoint auth menolak login. Cara set: Vercel Dashboard → proyek → Settings → Environment Variables (Production + Preview), atau `vercel env add ADMIN_SESSION_SECRET production`. |

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
| `POST /api/pengumuman` | `pengumuman`, `pengurus`, `log_aktivitas` | Buat pengumuman dari dashboard, langsung `tayang` (hanya ketua yang boleh; lihat deviasi 18). Body `{ isi (wajib), jenis (opsional, default "Pengumuman") }`; isi kosong 400, jenis > 100 karakter 400. Kembalikan 201 `{ pengumuman }`. |
| `PUT /api/pengumuman` | `pengumuman`, `pengurus`, `log_aktivitas` | Ubah pengumuman (lihat deviasi 19). Body `{ id (wajib), isi?, jenis? }`; setidaknya satu dari isi/jenis harus dikirim (400 bila tidak ada). Hanya status `menunggu`/`draft` (404 bila tidak ada, 409 bila `tayang`/`selesai`); isi kosong 400, jenis > 100 karakter 400. Kembalikan 200 `{ pengumuman }`. |
| `POST /api/pengumuman/:id/setujui` | `pengumuman`, `pengurus`, `log_aktivitas` | `menunggu` → `tayang`; `disetujui_oleh` = ketua yang login, `disetujui_pada` = now. Hanya status `menunggu` (409 bila bukan). |
| `POST /api/pengumuman/:id/tolak` | `pengumuman`, `pengurus`, `log_aktivitas` | Lihat catatan “Tolak” di bawah. Hanya status `menunggu`. |
| `POST /api/pengumuman/:id/akhiri` | `pengumuman`, `arsip`, `pengurus`, `log_aktivitas` | `tayang` → `selesai`; tulis baris arsip (judul = baris pertama isi, maks 200 karakter). Hanya status `tayang` (409 bila bukan). Kembalikan pengumuman + arsip. |
| `GET /api/kas` | `kas_kategori`, `kas_transaksi`, `pengurus` | Kategori + transaksi (100 terakhir) + saldo per kategori. Saldo `null` bila kategori belum punya transaksi. |
| `POST /api/kas` | `kas_transaksi`, `kas_kategori`, `pengurus`, `log_aktivitas` | Dashboard saja. Validasi: `jenis` masuk/keluar, `jumlah` angka ≥ 0, `kategori_id` ada, `keterangan` wajib. Pencatat harus ketua/bendahara (default: pengurus yang login). |
| `PUT /api/kas` | `kas_kategori`, `log_aktivitas` | Atur QRIS per kategori: `{kategori_id, qris_url}`. `qris_url` `null`/kosong = hapus QRIS; selain itu harus URL `https` yang valid (400 bila bukan). Kembalikan kategori yang diubah. |
| `GET /api/serah-terima` | `serah_terima`, `kas_kategori`, `kas_transaksi`, `pengurus`, `masjid` | Daftar (tanggal terbaru dulu, maks 50). Tiap item berisi dari/ke (nama + peran), tanggal, catatan, `saldo_akhir` per kategori + total (dihitung dari transaksi dengan `tanggal <= tanggal` serah terima — saldo beku per tanggal), dan daftar pengurus saat ini. |
| `POST /api/serah-terima` | `serah_terima`, `pengurus`, `log_aktivitas` | Catat serah terima: `{dari_pengurus_id, ke_pengurus_id, catatan?, tanggal?}` (tanggal default hari ini WIB). Validasi: kedua pengurus ada untuk masjid ini, dari ≠ ke, **dari harus ketua** (matriks izin spek). Kembalikan baris yang dibuat + snapshot saldo yang sama seperti GET. |
| `GET /api/event` | `event`, `kajian`, `masjid` | Daftar event (tanggal naik, tiap item membawa penanda `selesai` bila tanggal sudah lewat WIB) + kajian (tanggal naik, lalu `created_at`). |
| `POST /api/event` | `event`, `kajian`, `log_aktivitas` | Aksi lewat body `aksi`: `tambah-event` `{nama, tanggal, tampil_countdown?}`; `tambah-kajian` `{judul, tanggal, waktu?, pemateri?}` (status awal `draf`); `duplikasi-event` `{id}` (salin event, tanggal +1 tahun). Kembalikan baris yang dibuat (201). |
| `PUT /api/event` | `event`, `kajian`, `arsip`, `log_aktivitas` | Body `{target: "event"\|"kajian", id, ...}`. Event: `nama?`, `tanggal?`, `tampil_countdown?`. Kajian: `judul?`, `tanggal?`, `waktu?`, `pemateri?`, `status?` (hanya `draf`/`tayang`/`selesai`, 400 bila lain). Kajian `tayang` → `selesai` juga menulis baris arsip (`jenis: 'kajian'`). Target harus milik masjid ini (404 bila tidak ada). Kembalikan baris yang diubah. |
| `DELETE /api/event` | `event`, `kajian`, `log_aktivitas` | Body `{target: "event"\|"kajian", id}`. Hapus baris (404 bila tidak ada). Kembalikan `{dihapus: true, id}`. |
| `GET /api/jadwal` | `masjid`, `jadwal_settings`, `iqomah_durations`, `jadwal_petugas`, `murotal_settings` | Settings + iqomah + petugas + murotal + jadwal sholat terhitung + tanggal Masehi/Hijriyah. |
| `PUT /api/jadwal` | sama + `log_aktivitas` | Ubah `koreksi_menit` (-60..60), `offset_hijriyah` (-2..2), `iqomah` {waktu: 0..30}, `petugas` (array, ganti seluruh daftar), `murotal.aktif`. |
| `GET /api/pengurus` | `pengurus` | Daftar pengurus + nomor WhatsApp terdaftar. |
| `GET /api/log` | `log_aktivitas`, `pengurus` | 50 terakhir (`?limit=` maks 100). |
| `GET /api/arsip` | `arsip`, `event` | Arsip tersimpan (terbaru dulu) + event yang tanggalnya sudah lewat (turunan bacaan dari tabel `event`, `asal: 'event'`; tidak ditulis ke tabel `arsip`). `?q=` cari judul/konten, `?jenis=pengumuman\|kajian\|event` (400 bila lain), `?limit=` maks 100. |
| `GET /api/board` | `masjid`, `jadwal_settings`, `iqomah_durations`, `pengumuman`, `pengurus`, `kas_kategori`, `kas_transaksi`, `event`, `murotal_settings` | Paket tayang: hanya pengumuman `tayang`, ringkasan kas (bukan detail transaksi), QRIS, countdown event, murotal. Baca-saja. **Tetap publik tanpa login** — Board tidak disentuh login Admin. |
| `GET /api/auth/pengurus` | `pengurus` | Publik (tanpa login): daftar `{id, nama, peran}` untuk dropdown login. Nama + peran pengurus bukan rahasia. |
| `POST /api/auth/login` | `pengurus` | Body `{pengurus_id, pin}`. PIN benar → cookie `mihrab_sesi` (httpOnly, Secure, SameSite=Lax, 12 jam) + `{saya: {id, nama, peran}}`. PIN salah → 401 + `pin_gagal` +1; 5 gagal → kunci 15 menit (429). PIN belum diatur → 409. Tidak menulis log. |
| `GET /api/auth/saya` | — | Butuh sesi → `{saya: {id, nama, peran}}`, atau 401. |
| `POST /api/auth/logout` | — | Hapus cookie `mihrab_sesi` → `{ok: true}`. |
| `POST /api/auth/ubah-pin` | `pengurus` | Butuh sesi (semua peran). Body `{pin_lama, pin_baru}`; PIN lama harus cocok (401), PIN baru tepat 6 digit angka (400). |
| `POST /api/auth/reset-pin` | `pengurus` | Ketua saja. Body `{pengurus_id}` → `{pin_baru}` — PIN acak 6 digit yang hanya muncul sekali di respons ini; ketua yang menyampaikannya ke pengurus, tidak tersimpan sebagai teks di mana pun. |

### Peran per layar & endpoint (login Admin, 22 Nov 2026)

| Layar / endpoint | Ketua | Bendahara | Marbot |
| --- | --- | --- | --- |
| Beranda, Jadwal (lihat), Pratinjau Board, Ganti PIN | Ya | Ya | Ya |
| Kas (lihat + catat + QRIS), Arsip + Log (lihat) | Ya | Ya | — |
| Persetujuan, Event, Pengurus | Ya | — | — |
| `GET /api/pengumuman`, `GET /api/jadwal`, `GET /api/board` | Ya | Ya | Ya |
| `POST/PUT /api/pengumuman`, setujui/tolak/akhiri, serah terima, `PUT /api/jadwal`, `/api/event`, `/api/pengurus` | Ya | — | — |
| `GET/POST/PUT /api/kas` | Ya | Ya | — |
| `GET /api/log`, `GET /api/arsip` | Ya | Ya | — |

Semua endpoint di atas (kecuali `/api/board` dan `/api/auth/pengurus` +
`/api/auth/login`) menolak tanpa cookie sesi yang valid (401) atau peran
yang salah (403). Log aktivitas kini mencatat id pengurus yang login,
bukan selalu ketua. Peran pengawas ada di matriks spek tapi belum ada
orangnya — belum dibuka akses endpoint untuknya.

Setiap aksi tulis (setujui / tolak / akhiri tayang / tambah & ubah
pengumuman / tambah kas / ubah jadwal / ubah QRIS / serah terima /
tambah-ubah-hapus event & kajian) menulis satu baris ke `log_aktivitas`
(`sumber: "dashboard"`).

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
   (lalu ubah `api/pengumuman/[id]/aksi.js` (aksi `tolak`) memakai `'ditolak'`).
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
12. **Saldo akhir serah terima tidak disimpan di tabel.** Skema
    `serah_terima` tidak punya kolom snapshot, dan skema tidak diubah
    untuk Finance P0. `GET/POST /api/serah-terima` menghitung saldo
    akhir dari `kas_transaksi` dengan `tanggal <= tanggal` serah
    terima (maks 5.000 transaksi yang dibaca). Transaksi tidak pernah
    dihapus, jadi angka beku itu stabil. Berita acara adalah tampilan
    di Admin (bukan file): tombol “Cetak / Simpan PDF” memanggil
    `window.print()` — pengguna memilih “Save as PDF” di dialog
    browser. UI serah terima ada di layar Kas; layar Pengurus & Peran
    tetap display-only. Tabel `serah_terima` juga **tidak punya kolom
    `created_at`** (berbeda dengan tabel lain) — riwayat diurutkan
    per `tanggal` saja; jangan tambah `.order("created_at")` di
    endpoint ini (pernah merusak GET, diperbaiki 22 Nov 2026).
13. **Pola berulang kajian belum didukung.** Spesifikasi backend menyebut
    pola sekali/harian/mingguan/bulanan, tetapi skema `kajian` tidak
    punya kolom pola — tiap tanggal dibuat sebagai satu kajian (form
    tambah kajian di layar Event menyatakan ini). Bila pola diperlukan,
    perlu migrasi (mis. `alter table kajian add column pola text not
    null default 'sekali' check (pola in
    ('sekali','harian','mingguan','bulanan'))`) + logika perluasan
    jadwal di `api/event.js` dan tampilan di Board.
14. **Tabel `event` tidak punya kolom `created_at`.** Seperti
    `serah_terima`: urutan daftar di `api/event.js` selalu per
    `tanggal` saja — jangan tambah `.order("created_at")` untuk tabel
    ini. Duplikasi event memakai tanggal +1 tahun (29 Feb menjadi
    28 Feb bila tahun tujuan bukan kabisat).
15. **Hapus event/kajian memakai konfirmasi dua langkah di tombol.**
    `window.confirm()` tidak bisa diandalkan (di beberapa browser
    dialognya tidak muncul sehingga hapus tidak pernah jalan —
    ditemukan saat verifikasi live 22 Nov 2026): klik pertama pada
    "Hapus" mengubah tombol menjadi "Yakin hapus?", klik kedua baru
    menghapus. Penghapusan langsung menghapus baris dan tercatat di
    `log_aktivitas` (`aksi: "Menghapus event"` / `"Menghapus kajian"`).
    Pesan sukses singkat tampil di banner hijau `[data-api-sukses]`
    (baru di Event P0); banner error `[data-api-error]` menyembunyikan
    banner sukses dan sebaliknya.
16. **Arsip hanya ditulis pada transisi tayang → selesai.** `POST
    .../pengumuman/:id/akhiri` menulis baris arsip (`jenis:
    'pengumuman'`) saat pengumuman tayang diakhiri; PUT kajian
    `tayang` → `selesai` menulis baris arsip (`jenis: 'kajian'`).
    Transisi `draf` → `selesai` (termasuk tolak) tidak masuk arsip
    karena kontennya tidak pernah tayang. Event yang tanggalnya sudah
    lewat hanya dibaca dari tabel `event` di `GET /api/arsip`
    (turunan, `asal: 'event'`) — tidak ditulis ke tabel `arsip`.
    Arsip jadwal petugas & ringkasan kas belum masuk arsip (lanjutan).
    Tombol "Akhiri tayang" memakai konfirmasi dua langkah yang sama
    seperti butir 15 ("Akhiri tayang" → "Yakin akhiri?").
17. **Baris arsip tidak bisa dihapus.** Arsip adalah catatan permanen
    lembaga; tidak ada endpoint hapus dan tidak ada tombol hapus di
    layar Arsip. Bila ada baris arsip yang salah, perbaiki langsung
    di database (Supabase) dan catat perbaikannya di log — bukan
    dari Admin.
18. **Buat pengumuman dari dashboard langsung tayang sebagai ketua.**
    `POST /api/pengumuman` mengikuti preseden spek backend §4.3
    (kiriman WhatsApp dari ketua auto-tayang): hanya ketua yang boleh
    membuat pengumuman dari dashboard, jadi `pengirim_id` =
    `disetujui_oleh` = ketua yang login dan status langsung `tayang`
    tanpa antrean persetujuan.
19. **Hanya pengumuman `menunggu`/`draft` yang bisa diubah.** `PUT
    /api/pengumuman` menolak status `tayang`/`selesai` (409): yang
    tayang harus diakhiri dulu lewat "Akhiri tayang", yang selesai
    sudah masuk arsip. Tombol "Ubah" di layar Persetujuan hanya tampil
    pada item `menunggu`/`draft`; klik "Ubah" mengubah kartu item
    menjadi form edit inline (textarea + select jenis + Simpan/Batal).
20. **Login Admin pakai nama + PIN 6 digit, bukan email.** Pengurus tidak
    punya email tercatat dan nomor WA dipakai bersama, jadi login memilih
    nama pengurus lalu PIN. PIN disimpan sebagai hash scrypt + salt
    (kolom `pin_hash`/`pin_salt` di `pengurus`, migrasi
    `docs/migrations/002-pin-pengurus.sql` — BELUM diterapkan, lihat
    bagian "Yang belum dilakukan (login Admin)" di bawah). Sesi 12 jam
    via cookie `mihrab_sesi` (HMAC-SHA256, secret
    `ADMIN_SESSION_SECRET`).
21. **Semua endpoint Admin (kecuali `/api/board`) butuh sesi login.**
    `GET /api/pengumuman`, `GET /api/jadwal`, `GET /api/board` boleh
    semua peran yang login; tulis pengumuman, setujui/tolak/akhiri,
    serah terima, ubah jadwal, event, dan pengurus hanya ketua;
    kas + log + arsip ketua + bendahara. Bila ragu, dipilih yang
    lebih ketat (ketua saja). Frontend hanya mengambil endpoint yang
    boleh dibaca peran yang login (lihat `muatSemua()`).
22. **Log aktivitas mencatat pengurus yang login.** Sebelum ada login,
    semua log ditulis atas nama ketua (`getKetua`). Kini `tulisLog`
    memakai id dari token sesi. Pengecualian: serah terima — kolom
    `dari_pengurus` tetap harus ketua (aturan bisnis), tapi aktor
    log-nya adalah ketua yang login.
23. **Vercel SSO masih menyala.** Login aplikasi di atas belum menggantikan
    SSO Vercel; SSO dimatikan hanya setelah login terverifikasi live
    (lihat "Yang belum dilakukan (login Admin)"). Sementara itu pengurus
    tetap butuh akun Vercel untuk membuka Admin.
24. **Endpoint digabung karena batas 12 Serverless Functions (Hobby).**
    Deploy Admin gagal dengan `exceeded_serverless_functions_per_deployment`
    karena ada 18 file `api/*.js` (batas Hobby: 12 function per
    deployment). Enam endpoint auth digabung ke satu function
    `api/auth.js` (dispatcher lewat query `aksi`) dan tiga aksi
    pengumuman digabung ke `api/pengumuman/[id]/aksi.js` (dispatcher
    lewat query `aksi`, id dari path). Rewrite di `vercel.json`
    (`/api/auth/:aksi` → `/api/auth?aksi=:aksi` dan
    `/api/pengumuman/:id/:aksi` →
    `/api/pengumuman/:id/aksi?aksi=:aksi`, sebelum fallback SPA)
    menjaga URL yang dipanggil frontend TETAP SAMA; validasi, status
    HTTP, pesan error, cookie/sesi, dan peran per aksi sama persis
    seperti file asalnya. Vercel menghitung SEMUA file `.js` di bawah
    `api/` sebagai function, walau tidak di-route — jadi file lama
    (`api/auth/*.js`, `setujui.js`, `tolak.js`, `akhiri.js`) DIHAPUS,
    bukan dibiarkan. Daftar function akhir (11): `api/auth.js`,
    `api/pengumuman.js`, `api/pengumuman/[id]/aksi.js`, `api/kas.js`,
    `api/serah-terima.js`, `api/event.js`, `api/jadwal.js`,
    `api/pengurus.js`, `api/log.js`, `api/arsip.js`, `api/board.js`.
    **Jangan tambah file `api/` baru tanpa menggabungkan — total
    harus ≤ 12.** Bila butuh endpoint baru, masukkan ke dispatcher
    yang sudah ada (auth / pengumuman / event) atau buat dispatcher
    baru dengan rewrite yang sama polanya.
25. **Boot, error login, dan layar terlarang (perbaikan UI, 22 Nov
    2026).** Tiga cacat dari verifikasi live; semuanya murni UI/boot
    (`public/index.html` saja, tanpa perubahan API/lib/URL/peran):
    - **Boot tidak lagi menampilkan dashboard sebelum sesi
      dipastikan.** Sebelumnya `.app` tampil sejak first paint (tidak
      ada `display:none` awal) dan baru disembunyikan di
      `tampilkanLogin()` setelah `GET /api/auth/saya` gagal — jadi
      sebelum login terlihat shell dashboard lengkap (semua nav, nama
      masjid, label "Akun lembaga (DKM)", placeholder "Memuat log
      aktivitas…"). Kini `.app` dan `.mobilebar` (mobilebar berada DI
      LUAR `.app`, jadi harus disembunyikan terpisah) mulai dengan
      `display:none`, dan satu-satunya yang tampil saat boot adalah
      status netral `#boot-status` ("Memeriksa sesi…"). Dashboard +
      `muatSemua()` hanya jalan setelah sesi dipastikan
      (`tampilkanApp()`); bila 401 → `#login-screen`. Label kecil
      "Akun lembaga (DKM) — bukan akun pribadi pengurus" dihapus dari
      topbar: klaimnya sudah salah sejak ada akun per pengurus, dan
      label itulah yang tampil sebagai pengganti nama pengguna saat
      belum login. (`muatSemua()` sendiri tidak pernah terpanggil
      sebelum sesi — hanya shell statis yang bocor.)
    - **Error gagal login tampil di layar login, bukan di banner
      dashboard.** Sebelumnya handler submit login memanggil
      `tampilkanError("Nama atau PIN salah.")` yang menulis ke
      `[data-api-error]` di dalam `.app` yang tersembunyi — pesan
      tidak terlihat saat login gagal, lalu muncul terlambat di
      Beranda setelah login sukses berikutnya (sampai `muatSemua()`
      selesai dan menyembunyikannya). Kini gagal login memakai elemen
      khusus `[data-login-error]` di `#login-screen` (sudah ada di
      HTML, sebelumnya tidak pernah dipakai handler login).
      `tampilkanApp()` dan `tampilkanLogin()` selalu membersihkan
      banner dashboard (`[data-api-error]`/`[data-api-sukses]`) dan
      error login, jadi tidak ada pesan yang bisa bocor antar-layar.
      Error Ganti PIN tetap memakai banner dashboard — benar, karena
      layar PIN ada di dalam dashboard.
    - **Layar terlarang di load awal menampilkan
      `#view-terbatas`.** `navigasi()` sudah benar memetakan layar di
      luar peran ke `view-terbatas` untuk klik di dalam aplikasi,
      tetapi aplikasi sama sekali tidak membaca URL (tidak ada
      penanganan `location`/`hash`), jadi membuka langsung `/arsip`
      sebagai marbot selalu mendarat di Beranda tanpa pesan. Kini
      `tampilkanApp()` membaca layar awal dari URL lewat
      `viewDariUrl()` (segmen path pertama, atau hash, mis. `/arsip` /
      `#arsip`) dan melewatkannya ke `navigasi()` — layar terlarang →
      `#view-terbatas`, nama tak dikenal → Beranda. URL tidak pernah
      ditulis saat pindah layar.
    Verifikasi saat perbaikan: script inline lolos `node --check`;
    uji logika lokal 30 cek lolos (harness DOM tiruan + stub fetch di
    `/tmp/admin-boot-test.js`, tidak ikut repo): urutan
    boot → 401 → login gagal → login sukses → logout → login ketua,
    termasuk marbot buka `/arsip` → `#view-terbatas` dan ketua buka
    `/` → Beranda. Uji live di browser belum dilakukan.

## Yang belum dilakukan (login Admin — langkah parent setelah build)

- Terapkan migrasi `docs/migrations/002-pin-pengurus.sql` lewat SQL
  Editor Supabase (kolom `pin_hash`, `pin_salt`, `pin_gagal`,
  `pin_terkunci_sampai` di tabel `pengurus`). File skema
  `docs/supabase-schema.sql` sudah memuat keempat kolom untuk setup baru.
- Set `ADMIN_SESSION_SECRET` di Vercel (Production + Preview) — nilai
  acak panjang, jangan pernah dimasukkan ke repo.
- Buat PIN awal tiap pengurus dengan `node scripts/set-pin.js <pengurus_id> <pin-6-digit>`
  (dari direktori `vercel-admin`, env `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` diatur). Script hanya mencetak nama,
  bukan PIN. Sampaikan PIN ke tiap pengurus lewat jalur yang aman.
- Uji live: masuk sebagai tiap peran, pastikan layar + endpoint yang
  dilarang memang 403/tertutup, lalu matikan Vercel Authentication
  (SSO) di proyek Admin.

## Yang sudah diverifikasi (saat build, 22 Nov 2026)

- `npm run check` — `node --check` lolos untuk 11 file `api/*`
  (`api/auth.js` + `api/pengumuman/[id]/aksi.js` sebagai dispatcher
  penggabungan, lihat deviasi 24), 4 file `lib/*`, dan `scripts/set-pin.js`
  (script inline `public/index.html` dicek terpisah, lihat bawah).
- `npm install` berhasil (`@supabase/supabase-js` 2.119.2).
- Fungsi murni `lib/prayer.js` diuji langsung: jadwal Kemenag Jakarta
  22 Nov 2026 (lihat butir 4 di atas) dan tanggal Hijriyah pada
  1 Jan 2026 (12 Rajab 1447 H) & 1 Mar 2025 (1 Ramadan 1446 H) cocok
  dengan kalender resmi.
- Struktur `public/index.html`: 8 layar (beranda, persetujuan, jadwal,
  kas, event, arsip, pengurus, board) utuh; semua `data-*` yang dipakai script ada;
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
