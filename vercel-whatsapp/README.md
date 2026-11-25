# Mihrab Connect WhatsApp — webhook Meta Cloud API + intake + status + notifikasi

Service Vercel terpisah dari Admin (Admin sudah 11/12 Serverless Function,
jangan tambah beban di sana). Satu Serverless Function: `api/whatsapp.js`
(dispatcher). Tanpa framework, dependensi hanya `@supabase/supabase-js`.

## Cara kerja

1. Meta mengirim event webhook ke `POST /api/whatsapp`. Service memverifikasi
   `X-Hub-Signature-256` = HMAC-SHA256(raw body, `META_APP_SECRET`) dengan
   `timingSafeEqual` sebelum memproses apa pun. Event non-pesan (statuses /
   delivery) dan pesan dari nomor bisnis sendiri diabaikan.
2. Nomor pengirim dinormalisasi (62 → 0) lalu dicocokkan ke `pengurus` dengan
   `whatsapp_terdaftar = true`. Nomor tidak terdaftar → ditolak, tidak
   disimpan, penolakan dicatat di `log_aktivitas`.
3. **Keputusan founder 22 Nov 2026 (mengalahkan spek §4.3): SEMUA kiriman
   masuk status `menunggu`, ketua menyetujui dari dashboard.** Auto-tayang
   bila pengirim ketua TIDAK berlaku — ketiga pengurus berbagi satu nomor
   (089876543210), jadi peran pengirim tidak bisa dibedakan dari nomor.
   Karena itu `pengirim_id` diisi `null` untuk kiriman WhatsApp dan nomor
   mentah + nama-nama yang berbagi nomor dicatat di log.
4. Klasifikasi kiriman (berurutan):
   - Perintah kas (heuristik: kata kerja pencatatan + kata kas, atau jumlah
     uang + kata kas) → **ditolak**, penolakan dicatat, dibalas bahwa kas
     hanya dari dashboard. Pengumuman biasa yang menyebut infaq tanpa
     jumlah/perintah bukan perintah kas — masuk antrean normal dan tetap
     ditinjau ketua.
   - `stop / matikan / berhenti murotal` → `murotal_settings.aktif = false`
     + log + balasan. Lihat keterbatasan di bawah.
   - `cek status` / `status` → balas status kiriman WhatsApp terakhir
     masjid ini (nomor bersama: status per-orang tidak bisa dibedakan).
   - Berita duka (duka/meninggal/wafat/innalillahi) → jenis `Berita Duka`,
     tetap menunggu.
   - Update jadwal dadakan (khatib/imam/muadzin/jadwal/petugas) → jenis
     `Jadwal`, tetap menunggu. `jadwal_petugas` TIDAK diubah otomatis.
   - Teks biasa → jenis `Pengumuman`, menunggu. Foto + caption → caption
     jadi `isi`; foto tanpa caption → isi `[Foto WhatsApp — tanpa caption]`.
     Tipe lain (audio, video, dokumen, stiker, lokasi) → ditolak sopan.
5. Meta me-retry webhook bila respons bukan 2xx: dedup memakai `wamid`
   yang tercatat di `log_aktivitas` (10 log intake terakhir) supaya tidak
   insert ganda.
6. Balasan WhatsApp dikirim via Graph API v21.0. Bila kredensial Meta belum
   diatur, kiriman tetap disimpan dan log tetap ditulis — hanya balasannya
   yang batal (tidak pernah berpura-pura terkirim).

## Endpoint

| Kontrak spek | URL nyata | Keterangan |
| --- | --- | --- |
| GET verifikasi webhook | `GET /api/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...` | Cocokkan `META_VERIFY_TOKEN`; cocok → kembalikan `hub.challenge` teks polos. Env belum diset → 403. |
| POST /whatsapp/kiriman | `POST /api/whatsapp` atau `POST /whatsapp/kiriman` | Event webhook Meta (signature wajib). 200 `{ diterima, diproses, ditolak, duplikat }` (`duplikat` = pesan yang sudah pernah diproses, dilewati tanpa insert ganda). |
| GET /whatsapp/status/{id} | `GET /api/whatsapp?aksi=status&id=...` atau `GET /whatsapp/status/:id` | `{ id, status, jenis, judul, dibuat }`. 404 bila bukan milik masjid ini. |
| POST /whatsapp/notifikasi | `POST /api/whatsapp?aksi=notifikasi` atau `POST /whatsapp/notifikasi` | Header `x-internal-secret` wajib. Body `{ to, pesan }` atau `{ pengumuman_id, pesan }`. |

## Env var

