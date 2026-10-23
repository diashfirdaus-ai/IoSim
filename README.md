# Tel-U IoT Lab — Supabase + Vercel

Versi ini menyertakan dashboard, simulator ESP32/Arduino dan Raspberry Pi, tampilan papan flat, autentikasi email/password (Masuk & Daftar), sinkronisasi penyimpanan cloud ke database Supabase, serta komunikasi privat Supabase Realtime. Tidak membutuhkan server Node/WebSocket lokal.

## Pengaturan Supabase
1. Buat proyek Supabase. Jalankan seluruh skrip [supabase.sql](file:///Users/diashfirdaus/Documents/simulator_iot_TelU%202/supabase.sql) sekali di **SQL Editor**. Skrip ini akan membuat:
   - Tabel `public.app_members` dan trigger auto-membership pengguna baru.
   - Kebijakan RLS kanal Realtime privat `iot:<UUID>`.
   - Tabel `public.iot_workspaces` untuk menyimpan rangkaian dan layout dashboard di database cloud.
   - Tabel `public.iot_device_data` untuk menyimpan status terakhir pin virtual (last state).
   - Tabel `public.iot_telemetry_logs` untuk mencatat riwayat telemetri pin sensor.
2. **Pendaftaran (Sign Up)**:
   - Aplikasi kini dilengkapi formulir **Daftar Akun** langsung di tampilan web.
   - Pastikan **Authentication > Providers > Email**: opsi *Allow new users to sign up* aktif jika ingin mengizinkan pengguna mendaftar mandiri.
   - Setiap pengguna yang mendaftar akan otomatis diaktifkan di `public.app_members` melalui trigger database.
3. **Realtime Settings**:
   - Matikan *Allow public access* agar hanya kanal privat yang diizinkan. Kanal `iot:<UUID>` hanya bisa diakses pemilik akun yang sah.
4. **Kredensial API**:
   - Salin **Project URL** dan **anon/publishable key** dari Project Settings > API. Jangan gunakan service_role/secret key di sisi browser.

## Deploy Vercel
1. Unggah seluruh folder proyek ini ke repository, termasuk `pages`, `api`, `public`, dan `vercel.json`.
2. Import repository ke Vercel. Framework Preset: *Other*, Root Directory: folder proyek ini, Build Command: `npm run build`, Output Directory: `public`.
3. Tambahkan environment variables `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, lalu deploy.
4. Supabase **Authentication > URL Configuration**: isi *Site URL* dengan domain Vercel produksi Anda.
5. Akses web aplikasi: halaman masuk/daftar mandiri berada di `/login.html`. Jika pengguna belum masuk dan membuka `/`, sistem otomatis mengarahkan ke `/login.html`.

## Jalankan Lokal
1. Jalankan `npm install`.
2. Salin `.env.example` ke `.env.local` dan isi kredensial Supabase Anda.
3. Jalankan `npm run dev`. Server lokal otomatis berjalan di `http://localhost:3000`.

## Data Tersimpan di Database
- **Workspace Proyek (ESP32 / Raspi / Dashboard)**: Rangkaian komponen, kabel, kode editor, dan posisi widget dashboard tersimpan otomatis di database cloud (`public.iot_workspaces`) dan disinkronkan lintas browser/perangkat pengguna.
- **Status Pin Virtual (Device State)**: Status terakhir pin virtual (misal V0-V255) otomatis disimpan ke `public.iot_device_data` dan dimuat ulang secara otomatis (SYNC) setiap kali dashboard dibuka.
- **Log Telemetri**: Seluruh pengiriman data `WRITE` dicatat ke dalam `public.iot_telemetry_logs`.
