-- Migrasi 003 — RLS per-peran / least-privilege (23 Nov 2026).
--
-- BELUM DITERAPKAN. Terapkan terpisah lewat SQL Editor Supabase
-- (Dashboard Supabase -> SQL Editor -> tempel file ini -> Run).
-- Aman dijalankan ulang: semua memakai `drop policy if exists`.
--
-- Latar: policy starter `starter_authenticated_all` memberi SEMUA pengguna
-- login Supabase (role `authenticated`) akses penuh (baca+tulis+hapus)
-- ke 14 tabel — termasuk pin_hash/pin_salt + nomor WA di `pengurus`,
-- transaksi kas, log aktivitas, dan serah terima. Siapa pun yang bisa
-- mendaftar/masuk lewat Supabase Auth (pendaftaran email proyek ini
-- terbuka) otomatis menjadi `authenticated` dan mendapat semua itu.
--
-- Yang diubah migrasi ini:
--   * Hapus `starter_authenticated_all` dari semua 14 tabel.
--   * Role `anon`: TIDAK ADA policy sama sekali -> ditolak penuh
--     (sudah begitu sebelumnya; kini didokumentasikan di sini).
--   * Role `authenticated`: HANYA SELECT, dan hanya pada konten yang
--     memang tampil publik; TIDAK ADA INSERT/UPDATE/DELETE untuk
--     `authenticated` di tabel mana pun.
--   * Tanpa policy (= ditolak penuh) untuk: pengurus, kas_transaksi,
--     jadwal_petugas, log_aktivitas, serah_terima, arsip.
--   * SELECT tayang saja untuk: kajian, pengumuman (status='tayang'),
--     event (tampil_countdown=true).
--
-- TIDAK BERDAMPAK ke Admin/Board: keduanya memakai service_role key
-- lewat API Vercel, dan service_role melewati RLS sepenuhnya.
-- Login pengurus (PIN) adalah sesi aplikasi sendiri, BUKAN Supabase
-- Auth — jadi tidak ada pengguna Supabase Auth yang dipetakan ke
-- ketua/bendahara/marbot; policy di sini adalah pertahanan berlapis
-- untuk role `authenticated` secara umum, bukan per-pengurus.

-- ============ 1. Hapus policy starter dari semua tabel ============
drop policy if exists starter_authenticated_all on masjid;
drop policy if exists starter_authenticated_all on pengurus;
drop policy if exists starter_authenticated_all on jadwal_settings;
drop policy if exists starter_authenticated_all on iqomah_durations;
drop policy if exists starter_authenticated_all on jadwal_petugas;
drop policy if exists starter_authenticated_all on kajian;
drop policy if exists starter_authenticated_all on pengumuman;
drop policy if exists starter_authenticated_all on kas_kategori;
drop policy if exists starter_authenticated_all on kas_transaksi;
drop policy if exists starter_authenticated_all on event;
drop policy if exists starter_authenticated_all on murotal_settings;
drop policy if exists starter_authenticated_all on arsip;
drop policy if exists starter_authenticated_all on log_aktivitas;
drop policy if exists starter_authenticated_all on serah_terima;

-- ============ 2. SELECT publik untuk authenticated ============
-- Profil + pengaturan tampil (publik, sama seperti yang tampil di Board).
create policy rls_baca_masjid on masjid
  for select to authenticated using (true);
create policy rls_baca_jadwal_settings on jadwal_settings
  for select to authenticated using (true);
create policy rls_baca_iqomah on iqomah_durations
  for select to authenticated using (true);
create policy rls_baca_murotal on murotal_settings
  for select to authenticated using (true);
create policy rls_baca_kas_kategori on kas_kategori
  for select to authenticated using (true);

-- Konten tayang saja (draft/menunggu/selesai tidak boleh dibaca langsung).
create policy rls_baca_kajian_tayang on kajian
  for select to authenticated using (status = 'tayang');
create policy rls_baca_pengumuman_tayang on pengumuman
  for select to authenticated using (status = 'tayang');
create policy rls_baca_event_countdown on event
  for select to authenticated using (tampil_countdown = true);

-- ============ 3. Tanpa policy = ditolak penuh ============
-- pengurus (berisi pin_hash/pin_salt + nomor WA),
-- kas_transaksi, jadwal_petugas, log_aktivitas, serah_terima, arsip:
-- TIDAK ADA policy untuk anon/authenticated -> tidak bisa dibaca
-- maupun ditulis dari luar API. Sengaja tidak ada pernyataan di sini.
