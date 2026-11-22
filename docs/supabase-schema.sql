-- MIHRAB CONNECT — Skema Supabase (Postgres)
-- Sumber: docs/backend-spec.md (model data, alur persetujuan, matriks izin).
-- Cara pakai: jalankan di Supabase SQL Editor, satu kali, pada proyek baru.
-- Semua data di bawah ini CONTOH (Masjid Contoh An-Nur) — ganti dengan data
-- Masjid Al Furqon saat pilot. Jumlah kas sengaja tidak di-seed (tampil "Rp —").
--
-- CATATAN KEAMANAN: policy di bawah ini adalah starter untuk prototipe
-- (authenticated boleh baca/tulis). Kencangkan per-peran sebelum dipakai
-- jamaah nyata — lihat matriks izin di backend-spec.md.

-- ============ 1. Profil masjid ============
create table if not exists masjid (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  koordinat_lat numeric,
  koordinat_lng numeric,
  logo_url text,
  foto_url text,
  kontak text,
  created_at timestamptz not null default now()
);

-- ============ 2. Pengurus & peran ============
-- peran: ketua | bendahara | marbot | pengawas
-- no_whatsapp terdaftar = nomor yang boleh kirim lewat WhatsApp.
create table if not exists pengurus (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  nama text not null,
  peran text not null check (peran in ('ketua','bendahara','marbot','pengawas')),
  no_whatsapp text,
  whatsapp_terdaftar boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ 3. Pengaturan jadwal ============
create table if not exists jadwal_settings (
  masjid_id uuid primary key references masjid(id) on delete cascade,
  metode text not null default 'Kemenag',
  koreksi_menit int not null default 0,
  offset_hijriyah int not null default 0
);

-- durasi iqomah per waktu: subuh | dzuhur | ashar | maghrib | isya | jumat | tarawih
create table if not exists iqomah_durations (
  masjid_id uuid not null references masjid(id) on delete cascade,
  waktu text not null,
  durasi_menit int not null,
  primary key (masjid_id, waktu)
);

-- ============ 4. Jadwal petugas ============
-- peran: imam | muadzin | khatib
create table if not exists jadwal_petugas (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  tanggal date not null,
  peran text not null check (peran in ('imam','muadzin','khatib')),
  nama text not null,
  created_at timestamptz not null default now()
);

-- ============ 5. Kajian / kegiatan ============
create table if not exists kajian (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  judul text not null,
  tanggal date not null,
  waktu text,
  pemateri text,
  poster_url text,
  status text not null default 'draf' check (status in ('draf','tayang','selesai')),
  created_at timestamptz not null default now()
);

-- ============ 6. Pengumuman (alur persetujuan) ============
-- status: draft -> menunggu -> tayang -> selesai
-- sumber: dashboard | whatsapp
create table if not exists pengumuman (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  isi text not null,
  jenis text,
  sumber text not null default 'dashboard' check (sumber in ('dashboard','whatsapp')),
  pengirim_id uuid references pengurus(id),
  status text not null default 'draft'
    check (status in ('draft','menunggu','tayang','selesai')),
  disetujui_oleh uuid references pengurus(id),
  disetujui_pada timestamptz,
  created_at timestamptz not null default now()
);

-- ============ 7. Kas & QRIS ============
create table if not exists kas_kategori (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  nama text not null,
  qris_url text
);

-- jenis: masuk | keluar. Kas hanya dicatat dari dashboard (bukan WhatsApp).
create table if not exists kas_transaksi (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  kategori_id uuid references kas_kategori(id),
  jenis text not null check (jenis in ('masuk','keluar')),
  jumlah numeric not null check (jumlah >= 0),
  keterangan text,
  dicatat_oleh uuid references pengurus(id),
  tanggal date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============ 8. Event & countdown hari besar ============
create table if not exists event (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  nama text not null,
  tanggal date not null,
  tampil_countdown boolean not null default true
);

-- ============ 9. Pengaturan murotal ============
create table if not exists murotal_settings (
  masjid_id uuid primary key references masjid(id) on delete cascade,
  surah text,
  qari text,
  durasi_menit int,
  volume int check (volume between 0 and 100),
  aktif boolean not null default true
);

-- ============ 10. Arsip & log aktivitas ============
create table if not exists arsip (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  jenis text not null,
  judul text not null,
  konten text,
  tanggal date,
  created_at timestamptz not null default now()
);

create table if not exists log_aktivitas (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  pengurus_id uuid references pengurus(id),
  aksi text not null,
  detail text,
  sumber text,
  created_at timestamptz not null default now()
);

-- ============ 11. Serah terima pengurus ============
create table if not exists serah_terima (
  id uuid primary key default gen_random_uuid(),
  masjid_id uuid not null references masjid(id) on delete cascade,
  dari_pengurus uuid references pengurus(id),
  ke_pengurus uuid references pengurus(id),
  tanggal date not null default current_date,
  catatan text
);

-- ============ 12. Row Level Security (starter) ============
alter table masjid enable row level security;
alter table pengurus enable row level security;
alter table jadwal_settings enable row level security;
alter table iqomah_durations enable row level security;
alter table jadwal_petugas enable row level security;
alter table kajian enable row level security;
alter table pengumuman enable row level security;
alter table kas_kategori enable row level security;
alter table kas_transaksi enable row level security;
alter table event enable row level security;
alter table murotal_settings enable row level security;
alter table arsip enable row level security;
alter table log_aktivitas enable row level security;
alter table serah_terima enable row level security;

-- Policy starter: semua tabel boleh dibaca/ditulis oleh pengguna login.
-- Kencangkan per-peran sebelum pilot dengan jamaah nyata.
do $$
declare t text;
begin
  foreach t in array['masjid','pengurus','jadwal_settings','iqomah_durations',
    'jadwal_petugas','kajian','pengumuman','kas_kategori','kas_transaksi',
    'event','murotal_settings','arsip','log_aktivitas','serah_terima']
  loop
    execute format('create policy "starter_authenticated_all" on %I
      for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ============ 13. Data contoh (sekali saja) ============
insert into masjid (nama, alamat) values
  ('Masjid Contoh An-Nur', 'Kelurahan Contoh, Kota Contoh')
on conflict do nothing;

-- id masjid contoh dipakai di bawah ini
-- (jalankan select id from masjid untuk melihatnya; seed berikut memakai subquery)
insert into pengurus (masjid_id, nama, peran, no_whatsapp, whatsapp_terdaftar)
select id, 'Ketua Contoh', 'ketua', null, false from masjid where nama = 'Masjid Contoh An-Nur'
union all
select id, 'Bendahara Contoh', 'bendahara', null, true from masjid where nama = 'Masjid Contoh An-Nur'
union all
select id, 'Marbot Contoh', 'marbot', null, true from masjid where nama = 'Masjid Contoh An-Nur';

insert into jadwal_settings (masjid_id, metode, koreksi_menit, offset_hijriyah)
select id, 'Kemenag', 0, 0 from masjid where nama = 'Masjid Contoh An-Nur';

insert into iqomah_durations (masjid_id, waktu, durasi_menit)
select id, w.waktu, w.durasi from masjid,
  (values ('subuh',10),('dzuhur',10),('ashar',10),('maghrib',10),('isya',10),('jumat',0),('tarawih',15))
  as w(waktu, durasi)
where nama = 'Masjid Contoh An-Nur';

insert into kas_kategori (masjid_id, nama)
select id, k.nama from masjid,
  (values ('Infaq umum'),('Pembangunan'),('TPQ')) as k(nama)
where nama = 'Masjid Contoh An-Nur';

insert into murotal_settings (masjid_id, surah, qari, durasi_menit, volume, aktif)
select id, 'Ar-Rahman', 'Contoh Qari', 10, 70, true
from masjid where nama = 'Masjid Contoh An-Nur';

insert into event (masjid_id, nama, tanggal)
select id, 'Ramadan 1448 H', date '2027-02-18' from masjid where nama = 'Masjid Contoh An-Nur'
union all
select id, 'Idul Fitri 1448 H', date '2027-03-20' from masjid where nama = 'Masjid Contoh An-Nur';
