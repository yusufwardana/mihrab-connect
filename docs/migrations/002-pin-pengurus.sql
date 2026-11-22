-- Migrasi 002 — PIN login per pengurus (22 Nov 2026).
--
-- BELUM DITERAPKAN. Terapkan terpisah lewat SQL Editor Supabase
-- (Dashboard Supabase -> SQL Editor -> tempel file ini -> Run).
-- Jangan jalankan dua kali (aman: semua memakai `if not exists`).
--
-- PIN disimpan sebagai hash scrypt + salt (lihat vercel-admin/lib/auth.js);
-- TIDAK ADA PIN yang disimpan sebagai teks di database.
-- Kolom pin_gagal / pin_terkunci_sampai = pengunci brute force login
-- (5 gagal -> kunci 15 menit; sukses mereset keduanya).
alter table pengurus add column if not exists pin_hash text;
alter table pengurus add column if not exists pin_salt text;
alter table pengurus add column if not exists pin_gagal int not null default 0;
alter table pengurus add column if not exists pin_terkunci_sampai timestamptz;
