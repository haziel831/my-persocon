// Debug log (only with config.debug on): "HH:MM:SS.mmm [NIVEL] [módulo] mensagem" lines, deduplicated
// and sent in batches every few seconds; the host writes them to log/AAAA-MM-DD.log.

const FLUSH_MS = 3000;
const MAX_BUF = 500;
// null = config not read yet: early lines wait in the buffer and are dropped if debug is off.
let enabled = null;
let buf = [];
let last = null;
let repeat = 0;
let timer = 0;

const pad = (n, w = 2) => String(n).padStart(w, '0');
function stamp() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function pushRepeat() {
  if (repeat) buf.push(`${stamp()} [INFO] [log] última linha repetida ${repeat} ${repeat > 1 ? 'vezes' : 'vez'}`);
  repeat = 0;
}

function schedule() {
  if (enabled && !timer) timer = setTimeout(flushLog, FLUSH_MS);
}

// The last lines are always kept in memory (even with debug off) for the bug report / console.
const RECENT_MAX = 300;
const recent = [];
const listeners = new Set();
export const recentLog = () => recent.join('\n');
export function onLog(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function log(level, mod, msg) {
  const text = String(msg ?? '').trimEnd().replace(/\r?\n/g, '\n    ');
  const line = `${stamp()} [${level}] [${mod}] ${text}`;
  if (recent.at(-1)?.endsWith(`[${mod}] ${text}`) !== true) {
    recent.push(line);
    if (recent.length > RECENT_MAX) recent.shift();
  }
  for (const fn of listeners) {
    try { fn(line, level, mod, text); } catch { /* ignore subscriber errors */ }
  }
  if (enabled === false) return;
  const key = `${level}|${mod}|${text}`;
  if (key === last) {
    repeat++;
    return schedule();
  }
  pushRepeat();
  last = key;
  buf.push(line);
  if (buf.length > MAX_BUF) buf.splice(0, buf.length - MAX_BUF);
  schedule();
}

export const logInfo = (mod, msg) => log('INFO', mod, msg);
export const logWarn = (mod, msg) => log('WARN', mod, msg);
export const logError = (mod, msg) => log('ERROR', mod, msg);
export const logEnabled = () => enabled === true;

export function flushLog() {
  clearTimeout(timer);
  timer = 0;
  if (!enabled) return Promise.resolve();
  pushRepeat();
  if (!buf.length) return Promise.resolve();
  const lines = buf;
  buf = [];
  return Promise.resolve(window.petAPI?.logLines?.(lines)).catch(() => {});
}

export function setLogEnabled(on) {
  enabled = !!on;
  if (enabled) return schedule();
  clearTimeout(timer);
  timer = 0;
  buf = [];
  repeat = 0;
  last = null;
}

// Short "k=v" summary of an event payload (objects reduced to their id/name).
export function brief(data) {
  if (data === null || data === undefined) return '';
  if (typeof data !== 'object') return String(data);
  const out = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === 'img' || typeof v === 'function') continue;
    let val = v;
    if (Array.isArray(v)) val = `[${v.length}]`;
    else if (v && typeof v === 'object') val = v.id ?? v.name ?? '{…}';
    else if (typeof v === 'number') val = Math.round(v * 100) / 100;
    out.push(`${k}=${val}`);
  }
  return out.join(' ').slice(0, 300);
}

export function installErrorHooks() {
  const file = (f) => String(f || '').split('/').pop();
  window.addEventListener('error', (e) => {
    const where = e.filename ? ` @ ${file(e.filename)}:${e.lineno}:${e.colno}` : '';
    const stack = String(e.error?.stack || '').split('\n').slice(1).join('\n');
    logError('js', `${e.message}${where}${stack ? `\n${stack}` : ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => logError('promise', String(e.reason?.stack || e.reason)));
}
