(async () => {
  const isLoginPage = location.pathname.includes('login') || location.pathname.endsWith('/login.html');
  const status = document.getElementById('status');

  try {
    const config = await fetch('/api/config').then(r => r.json());
    if (!config.url || !config.key) {
      throw Error('Admin perlu mengatur SUPABASE_URL dan SUPABASE_ANON_KEY di .env.local atau Vercel.');
    }
    const client = supabase.createClient(config.url, config.key);

    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData?.session;

    if (isLoginPage) {
      // === HALAMAN LOGIN TERPISAH (login.html) ===
      if (session) {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || '/index.html';
        window.location.replace(redirect);
        return;
      }

      const form = document.querySelector('form');
      const tabLogin = document.getElementById('tab-login');
      const tabRegister = document.getElementById('tab-register');
      const authTitle = document.getElementById('auth-title');
      const submitBtn = document.getElementById('submit-btn');
      let mode = 'login';

      function setMode(newMode) {
        mode = newMode;
        if (mode === 'login') {
          tabLogin?.classList.add('active'); tabRegister?.classList.remove('active');
          if (authTitle) authTitle.innerHTML = 'Satu akun.<br>Seluruh eksperimen.';
          if (submitBtn) submitBtn.textContent = 'Masuk ke laboratorium →';
          if (status) status.textContent = 'Silakan masuk dengan akun Anda.';
        } else {
          tabRegister?.classList.add('active'); tabLogin?.classList.remove('active');
          if (authTitle) authTitle.innerHTML = 'Daftar Akun.<br>Mulai Eksperimen.';
          if (submitBtn) submitBtn.textContent = 'Buat Akun & Masuk →';
          if (status) status.textContent = 'Daftarkan email dan kata sandi baru.';
        }
      }

      if (tabLogin && tabRegister) {
        tabLogin.onclick = () => setMode('login');
        tabRegister.onclick = () => setMode('register');
      }

      if (form) {
        form.addEventListener('submit', async event => {
          event.preventDefault();
          if (submitBtn) submitBtn.disabled = true;
          const email = form.email.value.trim();
          const password = form.password.value;
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get('redirect') || '/index.html';

          try {
            if (mode === 'register') {
              if (status) status.textContent = 'Mendaftarkan akun baru…';
              const { data, error } = await client.auth.signUp({ email, password });
              if (error) {
                if (error.message.includes('already registered')) throw Error('Email sudah terdaftar. Silakan pilih tab Masuk.');
                throw error;
              }
              if (data && data.session) {
                if (status) status.textContent = 'Pendaftaran berhasil! Mengalihkan ke laboratorium…';
                window.location.replace(redirect);
              } else {
                if (status) status.textContent = 'Pendaftaran berhasil! Jika konfirmasi email aktif di Supabase, silakan periksa email Anda lalu Masuk.';
                setMode('login');
                if (submitBtn) submitBtn.disabled = false;
              }
            } else {
              if (status) status.textContent = 'Memverifikasi akun…';
              const { data, error } = await client.auth.signInWithPassword({ email, password });
              if (error) {
                if (error.message.toLowerCase().includes('email not confirmed')) {
                  throw Error('Email belum dikonfirmasi. Periksa kotak masuk/spam email Anda, atau matikan "Confirm email" di Supabase Authentication > Providers > Email.');
                }
                if (error.message.toLowerCase().includes('invalid login credentials')) {
                  throw Error('Email belum terdaftar atau kata sandi salah. Jika belum pernah mendaftar di proyek Supabase ini, silakan klik tab "Daftar Akun" di atas.');
                }
                throw Error(error.message);
              }
              if (status) status.textContent = 'Berhasil masuk! Membuka laboratorium…';
              window.location.replace(redirect);
            }
          } catch (error) {
            if (status) status.textContent = error.message;
            if (submitBtn) submitBtn.disabled = false;
          }
        });
      }
    } else {
      // === HALAMAN APLIKASI (INDEX, DASHBOARD, ESP, RASPI) ===
      const pageName = location.pathname.split('/').pop().replace('.html', '') || 'index';
      if (!session) {
        const redirectTarget = location.pathname.endsWith('.html') ? location.pathname : `/${pageName}.html`;
        window.location.replace(`/login.html?redirect=${encodeURIComponent(redirectTarget)}`);
        return;
      }

      if (status) status.textContent = 'Memuat ruang laboratorium…';
      const response = await fetch(`/api/page?name=${encodeURIComponent(pageName)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          await client.auth.signOut();
          window.location.replace(`/login.html?redirect=${encodeURIComponent(location.pathname)}`);
          return;
        }
        throw Error(body.error || (response.status === 404
          ? 'Halaman belum tersedia di server. Muat ulang server lokal lalu coba kembali.'
          : `Gagal memuat halaman (HTTP ${response.status}). Coba muat ulang halaman.`));
      }

      const html = await response.text();
      window.IoT = { client, user: session.user };
      await client.realtime.setAuth(session.access_token);
      document.open();
      document.write(html);
      document.close();
    }
  } catch (error) {
    if (status) status.textContent = error.message;
  }
})();
