// Title screen: synthwave shader (sky, striped sun, scrolling grid) with the logo resolving from big pixels,
// then the game name and the menu (Continue / New game / Options / Tutorial / Credits / Quit).
import { textFor } from './introtext.js';
import { Music } from './music.js';
import { editionLabel, STREAM } from './edition.js';
import { translate } from './i18n.js';
import { confirmStreamer } from './streamerconfirm.js';

const LOGO_URL = new URL('./assets/logo.png', import.meta.url).href;

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uT;
uniform float uReveal;
uniform float uFade;
uniform sampler2D uLogo;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec3 scene(vec2 uv) {
  float asp = uRes.x / uRes.y;
  float hz = 0.34;
  vec3 col;
  if (uv.y > hz) {
    float k = (uv.y - hz) / (1.0 - hz);
    col = mix(vec3(1.0, 0.32, 0.5), vec3(0.06, 0.0, 0.16), pow(k, 0.55));
    vec2 g = floor(uv * vec2(140.0 * asp / 1.4, 100.0));
    float tw = 0.5 + 0.5 * sin(uT * 2.5 + hash(g + 3.1) * 40.0);
    col += step(0.993, hash(g)) * tw * k * 0.9;
    vec2 c = vec2(0.5, hz + 0.27);
    vec2 d = (uv - c) * vec2(asp, 1.0);
    float r = length(d);
    float R = 0.25;
    if (r < R) {
      float sy = (uv.y - (c.y - R)) / (2.0 * R);
      vec3 sc = mix(vec3(1.0, 0.18, 0.55), vec3(1.0, 0.86, 0.32), sy);
      float band = fract(uv.y * 34.0 + uT * 0.5);
      float cut = step(sy, 0.5) * step(band, mix(0.6, 0.06, sy / 0.5));
      col = mix(col, sc, 1.0 - cut);
    }
    col += vec3(1.0, 0.3, 0.6) * 0.3 * exp(-r * 5.0);
  } else {
    float k = (hz - uv.y) / hz;
    float z = 1.0 / max(k, 0.004);
    float x = (uv.x - 0.5) * z * asp * 1.6;
    float zz = z * 0.6 + uT * 0.9;
    float px = z / uRes.y * 1.6;
    float lx = abs(fract(x) - 0.5);
    float lz = abs(fract(zz) - 0.5);
    float line = max(step(0.5 - px * 1.2, lx), step(0.5 - px * 0.9, lz));
    vec3 base = mix(vec3(0.07, 0.0, 0.15), vec3(0.12, 0.0, 0.22), k);
    vec3 neon = mix(vec3(1.0, 0.2, 0.75), vec3(0.25, 0.9, 1.0), clamp(k * 1.3, 0.0, 1.0));
    col = base + line * neon * (0.35 + 0.75 * k);
    col += vec3(1.0, 0.25, 0.6) * 0.5 * exp(-k * 14.0);
  }
  return col;
}

vec4 tex(vec2 p) { return texture2D(uLogo, vec2(p.x, 1.0 - p.y)); }

// 3x3 tent blur: soft logo edges once it has resolved.
vec4 softTex(vec2 p, float r) {
  vec2 d = vec2(r);
  vec4 s = tex(p) * 4.0;
  s += (tex(p + vec2(d.x, 0.0)) + tex(p - vec2(d.x, 0.0)) + tex(p + vec2(0.0, d.y)) + tex(p - vec2(0.0, d.y))) * 2.0;
  s += tex(p + d) + tex(p - d) + tex(p + vec2(d.x, -d.y)) + tex(p + vec2(-d.x, d.y));
  return s / 16.0;
}

vec4 logoAt(vec2 lu, float n, float sharp) {
  vec2 cell = floor(lu * n);
  vec2 q = mix((cell + 0.5) / n, lu, sharp);
  vec4 t = mix(tex(q), softTex(q, 1.6 / 256.0), sharp);
  float show = max(sharp, step(hash(cell + floor(n)), uReveal * 1.25 - 0.1));
  return vec4(t.rgb, t.a * show);
}

