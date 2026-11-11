// O evento do cartucho preto misterioso.
//
// A TV com console cospe estática, fumaça escura e gosma; do meio dela sai o "Unknown": um
// slime de glitch convertido em silhueta preta com os olhos vermelhos. Ele persegue a Persocon
// pela área de trabalho até encostar nela, e aí o combate por turnos começa. Se ela vencer,
// o Unknown morre, deixa um Cristal Negro e o cartucho preto some para sempre.
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
  'Espera... cadê aquele cartucho preto? Ele sumiu da estante! Só sobrou esse cristal escuro estranho...',
  'De onde será que veio essa criatura? Será que alguém colocou esse cartucho na loja de propósito?',
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Unknown {
  constructor(app) {
    this.app = app;
    this.state = 'idle';      // idle | erupt | chase | fight | dying | gone
    this.x = 0;
    this.y = 0;
    this.dir = -1;
    this.anim = 'idle';
    this.frame = 0;
    this.frameT = 0;
    this.t = 0;
    this.glitch = 0;          // quanto falta do glitch (segundos)
    this.jitter = 0;
    this.sheets = new Map();
    this.el = null;
    this.view = null;
    this.raw = null;
    this.rawG = null;
    this.chan = null;
    this.chanG = null;
  }

  get P() { return this.app.pet.P; }
  // A vida vem do motor de combate (o Unknown é o oponente dele).
  get hp() { return this.app.melee?.opp?.unknown ? (this.app.melee.opp.hp ?? 0) : 0; }

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

  // ---------- o sprite ----------

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

  // Converte o quadro do slime: corpo todo preto e os olhos (e a boca) vermelhos e brilhando.
  convert() {
    const g = this.rawG;
    const d = g.getImageData(0, 0, SPR, SPR);
    const px = d.data;
    // A borda de baixo da criatura (a sombra) fica preta: os olhos são só do rosto.
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
        // Vizinhos opacos: os olhos ficam no meio do corpo, o contorno na borda.
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
          const v = 5 + lum * 0.1;         // o corpo vira quase preto
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
    g.clearRect(0, 0, SPR, SPR);
    g.imageSmoothingEnabled = false;
    if (this.glitch > 0) {
      // As fatias horizontais saem de lugar.
      for (let y = 0; y < SPR; y += 3) {
        const off = Math.round((Math.random() - 0.5) * 6);
        g.drawImage(this.raw, 0, y, SPR, 3, off, y, SPR, 3);
      }
      // Separação RGB por cima.
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
  }

  // ---------- a erupção da TV ----------

  // O cartucho preto entrou na TV: começa a erupção.
  erupt() {
    if (this.state !== 'idle') return;
    this.state = 'erupt';
    const { app } = this;
    const toys = app.toys;
    const tv = app.game.toys.videogame;
    this.x = tv?.x ?? app.world.width / 2;
    this.y = toys.floorY();
    this.makeSprite();
    this.place();
    this.el.classList.add('erupting');
    // Ela se assusta e dá um passo para trás da TV (dá para ver a perseguição).
    const pet = app.pet;
    if (pet && tv) {
      const away = pet.x >= tv.x ? 1 : -1;
      const w = app.world?.width || innerWidth;
      pet.x = Math.max(this.P * 0.3, Math.min(w - this.P * 0.3, pet.x + away * this.P * 1.1));
    }
    const rect = toys.tvRect?.() || null;
    if (rect) this.static(rect);
    this.smoke(rect);
    this.ooze(rect);
    app.sound?.play?.('tvstatic', { volume: 0.5 });
    app.sound?.tone8?.(90, 40, 0.5, 'sawtooth', 0.08);
    setTimeout(() => {
      if (this.state !== 'erupt') return;
      this.el?.classList.remove('erupting');
      this.state = 'chase';
      this.play('idle');
      app.sound?.tone8?.(40, 200, 0.35, 'square', 0.1);
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
    const base = rect ? rect.y + rect.h : this.y - this.P * 0.6;
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'unknown-smoke';
      const s = 16 + Math.random() * 30;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.left = `${Math.round((rect ? rect.x + Math.random() * rect.w : this.x) - s / 2)}px`;
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
    const from = rect ? rect.y + rect.h : this.y - this.P * 0.6;
    for (let i = 0; i < 8; i++) {
      const el = document.createElement('div');
      el.className = 'unknown-ooze';
      const x = Math.round(rect ? rect.x + Math.random() * rect.w : this.x);
      el.style.left = `${x}px`;
      el.style.top = `${Math.round(from)}px`;
      el.style.setProperty('--fall', `${Math.round(this.y - from)}px`);
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
        blob.style.top = `${Math.round(this.y - s * 0.3)}px`;
        document.body.append(blob);
        setTimeout(() => blob.remove(), 7000);
      }, 2400);
    }
  }

  // ---------- a perseguição ----------

  // Ele encostou nela: ela larga o que estava fazendo e encara a criatura.
  startFight() {
    if (this.state !== 'chase') return;
    this.state = 'fight';
    const { app } = this;
    const pet = app.pet;
    const melee = app.melee;
    // Ela sai da TV (e a tela apaga) para encarar o Unknown.
    pet.endToy?.(true);
    app.toys?.screen?.stop?.();
    if (!melee) { this.remove(); this.state = 'gone'; return; }
    pet.playToy({
      id: 'unknown', train: true, dummy: true, combatKind: 'combat', dur: 3600, gain: {},
      anim: pet.pickClip?.(['combat_idle'], ['melee_idle', 'idle']) || 'idle',
      facing: 'front', effort: 0.5,
      onEnd: (interrupted) => { melee.leave(interrupted ? 'interrupted' : 'done'); },
      tick: (dt) => melee.update(dt),
    });
    melee.startUnknown(this);
    this.play('attack');
    app.sound?.play?.('explode', { volume: 0.35 });
    // Se a luta não conseguiu começar (outro combate no ar), ele some.
    if (!melee.active) {
      this.remove();
      this.state = 'gone';
    }
  }

  update(dt) {
    if (this.state === 'idle' || this.state === 'gone') return;
    this.t += dt;
    // O glitch pisca de vez em quando (e mais forte quando ele está machucado).
    this.glitchT = (this.glitchT ?? 0) - dt;
    if (this.glitchT <= 0) {
      this.glitchT = 1.6 + Math.random() * 3.4 - (this.state === 'fight' ? 0.6 : 0);
      this.glitch = 0.14 + Math.random() * 0.12;
    }
    if (this.glitch > 0) {
      this.glitch = Math.max(0, this.glitch - dt);
      this.jitter = Math.round((Math.random() - 0.5) * 3);
    }
    // A animação.
    const def = ANIMS[this.anim] || ANIMS.idle;
    this.frameT += dt * 1000;
    const delay = def.delays[this.frame] ?? 100;
    if (this.frameT >= delay) {
      this.frameT -= delay;
      this.frame = (this.frame + 1) % def.frames;
    }
    // A perseguição.
    if (this.state === 'chase') {
      const pet = this.app.pet;
      const dx = pet.x - this.x;
      this.dir = dx < 0 ? -1 : 1;
      const speed = this.P * 0.75;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
      if (step) this.x += step;
      this.play(Math.abs(step) > 0.4 ? 'hop' : 'idle');
      this.place();
      if (Math.abs(pet.x - this.x) < this.P * 0.8) this.startFight();
    } else if (this.state === 'fight') {
      this.place();
    }
    // O desenho.
    if (!this.rawG) return;
    const img = this.sheet(this.anim);
    if (img?.complete && img.naturalWidth) {
      this.rawG.clearRect(0, 0, SPR, SPR);
      this.rawG.imageSmoothingEnabled = false;
      // O quadro é encostado no chão (as folhas têm alturas diferentes).
      this.rawG.drawImage(img, this.frame * def.cw, 0, def.cw, def.ch, 0, SPR - def.ch, def.cw, def.ch);
      this.convert();
      this.draw();
    }
  }

  // ---------- o fim da luta ----------

  // O Unknown foi derrotado: a morte, o Cristal Negro e o cartucho que some para sempre.
  async onDefeat(reason) {
    if (this.state === 'dying' || this.state === 'gone') return;
    this.state = 'dying';
    this.play('death');
    this.app.sound?.play?.('explode', { volume: 0.5 });
    await wait(900);
    const { app } = this;
    const game = app.game;
    if (reason === 'win') {
      // O drop: 1 Cristal Negro no inventário (categoria Especiais).
      game.inventory.cristal_negro = (game.inventory.cristal_negro || 0) + 1;
      game.changed();
      const item = game.items().find((e) => e.item?.id === 'cristal_negro');
      app.gains?.show('Cristal Negro', 'item', 'o Unknown caiu', item?.item?.img || '💎');
      app.sound?.play?.('powerup', { volume: 0.5 });
      // O cartucho preto desaparece: da lista, da estante e da loja.
      game.removeCart('unknown');
      game.profile.unknownDone = true;
      game.changed();
    }
    // Some da tela.
    this.remove();
    this.state = 'gone';
    // E ela fica confusa (só quando ele caiu de verdade).
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
