(() => {
  const key = 'itenas-iot-theme';
  const root = document.documentElement;
  const system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const valid = value => value === 'light' || value === 'dark';
  function saved() { try { return localStorage.getItem(key); } catch { return null; } }
  function apply(theme, persist = false) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (persist) { try { localStorage.setItem(key, theme); } catch {} }
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  }
  const preference = saved();
  apply(valid(preference) ? preference : system?.matches ? 'dark' : 'light');
  function mount() {
    if (document.getElementById('theme-switcher')) return;
    const group = document.createElement('div');
    group.id = 'theme-switcher'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Mode tampilan');
    for (const [theme, label] of [['light', '☀ Terang'], ['dark', '☾ Gelap']]) {
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.themeChoice = theme; button.textContent = label;
      button.addEventListener('click', () => apply(theme, true)); group.appendChild(button);
    }
    document.body.appendChild(group); apply(root.dataset.theme);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
  window.addEventListener('storage', event => {
    if (event.key === key) apply(valid(event.newValue) ? event.newValue : system?.matches ? 'dark' : 'light');
  });
  system?.addEventListener?.('change', event => { if (!valid(saved())) apply(event.matches ? 'dark' : 'light'); });
})();
