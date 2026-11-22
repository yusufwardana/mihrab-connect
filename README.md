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
| `frontend/masjid-board.html` | Export landing page Masjid Board v2, satu file (gambar inline; font masih dari Google, fallback bila offline). |
| `frontend/mihrab-connect-board.html` | Export prototipe Board P0, satu file mandiri penuh (font & gambar inline, tanpa dependensi eksternal). |

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
- Branding final menunggu penilaian konsultan KI.
- Stack Admin dikunci 22 Nov 2026: Vercel + Supabase (tier gratis),
  hosting ikut Vercel.
- Keputusan terbuka: penyedia WhatsApp, brand final.
