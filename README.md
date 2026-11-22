# MIHRAB CONNECT

Kandidat brand induk untuk papan informasi masjid. Produk pertama:
**Mihrab Connect Board** — papan informasi digital (layar TV).

> **Status brand: BELUM FINAL.** Jangan pakai nama ini untuk pendaftaran
> merek, pembelian domain, atau launching publik sebelum ada penilaian
> konsultan KI.

## Hasil cek PDKI & domain (22 Nov 2026)

- Frasa persis "MIHRAB CONNECT" **tidak ada** datanya di PDKI.
- "MIHRAB" saja ada 11 catatan, tapi tidak satu pun di kelas 9, 35, 38,
  atau 42.
- Risiko fonetik di kelas target: **"Mihrob" kelas 9** (software, terdaftar
  9 Sep 2026, Kukuh Hadi Wiyono) dan **"MIHIRA" kelas 42** (PaaS dan
  komunitas online, terdaftar 2022, Tio Rosaline).
- **mihrabconnect.com sudah dipakai** platform lain di bidang masjid, dan
  nama "Mihrab Connect" juga dipakai SaaS manajemen masjid lain
  (SolvingSoft).
- PDKI adalah snapshot dan DJKI tidak menjamin datanya selalu mutakhir.

## Struktur produk

| Produk | Peran | Status (22 Nov 2026) |
| --- | --- | --- |
| Mihrab Connect Board | Papan informasi digital. Produk pertama. Fokus repo ini. | Live, P0 selesai |
| Mihrab Connect Admin | Dashboard pengelolaan. | Live, 8 layar |
| Mihrab Connect Finance | Keuangan dan kas. | P0 selesai (QRIS + Serah Terima) |
| Mihrab Connect Community | Jamaah dan komunikasi. | Dilewati user 22 Nov — menunggu nomor WA |
| Mihrab Connect Event | Kajian dan kegiatan. | P0 selesai |
| Mihrab Connect Archive | Arsip dan dokumentasi. | P0 selesai |

Tagline utama: **"Atur dari dashboard, kirim dari WhatsApp. Ganti pengurus,
data tetap di masjid."**

Palet: hijau gelap, emas lembut, putih hangat.

## Isi repo

| File | Isi |
| --- | --- |
| `docs/konsep-brand.md` | Konsep brand MIHRAB CONNECT (makna nama, positioning, 4 pilar, persona, suara, visual). |
| `docs/scope-board.md` | Dokumen scope Mihrab Connect Board (masuk/tidak masuk scope, batas teknis, kriteria selesai). |
| `docs/backend-spec.md` | Spesifikasi backend (model data, alur persetujuan, endpoint API, matriks izin, perilaku offline). |
| `docs/masjid-board-fitur-dan-usp.md` | Dokumen sumber: fitur utama & USP Masjid Board. |
| `docs/hasil-validasi-al-furqon.md` | Transkripsi setia hasil validasi di Masjid Al Furqon (22 Nov 2026). |
| `docs/supabase-schema.sql` | Skema Supabase (Postgres) dari spek backend — 14 tabel, RLS starter, data contoh. |
| `vercel-admin/` | Kode Admin live (Vercel, root `vercel-admin`): 12 file `api/`, 3 file `lib/`, `public/index.html`, `vercel.json`, README dengan daftar deviasi. |
| `vercel-board/` | Kode Board live (Vercel, root `vercel-board`): `api/board.js`, `lib/`, `public/index.html`, `vercel.json`. |
| `frontend/masjid-board.html` | Export landing page Masjid Board v2, satu file (gambar inline; font masih dari Google, fallback bila offline). |
| `frontend/mihrab-connect-board.html` | Export prototipe Board P0, satu file mandiri penuh (font & gambar inline, tanpa dependensi eksternal). |
| `frontend/mihrab-connect-admin.html` | Export prototipe Admin P0, satu file (font masih dari Google, fallback bila offline; tanpa backend nyata). |

Dokumen PDF (7 halaman konsep brand, 5 halaman scope) adalah hasil render
dari dokumen-dokumen di atas dan tersimpan di workspace; repo ini menyimpan
sumber Markdown-nya agar bisa diedit dan dilacak perubahannya.

## Keputusan izin yang sudah dikunci (22 Nov 2026)

- Ketua BOLEH mencatat kas lewat dashboard saja (tidak lewat WhatsApp).
- Bendahara BOLEH mengirim kiriman WhatsApp bila nomornya terdaftar;
  kiriman tetap menunggu persetujuan ketua sebelum tayang.
- Penyedia WhatsApp dikunci 22 Nov 2026: Meta Cloud API langsung
  (resmi; Rp0 di volume pilot). Semua kiriman WhatsApp masuk
  "menunggu" dan disetujui ketua dari dashboard — karena Sarino,
  Gondes, dan Paijo memakai satu nomor yang sama (083871374743),
  peran pengirim tidak bisa dibedakan dari nomor, jadi aturan spek
  "auto-tayang bila pengirim ketua" tidak berlaku untuk kiriman WA.
  Buat pengumuman dari dashboard tetap langsung tayang (pembuatnya
  jelas ketua).

