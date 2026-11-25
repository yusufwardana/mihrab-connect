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
| `docs/supabase-schema.sql` | Skema Supabase (Postgres) dari spek backend — 14 tabel, RLS least-privilege (migrasi 003), data contoh. |
| `vercel-admin/` | Kode Admin live (Vercel, root `vercel-admin`): 12 file `api/`, 3 file `lib/`, `public/index.html`, `vercel.json`, README dengan daftar deviasi. |
| `vercel-board/` | Kode Board live (Vercel, root `vercel-board`, vanilla: `public/index.html` satu file + `api/board.js` + `lib/`, `vercel.json`; React sempat dipakai 23 Nov 2026 lalu di-rollback ke vanilla). |
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
- Board: 4 variasi tema selesai + terverifikasi live 23 Nov 2026
  20:13–20:27 WIB (commit afab0058 + perbaikan kontras d4a0a978) —
  gelap (default), terang, emas, biru-malam, dipilih lewat
  `?tema=`; kontras teks/latar utama tiap tema ≥4,5:1 (terang sempat
  cacat: baris passed 2,05:1, diperbaiki ke 5,90:1, terverifikasi
  ulang live). Tema default: **biru-malam** (dipilih founder 23 Nov
  2026; sebelumnya gelap).
- Board: REDESIGN React 19 + Vite 8 + Tailwind 4, selesai +
  terverifikasi live 23 Nov 2026 20:58–20:59 WIB (commit e7551d02)
  — hijau zamrud `#05261B`/`#0A3D2D`, emas `#D4AF37`, pola geometris
  Islami, siluet lengkung mihrab di kartu countdown, serif untuk nama
  masjid, ticker marquee, sistem tema `?tema=` dipertahankan. Data
  tetap asli dari `/api/board` (kas kosong → `Rp —`, QRIS null →
  empty state). Slide kajian + petugas Jumat DIKEMBALIKAN 23 Nov 2026
  21:15 WIB (commit 9cd4af6b, terverifikasi live): strip full-width
  antara kolom utama dan ticker, rotasi 9 detik + dot; `/api/board`
  kini memuat `petugas_jumat` (Jumat terdekat, khutbah = Dzuhur di
  tanggal itu); kajian tampil hanya bila ada yang tayang, petugas
  kosong tampil "Belum ada petugas Jumat". Slide poster pengumuman
  tetap tidak ada (pengumuman di ticker marquee).
- Board: ROLLBACK ke vanilla 23 Nov 2026 21:32 WIB (head c97bbe5f,
  terverifikasi live) — redesign React DIBATALKAN atas permintaan
  founder; `public/index.html` vanilla + config lama dipulihkan dari
  commit 79421873, 16 file React dihapus dari repo. Board kembali
  statis + fallback CSS WebView lama (STB Android 6 bisa lagi);
  `petugas_jumat` di API ikut kembali ke versi lama (tidak ada di
  payload — slide petugas Jumat tampil kosong seperti sebelumnya).
  History redesign tetap tersimpan (e7551d02, 9cd4af6b).
- Board: DESAIN VANILLA ikut mockup hijau-emas 24 Nov 2026 21:17 WIB
  (commit e25a7722, terverifikasi live) — pola geometris Islami halus
  di header + kartu countdown, bingkai lengkung mihrab di countdown,
  ornamen emas di bawah nama masjid, strip status jadi 3 pil (mode,
  murotal, koneksi), baris sholat berikutnya + Total Saldo lebih
  menonjol. Angka kas/QRIS mockup TIDAK dipakai (kas tetap `Rp —`).
  Perbaikan lanjutan 21:25 WIB (commit 110f0d60, terverifikasi live):
  teks baris sholat berikutnya putih terang di tema gelap (sebelumnya
  emas pucat di atas wash emas, terbaca redup). 4 tema + fallback CSS
  WebView lama tetap utuh; dot slide hanya indikator (tidak bisa
  diklik), rotasi 9 detik dan berhenti saat mode sholat.
