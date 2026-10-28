// Floating log console: opens when debug mode is turned on, stays open until the player
// closes it (turning debug off does not hide it). Shows logger lines and console.* output.
import { onLog, recentLog, logInfo } from './logger.js';

const MAX_LINES = 800;

export class DebugConsole {
  constructor() {
    this.el = null;
    this.body = null;
    this.open = false;
    this.autoScroll = true;
    this.offLog = null;
    this.orig = null;
  }

  show() {
    if (this.open) {
      this.el?.classList.add('dbg-flash');
      setTimeout(() => this.el?.classList.remove('dbg-flash'), 400);
      return;
    }
    this.open = true;
    const root = document.createElement('div');
    root.className = 'debug-console hitzone';
    root.innerHTML = `
      <div class="dbg-head">
        <span class="dbg-title">Console</span>
        <span class="dbg-hint">logs do sistema · fecha só aqui</span>
        <button type="button" class="dbg-btn" data-act="clear" title="Limpar">Limpar</button>
        <button type="button" class="dbg-btn" data-act="copy" title="Copiar">Copiar</button>
        <button type="button" class="dbg-btn dbg-close" data-act="close" title="Fechar">✕</button>
      </div>
      <pre class="dbg-body"></pre>`;
    document.body.append(root);
    this.el = root;
    this.body = root.querySelector('.dbg-body');
    this.autoScroll = true;
    this.body.addEventListener('scroll', () => {
      const el = this.body;
      this.autoScroll = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    });
    root.querySelector('.dbg-head').addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      this.drag(e);
    });
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') this.hide();
      else if (act === 'clear') this.clear();
      else if (act === 'copy') this.copy();
    });
    // Seed with recent buffer, then follow live lines.
    const seed = recentLog();
    if (seed) this.body.textContent = seed + '\n';
    this.offLog = onLog((line, level) => this.append(line, level));
    this.hookConsole();
    this.scrollEnd();
    logInfo('console', 'console aberto');
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this.offLog?.();
    this.offLog = null;
    this.unhookConsole();
    this.el?.remove();
    this.el = this.body = null;
  }

  clear() {
    if (this.body) this.body.textContent = '';
  }

  async copy() {
    const text = this.body?.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      logInfo('console', 'copiado para a área de transferência');
    } catch {
      logInfo('console', 'falha ao copiar');
    }
  }

  append(line, level) {
    if (!this.body) return;
    const span = document.createElement('span');
    span.className = `dbg-line dbg-${(level || 'INFO').toLowerCase()}`;
    span.textContent = line + '\n';
    this.body.append(span);
    while (this.body.childNodes.length > MAX_LINES) this.body.firstChild.remove();
    if (this.autoScroll) this.scrollEnd();
  }

  scrollEnd() {
    if (this.body) this.body.scrollTop = this.body.scrollHeight;
  }

  drag(e) {
    const el = this.el;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    const move = (ev) => {
      el.style.left = `${Math.max(4, Math.min(innerWidth - 80, ev.clientX - ox))}px`;
      el.style.top = `${Math.max(4, Math.min(innerHeight - 40, ev.clientY - oy))}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  // Mirror console.* into the panel while it is open (does not replace the originals).
  hookConsole() {
    if (this.orig) return;
    const self = this;
    this.orig = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };
    const wrap = (level, fn) => (...args) => {
      fn(...args);
      if (!self.open) return;
      const msg = args.map((a) => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      }).join(' ');
      self.append(`${new Date().toLocaleTimeString('pt-BR', { hour12: false })} [${level}] [js] ${msg}`, level);
    };
    console.log = wrap('INFO', this.orig.log);
    console.info = wrap('INFO', this.orig.info);
    console.warn = wrap('WARN', this.orig.warn);
    console.error = wrap('ERROR', this.orig.error);
  }

  unhookConsole() {
    if (!this.orig) return;
    console.log = this.orig.log;
    console.info = this.orig.info;
    console.warn = this.orig.warn;
    console.error = this.orig.error;
    this.orig = null;
  }
}
