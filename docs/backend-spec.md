# Dokumen teknis - untuk developer backend MIHRAB CONNECT

Spesifikasi Backend Kontrak antara Board dan produk-produk di belakangnya: model data, alur persetujuan, endpoint, izin, dan perilaku offline. Board adalah klien baca-saja - semua penulisan terjadi di Admin, Finance, Event, Community, dan Archive.

| Produk pertama | Mihrab Connect Board (papan informasi digital TV) |
| --- | --- |
| Brand | MIHRAB CONNECT - kandidat brand induk, belum final; pemeriksaan PDKI dan domain masih berjalan |
| Acuan | Dokumen scope Board, dokumen fitur & USP Masjid Board, konsep brand, dan perilaku prototipe Board P0 |
| Status stack | Belum diputuskan - lihat Bagian 8, Keputusan terbuka |

**** **** **** **** **Cara memakai dokumen ini.** Bagian 1 menetapkan batas yang tidak boleh dilanggar implementasi. Bagian 2-5 adalah kontrak yang dibangun. Bagian 6-7 adalah perilaku dan daftar negatif yang diuji saat penerimaan. Bagian 8 memisahkan prioritas bangun dari keputusan yang masih terbuka.

## **Prinsip yang mengikat seluruh dokumen:** dashboard adalah sumber kebenaran, WhatsApp adalah jalan pintas, Board hanya menampilkan konten yang sudah disetujui. Konten berstatus draft atau menunggu persetujuan tidak pernah tampil di Board. MIHRAB CONNECT - Spesifikasi Backend1 Bagian 1 Gambaran sistem & batas

MIHRAB CONNECT adalah rangkaian produk untuk satu masjid, dengan akun atas nama lembaga (DKM atau yayasan), bukan atas nama pribadi pengurus. Board adalah ujung tayangnya. Backend melayani semua produk lain dan menjadi satu-satunya tempat data ditulis, disetujui, dan diarsipkan.

### Pemetaan fungsi ke pemiliknya

| Produk | Peran | Yang dimiliki backend untuk produk ini |
| --- | --- | --- |
| Board | Papan informasi digital di TV | Endpoint baca saja. Tidak ada endpoint tulis, edit, persetujuan, atau input kas yang dapat dipanggil Board. |
| Admin | Dashboard pengelolaan | Profil masjid, pengaturan jadwal, manajemen pengurus & peran, persetujuan kiriman WhatsApp, manajemen nomor WhatsApp. |
| Finance | Keuangan dan kas | Input pemasukan & pengeluaran per kategori dana, laporan Jumat & bulanan, QRIS per kategori, ringkasan kas untuk Board. |
| Event | Kajian dan kegiatan | Kajian/kegiatan, event & countdown hari besar, poster countdown, pengingat WhatsApp H-7, H-1, H-0, mode papan khusus event. |
| Community | Jamaah dan komunikasi | Ranah komunikasi jamaah. Pada dokumen sumber, fungsi jamaah yang sudah dirinci adalah kiriman dan notifikasi lewat WhatsApp (Bagian 3); fungsi Community lain belum dirinci dan tidak ditambahkan di sini. |
| Archive | Arsip dan dokumentasi | Arsip pengumuman, jadwal petugas, ringkasan kas, dan event yang pernah tayang; log aktivitas; serah terima. |

### **** **** **** **** **** **** Apa yang ditampilkan Board (kontrak baca)

- Jadwal sholat Kemenag dari koordinat masjid, tanggal Masehi dan Hijriyah, countdown iqomah.
- Mode layar otomatis: mode sholat dan mode Jumat.
- Running text; slide poster; slide kas ringkasan (saldo per kategori dan total, bukan detail transaksi); slide QRIS per kategori.
- Countdown hari besar dan event internal yang sudah ditetapkan dan disetujui.
- Status dan pengaturan murotal otomatis (auto-play 10 menit sebelum Maghrib dan Subuh).
- Logo dan foto masjid sebagai latar.

## **Aturan tayang.** Board hanya menerima konten berstatus tayang. Backend tidak boleh mengirim konten berstatus draft, menunggu persetujuan, atau selesai ke endpoint Board. MIHRAB CONNECT - Spesifikasi Backend2 Bagian 2 - Model data (1 dari 3) Model data per entitas