- Kiosk APK sendiri (Mihrab Kiosk v1.0.0, 24 Nov 2026): app Android
  (Kotlin, minSdk 23) untuk STB — autostart + Home, fullscreen,
  config URL dari HP + perintah remote via Supabase (migrasi 004:
  kiosk_config/kiosk_status/kiosk_commands), watchdog, offline cache,
  auto refresh, branding COSMICLABS; tanpa lisensi per perangkat.
  APK release terverifikasi (apksigner VERIFIED, 630 KB, package
  id.cosmiclabs.mihrabkiosk); source di `kiosk-app/`; keystore hanya
  lokal (tidak di repo). Uji di STB masih menunggu.
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
  400. PUT edit pengumuman selesai (lihat di bawah). Data uji dibersihkan
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
- Login Admin khusus selesai + terverifikasi live 22 Nov 2026
  23:02–23:18 WIB: pilih nama pengurus + PIN 6 digit (hash scrypt,
  bukan teks), sesi HMAC 12 jam via cookie httpOnly, kunci 15 menit
  setelah 5 PIN salah, Ganti PIN sendiri + Reset PIN oleh ketua. Peran
  ikut matriks spek: ketua semua layar; bendahara Beranda/Jadwal/Kas/
  Arsip/Board; marbot Beranda/Jadwal/Board saja. Semua endpoint Admin
  wajib login; log tercatat atas nama pengurus yang login. Migrasi 002
  diterapkan (kolom pin_hash, pin_salt, pin_gagal, pin_terkunci_sampai);
  ADMIN_SESSION_SECRET sudah diset di Vercel (Production + Preview).
  PIN awal 3 pengurus terpasang (diserahkan ke founder 22 Nov 2026
  untuk dibagikan; ketua bisa reset PIN dari layar Pengurus). Login
  Vercel (SSO) DIMATIKAN 22 Nov 2026 23:19 WIB setelah login baru
  terverifikasi — Admin kini publik dengan login PIN sebagai satu-satunya
  penjaga. Dua cacat UI ditemukan saat verifikasi pertama dan sudah
  diperbaiki + diverifikasi ulang: dashboard sempat berkedip sebelum
  login, dan error PIN salah sempat muncul terlambat di Beranda.
  Deploy pertama (commit e5cfacc0) GAGAL karena batas 12 function di paket
  Hobby Vercel (18 file api/) — diperbaiki dengan menggabungkan
  endpoint jadi 11 function (dispatcher api/auth.js + api/pengumuman/
  [id]/aksi.js + rewrite di vercel.json), tanpa mengubah URL maupun
  peran. Jangan tambah file api/ baru tanpa menggabungkan.
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
  Backend webhook + intake + status + notifikasi SELESAI 25 Nov 2026
  (service Vercel baru `mihrab-connect-whatsapp`, root
  `vercel-whatsapp`, commit bc1855e7, deploy READY, webhook
  https://mihrab-connect-whatsapp-0xs-projects-798a67b4.vercel.app/api/whatsapp
  — fail-closed terverifikasi live: verify 403, webhook 403,
  notifikasi 503). BELUM BISA dipakai end-to-end: nomor HP baru
  khusus masjid BELUM ADA (per 22 Nov 2026 21:30 WIB), akun Meta
  Business + kartu pembayaran belum ada, dan env
  `SUPABASE_SERVICE_ROLE_KEY` belum disalin ke proyek baru (nilai
  tidak bisa dibaca lewat tool — salin manual dari proyek Admin,
  lihat `vercel-whatsapp/README.md`). Perhatian saat beli SIM:
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
- Menunggu / belum dikerjakan: instalasi TV
  Board di Masjid Al Furqon (masjid setuju pasang, belum tercatat
  terpasang; rencana perangkat: STB ZTE B860H v2.1 sudah unlock
  (RAM belum diketahui; analisis 23 Nov 2026: layak, fallback CSS
  WebView lama sudah kembali lewat rollback 23 Nov; keputusan 24 Nov
  2026: tanpa kiosk — browser bawaan + app pinning, Board dibuka
  manual setelah restart/mati lampu; panduan instalasi PDF 5 halaman
  selesai 24 Nov 2026); celah bukti validasi (satu contoh insiden tercatat,
  lingkari LOLOS PILOT di formulir, tanggal tanda tangan Sarino,
  fitur paling dibutuhkan + keberatan terbesar).
- Selesai 23 Nov 2026: login Admin per pengurus terverifikasi live
  22 Nov 23:02–23:18 WIB + SSO Vercel Admin dimatikan 22 Nov 23:19 WIB;
  RLS diperketat 23 Nov 12:46 WIB (migrasi 003: hapus policy starter,
  authenticated hanya SELECT konten publik, pengurus/kas/log/arsip
  ditolak penuh untuk akses langsung; Admin/Board tidak berubah
  karena memakai service_role).
