// HUD do combate JRPG: a fila de turnos no topo, o anel de chão do lutador da vez,
// as barras pequenas de vida dos inimigos, o banner de aviso na TV, o banner de vitória
// com o resumo de XP e os modais de lore sombrios (cartucho preto / cristal negro).
import { icon, cartridge } from './pixel.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- os retratos das Persocons (emote pela faixa de HP) ----------
const PORTRAITS = {
  aghata: { normal: 'agatha_normal', mid: 'agatha_anxious', low: 'agatha_sad' },
  ninna: { normal: 'ninna_normal', mid: 'ninna_sad', low: 'ninna_shy' },
};
const _persoCache = new Map();
export function persoconPortrait(modelDir, hpPct = 1, petName = '') {
  const dir = `${modelDir || ''} ${petName || ''}`.toLowerCase();
  const set = dir.includes('aghata') ? PORTRAITS.aghata : PORTRAITS.ninna;
  const key = hpPct >= 0.66 ? set.normal : hpPct >= 0.33 ? set.mid : set.low;
  if (!_persoCache.has(key)) _persoCache.set(key, new URL(`./assets/emoticons/${key}.png`, import.meta.url).href);
  return _persoCache.get(key);
}

// O retrato estático de cada inimigo (a gosma convertida da folha Slime_Idle_Angry, quadro 0).
let _enemyPortrait = null;
let _enemyPortraitLoading = false;
const _loadImage = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
const SPR = 32;
export function enemyPortrait() {
  if (_enemyPortrait) return _enemyPortrait;
  if (_enemyPortraitLoading) return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';   // 1×1 até carregar
  _enemyPortraitLoading = true;
  const url = new URL('./assets/enemies/unknown_slime/Slime_Idle_Angry.png', import.meta.url).href;
  _loadImage(url).then((img) => {
    const c = document.createElement('canvas');
    c.width = SPR;
    c.height = SPR;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    // O quadro é encostado no chão (a folha tem a célula 24×17).
    g.drawImage(img, 0, 0, 24, 17, 0, SPR - 17, 24, 17);
    // A mesma conversão das gosmas: corpo quase preto e olhos vermelhos brilhando.
    const raw = g.getImageData(0, 0, SPR, SPR);
    const px = raw.data;
    let bottom = 0;
    for (let y = SPR - 1; y >= 0; y--) {
      let any = false;
      for (let x = 0; x < SPR; x++) if (px[(y * SPR + x) * 4 + 3] > 40) { any = true; break; }
      if (any) { bottom = y; break; }
    }
    const EYE = [255, 46, 58];
    for (let y = 0; y < SPR; y++) {
      for (let x = 0; x < SPR; x++) {
        const i = (y * SPR + x) * 4;
        if (px[i + 3] < 40) { px[i + 3] = 0; continue; }
        const lum = px[i] * 0.3 + px[i + 1] * 0.6 + px[i + 2] * 0.1;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= SPR || yy >= SPR) continue;
            if (px[(yy * SPR + xx) * 4 + 3] > 40) n++;
          }
        }
        if (lum < 90 && n >= 6 && y < bottom - 3) {
          px[i] = EYE[0]; px[i + 1] = EYE[1]; px[i + 2] = EYE[2]; px[i + 3] = 255;
        } else {
          const v = 5 + lum * 0.1;
          px[i] = v; px[i + 1] = v * 0.92; px[i + 2] = v * 1.4; px[i + 3] = 255;
        }
      }
    }
    g.putImageData(raw, 0, 0);
    _enemyPortrait = c.toDataURL('image/png');
  }).catch(() => { _enemyPortraitLoading = false; });
  return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
}

export class CombatUI {
  constructor(app) {
    this.app = app;
    this.queueEl = null;
    this.ringEl = null;
    this.foeEls = new Map();   // id → el da barra de vida pequena
    this.winEl = null;
    this.modalOpen = false;    // o modal de lore está na tela (o app.uiOpen precisa saber)
  }

  // ---------- a fila de turnos ----------

  // actors: [{ id, name, face (img src ou null), glyph (fallback), side: 'ally'|'enemy', hp (0..1), dead }]
  showQueue(actors) {
    if (!this.queueEl) {
      this.queueEl = document.createElement('div');
      this.queueEl.className = 'turn-queue';
      document.body.append(this.queueEl);
    }
    this.updateQueue(actors);
  }