Field di bawah ini hanya field yang disebut dokumen sumber. Tipe data dan nama kolom fisik diserahkan ke implementasi, selama makna dan batasnya sama. Setiap entitas yang berubah lewat dashboard atau WhatsApp wajib tercatat di log aktivitas.

### 2.1 Lembaga & profil masjid

| Entitas / field | Keterangan |
| --- | --- |
| lembaga | Akun utama atas nama DKM atau yayasan. Semua data melekat pada entitas ini, bukan pada pengurus. |
| profil_masjid.nama | Nama masjid. |
| profil_masjid.alamat | Alamat masjid. |
| profil_masjid.koordinat | Titik koordinat; dasar perhitungan jadwal sholat Kemenag. |
| profil_masjid.logo | Logo masjid untuk Board. |
| profil_masjid.foto | Foto masjid; dapat menjadi latar Board. |
| profil_masjid.kontak_lembaga | Kontak resmi lembaga. |

### 2.2 Pengurus & peran

| Entitas / field | Keterangan |
| --- | --- |
| pengurus.nama | Nama pengurus. |
| pengurus.peran | Salah satu dari: ketua, bendahara, marbot, pengawas. |
| pengurus.nomor_whatsapp | Nomor yang didaftarkan di dashboard sebagai nomor yang boleh mengirim ke Board. |
| pengurus.butuh_persetujuan | Apakah kiriman pengurus ini wajib persetujuan ketua. Kiriman ketua dapat auto-tayang. |
| pengurus.aktif | Tambah pengurus baru dan nonaktifkan pengurus lama tanpa memindah atau memigrasi data. |

Hak ringkas per peran: ketua menyetujui, bendahara mencatat, marbot mengirim, pengawas hanya melihat. Matriks lengkap ada di Bagian 5.

### 2.3 Pengaturan jadwal sholat

| Field | Keterangan |
| --- | --- |
| metode | Metode Kemenag. |
| koreksi_menit | Koreksi menit per waktu sholat. |
| offset_hijriyah | Penyesuaian tanggal Hijriyah. |
| durasi_iqomah | Durasi iqomah per waktu sholat; berbeda untuk Subuh, Jumat, dan Tarawih. |

## MIHRAB CONNECT - Spesifikasi Backend3 Bagian 2 - Model data (2 dari 3) Model data: jadwal, konten, kas

### 2.4 Jadwal petugas

| Field | Keterangan |
| --- | --- |
| jenis | imam, muadzin, khatib_jumat, atau piket. |
| nama_petugas | Nama petugas yang dijadwalkan. |
| waktu / tanggal | Waktu atau tanggal bertugas. Jadwal petugas Jumat tampil di Board pada mode Jumat. |

### 2.5 Kajian & kegiatan

| Field | Keterangan |
| --- | --- |
| judul | Nama kajian atau kegiatan. |
| pola | Sekali, atau berulang: harian, mingguan, bulanan. |
| jadwal | Hari, tanggal, dan jam pelaksanaan sesuai polanya. |

### 2.6 Pengumuman

| Field | Keterangan |
| --- | --- |
| jenis | Slide pengumuman, running text, poster (foto + caption), atau berita duka. Berita duka berformat khusus dan berprioritas tampil. |
| isi | Teks pengumuman, atau foto beserta caption untuk poster. |
| status | draft -> menunggu_persetujuan -> tayang -> selesai. Hanya tayang yang dikirim ke Board. |
| sumber | dashboard atau whatsapp, beserta pengurus pengirimnya. |
| jadwal_tayang | Pengumuman dapat dibuat, dijadwalkan, diedit, dan diarsipkan dari dashboard. |

### 2.7 Kas & QRIS

| Entitas / field | Keterangan |
| --- | --- |
| transaksi_kas.jenis | pemasukan atau pengeluaran. Input sederhana, hanya dari dashboard. |
| transaksi_kas.kategori_dana | Kategori dana; pemasukan dan pengeluaran dipisah per kategori. |
| laporan_kas | Laporan otomatis per Jumat dan per bulan, diturunkan dari transaksi. Board hanya menerima ringkasannya: saldo per kategori dan total. |
| qris.kategori | QRIS per kategori, misalnya infaq umum, pembangunan, dan TPQ, sesuai kategori yang ditetapkan masjid. |
| qris.kode | Kode QRIS yang ditampilkan pada slide QRIS kategori tersebut. |

