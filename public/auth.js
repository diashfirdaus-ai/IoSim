(async () => {
 const status = document.getElementById('status'), form = document.querySelector('form');
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
   event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
   try {
    status.textContent = 'Memverifikasi akun…';
    const {data,error} = await client.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value});
    if(error) throw Error('Email atau kata sandi tidak sesuai.'); await enter(data.session);
   } catch(error) { status.textContent = error.message; button.disabled = false; }
  });
  document.getElementById('switch-account').onclick = async () => { await client.auth.signOut(); location.reload(); };
  const {data} = await client.auth.getSession();
  if(data.session) await enter(data.session); else status.textContent = 'Gunakan akun yang diberikan oleh admin.';
 } catch(error) {status.textContent = error.message;}
})();
