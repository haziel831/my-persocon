// Floating chat-style panel for the Streamer stage: draggable, resizable,
// hideable and persisted in config (save-streamer.json).
const MAX = 30;
const DEFAULTS = { x: 24, y: 90, w: 360, h: 320, visible: true };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clean = (s) => String(s ?? '').replace(/[<>&"']/g, '').slice(0, 220);

export class StreamChatBox {
  constructor(app) {
    this.app = app;
    this.items = [];
    this.root = document.createElement('div');
    this.root.className = 'stream-chatbox';
    this.head = document.createElement('div');
    this.head.className = 'scb-head';
    const grip = document.createElement('span');
    grip.className = 'scb-grip';
    grip.textContent = '⋮⋮';
    const title = document.createElement('span');
    title.className = 'scb-title';
    title.textContent = 'Chat';
    this.clearBtn = document.createElement('button');
    this.clearBtn.className = 'scb-btn';
    this.clearBtn.title = 'Limpar';
    this.clearBtn.textContent = '⌫';
    this.hideBtn = document.createElement('button');
    this.hideBtn.className = 'scb-btn';
    this.hideBtn.title = 'Esconder';
    this.hideBtn.textContent = '×';
    this.head.append(grip, title, this.clearBtn, this.hideBtn);
    this.list = document.createElement('div');
    this.list.className = 'scb-list';
    this.resize = document.createElement('div');
    this.resize.className = 'scb-resize';
    this.root.append(this.head, this.list, this.resize);
    document.body.append(this.root);
    this.bind();
    this.restore();
  }

  get cfg() { return this.app.config.streamChatBox || {}; }

  save() {
    this.app.setOption?.('streamChatBox', { ...DEFAULTS, ...this.cfg, ...this.geom, visible: this.visible });
  }

  get geom() {
    const r = this.root.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }

  get visible() { return this.root.style.display !== 'none'; }

  restore() {
    const c = { ...DEFAULTS, ...this.cfg };
    this.root.style.left = `${clamp(c.x, 0, Math.max(0, innerWidth - 120))}px`;
    this.root.style.top = `${clamp(c.y, 0, Math.max(0, innerHeight - 80))}px`;
    this.root.style.width = `${clamp(c.w, 240, Math.min(700, innerWidth))}px`;
    this.root.style.height = `${clamp(c.h, 180, Math.min(720, innerHeight))}px`;
    this.setVisible(c.visible !== false);
  }

  setVisible(on) {
    this.root.style.display = on ? 'flex' : 'none';
    if (on) this.scroll();
  }

  toggle() { this.setVisible(!this.visible); this.save(); }

  reset() {
    this.app.setOption?.('streamChatBox', { ...DEFAULTS });
    Object.assign(this.root.style, {
      left: `${DEFAULTS.x}px`, top: `${DEFAULTS.y}px`,
      width: `${DEFAULTS.w}px`, height: `${DEFAULTS.h}px`,
    });
    this.setVisible(true);
  }

  push(kind, text) {
    if (!text) return;
    const row = document.createElement('div');
    row.className = `scb-row scb-${kind}`;
    const tag = document.createElement('span');
    tag.className = 'scb-tag';
    tag.textContent = kind === 'pet' ? 'P' : kind.slice(0, 2).toUpperCase();
    const body = document.createElement('span');
    body.textContent = clean(text);
    row.append(tag, body);
    this.list.append(row);
    this.items.push(row);
    while (this.items.length > MAX) this.items.shift().remove();
    this.scroll();
  }

  scroll() { requestAnimationFrame(() => { this.list.scrollTop = this.list.scrollHeight; }); }

  clear() { for (const el of this.items) el.remove(); this.items.length = 0; }

  destroy() { this.root.remove(); this.items.length = 0; }

  bind() {
    let drag = null;
    this.head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const r = this.root.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      this.head.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    this.head.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = this.root.getBoundingClientRect();
      this.root.style.left = `${clamp(drag.left + e.clientX - drag.x, 0, innerWidth - r.width)}px`;
      this.root.style.top = `${clamp(drag.top + e.clientY - drag.y, 0, innerHeight - r.height)}px`;
    });
    const endDrag = () => { if (drag) { drag = null; this.save(); } };
    this.head.addEventListener('pointerup', endDrag);
    this.head.addEventListener('pointercancel', endDrag);

    let size = null;
    this.resize.addEventListener('pointerdown', (e) => {
      const r = this.root.getBoundingClientRect();
      size = { x: e.clientX, y: e.clientY, w: r.width, h: r.height };
      this.resize.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    this.resize.addEventListener('pointermove', (e) => {
      if (!size) return;
      this.root.style.width = `${clamp(size.w + e.clientX - size.x, 240, Math.min(700, innerWidth))}px`;
      this.root.style.height = `${clamp(size.h + e.clientY - size.y, 180, Math.min(720, innerHeight))}px`;
    });
    const endSize = () => { if (size) { size = null; this.save(); } };
    this.resize.addEventListener('pointerup', endSize);
    this.resize.addEventListener('pointercancel', endSize);

    this.hideBtn.onclick = () => this.toggle();
    this.clearBtn.onclick = () => this.clear();
  }
}
