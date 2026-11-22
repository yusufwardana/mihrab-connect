# Dokumen Scope — Produk Pertama Mihrab Connect Board

Papan informasi digital masjid.Layar TV-nya saja — menampilkan, bukan mengedit.

Brand induk — kandidat

**MIHRAB CONNECT** adalah kandidat brand induk. **Mihrab Connect Board** adalah produk pertamanya. Dokumen ini menetapkan ruang lingkup Board: apa yang masuk, apa yang tidak masuk, batas teknisnya, dan kapan scope ini dianggap selesai.

**Status brand: belum final.** Pemeriksaan ketersediaan merek di PDKI dan domain masih berjalan. Nama dasar “Mihrab” sudah ramai digunakan, dan **mihrabconnect.com sudah dipakai platform lain** — Mihrab Connect Scholar Networking Platform. Kata “Connect” belum otomatis membuat nama ini unik secara hukum. Dokumen ini tidak mengklaim brand sudah final atau terdaftar.

## 1 — Definisi

**Board adalah layar TV-nya saja.** Papan informasi digital masjid yang menampilkan konten di layar. Bukan tempat mengatur, bukan tempat mengedit, bukan tempat menyetujui.

Board hanya menampilkan konten yang **sudah disetujui**. Setiap perubahan — jadwal, pengumuman, kas, poster — dibuat dan disetujui di produk lain, lalu hasilnya tampil di Board.

Prinsip ini yang menjaga kendali tetap jelas: pengurus inti memegang persetujuan, Board memegang tayangan. Jamaah melihat informasi yang sudah melewati persetujuan, bukan draf.

Identitas visual yang menyertai produk ini mengikuti nuansa desain Masjid Board: **hijau gelap, emas lembut, dan putih hangat** — tenang, jelas dibaca dari jarak jauh, dan layak untuk ruang masjid.

Struktur Produk

## 2 — Posisi Board di dalam MIHRAB CONNECT

MIHRAB CONNECT dirancang sebagai rangkaian produk untuk satu masjid. Board tidak berdiri sendiri — ia adalah ujung tayang dari produk-produk di belakangnya.

| Produk | Peran |
| --- | --- |
| Mihrab Connect Board | Papan informasi digital. Produk pertama. Fokus dokumen ini. |
| Mihrab Connect Admin | Dashboard pengelolaan. |
| Mihrab Connect Finance | Keuangan dan kas. |
| Mihrab Connect Community | Jamaah dan komunikasi. |
| Mihrab Connect Event | Kajian dan kegiatan. |
| Mihrab Connect Archive | Arsip dan dokumentasi. |

******** Konsekuensinya tegas: bila sebuah fungsi membutuhkan input, pengaturan, atau persetujuan, fungsi itu **bukan** milik Board — sekalipun hasilnya nanti tampil di Board.

## 3 — Masuk scope Board

Berikut fungsi tayang yang masuk scope Board. Daftar ini tertutup: fungsi yang tidak tertulis di sini tidak dianggap bagian dari Board.

### 1. Jadwal sholat dan waktu

- **Jadwal sholat Kemenag** — dihitung dari koordinat masjid, dengan koreksi menit per waktu sholat.
- **Tanggal Masehi dan Hijriyah** — tampil besar dan jelas, terbaca dari jarak jauh.
- **Countdown iqomah** — timer per waktu sholat, berbeda untuk Subuh, Jumat, dan Tarawih.

### 2. Mode layar otomatis

- **Mode sholat** — layar meredup otomatis saat sholat, menampilkan pesan “rapatkan shaf” dan “senyapkan HP”.
- **Mode Jumat** — countdown iqomah mati, diganti slide khutbah dan jadwal petugas Jumat.

## 3 — Masuk scope Board (lanjutan)

### 3. Konten yang berotasi di layar

- **Running text** — teks berjalan untuk pengumuman singkat, himbauan, dan berita duka.
- **Slide poster** — rotasi poster kajian, PHBI, dan kegiatan masjid.
- **Slide kas ringkasan** — saldo per kategori dan total. Bukan detail transaksi.
- **Slide QRIS per kategori** — misalnya infaq umum, pembangunan, dan TPQ, sesuai kategori yang ditetapkan masjid.

### 4. Countdown hari besar

- **Countdown event hari besar** — Ramadan, Idul Fitri, Idul Adha, Maulid, Isra Mi’raj, dan 1 Muharram.
- **Event internal masjid** — event di luar hari besar di atas juga dapat tampil sebagai countdown, bila sudah ditetapkan dan disetujui.

Board menampilkan countdown-nya. Pembuatan poster countdown dan pengingatnya bukan pekerjaan Board — lihat Bagian 4.

### 5. Murotal otomatis