## Status

- Landing page Masjid Board v2 sudah publik.
- Prototipe Board P0 (layar TV) selesai, lolos audit; temuan audit
  (panel simulasi di TV, overlay sholat, font offline) sudah diperbaiki.
- Spesifikasi backend selesai (10 halaman).
- Kit validasi untuk Masjid Al Furqon disetujui founder 22 Nov 2026.
- Validasi 22 Nov 2026: 4/4 kriteria pilot "Ya", persetujuan pilot
  ditandatangani pengurus Sarino — lolos pilot secara formal, tetapi
  jawaban wawancara kosong dan nama marbot pengirim WA belum tertulis
  (lihat `docs/hasil-validasi-al-furqon.md`).
- Admin tersambung Supabase + deploy Vercel 22 Nov 2026: proyek
  `mihrab-connect-admin` (team 0x's projects, git-linked ke repo ini,
  root `vercel-admin`, auto-deploy tiap push),
  https://mihrab-connect-admin-0xs-projects-798a67b4.vercel.app;
  env `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` terpasang. Layar:
  Beranda, Board, Jadwal, Kas, Pengurus, Persetujuan, Event, Arsip.
  API (12 file): pengumuman (GET/POST + setujui/tolak/akhiri),
  kas (GET/POST/PUT QRIS), serah-terima, event, jadwal, pengurus,
  log, arsip, board. Perlu login Vercel untuk membuka (Vercel
  Authentication aktif). Migrasi `kas_kategori.created_at` diterapkan
  22 Nov 2026 (API butuh kolom itu untuk urutan). Layar Jadwal kini
  punya tombol Simpan + form Tambah petugas (commit 2b52960e,
  terverifikasi live 22 Nov 2026 18:53–18:56 WIB; petugas tes sudah
  dihapus lagi, pengaturan tidak berubah).
- Finance P0 selesai + terverifikasi live 22 Nov 2026 19:47–19:48 WIB
  (commit d9d5880f, perbaikan fab16cb0 + 95c70b6f): QRIS per kategori
  (input + Simpan QRIS di kartu kas, status langsung berubah tanpa
  reload; Board membaca qris_url) dan Serah Terima 1 klik (form
  dari → ke + catatan, hanya dari ketua; saldo akhir per kategori
  dihitung per tanggal serah terima; riwayat + berita acara yang bisa
  dicetak). Bug saat verifikasi pertama: GET serah terima mengurutkan
  berdasarkan `created_at` yang tidak ada di tabel itu — diperbaiki
  (urutan per tanggal saja). Placeholder "Masjid Contoh An-Nur" dan
  angka 4/3 di Beranda diganti nama asli dan "…" agar tidak tampil
  angka salah saat data dimuat. Semua data uji dibersihkan (2 baris
  serah terima uji + URL QRIS uji dihapus; log aktivitas tetap
  sebagai jejak audit).
- Event P0 selesai + terverifikasi live 22 Nov 2026 20:09–20:18 WIB
  (commit da71ab2f Admin + 5c258c6b Board, perbaikan hapus 646d380a):
  layar Event di Admin (hari besar & event: tambah/ubah/saklar
  countdown/duplikasi ke tahun depan/hapus; kajian: tambah/ubah/status
  draf → tayang → selesai) dan slide "Kajian Berikutnya" di Board
  (muncul bila ada kajian tayang, rotasi jadi 4 slide). Bug saat
  verifikasi pertama: hapus memakai `window.confirm()` yang tidak
  muncul di browser sehingga hapus tidak pernah jalan — diganti
  konfirmasi dua langkah di tombol ("Hapus" → "Yakin hapus?").
  Data uji dibersihkan (3 baris event/kajian uji dihapus; yang
  tersisa hanya 2 event seed: Ramadan 1448 H dan Idul Fitri 1448 H).
- Archive P0 selesai + terverifikasi live 22 Nov 2026 20:38–21:02 WIB
  (commit 6baa1a02, perbaikan routing a1ccfffd, banner sukses
  ef94ccda): layar Arsip di Admin (daftar arsip tayangan dengan cari
  teks + filter jenis; Log Aktivitas dengan cari teks) dan GET
  /api/arsip (baris tersimpan + event yang tanggalnya sudah lewat
  sebagai turunan bacaan, bukan baris tersimpan); "Akhiri tayang"
  untuk pengumuman tayang (tayang → selesai + tulis baris arsip +
  log); kajian tayang → selesai otomatis masuk arsip. Bug saat
  verifikasi pertama: Setujui DAN Akhiri tayang sama-sama ditolak
  HTTP 405 — bukan salah kodenya, tapi rewrite lama di
  vercel-admin/vercel.json (`/api/:path*` → `/api/:path*`) menelan
  rute dinamis `[id]` sehingga permintaan dilempar ke index.html
  statis yang menolak POST; diperbaiki jadi satu fallback SPA yang
  mengecualikan `/api` (`/((?!api/).*)` → `/index.html`), dan semua
  rute `[id]` (setujui/tolak/akhiri) kini bekerja. Pelajaran: rute
  `[id]` belum pernah diuji live sebelum Archive P0 — semua rute
  dinamis harus diuji sekali saat dibuat. Temuan kecil: Setujui/Tolak
  tidak menampilkan banner sukses (hanya memuat ulang) — diperbaiki
  di ef94ccda. Data uji dibersihkan (2 pengumuman uji + 1 kajian uji
  + 2 baris arsip uji dihapus; arsip/pengumuman/kajian kembali 0;
  log aktivitas tetap sebagai jejak audit).
