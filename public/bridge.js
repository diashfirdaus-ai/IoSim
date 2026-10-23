// Adapter protokol simulator ke kanal Supabase privat & sinkronisasi database.
if (window.IoT) {
  const { client, user } = window.IoT;
  window.IoT.saveWorkspace = async (type, data) => {
    if (!client || typeof client.from !== 'function' || !user?.id) return;
    try {
      await client.from('iot_workspaces').upsert({
        user_id: user.id,
        workspace_type: type,
        data: data,
        updated_at: new Date().toISOString()
      });
    } catch(err) { console.warn('Gagal menyimpan workspace ke database:', err); }
  };

  window.IoT.loadWorkspace = async (type) => {
    if (!client || typeof client.from !== 'function' || !user?.id) return null;
    try {
      const { data, error } = await client.from('iot_workspaces')
        .select('data')
        .eq('user_id', user.id)
        .eq('workspace_type', type)
        .maybeSingle();
      if (!error && data && data.data) return data.data;
    } catch(err) { console.warn('Gagal memuat workspace dari database:', err); }
    return null;
  };

  window.IoT.savePinData = async (pin, value) => {
    if (!client || typeof client.from !== 'function' || !user?.id) return;
    try {
      const pinStr = String(pin);
      const valStr = String(value);
      await client.from('iot_device_data').upsert({
        user_id: user.id,
        pin: pinStr,
        value: valStr,
        updated_at: new Date().toISOString()
      });
      await client.from('iot_telemetry_logs').insert({
        user_id: user.id,
        pin: pinStr,
        value: valStr
      });
    } catch(err) { console.warn('Gagal menyimpan telemetri ke database:', err); }
  };
}

window.IoTSocket = class {
  static OPEN = 1;
  readyState = 0;
  constructor() {
    const { client, user } = window.IoT;
    this.channel = client.channel(`iot:${user.id}`, { config: { private: true, broadcast: { self: false } } });
    this.channel.on('broadcast', { event: 'iot' }, ({ payload }) => {
      if (payload && (payload.type !== 'WRITE' || (/^V[0-9]{1,3}$/.test(payload.pin) && ['number','boolean','string'].includes(typeof payload.value) && !/[<>&"']/.test(String(payload.value)))) && ['WRITE', 'PING'].includes(payload.type)) {
        this.onmessage?.({ data: JSON.stringify(payload) });
        if (payload.type === 'WRITE' && payload.pin) window.IoT?.savePinData?.(payload.pin, payload.value);
      }
    }).subscribe(status => {
      if (this.closed) return;
      if (status === 'SUBSCRIBED') {
        this.readyState = 1;
        this.onopen?.();
        if (client && typeof client.from === 'function' && user?.id) {
          client.from('iot_device_data').select('pin, value').eq('user_id', user.id).then(({ data, error }) => {
            if (!error && Array.isArray(data) && data.length > 0) {
              const state = {};
              data.forEach(item => { state[item.pin] = item.value; });
              this.onmessage?.({ data: JSON.stringify({ type: 'SYNC', state }) });
            }
          }).catch(() => {});
        }
      }
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
    if (payload && payload.type === 'WRITE' && payload.pin) {
      window.IoT?.savePinData?.(payload.pin, payload.value);
    }
  }
  close() {
    this.closed = true; this.readyState = 3; clearInterval(window.iotHeartbeat);
    window.IoT.client.removeChannel(this.channel);
  }
};
window.addEventListener('DOMContentLoaded', () => {
  if (!window.IoT?.user) return;
  const bar = document.createElement('div');
  bar.className = 'cloud-account';
  const text = document.createElement('span'); text.textContent = window.IoT.user.email;
  const logout = document.createElement('button'); logout.textContent = 'Keluar';
  logout.onclick = async () => { await window.IoT.client.auth.signOut(); window.location.replace('/login.html'); };
  bar.append(text, logout); document.body.append(bar);
  if (window.IoT.client?.auth) {
    window.IoT.client.auth.onAuthStateChange((event, session) => {
      if(event === 'SIGNED_OUT') window.location.replace('/login.html');
      if(event === 'TOKEN_REFRESHED' && session) queueMicrotask(() => window.IoT.client.realtime.setAuth(session.access_token));
    });
  }
});
