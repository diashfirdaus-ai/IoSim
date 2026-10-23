const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if(req.method !== 'GET') return res.status(405).end();
  const page = req.query.name;
  if(!['index','dashboard','esp','raspi','jetson','jetson-learn'].includes(page)) return res.status(404).end();
  const authorization = req.headers.authorization || '';
  if(!authorization.startsWith('Bearer ') || authorization.length < 8) return res.status(401).json({error:'Silakan masuk.'});
  try {
    const base = process.env.SUPABASE_URL;
    const headers = { apikey: process.env.SUPABASE_ANON_KEY, Authorization: authorization };
    const auth = await fetch(`${base}/auth/v1/user`, {headers,signal:AbortSignal.timeout(10000)});
    if(!auth.ok) return res.status(401).json({error:'Sesi berakhir. Silakan masuk kembali.'});
    const user = await auth.json();
    if(!user.id) return res.status(401).json({error:'Akun tidak valid.'});
    const query = new URLSearchParams({select:'user_id',user_id:`eq.${user.id}`,enabled:'eq.true'});
    const membership = await fetch(`${base}/rest/v1/app_members?${query}`,{headers,signal:AbortSignal.timeout(10000)});
    if(!membership.ok) return res.status(503).json({error:'Pemeriksaan izin gagal. Periksa konfigurasi database.'});
    const members = await membership.json();
    if(!Array.isArray(members) || members.length !== 1) return res.status(403).json({error:'Akun belum mendapat izin admin.'});
    const html = await fs.readFile(path.join(process.cwd(),'pages',`${page}.html`),'utf8');
    res.setHeader('Content-Type','text/html; charset=utf-8'); res.send(html);
  } catch { res.status(503).json({error:'Layanan belum siap. Periksa konfigurasi Supabase.'}); }
};
