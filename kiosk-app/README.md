# Mihrab Kiosk — APK Kiosk Board (Android)

Aplikasi kiosk Android untuk menampilkan **Mihrab Connect Board** di TV masjid
lewat STB (ZTE B860H v2.1, Android 6, sudah root). App sendiri COSMICLABS —
**tanpa biaya lisensi per perangkat**, tanpa kode lisensi/cek berbayar apa pun.

- Package: `id.cosmiclabs.mihrabkiosk`
- Nama app: **Mihrab Kiosk**
- Versi: **1.0.0** (versionCode 1)
- minSdk **23** (Android 6) • targetSdk **34** • compileSdk 34
- Bahasa: Kotlin, Views + WebView saja (tanpa Jetpack Compose — ringan untuk
  STB RAM 1 GB). Tanpa OkHttp/Retrofit — HTTP pakai `HttpURLConnection` +
  `org.json` bawaan Android.
- APK release: `app/build/outputs/apk/release/app-release.apk`
  (~630 KB; SHA-256 ada di laporan build — hitung ulang dengan
  `sha256sum` sebelum distribusi).

## Fitur

1. **Auto start setelah booting** — `BootReceiver` (BOOT_COMPLETED) +
   `MainActivity` bisa dipilih sebagai **Home/launcher** (intent HOME/DEFAULT),
   jadi STB nyala langsung masuk Board.
2. **Fullscreen permanen** — immersive sticky, status bar + navigation bar
   disembunyikan, diterapkan ulang tiap `onWindowFocusChanged`.
3. **Pengaturan URL dari HP** — polling tabel `kiosk_config` (Supabase REST,
   anon key) tiap 60 detik; bila `start_url` berubah, URL baru langsung dimuat.
   Plus layar pengaturan lokal di STB (ketuk **5x pojok kiri atas** → masukkan
   PIN → `SettingsActivity`) untuk ganti URL, interval refresh, dan PIN.
   PIN default: `123456` (ganti di layar pengaturan; butuh PIN lama).
4. **Remote management** — heartbeat ke `kiosk_status` tiap 60 detik
   (upsert: device_id, app_version, current_url, online, last_seen,
   android_version); polling `kiosk_commands` tiap 30 detik.
5. **Auto reconnect** — `NetworkCallback`; saat offline tampil banner offline
   + halaman dari cache; saat online kembali, muat ulang otomatis.
6. **Watchdog** — `WatchdogService` (foreground, sticky) memantau heartbeat
   `MainActivity`; bila basi > 90 detik, activity diluncurkan ulang.
   `AlarmManager` (tiap 60 detik) memastikan service tetap jalan.
   `onRenderProcessGone` WebView ditangani dengan membuat ulang WebView.
7. **Offline cache** — DOM storage + database WebView aktif; mode cache
   `LOAD_DEFAULT` saat online, `LOAD_CACHE_ELSE_NETWORK` saat offline.
8. **Auto refresh** — muat ulang halaman tiap `refresh_seconds` dari config
   (default 300 detik, minimal 60 detik).
9. **Branding COSMICLABS** — splash screen + layar pengaturan bertuliskan
   "COSMICLABS • Mihrab Kiosk" (teks saja, tanpa file logo). Ikon app vector
   sederhana (lengkung mihrab emas di atas hijau gelap).
10. **Tanpa lisensi** — tidak ada kode lisensi/cek berbayar.

## Instalasi di STB (sideload)

1. Salin `app-release.apk` ke flashdisk USB (FAT32).
2. Di STB: buka file manager → pasang APK. Bila diminta, izinkan
   "Install unknown apps" / "Sumber tidak dikenal" untuk file manager itu.
3. Buka **Mihrab Kiosk** sekali. Saat Android bertanya launcher default,
   pilih **Mihrab Kiosk** → "Selalu" — setelah itu tiap STB nyala, Board
   langsung tampil fullscreen.
4. Pastikan STB terhubung Wi-Fi/LAN. Board mengambil data dari internet;
   bila internet mati, halaman terakhir yang ter-cache tetap tampil
   (dengan banner offline).
5. Bila STB sudah root dan perintah `reboot` dari HP ingin dipakai,
   pastikan `su` tersedia (STB pilot sudah root).