- Buat pengumuman dari dashboard selesai + terverifikasi live 22 Nov
  2026 21:13–21:14 WIB (commit 2abfdd8b): POST /api/pengumuman (isi
  wajib, jenis default "Pengumuman") + form "Buat pengumuman" di layar
  Persetujuan (textarea + select jenis + tombol "Tayangkan"). Dibuat
  dari dashboard langsung berstatus tayang sebagai ketua (preseden
  spek §4.3: kiriman ketua auto-tayang; dashboard hanya dioperasikan
  ketua), dengan catatan jujur di bawah form. Alur penuh terverifikasi
  live: buat dari form → tampil di Board (slide INFO MASJID + ticker)
  → Akhiri tayang → masuk Arsip, dengan log "Menambah pengumuman"
  dan "Mengakhiri tayang". Validasi isi kosong ditahan browser
  (tooltip native "Please fill out this field"); server juga menolak
  400. Belum dibangun: PUT edit pengumuman. Data uji dibersihkan
  (1 pengumuman uji + 1 baris arsip uji dihapus; pengumuman/arsip
  kembali 0; log tetap sebagai jejak audit).
- Edit pengumuman selesai + terverifikasi live 22 Nov 2026
  21:39–21:40 WIB (commit c513b2fd): PUT /api/pengumuman (isi dan/atau
  jenis) + tombol "Ubah" dengan form edit inline di layar Persetujuan.
  Hanya status menunggu/draft yang bisa diubah (tayang harus diakhiri
  dulu, selesai sudah masuk arsip — server menolak 409). Terverifikasi
  live: ubah pengumuman menunggu (isi + jenis Pengumuman → Kegiatan)
  berhasil dan tetap menunggu; pengumuman tayang tidak punya tombol
  Ubah; log "Mengubah pengumuman" tercatat. Data uji dibersihkan
  (2 pengumuman uji + 1 baris arsip uji dihapus; pengumuman/arsip
  kembali 0; log tetap sebagai jejak audit).
- Board live di Vercel 22 Nov 2026: proyek `mihrab-connect-board`
  (team 0x's projects, git-linked ke repo ini, root `vercel-board`),
  https://mihrab-connect-board-0xs-projects-798a67b4.vercel.app —
  publik tanpa login (SSO protection dimatikan); data dari function
  `/api/board` sendiri di proyek itu (bukan dari domain Admin, karena
  Admin dilindungi login Vercel); panel simulasi dihapus, data dari
  Supabase, poll 60 detik. Data pilot terisi 22 Nov 2026 19:15 WIB,
  dikoreksi 19:29 WIB dari shareloc user: Masjid Jami' Abdul Latief
  Al Furqon, Ploso, Mlopoharjo, Wuryantoro, Wonogiri 57661, koordinat
  -7.89367, 110.84866; Ketua Sarino, Bendahara Gondes, Marbot Paijo
  (ketiganya WA 083871374743, terdaftar); pengurus contoh + transaksi
  uji Rp1.000 dihapus.
- WhatsApp: penyedia dikunci 22 Nov 2026 (Meta Cloud API langsung,
  resmi; Rp0 di volume pilot) — lihat "Keputusan izin" di atas.
  Nomor HP baru khusus masjid BELUM ADA (per 22 Nov 2026 21:30 WIB);
  webhook + endpoint intake/notifikasi belum dibangun, menunggu nomor
  + akun Meta Business + kartu pembayaran. Perhatian saat beli SIM:
  jangan didaftarkan di aplikasi WhatsApp biasa (nomor Cloud API
  harus belum pernah terdaftar di WA).
- Community DILEWATI user 22 Nov 2026 20:22 WIB ("Lewati Community,
  ke Archive"): fungsi intinya (kirim WhatsApp + notifikasi) terblokir
  penyedia — kini penyedia sudah dipilih, tetapi Community tetap belum
  dibangun; yang sudah ada hanya sisi persetujuan (draft → antrean →
  tayang). Dibuka lagi bila nomor WA sudah ada.
- Stack Admin dikunci 22 Nov 2026: Vercel + Supabase (tier gratis),
  hosting ikut Vercel.
- Keputusan terbuka: brand final.
- Menunggu / belum dikerjakan: PUT edit pengumuman; instalasi TV
  Board di Masjid Al Furqon (masjid setuju pasang, belum tercatat
  terpasang); login Admin khusus (saat ini hanya login Vercel);
  perketat RLS Supabase per-peran sebelum dipakai jamaah; celah bukti
  validasi (satu contoh insiden tercatat, lingkari LOLOS PILOT di
  formulir, tanggal tanda tangan Sarino, fitur paling dibutuhkan +
  keberatan terbesar).
