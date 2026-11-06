// Floating log console: opens when debug mode is turned on, stays open until the player
// closes it (turning debug off does not hide it). Shows logger lines and console.* output, plus a chat tab.
import { onLog, recentLog, logInfo } from './logger.js';

const MAX_LINES = 800;

export class DebugConsole {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.body = null;
    this.chatBody = null;
    this.open = false;
    this.view = 'log';
    this.autoScroll = true;
    this.offLog = null;
    this.orig = null;
    this.chatTimer = null;
    this.speechHistory = app.speechHistory || [];
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
      <div class="dbg-tabs">
        <button type="button" class="dbg-btn dbg-tab active" data-act="tab-log">Log</button>
        <button type="button" class="dbg-btn dbg-tab" data-act="tab-chat">Chat</button>
      </div>
      <pre class="dbg-body dbg-log"></pre>
      <pre class="dbg-body dbg-chat" style="display:none"></pre>`;
    document.body.append(root);
    this.el = root;
    this.body = root.querySelector('.dbg-log');
    this.chatBody = root.querySelector('.dbg-chat');
    this.view = 'log';
    this.autoScroll = true;
    this.body.addEventListener('scroll', () => {
      const el = this.body;
      this.autoScroll = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    });
    this.chatBody.addEventListener('scroll', () => {
      const el = this.chatBody;
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
      else if (act === 'tab-log') this.setView('log');
      else if (act === 'tab-chat') this.setView('chat');
    });
    const seed = recentLog();
    if (seed) this.body.textContent = seed + '\n';
    this.offLog = onLog((line, level) => this.append(line, level));
    this.hookConsole();
    this.refreshChat();
    this.scrollEnd();
    this.chatTimer = setInterval(() => this.refreshChat(), 1500);
    logInfo('console', 'console aberto');
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this.offLog?.();
    this.offLog = null;
    this.unhookConsole();
    this.el?.remove();
    this.el = this.body = this.chatBody = null;
    if (this.chatTimer) { clearInterval(this.chatTimer); this.chatTimer = null; }
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

  setView(v) {
    this.view = v;
    this.el?.querySelectorAll('.dbg-tab').forEach((b) => b.classList.toggle('active', b.dataset.act === `tab-${v}`));
    if (this.body) this.body.style.display = v === 'log' ? '' : 'none';
    if (this.chatBody) this.chatBody.style.display = v === 'chat' ? '' : 'none';
    if (v === 'chat') this.refreshChat();
    this.scrollEnd();
  }

  append(line, level) {
    if (!this.body) return;
    const span = document.createElement('span');
    span.className = `dbg-line dbg-${(level || 'INFO').toLowerCase()}`;
    span.textContent = line + '\n';
    this.body.append(span);
    while (this.body.childNodes.length > MAX_LINES) this.body.firstChild.remove();
    if (this.autoScroll && this.view === 'log') this.scrollEnd();
  }

  refreshChat() {
    if (!this.chatBody) return;
    this.chatBody.textContent = (this.app.speechHistory || []).map((t) => '• ' + t).join('\n');
    if (this.view === 'chat' && this.autoScroll) this.scrollEnd();
  }

  scrollEnd() {
    const target = this.view === 'chat' ? this.chatBody : this.body;
    if (target) target.scrollTop = target.scrollHeight;
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

  hookConsole() {
    const orig = console.log.bind(console);
    this.orig = orig;
    console.log = (...a) => { orig(...a); logInfo('console', a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); };
  }

  unhookConsole() {
    if (this.orig) console.log = this.orig;
  }
}
