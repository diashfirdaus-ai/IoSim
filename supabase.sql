-- Jalankan di Supabase SQL Editor menggunakan akun admin.

-- 1. Tabel Keanggotaan & Hak Akses
create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true
);
alter table public.app_members enable row level security;
revoke all on public.app_members from anon, authenticated;
grant select on public.app_members to authenticated;

drop policy if exists "Read own membership" on public.app_members;
create policy "Read own membership" on public.app_members for select to authenticated
  using (auth.uid() = user_id);

-- Trigger: Setiap pengguna baru yang mendaftar otomatis aktif di app_members
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.app_members (user_id, enabled)
  values (new.id, true)
  on conflict (user_id) do update set enabled = true;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Kebijakan Kanal Realtime Privat
drop policy if exists "Receive own IoT channel" on realtime.messages;
create policy "Receive own IoT channel" on realtime.messages for select to authenticated
  using (
    extension = 'broadcast'
    and realtime.topic() = 'iot:' || (select auth.uid())::text
    and exists(select 1 from public.app_members where user_id = (select auth.uid()) and enabled)
  );

drop policy if exists "Send own IoT channel" on realtime.messages;
create policy "Send own IoT channel" on realtime.messages for insert to authenticated
  with check (
    extension = 'broadcast'
    and realtime.topic() = 'iot:' || (select auth.uid())::text
    and exists(select 1 from public.app_members where user_id = (select auth.uid()) and enabled)
  );

-- 3. Tabel Penyimpanan Workspace (Rangkaian ESP32, Raspberry Pi, & Layout Dashboard)
create table if not exists public.iot_workspaces (
  user_id uuid references auth.users(id) on delete cascade,
  workspace_type text not null, -- 'esp32', 'raspi', atau 'dashboard'
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_type)
);
alter table public.iot_workspaces enable row level security;
grant select, insert, update, delete on public.iot_workspaces to authenticated;

drop policy if exists "Users can manage own workspaces" on public.iot_workspaces;
create policy "Users can manage own workspaces" on public.iot_workspaces
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Tabel Status Terkini Pin Virtual (Device State / Last Value)
create table if not exists public.iot_device_data (
  user_id uuid references auth.users(id) on delete cascade,
  pin text not null, -- contoh: 'V0', 'V1', 'V2'
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, pin)
);
alter table public.iot_device_data enable row level security;
grant select, insert, update, delete on public.iot_device_data to authenticated;

drop policy if exists "Users can manage own device data" on public.iot_device_data;
create policy "Users can manage own device data" on public.iot_device_data
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Tabel Riwayat / Log Telemetri Sensor
create table if not exists public.iot_telemetry_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  pin text not null,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.iot_telemetry_logs enable row level security;
grant select, insert on public.iot_telemetry_logs to authenticated;

drop policy if exists "Users can manage own telemetry logs" on public.iot_telemetry_logs;
create policy "Users can manage own telemetry logs" on public.iot_telemetry_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
