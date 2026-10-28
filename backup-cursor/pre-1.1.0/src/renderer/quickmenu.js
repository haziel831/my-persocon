// Quick Menu: opened by double-clicking the pet or a piece of furniture. Quick on/off switches.
export class QuickMenu {
  constructor(app) {
    this.app = app;
    this.el = null;
  }

  get open() {
    return !!this.el;
  }

  show(x, y) {
    const { app } = this;
    this.close();
    const el = document.createElement('div');
    el.className = 'quick-menu hitzone';
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    const title = document.createElement('div');
    title.className = 'qm-title';
    title.textContent = 'Quick Menu';
    const item = (label, key, tip) => {
      const on = !!app.config[key];
      const btn = document.createElement('button');
      btn.className = `qm-item${on ? ' on' : ''}`;
      btn.innerHTML = `<span>${label}</span><b>${on ? 'ON' : 'OFF'}</b>`;
      if (tip) btn.title = tip;
      btn.onclick = () => {
        app.sound.play('ok');
        this.close();
        app.setOption(key, !on);
      };
      return btn;
    };
    el.append(title,
      item('🎯 Modo foco', 'focus', 'Menos distrativa: fala e se mexe menos, não pede coisas, não escala janelas nem reage ao desktop'),
      item('🎥 Streamer Mode', 'streamer'),
      item('🖱 Clicar através', 'clickThrough', 'Os cliques passam pela Persocon, objetos e mobília (para desligar: ícone da bandeja › Clicar através)'));
    document.body.append(el);
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.round(Math.min(Math.max(6, x - r.width / 2), innerWidth - r.width - 6))}px`;
    el.style.top = `${Math.round(Math.min(Math.max(6, y - r.height - 14), innerHeight - r.height - 6))}px`;
    this.el = el;
    app.sound.play('blip', { volume: 0.5 });
    app.uiChanged();
  }

  close() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    this.app.uiChanged();
  }
}
