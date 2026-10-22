# Tel-U IoT Lab — Supabase + Vercel

Versi ini menyertakan dashboard, simulator ESP32/Arduino dan Raspberry Pi, tampilan papan flat, autentikasi email/password, serta komunikasi privat Supabase Realtime. Tidak membutuhkan server Node/WebSocket di localhost.

## Pengaturan Supabase
1. Buat proyek Supabase. Jalankan `supabase.sql` sekali di SQL Editor.
2. Authentication > Providers > Email: nonaktifkan pendaftaran publik (Allow new users to sign up). Tidak tersedia formulir pendaftaran dalam aplikasi.
3. Buat akun lewat Authentication > Users > Add user, atur email/password dan konfirmasi email sesuai kebijakan kampus. Masukkan UUID akun ke `public.app_members` dengan `enabled = true`. Akun tanpa keanggotaan ditolak meski berhasil login.
4. Realtime Settings: matikan Allow public access agar hanya kanal privat diizinkan. Kanal `iot:<UUID>` hanya bisa diakses pemilik yang terdaftar.
5. Salin Project URL dan anon/publishable key. Jangan gunakan service_role atau secret key. Kedua nilai publik ini memang dipakai browser; perlindungan data bergantung pada RLS.

## Deploy Vercel
1. Unggah SELURUH folder proyek ini ke repository, termasuk `pages`, `api`, `public`, dan `vercel.json`.
2. Import repository ke Vercel. Framework Preset: Other. Root Directory: folder proyek ini. Build Command `npm run build`, Output Directory `public`.
3. Tambahkan environment variables `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, lalu deploy. Untuk perubahan environment, lakukan redeploy.
4. Supabase Authentication > URL Configuration: isi Site URL dengan domain Vercel produksi. Gunakan domain khusus bila ada.
5. Buka `/`, `/dashboard.html`, `/esp.html`, atau `/raspi.html`. Semua meminta login; isi HTML aplikasi dikirim API hanya setelah token dan keanggotaan diverifikasi.

## Jalankan lokal
`npm install`, salin `.env.example` ke `.env.local` dan isi nilainya, lalu gunakan `npx vercel dev`. Membuka HTML lewat file:// atau server statis saja tidak mendukung API autentikasi.

## Uji penerimaan setelah konfigurasi
- Pengunjung belum login tidak menerima HTML aplikasi melalui `/api/page?name=esp` (401).
- Akun Supabase tanpa baris app_members ditolak (403).
- Login akun A, buka simulator dan dashboard pada dua tab; jalankan contoh virtualWrite lalu amati widget dengan virtual pin yang sama. Ubah kontrol dashboard dan periksa simulator.
- Login akun B di browser lain: pesan A tidak boleh diterima B. Uji subscribe/publish kanal A dengan JWT B, harus ditolak RLS.
- Uji tarik komponen, kabel pin, slider sensor, LED, Run/Stop, simpan/muat dan ekspor/impor pada kedua simulator.
- Uji logout dan token kedaluwarsa. Halaman setelah reload harus kembali meminta login.

## Batasan yang perlu diketahui
- Simulator tetap mesin pembelajaran JavaScript dari proyek awal; tidak mengemulasi firmware ESP32/Linux Raspberry Pi secara penuh atau menjamin timing perangkat fisik. Desain flat tidak mengubah ketepatan emulasi instruksi.
- Realtime menyampaikan perubahan saat kedua halaman tersambung; belum ada penyimpanan nilai virtual pin terakhir / replay pesan terputus.
- Rangkaian dan tata letak disimpan lokal per UUID dan per browser. Bukan penyimpanan cloud lintas perangkat. Tombol simpan ditandai sebagai simpan lokal.
- CDN digunakan untuk Supabase SDK, Tailwind dan aset font bawaan. Membutuhkan internet.
- Akses yang dicabut berlaku untuk permintaan halaman baru; kode yang sudah diunduh tidak dapat ditarik kembali. Putuskan sesi pengguna melalui Supabase ketika mencabut akses aktif.
- Proyek belum dipublikasikan dan login/Realtime nyata belum dapat diverifikasi tanpa konfigurasi akun Supabase/Vercel milik Anda.

Referensi: https://supabase.com/docs/guides/realtime/authorization dan https://supabase.com/docs/reference/javascript/auth-signinwithpassword
