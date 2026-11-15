// O evento do cartucho preto misterioso — agora uma HORDA de gosmas de glitch que sai da TV.
//
// A TV com console cospe estática, fumaça escura e gosma; do meio dela sai o "Unknown": um
// slime de glitch convertido em silhueta preta com os olhos vermelhos. Ele persegue a Persocon
// pela área de trabalho até encostar nela, e aí o combate por turnos começa. Se ela vencer,
// a horda morre e o Cristal Negro cai (só na primeira vitória de sempre).
//
// O `blackCartridgeWave` (game.profile) diz em que onda o jogador está:
//   1-9 → lutável (escala de inimigos e atributos);  10 → trava (o Boss aguarda).
import { BLACK_WAVES, STRIKE_GAP } from './melee.js';
import { cartridge } from './pixel.js';

const SHEET_DIR = './assets/enemies/unknown_slime/';

// As animações do "Angry slime" (folhas PNG + metadados de scripts/gif-slime-sheet.mjs).
const ANIMS = {
  idle: { file: 'Slime_Idle_Angry', frames: 4, cw: 24, ch: 17, delays: [100, 100, 100, 100] },
  walk: { file: 'Slime_Walk_Angry', frames: 3, cw: 23, ch: 17, delays: [100, 100, 100] },
  hop: { file: 'Slime_JumpWalk_Angry', frames: 5, cw: 23, ch: 19, delays: [100, 100, 100, 100, 100] },
  jump: { file: 'Slime_Jump_Angry', frames: 8, cw: 24, ch: 18, delays: [100, 100, 100, 100, 100, 100, 100, 100] },
  attack: { file: 'Slime_Attack_Angry', frames: 5, cw: 29, ch: 20, delays: [100, 100, 100, 100, 500] },
  hurt: { file: 'Slime_Hurt', frames: 2, cw: 23, ch: 15, delays: [100, 100] },
  death: { file: 'Slime_Death_Angry', frames: 5, cw: 32, ch: 17, delays: [100, 100, 100, 100, 100] },
};
const SPR = 32;          // o quadro lógico do sprite (32x32)
const EYE = [255, 46, 58];