vec3 shade(vec4 t, vec2 lu) {
  float lum = clamp(dot(t.rgb, vec3(0.333)) / max(t.a, 0.001), 0.0, 1.0);
  vec3 lit = mix(vec3(0.35, 0.95, 1.0), vec3(1.0, 0.45, 0.9), 1.0 - lu.y) * (0.9 + 0.2 * sin(uT * 3.0 + lu.y * 6.0));
  return mix(vec3(0.09, 0.0, 0.18), lit, smoothstep(0.35, 0.65, lum));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col = scene(uv);
  float asp = uRes.x / uRes.y;
  vec2 c = vec2(0.5, 0.61);
  float size = 0.5;
  // The gear's teeth stick out to the right: shift so its round body sits on the sun's centre.
  vec2 lu = (uv - c) * vec2(asp, 1.0) / size + vec2(0.41, 0.5);
  // CRT: tube curvature, a gentle line wobble and an occasional horizontal jolt.
  vec2 cc = lu - 0.5;
  lu = 0.5 + cc * (1.0 + 0.12 * dot(cc, cc));
  float jolt = step(0.965, hash(vec2(floor(uT * 9.0), 7.0)));
  lu.x += sin(lu.y * 90.0 + uT * 7.0) * 0.0015;
  lu.x += jolt * (hash(vec2(floor(lu.y * 26.0), floor(uT * 9.0))) - 0.5) * 0.035;
  lu.x += (hash(vec2(floor(lu.y * 18.0), floor(uT * 14.0))) - 0.5) * 0.12 * (1.0 - uReveal);
  if (lu.x > -0.1 && lu.x < 1.1 && lu.y > -0.1 && lu.y < 1.1) {
    float n = floor(mix(5.0, 200.0, pow(smoothstep(0.0, 0.85, uReveal), 2.0)));
    float sharp = smoothstep(0.75, 1.0, uReveal);
    float ab = 0.0025 + 0.006 * jolt;
    vec4 tr = logoAt(lu + vec2(ab, 0.0), n, sharp);
    vec4 tg = logoAt(lu, n, sharp);
    vec4 tb = logoAt(lu - vec2(ab, 0.0), n, sharp);
    float halo = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      halo += tex(lu + vec2(cos(a), sin(a)) * 0.035).a + tex(lu + vec2(cos(a + 0.39), sin(a + 0.39)) * 0.018).a;
    }
    halo = halo / 16.0 * smoothstep(0.15, 0.7, uReveal);
    vec3 glow = mix(vec3(1.0, 0.25, 0.8), vec3(0.3, 0.95, 1.0), lu.y);
    col = mix(col, glow * 1.15, (1.0 - tg.a) * halo * 0.85);
    col.r = mix(col.r, shade(tr, lu).r, tr.a);
    col.g = mix(col.g, shade(tg, lu).g, tg.a);
    col.b = mix(col.b, shade(tb, lu).b, tb.a);
  }
  col *= 1.0 + 0.07 * smoothstep(0.97, 1.0, sin(uv.y * 2.5 - uT * 1.3));
  col *= 0.86 + 0.14 * sin(gl_FragCoord.y * 3.14159);
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * 0.9;
  gl_FragColor = vec4(col * uFade, 1.0);
}`;

// 5x7 pixel font for the game name.
const GLYPHS = {
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], ' ': ['000', '000', '000', '000', '000', '000', '000'],
};

export function pixelText(text) {
  const chars = [...text.toUpperCase()].map((ch) => GLYPHS[ch] || GLYPHS[' ']);
  const w = chars.reduce((s, g) => s + g[0].length + 1, 0) + 1;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 9;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 8);
  grad.addColorStop(0, '#9ff6ff');
  grad.addColorStop(0.45, '#ffffff');
  grad.addColorStop(0.55, '#ff6ad5');
  grad.addColorStop(1, '#a63bff');
  let x = 0;
  for (const glyph of chars) {
    glyph.forEach((row, y) => [...row].forEach((p, i) => {
      if (p !== '1') return;
      g.fillStyle = '#2a0845';
      g.fillRect(x + i + 1, y + 2, 1, 1);
    }));
    glyph.forEach((row, y) => [...row].forEach((p, i) => {
      if (p !== '1') return;
      g.fillStyle = grad;
      g.fillRect(x + i, y + 1, 1, 1);
    }));
    x += glyph[0].length + 1;
  }
  return c;
}

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class TitleScreen {
  constructor(app, { canContinue, onContinue, onNewGame }) {
    this.app = app;
    this.canContinue = canContinue;
    this.onContinue = onContinue;
    this.onNewGame = onNewGame;
    this.music = new Music(app.sound);
    this.t = 0;
    this.speed = 1; // visual intro only — music stays at 1×
    this.raf = 0;
  }

  get T() {
    return textFor(this.app.config);
  }

  async show() {
    const T = this.T;
    this.root = el('div', 'title-back');
    this.root.dataset.noI18n = '';
    this.panel = el('div', 'title-panel hitzone');
    this.canvas = el('canvas', 'title-gl');
    this.nameEl = el('div', 'title-name');
    this.nameEl.append(pixelText('MY PERSOCON'));
    this.badge = el('div', 'title-badge', `v${this.app.version || ''} · ${editionLabel(T.earlyAccess)}`);
    this.modeBadge = el('div', 'title-mode-badge');
    this.modeMain = el('div', 'title-mode-main');
    this.modeSub = el('div', 'title-mode-sub');
    this.modeBtn = el('button', 'act title-mode-btn');
    this.modeBadge.append(this.modeMain, this.modeSub, this.modeBtn);
    this.modeToast = el('div', 'title-mode-toast');
    this.menuEl = el('div', 'title-menu');
    this.langEl = el('div', 'title-lang');
    this.panel.append(this.canvas, this.nameEl, this.badge, this.modeBadge, this.menuEl, this.langEl, this.modeToast);
    this.refreshModeBadge();
    this.buildLang();
    this.root.append(this.panel);
    document.body.append(this.root);
    document.body.classList.add('title-on');
    this.app.dialog = 'title';
    this.app.uiChanged?.();
    this.buildMenu();
    this.onKey = (e) => this.key(e);
    window.addEventListener('keydown', this.onKey);
    await this.initGL();
    this.music.start(0.9); // a bit louder, still below clipping (master volume/mute still apply)
    // Click / tap anywhere during the logo intro: rush visuals to the menu (music unchanged).
    this.onSkip = (e) => {
      if (this.closing || this.sub || this.t >= 4.7) return;
      if (e.target?.closest?.('button, a, input, select, .title-lang')) return;
      this.speed = 10;
      this.app.sound?.play('blip', { volume: 0.25 });
    };
    this.root.addEventListener('pointerdown', this.onSkip);
    let last = performance.now();
    const frame = (now) => {
      this.raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.t += dt * this.speed;
      this.draw();
      this.refreshModeBadge();
      if (this.t > 3.9) this.nameEl.classList.add('show');
      if (this.t > 4.7) {
        this.menuEl.classList.add('show');
        this.speed = 1;
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  async initGL() {
    const cv = this.canvas;
    const r = this.panel.getBoundingClientRect();
    cv.width = Math.max(320, Math.round(r.width / 1.5));
    cv.height = Math.max(220, Math.round(r.height / 1.5));
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    try {
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const img = new Image();
      img.src = LOGO_URL;
      await img.decode().catch(() => {});
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (img.naturalWidth) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      this.gl = gl;
      this.u = Object.fromEntries(['uRes', 'uT', 'uReveal', 'uFade', 'uLogo'].map((n) => [n, gl.getUniformLocation(prog, n)]));
    } catch (err) {
      this.app.log?.('title', `shader: ${err?.message || err}`);
      this.gl = null;
    }
  }

  draw() {
    const { gl, u } = this;
    if (!gl) return;
    const ease = (v) => Math.min(1, Math.max(0, v));
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uT, this.t);
    gl.uniform1f(u.uReveal, ease((this.t - 0.8) / 3));
    gl.uniform1f(u.uFade, ease(this.t / 0.8) * (this.closing ? ease(1 - (this.t - this.closing) / 0.6) : 1));
    gl.uniform1i(u.uLogo, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  buildMenu() {
    const T = this.T;
    this.menuEl.textContent = '';
    const items = [
      ['continue', T.menu.continue, () => this.close(this.onContinue), !this.canContinue],
      ['new', T.menu.newGame, () => this.newGame()],
      ...(STREAM ? [['streamer', T.menu.streamer, () => this.startStreamer()]] : []),
      ['options', T.menu.options, () => this.app.openOptions?.()],
      ['tutorial', T.menu.tutorial, () => this.pages(T.tutorialTitle, T.tutorial)],
      ['credits', T.menu.credits, () => this.credits()],
      ['quit', T.menu.quit, () => this.app.quit?.()],
    ];
    this.buttons = items.map(([id, label, fn, off]) => {
      const b = el('button', `title-item${off ? ' off' : ''}`, label);
      b.dataset.id = id;
      if (off) b.title = T.noSave;
      b.onpointerenter = () => this.focus(b);
      b.onclick = () => {
        if (off || this.closing || this.sub) return void this.app.sound?.play('cancel', { volume: 0.4 });
        this.app.sound?.play('ok', { volume: 0.5 });
        fn();
      };
      this.menuEl.append(b);
      return b;
    });
    this.focus(this.buttons.find((b) => !b.classList.contains('off')));
  }

  refreshModeBadge() {
    if (!STREAM) {
      if (this.modeBadge) this.modeBadge.hidden = true;
      return;
    }
    const on = !!(window.__PET_STREAMER__ || this.app.config.streamer);
    if (this._mode === on) return;
    const first = this._mode === undefined;
    this._mode = on;
    this.modeBadge.classList.toggle('on', on);
    this.modeMain.textContent = on ? `🎥 ${translate('Modo Streamer ATIVADO')}` : `✨ ${translate('Jogo Normal')}`;
    this.modeSub.textContent = on
      ? translate('Save isolado · Controle aberto no navegador')
      : translate('Save principal');
    this.modeBtn.textContent = on ? translate('Voltar ao Jogo Normal') : `🎥 ${translate('Ativar Modo Streamer')}`;
    this.modeBtn.onclick = () => {
      this.app.sound?.play('ok', { volume: 0.5 });
      if (on) this.app.setOption?.('streamer', false);
      else confirmStreamer(this.app, () => this.app.setOption?.('streamer', true));
    };
    if (!first) this.modeFlash(translate(on ? 'Modo Streamer ativado' : 'Jogo Normal ativado'));
  }

  modeFlash(message) {
    this.modeToast.textContent = message;
    this.modeToast.classList.add('show');
    clearTimeout(this._modeToastTimer);
    this._modeToastTimer = setTimeout(() => this.modeToast.classList.remove('show'), 2200);
  }

  buildLang() {
    const cur = this.app.config.lang === 'en' ? 'en' : 'pt';
    this.langEl.textContent = '';
    for (const [id, label] of [['pt', 'PT'], ['en', 'EN']]) {
      const b = el('button', id === cur ? 'on' : '', label);
      b.title = id === 'pt' ? 'Português' : 'English';
      b.onclick = () => {
        if (id === cur || this.closing) return;
        this.app.sound?.play('blip', { volume: 0.4 });
        this.app.setOption?.('lang', id);
        this.closeSub();
        this.badge.textContent = `v${this.app.version || ''} · ${editionLabel(this.T.earlyAccess)}`;
        this.current = null;
        this.buildMenu();
        this.buildLang();
      };
      this.langEl.append(b);
    }
  }

  focus(b) {
    if (!b || b === this.current) return;
    this.current?.classList.remove('focus');
    this.current = b;
    b.classList.add('focus');
    this.app.sound?.play('blip', { volume: 0.25 });
  }

  key(e) {
    if (this.closing || !this.menuEl.classList.contains('show')) return;
    if (this.sub) {
      if (e.key === 'Escape') this.closeSub();
      return;
    }
    const list = this.buttons.filter((b) => !b.classList.contains('off'));
    const i = list.indexOf(this.current);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.focus(list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.current?.click();
    }
  }

  // A box over the panel (tutorial, credits, confirmation).
  sheet(title, body, actions) {
    this.closeSub();
    const box = el('div', 'title-sheet');
    const head = el('div', 'title-sheet-head', title);
    box.append(head, body, actions);
    this.panel.append(box);
    this.sub = box;
    return box;
  }

  closeSub() {
    this.sub?.remove();
    this.sub = null;
  }

  pages(title, list) {
    const T = this.T;
    let i = 0;
    const body = el('div', 'title-sheet-body');
    const actions = el('div', 'title-sheet-actions');
    const prev = el('button', '', T.prev);
    const next = el('button', '', T.next);
    const back = el('button', '', T.back);
    const render = () => {
      body.textContent = '';
      body.append(el('h3', '', `${i + 1}/${list.length} · ${list[i][0]}`), el('p', '', list[i][1]));
      prev.disabled = i === 0;
      next.disabled = i === list.length - 1;
    };
    prev.onclick = () => { i--; render(); this.app.sound?.play('blip', { volume: 0.3 }); };
    next.onclick = () => { i++; render(); this.app.sound?.play('blip', { volume: 0.3 }); };
    back.onclick = () => this.closeSub();
    actions.append(prev, back, next);
    render();
    this.sheet(title, body, actions);
  }

  credits() {
    const T = this.T;
    const body = el('div', 'title-sheet-body credits');
    for (const [k, v] of T.credits) body.append(el('h4', '', k), el('p', '', v));
    const actions = el('div', 'title-sheet-actions');
    const back = el('button', '', T.back);
    back.onclick = () => this.closeSub();
    actions.append(back);
    this.sheet(T.creditsTitle, body, actions);
  }

  newGame() {
    if (!this.canContinue) return this.close(this.onNewGame);
    const T = this.T;
    const body = el('div', 'title-sheet-body', '');
    body.append(el('p', '', T.confirmNew));
    const actions = el('div', 'title-sheet-actions');
    const no = el('button', '', T.no);
    const yes = el('button', 'primary', T.yes);
    no.onclick = () => this.closeSub();
    yes.onclick = () => { this.closeSub(); this.close(this.onNewGame); };
    actions.append(no, yes);
    this.sheet(T.menu.newGame, body, actions);
  }

  startStreamer() {
    this.closeSub();
    confirmStreamer(this.app, () => this.app.setOption?.('streamer', true));
  }

  close(then) {
    if (this.closing) return;
    this.closing = this.t;
    this.closeSub();
    this.music.stop(0.8);
    this.root.classList.add('closing');
    setTimeout(() => {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.onKey);
      this.root.removeEventListener('pointerdown', this.onSkip);
      this.root.remove();
      document.body.classList.remove('title-on');
      if (this.app.dialog === 'title') this.app.dialog = null;
      this.app.uiChanged?.();
      then?.();
    }, 650);
  }
}