Izin yang diminta aplikasi (semuanya wajar untuk kiosk):

| Izin | Untuk |
|---|---|
| INTERNET | Memuat Board + Supabase |
| ACCESS_NETWORK_STATE | Deteksi online/offline |
| RECEIVE_BOOT_COMPLETED | Auto start setelah booting |
| WAKE_LOCK | Layar tetap menyala |
| FOREGROUND_SERVICE (+ SPECIAL_USE) | Watchdog tetap jalan |
| SET_ALARM | Alarm watchdog tiap 60 detik |

## Ganti URL dari HP (tanpa pegang STB)

Syarat: migrasi `docs/migrations/004-kiosk.sql` sudah diterapkan di Supabase
(lihat "Database" di bawah). Lalu dari HP, buka **Supabase Dashboard →
Table Editor → kiosk_config**:

```sql
update public.kiosk_config
set start_url = 'https://contoh-url-board-baru/', updated_at = now()
where id = 'default';
```

APK mengecek tiap 60 detik; Board akan memuat URL baru sendiri.
Untuk mengubah interval auto-refresh:

```sql
update public.kiosk_config
set refresh_seconds = 600 where id = 'default';
```

## Kirim perintah dari HP (remote management)

Sisipkan baris ke tabel `kiosk_commands` (Supabase Dashboard → Table Editor,
atau SQL Editor). APK mengambil perintah tiap 30 detik dan menandai statusnya
(`menunggu` → `dijalankan` → `selesai` / `gagal`).

`device_id` adalah Android ID perangkat. Lihat nilainya di tabel
`kiosk_status` setelah APK pertama kali heartbeat (kolom `device_id`).

```sql
-- Muat ulang Board di STB
insert into public.kiosk_commands (device_id, perintah)
values ('<device_id>', 'reload');

-- Ganti URL + muat ulang
insert into public.kiosk_commands (device_id, perintah, payload)
values ('<device_id>', 'set_url',
        '{"url": "https://mihrab-connect-board-0xs-projects-798a67b4.vercel.app/?tema=emas"}');

-- Reboot STB (butuh root; bila su gagal, status jadi 'gagal', app tidak crash)
insert into public.kiosk_commands (device_id, perintah)
values ('<device_id>', 'reboot');

-- Minta APK baca ulang config dari server
insert into public.kiosk_commands (device_id, perintah)
values ('<device_id>', 'refresh_config');
```

Daftar perintah:

| Perintah | Payload | Efek |
|---|---|---|
| `reload` | — | Muat ulang WebView |
| `set_url` | `{"url": "..."}` | Ganti URL + muat |
| `reboot` | — | `su -c reboot` (gagal → status `gagal`) |
| `refresh_config` | — | Baca ulang `kiosk_config` |

Perintah ditandai `dijalankan` **sebelum** dieksekusi; bila penandaannya
gagal, perintah dilewati agar tidak dieksekusi berulang tiap polling.

## Database

File: `../docs/migrations/004-kiosk.sql` (idempotent, `IF NOT EXISTS`).
**Terapkan lewat SQL Editor Supabase** (jangan dari repo). Isi:

- `kiosk_config` (id PK default `'default'`, `start_url`, `refresh_seconds`
  default 300) + seed 1 baris id `'default'`.
- `kiosk_status` (device_id PK, app_version, current_url, online,
  last_seen, android_version, updated_at).
- `kiosk_commands` (id uuid PK, device_id, perintah check
  `reload|set_url|reboot|refresh_config`, payload jsonb, status check
  `menunggu|dijalankan|selesai|gagal`, created_at, dijalankan_pada)
  + index (device_id, status, created_at).
- RLS aktif di ketiganya; policy anon: SELECT `kiosk_config`;
  INSERT/UPDATE `kiosk_status`; SELECT `kiosk_commands` **+ UPDATE
  `kiosk_commands`** (deviasi dari spek awal — tanpa policy UPDATE ini
  APK tidak bisa menandai perintah sehingga perintah dieksekusi berulang
  tiap polling 30 detik; dicatat juga sebagai komentar di file SQL).
  Role `service_role` melewati RLS (untuk Admin nanti).

## Build ulang (developer)