// As falas da Persocon depois da luta (o balão traduz o texto sozinho).
const AFTER = [
  'O-o que foi aquilo?! Essa coisa acabou de sair de dentro da tela da TV?!',
  'Meus sensores não conseguiram identificar esse código... parecia uma falha viva.',
  'Espera... cadê aquele cartucho preto? Ele sumiu da tela! E esse cristal escuro estranho...',
  'De onde será que veio essa criatura? Será que alguém colocou esse cartucho na loja de propósito?',
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------- a gosma individual ----------------

export class Slime {
  constructor(app, x, y, stats) {
    this.app = app;
    this.hp = stats.hp;
    this.max = stats.hp;
    this.atk = stats.atk;
    this.defense = stats.def;
    this.level = stats.level;
    this.acc = stats.acc;
    this.stun = stats.stun;
    this.name = stats.name || 'Unknown';
    this.x = x;
    this.y = y;
    this.dir = -1;
    this.anim = 'idle';
    this.frame = 0;
    this.frameT = 0;
    this.t = 0;
    this.glitch = 0;
    this.glitchT = 0;
    this.jitter = 0;
    // Temporizador do flash vermelho (o método flash() é do protótipo; a propriedade se chama flashT).
    this.flashT = 0;
    this.flashI = 0;
    this.sheets = new Map();
    this.el = null;
    this.view = null;
    this.raw = null;
    this.rawG = null;
    this.chan = null;
    this.chanG = null;
  }

  get P() { return this.app.pet.P; }

  // ---------- as folhas do slime ----------

  sheet(name) {
    if (!this.sheets.has(name)) {
      const def = ANIMS[name];
      const img = new Image();
      img.src = new URL(`${SHEET_DIR}${def.file}.png`, import.meta.url).href;
      this.sheets.set(name, img);
    }
    return this.sheets.get(name);
  }

  makeSprite() {
    if (this.el) return this.el;
    const el = document.createElement('canvas');
    el.className = 'unknown-slime';
    el.width = SPR;
    el.height = SPR;
    document.body.append(el);
    this.el = el;
    this.view = el.getContext('2d');
    this.raw = document.createElement('canvas');
    this.raw.width = SPR;
    this.raw.height = SPR;
    this.rawG = this.raw.getContext('2d', { willReadFrequently: true });
    this.chan = { r: document.createElement('canvas'), g: document.createElement('canvas'), b: document.createElement('canvas') };
    this.chanG = {};
    for (const k of ['r', 'g', 'b']) {
      this.chan[k].width = SPR;
      this.chan[k].height = SPR;
      this.chanG[k] = this.chan[k].getContext('2d', { willReadFrequently: true });
    }
    return el;
  }

  remove() {
    this.el?.remove();
    this.el = null;
  }

  // A escala do sprite na tela (o slime é pequeno perto da Persocon).
  scale() {
    return Math.max(2, Math.round((this.P / 46) * 2) / 2);
  }

  place() {
    if (!this.el) return;
    const s = SPR * this.scale();
    this.el.style.width = `${s}px`;
    this.el.style.height = `${s}px`;
    this.el.style.left = `${Math.round(this.x - s / 2)}px`;
    this.el.style.top = `${Math.round(this.y - s)}px`;
  }

  // Troca a animação (e recomeça o quadro).
  play(anim) {
    if (!ANIMS[anim] || this.anim === anim) return;
    this.anim = anim;
    this.frame = 0;
    this.frameT = 0;
  }

  // O flash vermelho quando ele leva dano: quanto maior o dano, mais forte acende.
  // Assinatura completa (intensity, duration) — usada tanto pelo combate quanto por testes.
  flash(intensity = 1, duration = 0.3) {
    this.flashT = Math.max(0.01, duration);
    this.flashI = Math.min(1, Math.max(0.25, intensity || 0.25));
    this.hitFlash = this.flashI;   // fallback lido pelo desenho se algo falhar
  }

  // Converte o quadro do slime: corpo todo preto e os olhos (e a boca) vermelhos e brilhando.
  convert() {
    const g = this.rawG;
    const d = g.getImageData(0, 0, SPR, SPR);
    const px = d.data;
    let bottom = 0;
    for (let y = SPR - 1; y >= 0; y--) {
      let any = false;
      for (let x = 0; x < SPR; x++) if (px[(y * SPR + x) * 4 + 3] > 40) { any = true; break; }
      if (any) { bottom = y; break; }
    }
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
    g.putImageData(d, 0, 0);
  }

  // Desenha o quadro convertido, com o glitch (separação RGB + fatias tremidas).
  draw() {
    if (!this.view) return;
    const g = this.view;
    // A gosma ENCARA a Persocon: espelha o sprite na horizontal quando ela estiver à esquerda.
    const petX = this.app?.pet?.x ?? this.x;
    const flip = petX < this.x;
    g.save();
    if (flip) { g.translate(SPR, 0); g.scale(-1, 1); }
    g.clearRect(0, 0, SPR, SPR);
    g.imageSmoothingEnabled = false;
    if (this.glitch > 0) {
      for (let y = 0; y < SPR; y += 3) {
        const off = Math.round((Math.random() - 0.5) * 6);
        g.drawImage(this.raw, 0, y, SPR, 3, off, y, SPR, 3);
      }
      for (const k of ['r', 'g', 'b']) {
        const cg = this.chanG[k];
        cg.clearRect(0, 0, SPR, SPR);
        cg.drawImage(this.raw, 0, 0);
        const d = cg.getImageData(0, 0, SPR, SPR);
        const px = d.data;
        for (let i = 0; i < px.length; i += 4) {
          if (k === 'r') { px[i + 1] = 0; px[i + 2] = 0; }
          else if (k === 'g') { px[i] = 0; px[i + 2] = 0; }
          else { px[i] = 0; px[i + 1] = 0; }
        }
        cg.putImageData(d, 0, 0);
      }
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.55;
      g.drawImage(this.chan.r, -2 + this.jitter, 0);
      g.drawImage(this.chan.g, 0, 0);
      g.drawImage(this.chan.b, 2 - this.jitter, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    } else {
      g.drawImage(this.raw, 0, 0);
    }
    g.restore();
    // O flash de dano continua ocupando a área inteira do sprite.
    if (this.flashT > 0) {
      const k = this.flashI * (this.flashT / 0.3);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(255, 24, 48, ${(k * 0.85).toFixed(3)})`;
      g.fillRect(0, 0, SPR, SPR);
      g.globalCompositeOperation = 'source-over';
    }
  }

  // A perseguição e o desenho.
  update(dt, pet) {
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.glitchT = (this.glitchT ?? 0) - dt;
    if (this.glitchT <= 0) {
      this.glitchT = 1.6 + Math.random() * 3.4;
      this.glitch = 0.14 + Math.random() * 0.12;
    }
    if (this.glitch > 0) {
      this.glitch = Math.max(0, this.glitch - dt);
      this.jitter = Math.round((Math.random() - 0.5) * 3);
    }
    const def = ANIMS[this.anim] || ANIMS.idle;
    this.frameT += dt * 1000;
    const delay = def.delays[this.frame] ?? 100;
    if (this.frameT >= delay) {
      this.frameT -= delay;
      this.frame = (this.frame + 1) % def.frames;
    }
    // Posiciona SEMPRE (durante a perseguição E durante a luta): a tela desenha o
    // sprite onde o inimigo está, nunca na TV antiga.
    this.place();
    if (this.state === 'chase' && pet) {
      const dx = pet.x - this.x;
      this.dir = dx < 0 ? -1 : 1;
      const speed = this.P * 0.75;
      // Ele para na distância de golpe: não entra dentro dela.
      const room = Math.abs(dx) - this.P * STRIKE_GAP;
      const step = Math.sign(dx) * Math.max(0, Math.min(room, speed * dt));
      if (step) this.x += step;
      this.play(Math.abs(step) > 0.4 ? 'hop' : 'idle');
      this.place();
    }
    if (!this.rawG) return;
    const img = this.sheet(this.anim);
    if (img?.complete && img.naturalWidth) {
      this.rawG.clearRect(0, 0, SPR, SPR);
      this.rawG.imageSmoothingEnabled = false;
      this.rawG.drawImage(img, this.frame * def.cw, 0, def.cw, def.ch, 0, SPR - def.ch, def.cw, def.ch);
      this.convert();
      this.draw();
    }
  }
}

// ---------------- o evento ----------------

export class Unknown {
  constructor(app) {
    this.app = app;
    this.state = 'idle';      // idle | erupt | chase | fight | dying | gone
    this.t = 0;
    this.slimes = [];         // a horda (a luta)
    this.wave = 1;
  }

  get P() { return this.app.pet.P; }
  // A vida somada da horda (a barra do combate é por inimigo).
  get hp() { return this.slimes.reduce((a, s) => a + s.hp, 0); }

  // ---------- o jogador insere o cartucho preto na TV ----------

  insert() {
    if (this.state !== 'idle' && this.state !== 'gone') return false;
    const { app } = this;
    const game = app.game;
    const tv = app.game?.toys?.videogame;
    const wave = game?.profile?.blackCartridgeWave || 1;
    // A trava do Wave 10: o cartucho rejeita a TV.
    if (wave > 9) {
      app.toys?.furn?.floatText?.(tv?.x ?? 0, app.toys?.floorY?.() - this.P * 1.4, 'O cartucho rejeita a TV... algo gigantesco aguarda no Wave 10.');
      app.sound?.play?.('cancel', { volume: 0.5 });
      return false;
    }
    if (!tv?.placed || tv.broken) return false;
    if (app.melee?.active) app.melee.leave('interrupted');   // a luta com o boneco para na hora
    if (app.pet?.dead) return false;
    // Ela larga TUDO e encara a horda: toy, comer, assistir, jam, correr, o boneco de treino.
    app.toys?.screen?.stop?.();
    this.interruptPet();
    this.wave = wave;
    this.t = 0;
    this.slimes = [];
    // O banner de aviso e a animação do cartucho flutuando sobre a TV.
    app.combatUI?.warnBanner(`⚠️ ALERTA DE ANOMALIA — WAVE ${wave} ⚠️`, 2400);
    this.cartAnimation(tv);
    setTimeout(() => this.erupt(wave), 1650);
    return true;
  }

  // Ela para tudo o que está fazendo e fica parada encarando a horda até o contato.
  interruptPet() {
    const app = this.app;
    const pet = app.pet;
    const wasSleeping = pet?.action === 'sleep';
    app.modes?.stop?.();               // assistir/jam/etc.
    pet?.stopActivity?.();             // atividade dela (watch/jam/react)
    if (pet?.toyPlay) pet.endToy(true);           // solta o que estava nas mãos (o boneco!)
    if (pet?.ballPlay) pet.endBall?.(true);
    if (pet?.eating) pet.finishEating?.();
    if (pet?.chase) pet.endChase?.(false);
    if (pet?.mini) pet.mini = null;
    if (pet?.hook) pet.hook = null;
    if (Array.isArray(pet?.actionQueue)) pet.actionQueue.length = 0;
    if (Array.isArray(pet?.afterPlay)) pet.afterPlay.length = 0;   // consumíveis na fila: fora
    if (wasSleeping) pet.emit?.('wake', { startled: true });
    if (pet?.mode === 'wall') pet.restOnWall?.(Infinity);
    if (pet?.mode === 'ground') pet.startGround?.('idle');
    pet?.pause?.();                    // congela o que sobrou da IA (ela fica parada)
  }

  // O cartucho preto desce sobre a TV e se acopla (estática e partículas escuras).
  cartAnimation(tv) {
    const { app } = this;
    const rect = app.toys?.tvRect?.() || null;
    if (rect) {
      const el = document.createElement('div');
      el.className = 'insertion-cart';
      el.style.left = `${Math.round(rect.x + rect.w / 2)}px`;
      el.style.top = `${Math.round(rect.y - 60)}px`;
      const img = document.createElement('img');
      img.src = cartridge('#000000', 'unknown', 'gb');
      img.draggable = false;
      img.alt = '';
      el.append(img);
      document.body.append(el);
      setTimeout(() => el.remove(), 1600);
    }
  }

  // ---------- a erupção da TV ----------

  erupt(wave = null) {
    if (this.state !== 'idle' && this.state !== 'gone' && this.state !== 'erupt') return;
    this.state = 'erupt';
    const { app } = this;
    const toys = app.toys;
    const tv = app.game.toys.videogame;
    const w = app.world?.width || (typeof innerWidth !== 'undefined' ? innerWidth : 1280);
    const floor = toys?.floorY?.() ?? (typeof innerHeight !== 'undefined' ? innerHeight : 900);
    this.wave = wave ?? ((app.game?.profile?.blackCartridgeWave || 1) > 9 ? 1 : (app.game?.profile?.blackCartridgeWave || 1));
    const plan = BLACK_WAVES[this.wave] || BLACK_WAVES[1];
    // A horda nasce dentro da TV e cai no chão.
    const baseX = tv?.x ?? w / 2;
    this.slimes = [];
    for (let i = 0; i < plan.count; i++) {
      const hp = Math.round(plan.hp * (0.9 + Math.random() * 0.25));
      const s = new Slime(app, baseX + (i - (plan.count - 1) / 2) * 18, floor, {
        hp, atk: plan.atk, def: plan.def, level: plan.level, acc: plan.acc, stun: plan.stun, name: 'Unknown',
      });
      s.makeSprite();
      s.place();
      s.el.classList.add('erupting');
      s.state = 'chase';
      this.slimes.push(s);
    }
    // Ela se assusta e dá um passo para trás da TV (dá para ver a perseguição).
    const pet = app.pet;
    if (pet && tv) {
      const away = pet.x >= tv.x ? 1 : -1;
      pet.x = Math.max(this.P * 0.3, Math.min(w - this.P * 0.3, pet.x + away * this.P * 1.1));
    }
    const rect = toys?.tvRect?.() || null;
    if (rect) { this.static(rect); this.smoke(rect); this.ooze(rect); }
    app.sound?.play?.('tvstatic', { volume: 0.5 });
    app.sound?.tone8?.(90, 40, 0.5, 'sawtooth', 0.08);
    setTimeout(() => {
      if (this.state !== 'erupt') return;
      for (const s of this.slimes) s.el?.classList.remove('erupting');
      this.state = 'chase';
      for (const s of this.slimes) s.play('idle');
      app.sound?.tone8?.(40, 200, 0.35, 'square', 0.1);
      // A erupção acabou: o combate começa AGORA (sem esperar o contato).
      this.startFight();
    }, 1500);
  }

  // A estática na tela da TV.
  static(rect) {
    const cv = document.createElement('canvas');
    cv.className = 'tv-static';
    cv.width = Math.max(8, Math.round(rect.w));
    cv.height = Math.max(8, Math.round(rect.h));
    cv.style.left = `${Math.round(rect.x)}px`;
    cv.style.top = `${Math.round(rect.y)}px`;
    cv.style.width = `${Math.round(rect.w)}px`;
    cv.style.height = `${Math.round(rect.h)}px`;
    document.body.append(cv);
    const g = cv.getContext('2d');
    const t0 = performance.now();
    const tick = () => {
      const el = performance.now() - t0;
      if (el > 2400) { cv.remove(); return; }
      const img = g.createImageData(cv.width, cv.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = v * 0.85; d[i + 1] = v; d[i + 2] = v * 1.15; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      requestAnimationFrame(tick);
    };
    tick();
  }

  // Fumaça escura saindo da tela.
  smoke(rect) {
    const base = rect ? rect.y + rect.h : (this.slimes[0]?.y ?? 0) - this.P * 0.6;
    const x0 = rect ? rect.x + Math.random() * rect.w : this.slimes[0]?.x ?? 0;
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'unknown-smoke';
      const s = 16 + Math.random() * 30;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.left = `${Math.round((rect ? rect.x + Math.random() * rect.w : x0) - s / 2)}px`;
      el.style.top = `${Math.round(base - s / 2)}px`;
      el.style.setProperty('--rise', `${Math.round(-(30 + Math.random() * 80))}px`);
      el.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 60)}px`);
      el.style.setProperty('--delay', `${(Math.random() * 0.9).toFixed(2)}s`);
      document.body.append(el);
      setTimeout(() => el.remove(), 3000);
    }
  }

  // A gosma preta pingando no chão da frente da TV.
  ooze(rect) {
    const floor = this.slimes[0]?.y ?? 0;
    const from = rect ? rect.y + rect.h : floor - this.P * 0.6;
    for (let i = 0; i < 8; i++) {
      const el = document.createElement('div');
      el.className = 'unknown-ooze';
      const x = Math.round(rect ? rect.x + Math.random() * rect.w : this.slimes[0]?.x ?? 0);
      el.style.left = `${x}px`;
      el.style.top = `${Math.round(from)}px`;
      el.style.setProperty('--fall', `${Math.round(floor - from)}px`);
      el.style.setProperty('--delay', `${(Math.random() * 0.8).toFixed(2)}s`);
      document.body.append(el);
      setTimeout(() => {
        el.remove();
        const blob = document.createElement('div');
        blob.className = 'unknown-blob';
        const s = 10 + Math.random() * 16;
        blob.style.width = `${Math.round(s)}px`;
        blob.style.height = `${Math.round(s * 0.5)}px`;
        blob.style.left = `${Math.round(x - s / 2)}px`;
        blob.style.top = `${Math.round(floor - s * 0.3)}px`;
        document.body.append(blob);
        setTimeout(() => blob.remove(), 7000);
      }, 2400);
    }
  }

  // ---------- a perseguição ----------

  // A erupção acabou: ela larga TUDO e encara a horda imediatamente.
  startFight() {
    if (this.state !== 'chase') return;
    this.state = 'fight';
    const { app } = this;
    const pet = app.pet;
    const melee = app.melee;
    pet.resume?.();
    pet.endToy?.(true);
    this.interruptPet();               // nada escapa: toy, comer, dormir, assistir…
    pet.resume?.();                    // a pausa era só para o cartucho; a IA fica livre para o combate e para depois
    app.toys?.screen?.stop?.();
    if (app.melee?.active) app.melee.leave('interrupted');
    if (!melee) { this.fleeAll(); return; }
    pet.playToy({
      id: 'unknown', dummy: true, combatKind: 'black_cartridge_wave', dur: 3600, gain: {},
      anim: pet.pickClip?.(['combat_idle'], ['melee_idle', 'idle']) || 'idle',
      facing: 'front', effort: 0.5,
      onEnd: (interrupted) => { melee.leave(interrupted ? 'interrupted' : 'done'); },
      tick: (dt) => melee.update(dt),
    });
    melee.startUnknown(this.slimes, this.wave);
    pet.setCombat?.(true, 'black_cartridge_wave');
    for (const s of this.slimes) s.play('attack');
    app.sound?.play?.('explode', { volume: 0.35 });
    if (!melee.active) this.fleeAll();
  }

  // Elas recuam para dentro da TV (a luta acabou sem a derrota delas).
  fleeAll() {
    for (const s of this.slimes) s.remove();
    this.slimes = [];
    this.state = 'gone';
  }

  update(dt) {
    const pet = this.app.pet;
    if (this.state === 'idle' || this.state === 'gone') return;
    // O flash vermelho do dano se apaga em cada slime.
    for (const s of this.slimes) s.update(dt, this.state === 'chase' ? pet : null);
    if (this.state === 'chase') {
      // Ele chegou na distância de golpe: a luta começa.
      const dx = pet && this.slimes.length ? pet.x - this.slimes[0].x : 9999;
      if (pet && Math.abs(dx) < pet.P * (STRIKE_GAP + 0.1)) this.startFight();
    } else if (this.state === 'fight') {
      // A luta acabou sem a derrota delas (interrompida): elas somem.
      if (!this.app.melee?.active) this.fleeAll();
    }
  }

  // ---------- o fim da luta ----------

  // A horda foi derrotada (ou recuou): a morte delas e a fala dela.
  async onDefeat(reason) {
    if (this.state === 'dying' || this.state === 'gone') return;
    this.state = 'dying';
    for (const s of this.slimes) s.play(reason === 'win' ? 'death' : 'idle');
    if (reason === 'win') this.app.sound?.play?.('explode', { volume: 0.5 });
    await wait(900);
    for (const s of this.slimes) s.remove();
    this.slimes = [];
    this.state = 'gone';
    // E ela fica confusa (só quando eles caíram de verdade).
    if (reason === 'win') this.talk();
  }

  // As falas confusas depois da luta.
  async talk() {
    const { app } = this;
    for (const line of AFTER) {
      await wait(1800);
      if (!app.pet || app.pet.dead) return;
      app.speech?.say(line, 4.2);
      app.emoticons?.show('question', true);
      await wait(700);
      app.emoticons?.show('effort', true);
    }
  }
}
