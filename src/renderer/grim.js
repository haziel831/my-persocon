// O Grim — o segundo tipo de inimigo do cartucho preto.
//
// Diferente das gosmas (que são uma silhueta preta com os olhos vermelhos, geradas por
// conversão de quadro), o Grim já vem em pixel art colorida com folhas próprias. Ele usa a
// MESMA API que o combate exige de qualquer inimigo (hp/atk/defense/level/acc/stun/name/
// play/flash/place/remove/update), então o `melee.js` não precisa saber que ele é diferente:
// só o `kind = 'grim'` muda as falas, o Glitch Surge e o projétil.
const SHEET_DIR = './assets/enemies/grim/';

// As folhas do Grim (tiles de 64x64; o projétil é 64x48). As animações de 3 linhas têm 24
// quadros; as de 1 linha têm 6 ou 7. Só `idle` e `run` repetem.
const ANIMS = {
  idle: { file: 'idle', cols: 8, rows: 2, frames: 16, delay: 110, loop: true },
  run: { file: 'run', cols: 6, rows: 1, frames: 6, delay: 90, loop: true },
  attack: { file: 'attack', cols: 8, rows: 3, frames: 24, delay: 55, loop: false },
  hurt: { file: 'confused', cols: 8, rows: 3, frames: 24, delay: 55, loop: false },
  death: { file: 'death', cols: 8, rows: 3, frames: 24, delay: 70, loop: false },
  spawn: { file: 'spawn', cols: 8, rows: 3, frames: 24, delay: 55, loop: false },
  summon: { file: 'summon', cols: 8, rows: 3, frames: 24, delay: 60, loop: false },
  knock: { file: 'knockback', cols: 7, rows: 1, frames: 7, delay: 70, loop: false },
};
// Nomes que o combate usa para os inimigos e que não existem nas folhas do Grim.
const ALIAS = { walk: 'run', hop: 'run', jump: 'run', hit: 'hurt', knockback: 'knock' };
const SPR = 64;          // o quadro lógico do sprite (64x64)
const PROJ = { w: 64, h: 48, frames: 6, delay: 70 };

export class Grim {
  constructor(app, x, y, stats) {
    this.app = app;
    this.kind = 'grim';
    this.hp = stats.hp;
    this.max = stats.hp;
    this.atk = stats.atk;
    this.defense = stats.def;
    this.level = stats.level;
    this.acc = stats.acc;
    this.stun = stats.stun;
    this.name = stats.name || 'Grim';
    this.x = x;
    this.y = y;
    this.dir = -1;
    this.anim = 'idle';
    this.frame = 0;
    this.frameT = 0;
    this.t = 0;
    this.flashT = 0;
    this.flashI = 0;
    this.sheets = new Map();
    this.el = null;
    this.view = null;
    this.projEl = null;
  }

  get P() { return this.app.pet.P; }

