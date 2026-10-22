-- Jalankan di Supabase SQL Editor menggunakan akun admin.
create table if not exists public.app_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true
);
alter table public.app_members enable row level security;
revoke all on public.app_members from anon, authenticated;
grant select on public.app_members to authenticated;
create policy "Read own membership" on public.app_members for select to authenticated
 using (auth.uid() = user_id);
-- Pengguna tidak dapat mendaftarkan / mengaktifkan dirinya sendiri.
create policy "Receive own IoT channel" on realtime.messages for select to authenticated
 using (
 extension = 'broadcast'
 and realtime.topic() = 'iot:' || (select auth.uid())::text
 and exists(select 1 from public.app_members where user_id = (select auth.uid()) and enabled)
 );
create policy "Send own IoT channel" on realtime.messages for insert to authenticated
 with check (
 extension = 'broadcast'
 and realtime.topic() = 'iot:' || (select auth.uid())::text
 and exists(select 1 from public.app_members where user_id = (select auth.uid()) and enabled)
 );
-- Setelah membuat akun lewat Authentication > Users > Add user:
-- insert into public.app_members(user_id) values ('UUID-AKUN-DARI-AUTH');
-- Cabut akses: update public.app_members set enabled = false where user_id = 'UUID';