Dibutuhkan: JDK 17, Android SDK (platform android-34, build-tools 34.0.0),
Gradle 8.2. Di VM build COSMICLABS, dependensi AGP/Kotlin diambil dari repo
Maven lokal (`~/maven-repo`, diutamakan di `settings.gradle.kts`) karena
HTTP client Gradle di-reset egress proxy VM itu; jalankan offline:

```sh
./gradlew assembleRelease --offline
```

APK: `app/build/outputs/apk/release/app-release.apk`.
Keystore release: `keystore.jks` + `keystore-password.txt` di folder ini —
**file lokal saja, JANGAN masuk repo** (sudah di `.gitignore`).
Verifikasi:

```sh
aapt2 dump badging app/build/outputs/apk/release/app-release.apk
apksigner verify -v app/build/outputs/apk/release/app-release.apk
```

## Penyimpangan dari spek (dicatat jujur)

1. **AppCache tidak dipakai.** Spek meminta `setAppCacheEnabled` /
   `setAppCachePath`, tapi kedua API itu **dihapus dari WebSettings di
   compileSdk 34** (Chromium mematikan AppCache). Cache offline tetap jalan
   lewat HTTP cache WebView + DOM storage + `LOAD_CACHE_ELSE_NETWORK`.
2. **Lint dimatikan saat build release di VM ini** (task `lint*` di-disable
   di `app/build.gradle.kts`). Artefak lint tidak tersedia di repo Maven
   offline; lint adalah static analysis, bukan bagian dari APK.
   (`checkRelease` sudah dihapus di AGP 8.x, jadi task dinonaktifkan
   langsung.) Jalankan `./gradlew lint` di mesin dengan akses Maven bila
   dibutuhkan.
3. **Policy UPDATE `kiosk_commands` untuk anon** — lihat "Database" di atas.
4. **Build memakai repo Maven lokal + Gradle terpasang** (bukan wrapper
   download) karena jaringan Gradle di VM build ini tidak stabil; file
   `gradlew` tetap tersedia untuk mesin lain.

## Troubleshooting

| Gejala | Kemungkinan penyebab / solusi |
|---|---|
| Board tidak muncul setelah instal | Buka app sekali manual; pilih sebagai Home "Selalu". Cek Wi-Fi/LAN STB. |
| Tampil "Memuat…" lama | Cold start serverless Board (±10–20 detik pertama) — tunggu. |
| Banner offline terus | Cek internet STB; Board butuh internet untuk muat pertama; cache hanya menahan halaman yang pernah termuat. |
| URL baru dari HP tidak diterapkan | Tunggu 60 detik (interval polling config); cek `start_url` di `kiosk_config` benar; cek APK sudah heartbeat (baris di `kiosk_status`). |
| Perintah tidak jalan | Cek `device_id` benar (lihat `kiosk_status`); cek status baris di `kiosk_commands` — `gagal` berarti perintah gagal dieksekusi (mis. `reboot` tanpa root). |
| STB restart tapi Board tidak kembali | Pastikan Mihrab Kiosk dipilih sebagai launcher default; bila tidak, buka app manual. (Jalur tanpa-kiosk memang tidak punya auto-start di luar app ini.) |
| Layar pengaturan tidak bisa dibuka | Ketuk **tepat 5x** di pojok kiri atas layar; PIN default `123456`. |
| App crash / layar hitam | Watchdog meluncurkan ulang app (±90 detik). Bila berulang, catat waktunya dan laporkan — log tidak tersimpan di app ini. |

## Catatan jujur

- **APK ini BELUM PERNAH diuji di perangkat nyata.** Build hanya
  terverifikasi compile + `aapt2 dump badging` + `apksigner verify` di VM.
  Uji di STB ZTE B860H v2.1 masih menunggu user.
- Perilaku di Android 6 (API 23) mengikuti kode yang ditulis untuk API itu
  (minSdk 23), tapi WebView bawaan STB yang tua bisa menampilkan Board
  berbeda dari emulator/browser modern — Board vanilla punya fallback CSS
  untuk WebView lama.
- `onRenderProcessGone` hanya tersedia di API 26+; di Android 6 crash
  proses render WebView ditangani lewat watchdog service (restart app).