  // ---------- as folhas ----------

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
    el.className = 'grim-foe';
    el.width = SPR;
    el.height = SPR;
    document.body.append(el);
    this.el = el;
    this.view = el.getContext('2d');
    // Pré-carrega as folhas que o combate usa: sem isto o primeiro desenho sai vazio
    // (canvas limpo, imagem ainda baixando) e ele "desaparece" por um instante.
    for (const name of ['idle', 'run', 'attack', 'hurt', 'spawn', 'knock']) this.sheet(name);
    return el;
  }

  remove() {
    this.el?.remove();
    this.el = null;
    this.projEl?.remove();
    this.projEl = null;
  }

  // A escala do sprite na tela (o Grim é maior que a gosma, menor que a Persocon).
  scale() {
    return Math.max(2, Math.round((this.P / 52) * 2) / 2);
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
    const name = ALIAS[anim] || anim;
    if (!ANIMS[name] || this.anim === name) return;
    this.anim = name;
    this.frame = 0;
    this.frameT = 0;
  }

  // O flash vermelho do dano: quanto maior, mais forte acende.
  flash(intensity = 1, duration = 0.3) {
    this.flashT = Math.max(0.01, duration);
    this.flashI = Math.min(1, Math.max(0.25, intensity || 0.25));
    this.hitFlash = this.flashI;
  }

  // ---------- o desenho ----------

  draw() {
    if (!this.view || typeof this.view.save !== 'function') return;
    const g = this.view;
    const def = ANIMS[this.anim] || ANIMS.idle;
    const img = this.sheet(this.anim);
    const col = this.frame % def.cols;
    const row = Math.floor(this.frame / def.cols);
    // Ele ENCARA a Persocon: espelha quando ela está à esquerda.
    const petX = this.app?.pet?.x ?? this.x;
    const flip = petX < this.x;
    g.save();
    if (flip) { g.translate(SPR, 0); g.scale(-1, 1); }
    g.imageSmoothingEnabled = false;
    // Só limpa quando tem quadro para desenhar: se a imagem ainda não chegou, o último
    // quadro desenhado continua na tela (em vez de sumir).
    if (img?.complete && img.naturalWidth) {
      g.clearRect(0, 0, SPR, SPR);
      g.drawImage(img, col * SPR, row * SPR, SPR, SPR, 0, 0, SPR, SPR);
    }
    g.restore();
    if (this.flashT > 0) {
      const k = this.flashI * (this.flashT / 0.3);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(255, 40, 60, ${(k * 0.8).toFixed(3)})`;
      g.fillRect(0, 0, SPR, SPR);
      g.globalCompositeOperation = 'source-over';
    }
  }

  // O Projétil da Peste: sai dele e voa até o alvo, girando os quadros da folha.
  projectile(tx, ty) {
    if (typeof document === 'undefined') return;
    this.projEl?.remove();
    const cv = document.createElement('canvas');
    cv.className = 'grim-proj';
    cv.width = PROJ.w;
    cv.height = PROJ.h;
    const img = new Image();
    img.src = new URL(`${SHEET_DIR}projectile.png`, import.meta.url).href;
    document.body.append(cv);
    this.projEl = cv;
    const g = cv.getContext('2d');
    const from = { x: this.x, y: this.y - SPR * this.scale() * 0.55 };
    const to = { x: tx ?? this.x, y: ty ?? this.y };
    const dur = 0.42;
    let t = 0;
    let frame = 0;
    let frameT = 0;
    const tick = (dt) => {
      t += dt;
      frameT += dt * 1000;
      if (frameT >= PROJ.delay) { frameT -= PROJ.delay; frame = (frame + 1) % PROJ.frames; }
      const k = Math.min(1, t / dur);
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 26;
      const s = 1.6;
      g.clearRect(0, 0, PROJ.w, PROJ.h);
      g.imageSmoothingEnabled = false;
      if (img.complete && img.naturalWidth) {
        g.drawImage(img, frame * PROJ.w, 0, PROJ.w, PROJ.h, 0, 0, PROJ.w, PROJ.h);
      }
      cv.style.width = `${PROJ.w * s}px`;
      cv.style.height = `${PROJ.h * s}px`;
      cv.style.left = `${Math.round(x - (PROJ.w * s) / 2)}px`;
      cv.style.top = `${Math.round(y - (PROJ.h * s) / 2)}px`;
      if (k >= 1) {
        cv.remove();
        if (this.projEl === cv) this.projEl = null;
        return false;
      }
      return true;
    };
    cv.style.left = `${Math.round(from.x)}px`;
    cv.style.top = `${Math.round(from.y)}px`;
    // O laço do projétil roda no update dele (um só por vez).
    this._proj = { tick };
  }

  // A perseguição e o desenho.
  update(dt, pet) {
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    if (this._proj && this._proj.tick(dt) === false) this._proj = null;
    const def = ANIMS[this.anim] || ANIMS.idle;
    this.frameT += dt * 1000;
    if (this.frameT >= def.delay) {
      this.frameT -= def.delay;
      if (def.loop) this.frame = (this.frame + 1) % def.frames;
      else if (this.frame + 1 < def.frames) this.frame += 1;
      // Animação de uma vez só terminou: volta para o idle. Sem isto ele parava no último
      // quadro (quase sempre vazio nas folhas) e ficava invisível até o próximo play().
      else if (this.anim !== 'death' && this.anim !== 'spawn') this.play('idle');
    }
    // Posiciona SEMPRE (na perseguição E na luta).
    this.place();
    if (this.state === 'chase' && pet) {
      const dx = pet.x - this.x;
      this.dir = dx < 0 ? -1 : 1;
      const speed = this.P * 0.62;
      const room = Math.abs(dx) - this.P * 1.05;
      const step = Math.sign(dx) * Math.max(0, Math.min(room, speed * dt));
      if (step) this.x += step;
      if (this.anim !== 'spawn') this.play(Math.abs(step) > 0.4 ? 'run' : 'idle');
      this.place();
    }
    this.draw();
  }
}