| Var | Status | Dari mana |
| --- | --- | --- |
| `SUPABASE_URL` | Diatur (disalin dari proyek Admin) | Proyek Supabase yang sama (`mihrab-connect`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Diatur (disalin dari proyek Admin) | Proyek Supabase yang sama — JANGAN pernah tulis nilainya di file/chat |
| `META_VERIFY_TOKEN` | **BELUM ADA** | Dibuat sendiri (string acak) saat mendaftarkan webhook di Meta Developer Console → App → WhatsApp → Configuration → Webhook → Verify token |
| `META_APP_SECRET` | **BELUM ADA** | Meta Developer Console → App → Settings → Basic → App Secret |
| `META_ACCESS_TOKEN` | **BELUM ADA** | Meta Developer Console → App → WhatsApp → API Setup → Temporary access token (24 jam, untuk uji) atau System User + token permanen (untuk produksi) |
| `WHATSAPP_PHONE_NUMBER_ID` | **BELUM ADA** | Meta Developer Console → App → WhatsApp → API Setup → Phone number ID |
| `WHATSAPP_INTERNAL_SECRET` | **BELUM ADA** | Dibuat sendiri (string acak) — dipakai Admin saat memanggil notifikasi; harus sama di kedua proyek |

Yang BELUM ADA semuanya menunggu user: (1) nomor HP baru khusus masjid yang
BELUM PERNAH didaftarkan di aplikasi WhatsApp, (2) akun Meta Business
(gratis), (3) kartu pembayaran untuk tagihan Meta. Tanpa ketiganya, service
tetap jalan tapi fail-closed: verify → 403, webhook → 403/401, notifikasi →
503, dan balasan WhatsApp batal (kiriman tetap tersimpan + log tetap jalan).

## Keterbatasan jujur

- **Foto tidak tersimpan sebagai poster.** Tabel `pengumuman` tidak punya
  kolom `poster_url` dan belum ada Storage bucket. Yang tersimpan: caption
  sebagai `isi` + media id di log. Bila poster mau tampil di Board, butuh
  migrasi (tambah `poster_url` di `pengumuman` + bucket Supabase Storage +
  unduh media dari Graph API).
- **Stop murotal = mati sampai dinyalakan lagi.** Schema punya
  `murotal_settings.aktif` tapi tidak punya kolom tanggal — perintah stop
  mematikan murotal tanpa jadwal nyala otomatis. Butuh migrasi bila mau
  "mati hari ini saja" (mis. tambah `nonaktif_sampai date`).
- **Pengingat H-7/H-1/H-0 TIDAK dibangun di sini** — itu P1 Event (butuh
  cron + endpoint pengingat terpisah).
- **Wiring notifikasi dari Admin saat ketua menyetujui BELUM dibangun.**
  Endpoint `POST /api/whatsapp?aksi=notifikasi` sudah siap dipanggil, tapi
  Admin belum memanggilnya saat setujui/tolak. Butuh: `WHATSAPP_INTERNAL_SECRET`
  juga diatur di proyek Admin + satu pemanggilan HTTP dari
  `vercel-admin/api/pengumuman/[id]/aksi.js`.
- **Nomor bersama.** Semua pengurus memakai satu nomor → `pengirim_id`
  null, cek status melaporkan kiriman terakhir masjid, dan notifikasi per
  `pengumuman_id` terkirim ke semua nomor pengurus terdaftar (di pilot hanya
  1 nomor). Bila tiap pengurus punya nomor sendiri, perilaku ini otomatis
  menjadi per-orang tanpa ubah kode.
- **Deteksi perintah kas itu heuristik** (kata kerja + kata kas, atau jumlah
  + kata kas). Pesan yang lolos heuristik tapi ternyata perintah kas tetap
  tertahan di antrean `menunggu` — ketua yang memutuskan di dashboard.

## Deploy (Vercel)

Proyek: `mihrab-connect-whatsapp`, team "0x's projects", git-linked ke
repo `yusufwardana/mihrab-connect`, root directory `vercel-whatsapp`.
Webhook URL (untuk didaftarkan di Meta): `https://<domain-proyek>/api/whatsapp`.

Langkah manual bila pembuatan proyek tidak lewat tool:
1. Vercel Dashboard → Add New → Project → Import `yusufwardana/mihrab-connect`.
2. Root Directory: `vercel-whatsapp`. Framework Preset: Other.
3. Environment Variables (Production + Preview): isi `SUPABASE_URL` dan
   `SUPABASE_SERVICE_ROLE_KEY` dengan nilai yang sama seperti di proyek
   `mihrab-connect-admin`. Env Meta JANGAN diisi dulu (belum ada).
4. Deploy. Cek `GET /api/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1`
   harus 403 (bukti fail-closed: `META_VERIFY_TOKEN` belum diatur).

## Uji lokal

```sh
npm install
npm run check   # node --check semua file api + lib + test
npm test        # uji fail-closed + intake end-to-end dengan Supabase
                # dan Graph API palsu (tanpa kredensial Meta sungguhan)
```

`scripts/uji-fail-closed.js` memakai stub `fetch` (Supabase palsu di memori
+ Graph API palsu) — tidak memanggil jaringan sungguhan.