## MIHRAB CONNECT - Spesifikasi Backend4 Bagian 2 - Model data (3 dari 3) Model data: event, murotal, arsip

### 2.8 Event & countdown

| Field | Keterangan |
| --- | --- |
| nama | Hari besar - Ramadan, Idul Fitri, Idul Adha, Maulid, Isra Mi'raj, 1 Muharram - atau event internal seperti kajian akbar dan bakti sosial. |
| tanggal | Tanggal event; dasar hitung mundur di Board. |
| poster_countdown | Poster hasil pilihan event + template dari dashboard, menjadi slide countdown di Board. |
| pengingat | Pengingat WhatsApp otomatis H-7, H-1, dan H-0 ke grup pengurus (ranah Event). |
| mode_khusus | Mode papan khusus event, misalnya H-30 Ramadan (jadwal tarawih, target infaq, jadwal kajian) dan H-7 Idul Adha (jumlah hewan qurban, jadwal penyembelihan, jadwal distribusi). |

Setelah event selesai, event otomatis masuk arsip dan dapat diduplikasi untuk tahun berikutnya.

### 2.9 Pengaturan murotal

| Field | Keterangan |
| --- | --- |
| surah | Surah yang diputar. Aturan momen dari sumber: Jumat sebelum Maghrib otomatis Al-Kahfi; Subuh dapat Ar-Rahman atau pilihan qari masjid. |
| qari | Qari pilihan masjid. |
| durasi | Durasi putar. Pemicu dasarnya: mulai 10 menit sebelum Maghrib dan 10 menit sebelum Subuh. |
| volume | Volume putar; turun halus (auto-fade) saat masuk adzan dan berhenti saat iqomah. |
| file_cache | File murotal tersimpan di perangkat Board agar tetap jalan walau WiFi putus. |

### 2.10 Arsip, log aktivitas, serah terima

| Entitas / field | Keterangan |
| --- | --- |
| arsip | Semua pengumuman, jadwal petugas, dan ringkasan kas yang pernah tayang, tersimpan dan dapat dicari lagi. Termasuk arsip event. |
| log_aktivitas.siapa | Pengurus yang melakukan perubahan. |
| log_aktivitas.kapan | Waktu perubahan. |
| log_aktivitas.dari_mana | dashboard atau whatsapp. |
| log_aktivitas.apa | Apa yang diubah. |
| serah_terima | Catatan serah terima berisi saldo akhir, daftar pengurus baru, dan berita acara yang dapat diunduh. |

## MIHRAB CONNECT - Spesifikasi Backend5 Bagian 3 Alur persetujuan: WhatsApp ke tayang

WhatsApp adalah jalan pintas pengurus lapangan, bukan sumber kebenaran. Setiap kiriman masuk sebagai draft atau antrean, melewati persetujuan, dan baru tampil setelah berstatus tayang.

### Langkah alur

- **Kiriman masuk.** Pengurus mengirim dari nomor WhatsApp-nya: foto + caption (menjadi draft slide poster), teks (menjadi running text atau slide pengumuman), berita duka (format khusus, prioritas tampil), update jadwal dadakan (misalnya khatib Jumat berganti), perintah berhenti murotal hari ini, atau pertanyaan cek status tayang.
- **Pemeriksaan nomor.** Backend mencocokkan nomor pengirim dengan daftar pengurus terdaftar di dashboard. Nomor tidak terdaftar ditolak dan tidak membuat draft apa pun.
- **Masuk draft / antrean.** Kiriman yang sah menjadi pengumuman atau perubahan berstatus draft, lalu menunggu_persetujuan. Kiriman ini belum tampil di Board.
- **Persetujuan ketua.** Ketua meninjau di dashboard dan menyetujui atau menolak. Kiriman marbot wajib melewati langkah ini.
- **Auto-tayang untuk ketua.** Kiriman dari ketua sendiri dapat langsung berstatus tayang tanpa antrean, sesuai pengaturan butuh_persetujuan per pengurus.
- **Tayang di Board.** Konten berstatus tayang tersedia untuk endpoint Board pada sinkronisasi berikutnya.
- **Notifikasi balik.** WhatsApp memberi tahu pengirim bahwa pengumumannya sudah tampil di TV atau masih menunggu persetujuan. Pengirim juga dapat mengecek status tayang lewat WhatsApp.
- **Tercatat.** Seluruh langkah tercatat di log aktivitas: siapa, kapan, dari WhatsApp atau dashboard, dan apa yang diubah. Setelah selesai tayang, konten masuk arsip.
### **Batas keras alur ini.** Kas tidak dapat dibuat atau diubah dari WhatsApp dalam bentuk apa pun - tidak ada pengecualian pada alur ini. Perintah WhatsApp yang menyentuh kas harus ditolak dan penolakannya tercatat di log. Status pengumuman sebagai mesin keadaan

