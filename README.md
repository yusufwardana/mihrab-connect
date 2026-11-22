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

| Produk | Peran |
| --- | --- |
| Mihrab Connect Board | Papan informasi digital. Produk pertama. Fokus repo ini. |
| Mihrab Connect Admin | Dashboard pengelolaan. |
| Mihrab Connect Finance | Keuangan dan kas. |
| Mihrab Connect Community | Jamaah dan komunikasi. |
| Mihrab Connect Event | Kajian dan kegiatan. |
| Mihrab Connect Archive | Arsip dan dokumentasi. |

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
| `docs/supabase-schema.sql` | Skema Supabase (Postgres) dari spek backend — 14 tabel, RLS starter, data contoh. |
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
  env `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` terpasang. Verifikasi
  live: 6 endpoint GET 200 dari data nyata, POST kas Rp1.000 (uji)
  tercatat + masuk log. Perlu login Vercel untuk membuka (Vercel
  Authentication aktif). Migrasi `kas_kategori.created_at` diterapkan
  22 Nov 2026 (API butuh kolom itu untuk urutan). Layar Jadwal kini
  punya tombol Simpan + form Tambah petugas (commit 2b52960e,
  terverifikasi live 22 Nov 2026 18:53–18:56 WIB; petugas tes sudah
  dihapus lagi, pengaturan tidak berubah).
- Board live di Vercel 22 Nov 2026: proyek `mihrab-connect-board`
  (team 0x's projects, git-linked ke repo ini, root `vercel-board`),
  https://mihrab-connect-board-0xs-projects-798a67b4.vercel.app —
  publik tanpa login (SSO protection dimatikan); data dari function
  `/api/board` sendiri di proyek itu (bukan dari domain Admin, karena
  Admin dilindungi login Vercel); panel simulasi dihapus, data dari
  Supabase, poll 60 detik. Koordinat contoh Jakarta sudah diisi agar
  jadwal tampil (ganti dengan koordinat Masjid Al Furqon saat pilot).
- Stack Admin dikunci 22 Nov 2026: Vercel + Supabase (tier gratis),
  hosting ikut Vercel.
- Keputusan terbuka: penyedia WhatsApp, brand final.
