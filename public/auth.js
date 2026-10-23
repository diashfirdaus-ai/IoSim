(async () => {
 const status = document.getElementById('status'), form = document.querySelector('form');
 const tabLogin = document.getElementById('tab-login'), tabRegister = document.getElementById('tab-register');
 const authTitle = document.getElementById('auth-title'), submitBtn = document.getElementById('submit-btn');
 let mode = 'login';

 function setMode(newMode) {
  mode = newMode;
  if(mode === 'login') {
   tabLogin.classList.add('active'); tabRegister.classList.remove('active');
   authTitle.innerHTML = 'Satu akun.<br>Seluruh eksperimen.';
   submitBtn.textContent = 'Masuk ke laboratorium →';
   status.textContent = 'Silakan masuk dengan akun Anda.';
  } else {
   tabRegister.classList.add('active'); tabLogin.classList.remove('active');
   authTitle.innerHTML = 'Daftar Akun.<br>Mulai Eksperimen.';
   submitBtn.textContent = 'Buat Akun & Masuk →';
   status.textContent = 'Daftarkan email dan kata sandi baru.';
  }
 }
 if(tabLogin && tabRegister) {
  tabLogin.onclick = () => setMode('login');
  tabRegister.onclick = () => setMode('register');
 }

 try {
  const config = await fetch('/api/config').then(r=>r.json());
  if(!config.url || !config.key) throw Error('Admin perlu mengatur SUPABASE_URL dan SUPABASE_ANON_KEY di Vercel.');
  const client = supabase.createClient(config.url, config.key);
  async function enter(session) {
   status.textContent = 'Memeriksa izin akun…';
   const name = location.pathname.split('/').pop().replace('.html','') || 'index';
   const response = await fetch(`/api/page?name=${encodeURIComponent(name)}`, {headers:{Authorization:`Bearer ${session.access_token}`}});
   if(!response.ok) { const body = await response.json(); throw Error(body.error); }
   const html = await response.text(); window.IoT = {client, user: session.user};
   await client.realtime.setAuth(session.access_token);
   document.open(); document.write(html); document.close();
  }

  form.addEventListener('submit', async event => {
   event.preventDefault(); submitBtn.disabled = true;
   const email = form.email.value.trim();
   const password = form.password.value;
   try {
    if(mode === 'register') {
     status.textContent = 'Mendaftarkan akun baru…';
     const { data, error } = await client.auth.signUp({ email, password });
     if(error) {
      if(error.message.includes('already registered')) throw Error('Email sudah terdaftar. Silakan pilih tab Masuk.');
      throw error;
     }
     if(data && data.session) {
      status.textContent = 'Pendaftaran berhasil! Menyiapkan laboratorium…';
      await enter(data.session);
     } else {
      status.textContent = 'Pendaftaran berhasil! Jika konfirmasi email aktif di Supabase, silakan periksa email Anda lalu Masuk.';
      setMode('login');
      submitBtn.disabled = false;
     }
    } else {
     status.textContent = 'Memverifikasi akun…';
     const {data,error} = await client.auth.signInWithPassword({email, password});
     if(error) throw Error('Email atau kata sandi tidak sesuai.');
     await enter(data.session);
    }
   } catch(error) { status.textContent = error.message; submitBtn.disabled = false; }
  });

  document.getElementById('switch-account').onclick = async () => { await client.auth.signOut(); location.reload(); };
  const {data} = await client.auth.getSession();
  if(data.session) await enter(data.session); else status.textContent = 'Silakan masuk atau daftar akun baru.';
 } catch(error) {status.textContent = error.message;}
})();