| Dari | Ke | Pemicu |
| --- | --- | --- |
| (baru) | draft | Dibuat di dashboard, atau kiriman WhatsApp yang nomornya terdaftar |
| draft | menunggu_persetujuan | Diajukan untuk tayang (kiriman marbot otomatis masuk keadaan ini) |
| menunggu_persetujuan | tayang | Persetujuan ketua di dashboard |
| (baru, oleh ketua) | tayang | Kiriman ketua dengan auto-tayang |
| tayang | selesai | Masa tayang berakhir atau diakhiri dari dashboard; konten berpindah ke arsip |

## MIHRAB CONNECT - Spesifikasi Backend6 Bagian 4 - Endpoint API (1 dari 2) Endpoint API per kelompok

Nama endpoint dan data masuk/keluar di bawah ini adalah kontraknya. Format transport, bahasa, dan framework tidak ditetapkan di dokumen ini (Bagian 8). Semua endpoint tulis wajib menulis log aktivitas.

### 4.1 Board - baca saja

| Endpoint | Keluar (ke Board) |
| --- | --- |
| GET /board/paket-tayang | Satu paket tayang terkini: profil masjid (nama, logo, foto), pengaturan jadwal, pengumuman berstatus tayang, ringkasan kas, QRIS per kategori, event & countdown aktif, pengaturan murotal. Dipakai Board untuk sinkronisasi dan cache. |
| GET /board/jadwal-sholat | Jadwal hasil metode Kemenag dari koordinat masjid, koreksi menit, offset Hijriyah, dan durasi iqomah per waktu. |
| GET /board/murotal | Pengaturan murotal (surah, qari, durasi, volume) dan rujukan file untuk di-cache di perangkat. |

Tidak ada endpoint POST, PUT, atau DELETE pada kelompok Board.

### 4.2 Admin - kelola & persetujuan

| Endpoint | Masuk -> keluar |
| --- | --- |
| GET/PUT /admin/profil-masjid | Nama, alamat, koordinat, logo, foto, kontak lembaga. |
| GET/POST /admin/pengurus | Tambah pengurus: nama, peran, nomor WhatsApp, butuh persetujuan. |
| PUT/DELETE /admin/pengurus/{id} | Ubah peran / nomor, atau nonaktifkan pengurus tanpa memindah data. |
| GET/PUT /admin/pengaturan-jadwal | Metode Kemenag, koreksi menit, offset Hijriyah, durasi iqomah. |
| GET/POST/PUT /admin/jadwal-petugas | Imam, muadzin, khatib Jumat, piket beserta waktunya. |
| GET/POST/PUT /admin/pengumuman | Buat, jadwalkan, edit pengumuman; status mengikuti mesin keadaan Bagian 3. |
| POST /admin/pengumuman/{id}/setujui | Persetujuan ketua: status menjadi tayang. |
| POST /admin/pengumuman/{id}/tolak | Penolakan ketua: kiriman tidak tayang, tetap tercatat. |
| GET/PUT /admin/pengaturan-murotal | Surah, qari, durasi, volume. |
| GET /admin/arsip dan GET /admin/log-aktivitas | Pencarian arsip tayangan dan log (siapa, kapan, dari mana, apa). |
| POST /admin/serah-terima | Menghasilkan catatan serah terima: saldo akhir, daftar pengurus baru, berita acara yang dapat diunduh. |

## MIHRAB CONNECT - Spesifikasi Backend7 Bagian 4 - Endpoint API (2 dari 2) Endpoint: WhatsApp, Finance, Event

