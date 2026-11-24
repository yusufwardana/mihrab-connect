-- Migrasi 004 — Kiosk (APK Mihrab Kiosk, STB Android)
-- Idempotent (aman dijalankan ulang). JANGAN terapkan dari sini —
-- jalankan lewat SQL Editor Supabase (parent).
--
-- Catatan RLS: role service_role MELEWATI RLS sepenuhnya, jadi Admin
-- (Vercel, memakai service_role key) bisa baca/tulis ketiga tabel ini
-- tanpa policy tambahan. Policy di bawah hanya untuk anon key yang
-- dipakai APK (publik by design, hanya boleh yang tertulis di sini).

create table if not exists public.kiosk_config (
  id text primary key default 'default',
  start_url text not null default 'https://mihrab-connect-board-0xs-projects-798a67b4.vercel.app/',
  refresh_seconds int not null default 300,
  updated_at timestamptz not null default now()
);

insert into public.kiosk_config (id, start_url, refresh_seconds)
values ('default', 'https://mihrab-connect-board-0xs-projects-798a67b4.vercel.app/', 300)
on conflict (id) do nothing;

create table if not exists public.kiosk_status (
  device_id text primary key,
  app_version text,
  current_url text,
  online boolean not null default true,
  last_seen timestamptz,
  android_version text,
  updated_at timestamptz not null default now()
);

create table if not exists public.kiosk_commands (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  perintah text not null check (perintah in ('reload', 'set_url', 'reboot', 'refresh_config')),
  payload jsonb,
  status text not null default 'menunggu' check (status in ('menunggu', 'dijalankan', 'selesai', 'gagal')),
  created_at timestamptz not null default now(),
  dijalankan_pada timestamptz
);

create index if not exists kiosk_commands_device_status_idx
  on public.kiosk_commands (device_id, status, created_at);

alter table public.kiosk_config enable row level security;
alter table public.kiosk_status enable row level security;
alter table public.kiosk_commands enable row level security;

-- APK hanya BOLEH membaca config (start_url + refresh_seconds).
drop policy if exists kiosk_config_anon_select on public.kiosk_config;
create policy kiosk_config_anon_select on public.kiosk_config
  for select to anon using (true);

-- APK menulis heartbeat-nya sendiri (insert baris baru / update barisnya).
drop policy if exists kiosk_status_anon_insert on public.kiosk_status;
create policy kiosk_status_anon_insert on public.kiosk_status
  for insert to anon with check (true);

drop policy if exists kiosk_status_anon_update on public.kiosk_status;
create policy kiosk_status_anon_update on public.kiosk_status
  for update to anon using (true) with check (true);

-- APK membaca perintah yang ditujukan ke device-nya.
drop policy if exists kiosk_commands_anon_select on public.kiosk_commands;
create policy kiosk_commands_anon_select on public.kiosk_commands
  for select to anon using (true);

-- APK harus bisa menandai perintah (menunggu -> dijalankan -> selesai/gagal).
-- Tanpa policy ini, perintah akan dieksekusi berulang tiap polling (30 detik).
drop policy if exists kiosk_commands_anon_update on public.kiosk_commands;
create policy kiosk_commands_anon_update on public.kiosk_commands
  for update to anon using (true) with check (true);
