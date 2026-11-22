// Quick Menu: opened with X while hovering the pet (or by clicking a piece of furniture).
import { itemById, HER_BAG } from './game.js';
import { confirmStreamer } from './streamerconfirm.js';
import { STREAM } from './edition.js';
export class QuickMenu {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.bagEl = null;
  }

  get open() {
    return !!this.el || !!this.bagEl;
  }

  show(x, y) {
    const { app } = this;
    this.close();
    app.closeAllMenus?.();
    const el = document.createElement('div');
    el.className = 'quick-menu hitzone';
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    const title = document.createElement('div');
    title.className = 'qm-title';
    title.textContent = 'Quick Menu';
    const item = (label, key, tip) => {
      const on = key === 'sound' ? app.config.sound !== false : !!app.config[key];
      const btn = document.createElement('button');
      btn.className = `qm-item${on ? ' on' : ''}`;
      btn.innerHTML = `<span>${label}</span><b>${on ? 'ON' : 'OFF'}</b>`;
      if (tip) btn.title = tip;
      btn.onclick = () => {
        app.sound.play('ok');
        this.close();
        if (key === 'streamer' && !on) confirmStreamer(app, () => app.setOption('streamer', true));
        else app.setOption(key, !on);
      };
      return btn;
    };
    const ttsToggle = () => {
      const streamer = STREAM && (!!window.__PET_STREAMER__ || !!app.config.streamer);
      const key = streamer ? 'ttsEnabled' : 'offlineTts';
      const on = key === 'ttsEnabled' ? app.config.ttsEnabled !== false : app.config.offlineTts === true;
      const btn = document.createElement('button');
      btn.className = `qm-item${on ? ' on' : ''}`;
      btn.innerHTML = `<span>🗣 TTS</span><b>${on ? 'ON' : 'OFF'}</b>`;
      btn.title = streamer ? 'Voz do Modo Streamer' : 'Voz offline do jogo';
      btn.onclick = () => { app.sound.play('ok'); this.close(); app.setOption(key, !on); };
      return btn;
    };
    const action = (label, tip, fn) => {
      const btn = document.createElement('button');
      btn.className = 'qm-item';
      btn.innerHTML = `<span>${label}</span><b>›</b>`;
      if (tip) btn.title = tip;
      btn.onclick = () => {
        app.sound.play('ok');
        const bx = parseFloat(el.style.left) || x;
        const by = parseFloat(el.style.top) || y;
        this.close();
        fn(bx, by);
      };
      return btn;
    };
    // Volume sliders: same keys as Options › Som (the voice plays a sample when released).
    const slider = (label, key, def, max = 1) => {
      const row = document.createElement('label');
      row.className = 'qm-vol';
      const name = document.createElement('span');
      name.textContent = label;
      const input = document.createElement('input');
      Object.assign(input, { type: 'range', min: 0, max, step: 0.05, value: app.config[key] ?? def });
      const val = document.createElement('b');
      const show = () => { val.textContent = `${Math.round(input.value * 100)}%`; };
      show();
      input.oninput = () => {
        show();
        if (key !== 'voiceVolume') app.setOption(key, Number(input.value));
      };
      input.onchange = () => {
        if (key === 'voiceVolume') app.setOption(key, Number(input.value));
        else if (key === 'volume') app.sound.play('blip');
      };
      row.append(name, input, val);
      return row;
    };
    const pomo = app.pomodoro;
    const focusItems = !pomo ? [] : pomo.active
      ? [
        action(pomo.paused ? '▶ Retomar foco' : '⏱ Pausar foco', 'Modo Foco (Pomodoro)', () => pomo.toggle()),
        action('✕ Cancelar foco', 'Encerra a sessão de foco', () => pomo.cancel()),
      ]
      : [
        action('⏱ Foco 25/5', '25 min de foco com a Persocon e a Boneca, 5 min de pausa', () => pomo.start('25/5')),
        action('⏱ Foco 50/10', '50 min de foco com a Persocon e a Boneca, 10 min de pausa', () => pomo.start('50/10')),
      ];
    const vol = document.createElement('div');
    vol.className = 'qm-title';
    vol.textContent = 'Volume';
    const bag = app.game.herBag();
    const cap = app.game.bagCap();
    el.append(title,
      (HER_BAG || bag.length) ? action(
        `🎒 Inventário dela (${bag.length}/${cap})`,
        HER_BAG ? 'Itens que ela guarda (hook, Syntoyo, consoles…)' : 'Bolsa pausada — só devolver itens que ainda estão nela',
        (bx, by) => this.showBag(bx, by),
      ) : null,
      item('🎯 Modo foco', 'focus', 'Menos distrativa: fala e se mexe menos, não pede coisas, não escala janelas nem reage ao desktop'),
      ...focusItems,
      ...(STREAM ? [item('🎥 Streamer Mode', 'streamer')] : []),
      item('🖱 Clicar através', 'clickThrough', 'Os cliques passam pela Persocon, objetos e mobília (para desligar: ícone da bandeja › Clicar através)'),
      vol,
      slider('🔊 Efeitos', 'volume', 0.3),
      slider('🗨 Voz', 'voiceVolume', 0.7),
      slider('🎮 GameBuddy', 'gbVolume', 0.25, 2),
      item('🔈 Efeitos sonoros', 'sound'),
      ttsToggle());
    document.body.append(el);
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.round(Math.min(Math.max(6, x - r.width / 2), innerWidth - r.width - 6))}px`;
    el.style.top = `${Math.round(Math.min(Math.max(6, y - r.height - 14), innerHeight - r.height - 6))}px`;
    this.el = el;
    const out = (e) => { if (!el.contains(e.target)) this.close(); };
    this._out = out;
    setTimeout(() => this.el === el && addEventListener('pointerdown', out, true), 0);
    this._key = (e) => { if (e.key === 'Escape') this.close(); };
    window.addEventListener('keydown', this._key);
    app.sound.play('blip', { volume: 0.5 });
    app.uiChanged();
  }

  showBag(x, y) {
    const { app } = this;
    this.close();
    const game = app.game;
    const el = document.createElement('div');
    el.className = 'quick-menu her-bag hitzone';
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    const title = document.createElement('div');
    title.className = 'qm-title';
    const render = () => {
      el.innerHTML = '';
      const bag = game.herBag();
      const cap = game.bagCap();
      title.textContent = `Inventário dela (${bag.length}/${cap})`;
      el.append(title);
      const note = document.createElement('div');
      note.className = 'qm-note';
      note.textContent = HER_BAG
        ? 'Comidas, bebidas e brinquedos · arraste do desktop · clique num slot para devolver ao seu inventário'
        : 'Bolsa dela pausada · clique num slot para devolver ao seu inventário';
      el.append(note);
      const grid = document.createElement('div');
      grid.className = 'her-bag-grid';
      for (let i = 0; i < cap; i++) {
        const id = bag[i];
        const slot = document.createElement('button');
        slot.className = `her-bag-slot${id ? '' : ' empty'}`;
        if (id) {
          const it = itemById(id);
          slot.innerHTML = `<img src="${it?.img || ''}" alt=""><span>${it?.name || id}</span>`;
          slot.title = `${it?.name || id} · clique para devolver`;
          slot.onclick = () => {
            if (game.bagTake(id)) {
              app.sound.play('ok');
              render();
              app.uiChanged();
            }
          };
        } else slot.textContent = '·';
        grid.append(slot);
      }
      el.append(grid);
      const back = document.createElement('button');
      back.className = 'qm-item';
      back.innerHTML = '<span>‹ Voltar</span><b></b>';
      back.onclick = () => {
        const bx = parseFloat(el.style.left) || x;
        const by = parseFloat(el.style.top) || y;
        this.close();
        this.show(bx, by);
      };
      el.append(back);
    };
    // Drop a desktop toy onto the panel → she keeps it.
    el.addEventListener('pointerup', (e) => {
      if (!HER_BAG) return;
      const id = app.toys?.draggingId || document.body.dataset.dragToy;
      if (!id) return;
      const bid = String(id).split('#')[0];
      const it = itemById(bid);
      if (!it || !game.canBag?.(bid)) return;
      if (game.bagStore(bid)) {
        app.sound.play('ok');
        render();
        app.uiChanged();
      } else app.sound.play('cancel', { volume: 0.4 });
      e.stopPropagation();
    });
    render();
    document.body.append(el);
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.round(Math.min(Math.max(6, x), innerWidth - r.width - 6))}px`;
    el.style.top = `${Math.round(Math.min(Math.max(6, y), innerHeight - r.height - 6))}px`;
    this.bagEl = el;
    app.sound.play('blip', { volume: 0.5 });
    app.uiChanged();
  }

  close() {
    if (this._out) {
      removeEventListener('pointerdown', this._out, true);
      this._out = null;
    }
    if (this._key) {
      window.removeEventListener('keydown', this._key);
      this._key = null;
    }
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    if (this.bagEl) {
      this.bagEl.remove();
      this.bagEl = null;
    }
    this.app.uiChanged();
  }
}