### 4.3 WhatsApp intake

| Endpoint | Masuk -> keluar |
| --- | --- |
| POST /whatsapp/kiriman | Masuk: nomor pengirim + isi kiriman (foto + caption, teks, berita duka, update jadwal, perintah stop murotal, cek status). Keluar: ditolak bila nomor tidak terdaftar; diterima sebagai draft / antrean persetujuan bila terdaftar; auto-tayang bila pengirim ketua. |
| GET /whatsapp/status/{id} | Status kiriman untuk cek status tayang oleh pengirim: menunggu persetujuan atau sudah tayang. |
| POST /whatsapp/notifikasi | Notifikasi balik ke pengirim: pengumuman sudah tampil di TV atau masih menunggu persetujuan. |

Bentuk integrasi WhatsApp (penyedia dan mekanismenya) adalah keputusan terbuka - Bagian 8. Kontrak di atas hanya menetapkan perilaku, bukan penyedianya.

### 4.4 Finance

| Endpoint | Masuk -> keluar |
| --- | --- |
| GET/POST /finance/transaksi | Input pemasukan / pengeluaran per kategori dana. Dashboard saja. |
| GET /finance/laporan | Laporan per Jumat dan per bulan dari transaksi yang tercatat. |
| GET /finance/ringkasan | Saldo per kategori dan total - satu-satunya bentuk kas yang boleh dikirim ke Board. |
| GET/POST/PUT /finance/qris | QRIS per kategori (misalnya infaq umum, pembangunan, TPQ). |

### 4.5 Event

| Endpoint | Masuk -> keluar |
| --- | --- |
| GET/POST/PUT /event/kajian | Kajian & kegiatan: sekali, harian, mingguan, bulanan. |
| GET/POST/PUT /event/hari-besar | Event & countdown: hari besar dan event internal, beserta tanggalnya. |
| POST /event/{id}/poster-countdown | Pilih event + template, menghasilkan slide countdown untuk Board. |
| POST /event/{id}/duplikasi | Duplikasi event dari arsip untuk tahun berikutnya. |
| (otomatis) pengingat H-7/H-1/H-0 | Pekerjaan terjadwal backend: mengirim pengingat WhatsApp ke grup pengurus pada H-7, H-1, dan H-0. |

## **Aturan lintas kelompok.** Endpoint Finance tidak menerima penulisan dari kanal WhatsApp. Endpoint Board tidak menerima penulisan dari kanal mana pun. Setiap penulisan dari Admin, Finance, dan Event tercatat di log Archive. MIHRAB CONNECT - Spesifikasi Backend8 Bagian 5 dan 6 Peran & matriks izin

| Kemampuan | Ketua | Bendahara | Marbot | Pengawas |
| --- | --- | --- | --- | --- |
| Menyetujui / menolak kiriman | Ya | Tidak | Tidak | Tidak |
| Kiriman auto-tayang | Ya | Tidak | Tidak | Tidak |
| Mengatur profil, jadwal, petugas, murotal | Ya | Tidak | Tidak | Tidak |
| Mengelola pengurus & nomor WhatsApp | Ya | Tidak | Tidak | Tidak |
| Mencatat kas (dashboard saja) | Ya | Ya | Tidak | Tidak |
| Mengirim kiriman WhatsApp | Ya | Bila nomor terdaftar | Ya | Tidak |
| Melihat arsip & log aktivitas | Ya | Ya | Tidak | Ya |
| Serah terima | Ya | Tidak | Tidak | Tidak |

Matriks ini menerjemahkan hak ringkas dari dokumen sumber - ketua menyetujui, bendahara mencatat, marbot mengirim, pengawas hanya melihat. Pengawas tidak menulis dalam bentuk apa pun.

## **Keputusan dikunci founder - 22 Nov 2026:** (1) Ketua **BOLEH** mencatat kas melalui dashboard, setara bendahara untuk pencatatan kas (dashboard saja, tidak lewat WhatsApp). (2) Bendahara **BOLEH** mengirim kiriman WhatsApp bila nomornya terdaftar, dengan kiriman tetap menunggu persetujuan ketua sebelum tayang. Perilaku offline