- **Auto-play 10 menit sebelum Maghrib dan Subuh** — mengikuti jadwal sholat masjid itu. Bila jadwal berubah, murotal ikut berubah.
- **Jumat sebelum Maghrib: Al-Kahfi.**
- **Auto-fade ke adzan** — volume turun halus saat masuk adzan, lalu **berhenti saat iqomah**. Tidak tabrakan, tidak perlu menekan tombol stop.

**Aturan tayang:** Board hanya menampilkan konten yang sudah disetujui. Konten yang masih berstatus draf atau menunggu persetujuan tidak tampil di Board.

Di Luar Board

## 4 — Tidak masuk scope Board

Fungsi berikut **tidak** dibangun di Board. Masing-masing adalah ranah produk lain, sekalipun hasil akhirnya terlihat di layar Board.

| Fungsi | Ranah |
| --- | --- |
| Pengaturan jadwal — metode Kemenag, koreksi menit, offset Hijriyah, durasi iqomah | Admin |
| Manajemen pengurus dan peran | Admin |
| Persetujuan kiriman WhatsApp | Admin |
| Input kas | Finance |
| Pengingat WhatsApp H-7, H-1, dan H-0 untuk event | Event |
| Pembuatan poster countdown event | Event |
| Arsip tayangan | Archive |
| Log aktivitas | Archive |

**** **** **** **** **** **** **** **** Pemisahan ini disengaja. Board yang bisa mengedit akan mengaburkan siapa yang bertanggung jawab atas isi layar. Dengan pemisahan ini, setiap perubahan punya tempat, penanggung jawab, dan jejak persetujuannya sendiri.

## 5 — Batas teknis & aturan yang berlaku

- **Jadwal tetap jalan offline.** Jadwal sholat yang sudah terhitung tetap tampil walau koneksi terputus.
- **Murotal ter-cache.** File murotal tersimpan di perangkat, sehingga tetap dapat diputar walau WiFi putus.
- **Konten baru tetap butuh internet.** Poster, pengumuman, dan pembaruan lain yang baru dibuat tidak akan sampai ke Board tanpa koneksi.
- **Tidak ada klaim “tanpa internet” untuk semua fitur.** Klaim offline hanya berlaku untuk jadwal dan murotal ter-cache di atas.
- **Tidak ada edit kas dari WhatsApp.** Kas hanya diatur melalui jalur yang dapat diaudit. Board hanya menampilkan ringkasannya.

Kriteria Selesai

## 6 — Kriteria selesai

Scope Board dianggap selesai bila seluruh daftar periksa berikut **lolos saat diuji langsung di TV**. Satu butir gagal berarti scope belum selesai.

- **Jadwal tampil benar** — jadwal sholat Kemenag sesuai koordinat masjid dan koreksi menit yang ditetapkan, lengkap dengan tanggal Masehi dan Hijriyah.
- **Countdown berjalan** — countdown iqomah berjalan per waktu sholat, dengan durasi yang berbeda untuk Subuh, Jumat, dan Tarawih sebagaimana ditetapkan.
- **Mode berganti otomatis** — mode sholat meredupkan layar dengan pesan “rapatkan shaf” dan “senyapkan HP”; mode Jumat mematikan countdown iqomah dan menggantinya dengan slide khutbah dan jadwal petugas Jumat — tanpa campur tangan manual.
- **Running text dan slide berotasi** — running text berjalan, dan slide poster, kas ringkasan, serta QRIS per kategori berotasi sebagaimana dijadwalkan.
- **Countdown hari besar tampil** — countdown untuk hari besar dan event internal yang ditetapkan tampil dengan tanggal yang benar.
- **Murotal nyala dan fade tepat waktu** — murotal mulai 10 menit sebelum Maghrib dan Subuh (Jumat sebelum Maghrib: Al-Kahfi), memudar saat adzan, dan berhenti saat iqomah.
- **Board tidak bisa dipakai mengedit** — tidak ada jalan dari Board untuk mengubah jadwal, menyetujui kiriman, atau menginput dan mengedit kas.

**Keputusan scope:** Bangun Board hanya untuk fungsi tayang di Bagian 3. Setiap permintaan di luar daftar itu diarahkan ke produk pemiliknya di Bagian 4, bukan ditambahkan ke Board.

### Langkah berikutnya di luar dokumen ini

Branding final menunggu hasil pemeriksaan merek di PDKI dan domain. Selama pemeriksaan itu belum selesai, nama MIHRAB CONNECT dipakai sebagai kandidat — bukan sebagai nama final, bukan sebagai merek terdaftar.

Sumber scope: dokumen Fitur Utama dan USP Masjid Board (prioritas P0), struktur produk MIHRAB CONNECT, dan draf ruang lingkup Board yang dibahas dalam percakapan ini. Dokumen ini tidak memuat harga, kontak, testimoni, atau fitur di luar sumber tersebut.