  updateQueue(actors, activeId = null) {
    const el = this.queueEl;
    if (!el) return;
    el.replaceChildren();
    actors.forEach((a, i) => {
      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'tq-arrow';
        arrow.textContent = '›';
        el.append(arrow);
      }
      const unit = document.createElement('div');
      unit.className = `tq-unit ${a.side}${a.id === activeId ? ' active' : ''}${a.dead ? ' dead' : ''}`;
      unit.title = a.name;
      if (a.face) {
        const img = document.createElement('img');
        img.src = a.face;
        img.draggable = false;
        img.alt = a.name;
        unit.append(img);
      } else if (a.glyph) {
        const g = document.createElement('span');
        g.className = 'tq-glyph';
        g.textContent = a.glyph;
        unit.append(g);
      }
      if (a.hp != null) {
        const hp = document.createElement('div');
        hp.className = 'tq-hp';
        const i = document.createElement('i');
        i.style.width = `${Math.max(0, Math.round(a.hp * 100))}%`;
        hp.append(i);
        unit.append(hp);
      }
      el.append(unit);
    });
  }

  hideQueue() {
    this.queueEl?.remove();
    this.queueEl = null;
  }

  // ---------- o anel de chão ----------

  ring(x, y) {
    if (!this.ringEl) {
      this.ringEl = document.createElement('div');
      this.ringEl.className = 'combat-floor-ring';
      document.body.append(this.ringEl);
    }
    this.ringEl.style.left = `${Math.round(x)}px`;
    this.ringEl.style.top = `${Math.round(y + 6)}px`;
  }

  hideRing() {
    this.ringEl?.remove();
    this.ringEl = null;
  }

  // ---------- as barras pequenas dos inimigos ----------

  foeBars(foes) {
    // foes: [{ id, x, y, w, pct }]
    const seen = new Set();
    for (const f of foes) {
      seen.add(f.id);
      let el = this.foeEls.get(f.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'foe-hp';
        el.innerHTML = '<i></i>';
        document.body.append(el);
        this.foeEls.set(f.id, el);
      }
      const P = this.app.pet?.P || 46;
      const w = Math.max(46, Math.round(P * 0.95));
      el.style.left = `${Math.round(f.x - w / 2)}px`;
      el.style.top = `${Math.round(f.y - P * 1.18)}px`;
      el.style.width = `${w}px`;
      el.firstElementChild.style.width = `${Math.max(0, Math.round(f.pct * 100))}%`;
      el.classList.toggle('low', f.pct <= 0.3);
    }
    for (const [id, el] of this.foeEls) {
      if (!seen.has(id)) { el.remove(); this.foeEls.delete(id); }
    }
  }

  hideFoeBars() {
    for (const [, el] of this.foeEls) el.remove();
    this.foeEls.clear();
  }

  // ---------- o ícone do item acima da cabeça ----------

  itemPop(x, y, src) {
    if (!src) return;
    const el = document.createElement('div');
    el.className = 'item-icon-pop';
    const img = document.createElement('img');
    img.src = src;
    img.draggable = false;
    el.append(img);
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), 2100);
  }

  // ---------- o banner de aviso na TV ----------

  warnBanner(text, ms = 2400) {
    const el = document.createElement('div');
    el.className = 'unknown-warn';
    el.textContent = text;
    document.body.append(el);
    setTimeout(() => el.remove(), ms);
    return el;
  }

  // ---------- o banner de VITÓRIA ----------

  victoryBanner(xpLines = []) {
    this.hideVictory();
    const el = document.createElement('div');
    el.className = 'victory-banner';
    const h = document.createElement('h1');
    h.textContent = 'VITÓRIA!';
    el.append(h);
    if (xpLines.length) {
      const box = document.createElement('div');
      box.className = 'victory-xp';
      for (const [label, amount] of xpLines) {
        const line = document.createElement('div');
        const b = document.createElement('b');
        b.textContent = `+${Math.round(amount)} XP`;
        line.append(b, ` ${label}`);
        box.append(line);
      }
      el.append(box);
    }
    document.body.append(el);
    this.winEl = el;
    return el;
  }

  hideVictory() {
    this.winEl?.remove();
    this.winEl = null;
  }

  // ---------- os modais de lore sombrios ----------

  // kind: 'cart' (Trigger A) | 'crystal' (Trigger B)
  loreModal(kind) {
    return new Promise((resolve) => {
      const sound = this.app.sound;
      const ctx = sound?.ctx;
      const wasMusicPaused = !!sound?.musicPaused;
      const wasMaster = sound?.master?.gain?.value;
      // Pausa toda a música e abaixa o mix para deixar o drone tomar conta.
      sound?.pauseMusic?.();
      if (ctx && sound?.master) sound.master.gain.setTargetAtTime(Math.min(wasMaster ?? 1, 0.06), ctx.currentTime, 0.35);
      // O modal entra no uiOpen do app: a janela deixa de ser click-through e recebe o clique.
      this.modalOpen = true;
      this.app.uiChanged?.();
      const overlay = document.createElement('div');
      overlay.className = 'lore-overlay';
      const box = document.createElement('div');
      box.className = 'lore-box';
      const glyph = document.createElement('div');
      glyph.className = 'lore-glyph';
      const img = document.createElement('img');
      img.draggable = false;
      img.src = kind === 'crystal'
        ? new URL('./assets/items/black_crystal.png', import.meta.url).href
        : cartridge('#000000', 'unknown', 'gb');
      img.alt = kind === 'crystal' ? 'Cristal Negro' : 'Cartucho Preto';
      glyph.append(img);
      const text = kind === 'crystal'
        ? ' Esta estranha substancia pulsa com uma energia ruim . . . '
        : 'Este cartucho emite uma aura sombria . . .';
      const p = document.createElement('p');
      p.className = 'lore-text';
      p.setAttribute('aria-live', 'polite');
      const hint = document.createElement('div');
      hint.className = 'lore-hint';
      hint.textContent = '[ Clique para revelar ▼ ]';
      box.append(glyph, p, hint);
      overlay.append(box);
      document.body.append(overlay);
      // O drone sombrio em loop (WebAudio): três vozes graves desafinadas + sub-baixo.
      // Ele sai direto para a saída (não passa pelo master, que está silenciado).
      let nodes = null;
      if (ctx) {
        nodes = [];
        const out = ctx.createGain();
        out.gain.value = 0;
        out.connect(ctx.destination);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 340;
        filter.Q.value = 8;
        filter.connect(out);
        const mk = (freq, type, detune) => {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = freq;
          o.detune.value = detune;
          const g = ctx.createGain();
          g.gain.value = type === 'sine' ? 0.5 : 0.22;
          o.connect(g).connect(filter);
          o.start();
          nodes.push(o);
          return o;
        };
        mk(55, 'sawtooth', -9);
        mk(55, 'sawtooth', +9);
        mk(27.5, 'sine', 0);
        mk(110, 'triangle', +4);
        // LFO no filtro (a "respiração" do drone).
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.12;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 140;
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start();
        nodes.push(lfo, filter, out);
        out.gain.setTargetAtTime(0.3, ctx.currentTime, 0.6);
      }
      const stopDrone = () => {
        if (nodes && ctx) {
          try {
            const out = nodes[nodes.length - 1];
            out?.gain?.setTargetAtTime?.(0.0001, ctx.currentTime, 0.3);
            setTimeout(() => { try { nodes.forEach((n) => n.disconnect?.()); } catch {} }, 900);
          } catch {}
        }
      };
      // O texto em máquina de escrever (com máquina de estados bem firme).
      let shown = 0;
      let isTypingComplete = false;
      let interval = null;
      const render = () => { p.textContent = text.slice(0, shown); };
      const finishTyping = () => {
        if (isTypingComplete) return;
        isTypingComplete = true;
        clearInterval(interval);
        interval = null;
        p.textContent = text;
        hint.textContent = '[ Clique para fechar ▼ ]';
        hint.classList.add('ready');
      };
      const tick = () => {
        shown = Math.min(text.length, shown + 1);
        render();
        if (shown >= text.length) finishTyping();
      };
      interval = setInterval(tick, 46);
      // Fechar: encerra o drone, devolve o áudio normal e some com a janela.
      const close = () => {
        if (close.done) return;
        close.done = true;
        clearInterval(interval);
        interval = null;
        stopDrone();
        overlay.remove();
        window.removeEventListener('keydown', onKey, true);
        if (!wasMusicPaused) sound?.resumeMusic?.();
        if (ctx && sound?.master && wasMaster != null) sound.master.gain.setTargetAtTime(wasMaster, ctx.currentTime, 0.4);
        this.modalOpen = false;
        this.app.uiChanged?.();
        resolve();
      };
      const advance = () => {
        if (!isTypingComplete) finishTyping();
        else close();
      };
      const onKey = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          advance();
        }
      };
      window.addEventListener('keydown', onKey, true);
      // O clique vale tanto no box quanto no fundo inteiro da tela.
      overlay.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        advance();
      });
      box.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        advance();
      });
    });
  }

  // ---------- limpar tudo ----------

  clear() {
    this.hideQueue();
    this.hideRing();
    this.hideFoeBars();
    this.hideVictory();
  }
}