| Kondisi | Perilaku yang wajib dijaga |
| --- | --- |
| Jadwal sholat | Tetap jalan offline. Jadwal yang sudah terhitung dan tersalin di Board tetap tampil walau koneksi terputus. |
| Murotal | File ter-cache di perangkat, tetap dapat diputar walau WiFi putus, termasuk auto-play dan auto-fade-nya. |
| Konten baru | Butuh internet. Poster, pengumuman, dan pembaruan baru tidak sampai ke Board tanpa koneksi, dan tampil setelah sinkronisasi berikutnya. |
| Kiriman WhatsApp & persetujuan | Proses server: tanpa koneksi, kiriman tidak masuk antrean dan persetujuan tidak berjalan. Tidak ada janji offline untuk alur ini. |

## **Batas klaim.** Backend dan Board tidak boleh mengklaim "tanpa internet" untuk semua fitur. Klaim offline hanya berlaku untuk jadwal dan murotal ter-cache di atas. MIHRAB CONNECT - Spesifikasi Backend9 Bagian 7 dan 8 Hal yang sengaja tidak ada

Daftar negatif ini sama mengikatnya dengan daftar fitur. Menambahkannya berarti melanggar dokumen sumber, bukan memperkaya produk.

- **Tidak ada pengeditan dari Board.** Tidak ada jalan dari Board untuk mengubah jadwal, menyetujui kiriman, atau menginput dan mengedit kas.
- **Tidak ada edit kas dari WhatsApp**, agar kas tetap dapat diaudit. Kas hanya dari dashboard.
- **Tidak ada klaim "tanpa internet" untuk semua fitur.** Hanya jadwal dan murotal ter-cache yang offline.
- **Tidak ada klaim "paling akurat"** tanpa menyebut metode Kemenag dan koreksi menit.
- **Tidak ada klaim "gratis selamanya"** bila model bisnisnya membutuhkan langganan untuk bertahan.
- **Tidak ada aplikasi baru yang wajib diinstal marbot.** Kanal lapangan tetap WhatsApp yang sudah dipakai.
- **Tidak ada data milik pribadi pengurus.** Akun, data, dan arsip melekat pada lembaga; pergantian pengurus tidak memindahkan data.
- **Di luar P0, belum dibangun:** jaringan antar-masjid se-kecamatan, halaman publik masjid, dan notifikasi WhatsApp ke jamaah yang mengikuti masjid adalah prioritas P2 pada dokumen sumber, bukan bagian spesifikasi tahap ini.

## Prioritas bangun & keputusan terbuka

### Prioritas dari dokumen sumber

| Tahap | Isi |
| --- | --- |
| P0 | Jadwal Kemenag, countdown iqomah, mode sholat, running text, slide poster, kiriman WhatsApp menjadi draft, persetujuan di dashboard, manajemen pengurus, arsip, log aktivitas, murotal auto-play sebelum Maghrib dan Subuh, countdown event hari besar. |
| P1 | Jadwal petugas, kas ringkasan, QRIS per kategori, mode Jumat, mode papan khusus event, pengingat WhatsApp H-7, H-1, H-0, serah terima 1 klik. |
| P2 | Jaringan antar-masjid se-kecamatan, halaman publik masjid untuk jamaah rantau, notifikasi WhatsApp ke jamaah yang mengikuti masjid. |

### **** **** **** Keputusan terbuka - diisi founder / developer, tidak diputuskan dokumen ini

| Keputusan | Yang harus ditetapkan |
| --- | --- |
| Pilihan stack | Bahasa, framework, dan basis data backend. Kontrak di dokumen ini tidak bergantung pada pilihan tersebut. |
| Hosting | Tempat backend berjalan dan cara Board di masjid menjangkaunya, termasuk kebutuhan operasionalnya. |
| Penyedia WhatsApp | Penyedia dan mekanisme integrasi WhatsApp untuk intake, notifikasi balik, dan pengingat event. |
| Brand final | Nama MIHRAB CONNECT masih kandidat; finalnya menunggu pemeriksaan merek di PDKI dan domain. |

Sumber: dokumen scope Board, dokumen fitur & USP Masjid Board, konsep brand, dan prototipe Board P0. Dokumen ini tidak memuat harga, kontak, testimoni, statistik, atau fitur di luar sumber tersebut.
