// Adapter protokol simulator lama ke kanal Supabase privat.
window.IoTSocket = class {
  static OPEN = 1;
  readyState = 0;
  constructor() {
    const { client, user } = window.IoT;
    this.channel = client.channel(`iot:${user.id}`, { config: { private: true, broadcast: { self: false } } });
    this.channel.on('broadcast', { event: 'iot' }, ({ payload }) => {
      if (payload && (payload.type !== 'WRITE' || (/^V[0-9]{1,3}$/.test(payload.pin) && ['number','boolean','string'].includes(typeof payload.value) && !/[<>&"']/.test(String(payload.value)))) && ['WRITE', 'PING'].includes(payload.type)) this.onmessage?.({ data: JSON.stringify(payload) });
    }).subscribe(status => {
      if (this.closed) return;
      if (status === 'SUBSCRIBED') { this.readyState = 1; this.onopen?.(); }
      else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        this.readyState = 0; this.onerror?.(new Error(status));
      }
    });
  }
  send(raw) {
    if (this.readyState !== 1) return;
    const payload = JSON.parse(raw);
    this.channel.send({ type: 'broadcast', event: 'iot', payload }).then(result => {
      if (result !== 'ok') this.onerror?.(new Error('Pesan gagal terkirim'));
    });
  }
  close() {
    this.closed = true; this.readyState = 3; clearInterval(window.iotHeartbeat);
    window.IoT.client.removeChannel(this.channel);
  }
};
window.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div');
  bar.className = 'cloud-account';
  const text = document.createElement('span'); text.textContent = window.IoT.user.email;
  const logout = document.createElement('button'); logout.textContent = 'Keluar';
  logout.onclick = async () => { await window.IoT.client.auth.signOut(); location.reload(); };
  bar.append(text, logout); document.body.append(bar);
  window.IoT.client.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_OUT') location.reload();
    if(event === 'TOKEN_REFRESHED' && session) queueMicrotask(() => window.IoT.client.realtime.setAuth(session.access_token));
  });
});
