const fs = require('fs');

const loginShell = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Masuk / Daftar • Tel-U IoT Lab</title>
  <link rel="stylesheet" href="/flat.css">
  <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.107.0/dist/umd/supabase.js"></script>
  <script defer src="/auth.js"></script>
</head>
<body class="auth-page">
  <main class="auth-card">
    <span class="eyebrow">TELKOM UNIVERSITY · IOT LAB</span>
    <h1 id="auth-title">Satu akun.<br>Seluruh eksperimen.</h1>
    <p id="auth-desc">Rancang rangkaian, jalankan simulasi, dan pantau perangkat dalam satu ruang belajar.</p>
    
    <div class="auth-tabs">
      <button type="button" id="tab-login" class="auth-tab active">Masuk</button>
      <button type="button" id="tab-register" class="auth-tab">Daftar Akun</button>
    </div>

    <form id="auth-form">
      <label>Email
        <input name="email" type="email" required autocomplete="username" placeholder="nama@kampus.ac.id">
      </label>
      <label>Kata sandi
        <input name="password" type="password" required autocomplete="current-password" placeholder="Minimal 6 karakter" minlength="6">
      </label>
      <button id="submit-btn" type="submit">Masuk ke laboratorium →</button>
    </form>
    
    <p id="status" role="status" aria-live="polite">Silakan masuk atau daftar akun baru.</p>
    <button id="switch-account" class="text-button" style="display:none;">Gunakan akun lain</button>
    <small id="auth-hint">Data proyek dan simulasi tersimpan otomatis di database cloud.</small>
  </main>
</body>
</html>`;

const appShell = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Tel-U IoT Lab</title>
  <link rel="stylesheet" href="/flat.css">
  <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.107.0/dist/umd/supabase.js"></script>
  <script defer src="/auth.js"></script>
  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-box {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; min-height: 85vh; text-align: center;
    }
    .spinner {
      width: 44px; height: 44px; border: 4px solid #e2e8f0;
      border-top-color: #be123c; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  </style>
</head>
<body class="auth-page">
  <div class="loader-box">
    <span class="eyebrow">TELKOM UNIVERSITY · IOT LAB</span>
    <div class="spinner"></div>
    <p id="status" style="font-size: 14px; font-weight: 600; color: #475569; margin: 0;">Memverifikasi sesi laboratorium…</p>
  </div>
</body>
</html>`;

fs.writeFileSync('public/login.html', loginShell);
for (const name of ['index', 'dashboard', 'esp', 'raspi']) {
  fs.writeFileSync(`public/${name}.html`, appShell);
}

