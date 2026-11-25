// Assistir na TV: everyone gathers in front of the TV (videogame furniture). The screen shows a
// YouTube video (muted) or, without a link, procedural anime / movie episodes. Same CRT look as
// the games on the TV; snacks and reactions come from the Assistir mode (modes.js).
import { crtFilter } from './games.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const W = 128;
const H = 96;
const SCENE = 10;

// name, genre (drawing), the reaction of each scene in turn.
const SHOWS = [
  ['MECHA ZERO', 'mecha', ['tense', 'cheer', 'tense']],
  ['ESTRELA MÁGICA', 'magical', ['cheer', 'laugh']],
  ['TARDE DE SAKURA', 'slice', ['laugh', 'sad', 'laugh']],
  ['A CASA SILENCIOSA', 'horror', ['tense', 'scare']],
  ['SOMBRA NINJA', 'ninja', ['tense', 'cheer']],
  ['TURBO DRIFT', 'race', ['cheer', 'tense']],
  ['KAIJU Z', 'kaiju', ['scare', 'tense', 'cheer']],
  ['LUA DE PAPEL', 'romance', ['sad', 'cheer']],
];

export function youtubeId(text) {
  const s = String(text || '').trim();
  const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : null;
}

export class TvWatch {
  constructor(app) {
    this.app = app;
    this.on = null;
    this.el = null;
    app.pet.on((type, d) => {
      if (!this.on) return;
      if (type === 'activityEnd' || type === 'death' || (type === 'toyStart' && d?.id === 'videogame')) this.stop(true);
    });
  }

  get tv() {
    const t = this.app.game.toys.videogame;
    return t?.placed && !t.broken && this.app.toys.here(t) ? t : null;
  }

  // Right-click on the TV → Assistir: a YouTube link (optional) or a random show.
  panel(x, y) {
    const { toys, game } = this.app;
    const el = document.createElement('div');
    el.className = 'toy-menu hitzone tv-panel';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = '📺 Assistir na TV';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text';
    input.spellcheck = false;
    // The overlay window only takes the keyboard after asking for focus.
    input.addEventListener('pointerdown', () => {
      window.petAPI?.focusWindow?.();
      setTimeout(() => input.focus(), 30);
    });
    input.placeholder = 'Link do YouTube (opcional)';
    input.value = game.profile.tvLink || '';
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = 'Sem link: passa um anime ou filme aleatório. O vídeo passa sem som.';
    const go = (link) => {
      const id = link ? youtubeId(input.value) : null;
      if (link && input.value.trim() && !id) {
        input.classList.add('bad');
        note.textContent = 'Link inválido: cole um link do YouTube.';
        this.app.sound.play('cancel', { volume: 0.4 });
        return;
      }
      if (link) {
        game.profile.tvLink = input.value.trim();
        game.changed();
      }
      toys.closeMenu();
      this.start(id);
    };
    const btn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = (e) => {
        e.stopPropagation();
        fn();
      };
      return b;
    };
    input.onkeydown = (e) => e.key === 'Enter' && go(true);
    const paste = btn('📋 Colar link', async () => {
      const text = await window.petAPI?.clipboardText?.().catch(() => '');
      if (!text?.trim()) {
        note.textContent = 'A área de transferência está vazia.';
        return;
      }
      input.value = text.trim();
      input.classList.toggle('bad', !youtubeId(input.value));
      note.textContent = youtubeId(input.value) ? 'Link colado. Clique em Assistir.' : 'Isso não parece um link do YouTube.';
    });
    el.append(title, input, paste, btn('▶ Assistir', () => go(true)), btn('🎲 Anime ou filme aleatório', () => go(false)), note);
    toys.openMenu(el, x, y);
    window.petAPI?.focusWindow?.();
    setTimeout(() => input.focus(), 30);
  }

  start(yt) {
    const { pet, modes, toys, sound } = this.app;
    const tv = this.tv;
    if (!tv || pet.dead) return false;
    this.stop();
    if (pet.toyPlay) pet.endToy(true);
    if (modes.kind) modes.stop();
    this.on = { yt, show: yt ? null : this.newShow(), t: 0, react: rand(9, 14), started: false };
    this.build();
    sound.sfx('tvon', 1.2);
    const P = pet.P;
    const begin = () => {
      const o = this.on;
      if (!o || o.started) return;
      o.started = true;
      pet.watchTarget = tv.x;
      modes.start('watch', true);
      pet.emit('tvStart');
    };
    const side = pet.x < tv.x ? -1 : 1;
    const spot = clamp(tv.x + side * P * 1.2, P * 0.4, this.app.world.width - P * 0.4);
    if (pet.mode !== 'ground' || !pet.goTo(spot, begin)) begin();
    setTimeout(begin, 12000);
    toys.closeMenu();
    return true;
  }

  stop(fromPet = false) {
    if (!this.on) return;
    this.on = null;
    this.el?.remove();
    this.el = null;
    this.canvas = null;
    this.app.sound.sfx('tvstatic', 0.5);
    if (!fromPet && this.app.pet.activity === 'watch') this.app.modes.stop();
  }

  newShow(prev) {
    let s;
    do s = pick(SHOWS);
    while (SHOWS.length > 1 && s[0] === prev);
    return { name: s[0], genre: s[1], kinds: s[2], t: 0, ep: Math.floor(rand(1, 25)), len: rand(70, 110), seed: Math.random() * 1000 };
  }

  build() {
    crtFilter();
    const el = document.createElement('div');
    el.className = 'tv-show';
    if (this.app.game.toys.videogame?.up) {
      el.classList.add('tv-up');
      const glitch = document.createElement('div');
      glitch.className = 'tv-glitch';
      el.append(glitch);
    }
    if (this.on.yt) {
      const id = this.on.yt;
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1`;
      f.allow = 'autoplay; encrypted-media';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.tabIndex = -1;
      el.append(f);
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = W;
      this.canvas.height = H;
      this.g = this.canvas.getContext('2d');
      el.append(this.canvas);
    }
    document.body.append(el);
    this.el = el;
  }

  update(dt, hidden) {
    const o = this.on;
    if (!o) return;
    if (!this.tv) return this.stop();
    const r = this.app.toys.tvRect();
    const el = this.el;
    el.style.display = hidden || !r ? 'none' : 'block';
    if (r) {
      el.style.width = `${Math.round(r.w)}px`;
      el.style.height = `${Math.round(r.h)}px`;
      el.style.transformOrigin = `${Math.round(r.ox - r.x)}px ${Math.round(r.oy - r.y)}px`;
      el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)${r.rot ? ` rotate(${r.rot}deg)` : ''}`;
    }
    o.t += dt;
    const { pet } = this.app;
    const s = o.show;
    if (s) {
      s.t += dt;
      if (s.t > s.len) o.show = this.newShow(s.name);
      const sc = Math.floor(Math.max(0, s.t - 3) / SCENE);
      // A new scene: she reacts to it (the horror one with a jump scare a few seconds in).
      if (s.t > 3 && sc !== s.scene) {
        s.scene = sc;
        s.kind = s.kinds[sc % s.kinds.length];
        s.reacted = false;
      }
      const at = (s.t - 3) % SCENE;
      if (s.kind && !s.reacted && at > (s.kind === 'scare' ? 4 : 2.5)) {
        s.reacted = true;
        if (pet.action === 'watch') pet.react(s.kind === 'cheer' && Math.random() < 0.3 ? 'laugh' : s.kind);
        if (s.kind === 'scare') this.app.sound.sfx('hit', 0.6);
      }
      if (!hidden && this.g) this.draw(s);
    } else if ((o.react -= dt) <= 0) {
      o.react = rand(14, 26);
      if (pet.action === 'watch') pet.react(pick(['laugh', 'cheer', 'tense', 'laugh']));
    }
  }

  // ---------- the procedural shows ----------

  draw(s) {
    const g = this.g;
    g.imageSmoothingEnabled = false;
    if (s.t < 3) return this.titleCard(s);
    const t = s.t;
    const at = (t - 3) % SCENE;
    this[s.genre](g, t, at, s);
    // Opening fade of each scene.
    if (at < 0.4) {
      g.fillStyle = `rgba(0,0,0,${1 - at / 0.4})`;
      g.fillRect(0, 0, W, H);
    }
  }

  titleCard(s) {
    const g = this.g;
    const k = clamp(s.t / 0.6, 0, 1);
    g.fillStyle = '#05040c';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `hsla(${(i * 40 + s.seed) % 360}, 90%, 70%, ${0.25 + 0.25 * Math.sin(s.t * 4 + i)})`;
      g.fillRect((i * 47 + s.seed) % W, (i * 29) % H, 1, 1);
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 11px PxEmoji, monospace';
    g.fillStyle = `hsla(${(s.seed + s.t * 60) % 360}, 95%, 65%, ${k})`;
    g.fillText(s.name, W / 2 + 1, H / 2 - 5 + 1);
    g.fillStyle = `rgba(255,255,255,${k})`;
    g.fillText(s.name, W / 2, H / 2 - 5);
    g.font = '7px PxEmoji, monospace';
    g.fillStyle = `rgba(200,210,255,${k * 0.9})`;
    g.fillText(`EP. ${s.ep}`, W / 2, H / 2 + 10);
  }

  sky(g, top, bottom) {
    for (let y = 0; y < H; y += 4) {
      const k = y / H;
      g.fillStyle = `hsl(${top[0] + (bottom[0] - top[0]) * k}, ${top[1] + (bottom[1] - top[1]) * k}%, ${top[2] + (bottom[2] - top[2]) * k}%)`;
      g.fillRect(0, y, W, 4);
    }
  }

  stars(g, t, n, speed, seed = 0) {
    for (let i = 0; i < n; i++) {
      const x = (W - (((i * 53 + seed) % W) + t * speed * (1 + (i % 3))) % W + W) % W;
      g.fillStyle = i % 5 ? '#c8d4ff' : '#ffffff';
      g.fillRect(x, (i * 31 + seed) % (H - 20), 1, 1);
    }
  }

  circle(g, x, y, r, c) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  mecha(g, t, at) {
    g.fillStyle = '#060a1e';
    g.fillRect(0, 0, W, H);
    this.stars(g, t, 50, 30);
    this.circle(g, 100, 22, 12, '#3b2f7a');
    this.circle(g, 96, 19, 12, '#5a48b0');
    const bob = Math.sin(t * 2) * 3;
    const x = 40;
    const y = 44 + bob;
    g.fillStyle = '#9aa6c4';
    g.fillRect(x - 10, y - 4, 20, 22);
    g.fillRect(x - 18, y - 2, 7, 18);
    g.fillRect(x + 11, y - 2, 7, 18);
    g.fillRect(x - 8, y + 18, 6, 14);
    g.fillRect(x + 2, y + 18, 6, 14);
    g.fillStyle = '#d33c4e';
    g.fillRect(x - 6, y + 2, 12, 6);
    g.fillStyle = '#c8d0e6';
    g.fillRect(x - 6, y - 14, 12, 10);
    g.fillStyle = '#f4c542';
    g.fillRect(x - 8, y - 18, 4, 4);
    g.fillRect(x + 4, y - 18, 4, 4);
    g.fillStyle = Math.sin(t * 9) > -0.6 ? '#4ff2ff' : '#1a6f80';
    g.fillRect(x - 4, y - 11, 8, 2);
    // Thrusters.
    g.fillStyle = `rgba(80,200,255,${0.5 + 0.5 * Math.sin(t * 30)})`;
    g.fillRect(x - 8, y + 32, 6, 3 + Math.random() * 4);
    g.fillRect(x + 2, y + 32, 6, 3 + Math.random() * 4);
    // Beam and explosion every few seconds.
    const p = at % 3.2;
    if (p > 1.6 && p < 2.2) {
      g.fillStyle = '#9ff8ff';
      g.fillRect(x + 18, y + 4, W, 3);
      g.fillStyle = '#ffffff';
      g.fillRect(x + 18, y + 5, W, 1);
    }
    if (p > 2.1 && p < 3) {
      const r = (p - 2.1) * 22;
      this.circle(g, 112, y + 5, r, '#ff8a3c');
      this.circle(g, 112, y + 5, r * 0.6, '#ffe27a');
    }
  }

  magical(g, t, at) {
    this.sky(g, [300, 70, 35], [260, 60, 20]);
    for (let i = 0; i < 18; i++) {
      const tw = Math.sin(t * 5 + i * 1.7);
      if (tw < 0) continue;
      const x = (i * 41) % W;
      const y = (i * 23 + t * 6) % H;
      g.fillStyle = '#fff6b0';
      g.fillRect(x, y - 1, 1, 3);
      g.fillRect(x - 1, y, 3, 1);
    }
    const x = W / 2;
    const y = 52 + Math.sin(t * 2.2) * 4;
    const sx = Math.cos(t * (at > 5 ? 9 : 2));
    g.save();
    g.translate(x, y);
    g.scale(Math.abs(sx) < 0.15 ? 0.15 : sx, 1);
    g.fillStyle = '#ff7fc8';
    g.fillRect(-12, -18, 6, 14);
    g.fillRect(6, -18, 6, 14);
    g.fillStyle = '#ffd9b8';
    g.fillRect(-6, -20, 12, 11);
    g.fillStyle = '#ff7fc8';
    g.fillRect(-7, -22, 14, 5);
    g.fillStyle = '#2a2040';
    g.fillRect(-4, -15, 2, 3);
    g.fillRect(2, -15, 2, 3);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(-4, -8);
    g.lineTo(4, -8);
    g.lineTo(12, 16);
    g.lineTo(-12, 16);
    g.fill();
    g.fillStyle = '#ff4fa8';
    g.fillRect(-12, 12, 24, 4);
    g.fillStyle = '#ffd9b8';
    g.fillRect(-5, 16, 3, 8);
    g.fillRect(2, 16, 3, 8);
    g.fillStyle = '#c89a3a';
    g.fillRect(8, -10, 2, 14);
    g.fillStyle = '#ffe27a';
    g.fillRect(6, -14, 6, 4);
    g.fillRect(8, -16, 2, 8);
    g.restore();
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.6 + i / 6) % 1;
      const hx = x + Math.sin(i * 2 + t) * 30;
      const hy = H - k * H;
      g.fillStyle = `rgba(255,90,170,${1 - k})`;
      g.fillRect(hx - 2, hy, 2, 2);
      g.fillRect(hx + 1, hy, 2, 2);
      g.fillRect(hx - 2, hy + 1, 5, 2);
      g.fillRect(hx - 1, hy + 3, 3, 1);
    }
  }

  slice(g, t, at, s) {
    this.sky(g, [25, 90, 60], [280, 50, 30]);
    this.circle(g, 96, 56, 14, '#ffcf6b');
    g.fillStyle = '#2a1f3c';
    [[0, 40, 18], [18, 52, 14], [32, 34, 20], [52, 46, 16], [68, 30, 18], [86, 50, 14], [100, 38, 28]].forEach(([x, y, w]) => g.fillRect(x, y, w, H - y));
    g.fillStyle = '#ffe9a8';
    for (let i = 0; i < 16; i++) if ((i * 7 + Math.floor(t / 2)) % 3) g.fillRect(4 + (i * 17) % 120, 44 + (i * 11) % 30, 2, 2);
    for (let i = 0; i < 14; i++) {
      const k = (t * 0.25 + i / 14) % 1;
      g.fillStyle = '#ffb3cf';
      g.fillRect((i * 37 + k * 60) % W, k * H, 2, 1);
    }
    g.fillStyle = '#3a2e4a';
    g.fillRect(0, 82, W, 14);
    const talk = Math.floor(at / 1.6) % 2;
    [[44, '#5b4636', '#3a6fd8'], [80, '#e8b04a', '#d33c4e']].forEach(([x, hair, shirt], i) => {
      const b = talk === i ? Math.abs(Math.sin(t * 8)) * 2 : 0;
      g.fillStyle = shirt;
      g.fillRect(x - 6, 68 - b, 12, 14);
      g.fillStyle = '#ffd9b8';
      g.fillRect(x - 5, 58 - b, 10, 10);
      g.fillStyle = hair;
      g.fillRect(x - 6, 55 - b, 12, 4);
      g.fillRect(x + (i ? 3 : -6), 57 - b, 3, 8);
      g.fillStyle = '#2a2040';
      g.fillRect(x - 3 + (i ? -1 : 1), 62 - b, 1, 2);
      g.fillRect(x + 1 + (i ? -1 : 1), 62 - b, 1, 2);
    });
    const bx = talk ? 70 : 30;
    g.fillStyle = '#ffffff';
    g.fillRect(bx, 36, 26, 12);
    g.fillRect(bx + (talk ? 8 : 14), 48, 3, 3);
    g.fillStyle = '#2a2040';
    g.font = '7px PxEmoji, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s.kind === 'sad' ? '...' : ['!?', 'haha', '!!'][Math.floor(t / 1.6) % 3], bx + 13, 42);
  }

  horror(g, t, at, s) {
    const flick = Math.random() < 0.06;
    g.fillStyle = flick ? '#1a1a26' : '#08080e';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#16162a';
    g.fillRect(20, 14, 26, 30);
    this.circle(g, 33, 26, 6, flick ? '#e8e8ff' : '#9fa4c8');
    g.fillStyle = '#08080e';
    g.fillRect(32, 14, 2, 30);
    g.fillRect(20, 28, 26, 2);
    g.fillStyle = '#1c1410';
    g.fillRect(80, 20, 24, 62);
    g.fillStyle = '#0a0806';
    g.fillRect(82 + Math.min(10, at * 1.5), 22, 20 - Math.min(10, at * 1.5), 58);
    if (Math.sin(t * 1.3) > 0.2) {
      g.fillStyle = '#ff2a2a';
      g.fillRect(88, 44, 2, 1);
      g.fillRect(94, 44, 2, 1);
    }
    g.fillStyle = '#10101a';
    g.fillRect(0, 82, W, 14);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }
    // Jump scare.
    if (s.kind === 'scare' && at > 4 && at < 4.5) {
      g.fillStyle = '#e8e8f0';
      g.fillRect(0, 0, W, H);
      this.circle(g, W / 2, H / 2, 34, '#d8d8e0');
      g.fillStyle = '#000';
      g.fillRect(W / 2 - 18, H / 2 - 12, 12, 14);
      g.fillRect(W / 2 + 6, H / 2 - 12, 12, 14);
      g.fillRect(W / 2 - 10, H / 2 + 10, 20, 16);
    }
  }

  ninja(g, t, at) {
    g.fillStyle = '#0c1430';
    g.fillRect(0, 0, W, H);
    this.stars(g, t, 25, 3, 7);
    this.circle(g, 92, 24, 14, '#f4ecc8');
    this.circle(g, 88, 22, 3, '#ddd2a8');
    const scroll = t * 50;
    g.fillStyle = '#05070f';
    for (let i = -1; i < 5; i++) {
      const x = i * 40 - (scroll % 40);
      const h = 60 + ((i + Math.floor(scroll / 40)) % 3) * 6;
      g.fillRect(x, h, 36, H - h);
      g.fillRect(x - 3, h - 2, 42, 3);
    }
    const ph = (t * 1.2) % 1;
    const y = 56 - Math.sin(ph * Math.PI) * 24;
    const x = 44;
    g.fillStyle = '#000000';
    g.fillRect(x - 4, y - 14, 8, 8);
    g.fillRect(x - 5, y - 6, 10, 10);
    g.fillRect(x - 5 + (Math.sin(t * 16) > 0 ? 2 : -2), y + 4, 3, 6);
    g.fillRect(x + 2 - (Math.sin(t * 16) > 0 ? 2 : -2), y + 4, 3, 6);
    g.fillStyle = '#ffffff';
    g.fillRect(x, y - 11, 3, 1);
    g.fillStyle = '#d33c4e';
    for (let i = 0; i < 4; i++) g.fillRect(x - 6 - i * 4, y - 9 + Math.sin(t * 12 + i) * 2, 4, 2);
    if (at % 2.5 > 1.5) {
      const sx = x + 8 + ((at % 2.5) - 1.5) * 90;
      g.fillStyle = '#c8d0e6';
      g.fillRect(sx - 2, y - 6, 5, 1);
      g.fillRect(sx, y - 8, 1, 5);
    }
  }

  race(g, t, at) {
    this.sky(g, [200, 80, 60], [220, 60, 75]);
    g.fillStyle = '#6a8c4a';
    g.fillRect(0, 44, W, H - 44);
    g.fillStyle = '#3a3a48';
    g.beginPath();
    g.moveTo(W / 2 - 4, 44);
    g.lineTo(W / 2 + 4, 44);
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
    for (let i = 0; i < 8; i++) {
      const k = ((i / 8 + t * 1.6) % 1) ** 2;
      const y = 44 + k * (H - 44);
      g.fillStyle = '#ffffff';
      g.fillRect(W / 2 - 1 - k * 2, y, 2 + k * 4, 1 + k * 4);
      g.fillStyle = i % 2 ? '#d33c4e' : '#ffffff';
      g.fillRect(W / 2 - 6 - k * 60, y, 3 + k * 6, 1 + k * 3);
      g.fillRect(W / 2 + 3 + k * 60, y, 3 + k * 6, 1 + k * 3);
    }
    const rx = W / 2 + Math.sin(t * 0.7) * 20;
    const rk = 0.4 + 0.2 * Math.sin(t * 0.5);
    g.fillStyle = '#2f6fd0';
    g.fillRect(rx - 8 * rk, 44 + rk * 40, 16 * rk, 8 * rk);
    const cx = W / 2 + Math.sin(t * 1.3) * 26;
    g.fillStyle = '#d33c4e';
    g.fillRect(cx - 14, 76, 28, 10);
    g.fillRect(cx - 9, 70, 18, 7);
    g.fillStyle = '#9fd8ff';
    g.fillRect(cx - 7, 71, 14, 4);
    g.fillStyle = '#111';
    g.fillRect(cx - 14, 86, 7, 4);
    g.fillRect(cx + 7, 86, 7, 4);
    g.fillStyle = `rgba(255,${150 + Math.random() * 100},60,0.9)`;
    g.fillRect(cx - 4, 88, 8, 2 + Math.random() * 4);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(Math.random() * W, 50 + Math.random() * 40, 10, 1);
    }
  }

  kaiju(g, t, at) {
    const shake = at % 4 < 0.3 ? (Math.random() - 0.5) * 4 : 0;
    g.save();
    g.translate(shake, 0);
    g.fillStyle = '#1a1030';
    g.fillRect(-4, 0, W + 8, H);
    this.circle(g, 24, 20, 9, '#ff9a5a');
    const mx = 20 + ((t * 6) % (W + 40)) - 20;
    g.fillStyle = '#2f7a4a';
    g.fillRect(mx - 12, 30, 24, 40);
    g.fillRect(mx - 8, 18, 16, 14);
    g.fillRect(mx + 6, 22, 10, 6);
    g.fillRect(mx - 22, 56, 12, 6);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#7fe0a0';
      g.fillRect(mx - 14 - i, 32 + i * 9, 3, 5);
    }
    g.fillStyle = '#ffe27a';
    g.fillRect(mx + 2, 22, 3, 2);
    if (at % 4 > 2.4 && at % 4 < 3.4) {
      g.fillStyle = '#7fd8ff';
      g.fillRect(mx + 16, 24, W, 4);
      g.fillStyle = '#ffffff';
      g.fillRect(mx + 16, 25, W, 1);
    }
    g.fillStyle = '#0c0818';
    [[0, 56, 16], [18, 48, 14], [34, 62, 12], [48, 44, 18], [70, 54, 14], [86, 40, 16], [104, 58, 24]].forEach(([x, y, w]) => g.fillRect(x, y, w, H - y));
    g.fillStyle = '#ffd36a';
    for (let i = 0; i < 24; i++) if ((i + Math.floor(t * 2)) % 4) g.fillRect(2 + (i * 19) % 124, 50 + (i * 7) % 40, 2, 2);
    g.restore();
  }

  romance(g, t, at) {
    this.sky(g, [235, 50, 14], [270, 45, 28]);
    this.stars(g, t, 30, 1, 3);
    this.circle(g, W / 2, 28, 15, '#fff2c8');
    if (at % 5 > 4) {
      const k = (at % 5) - 4;
      g.fillStyle = '#ffffff';
      g.fillRect(100 - k * 70, 10 + k * 20, 6, 1);
    }
    g.fillStyle = '#1a1430';
    g.fillRect(0, 80, W, 16);
    const close = Math.min(1, at / 8);
    const gap = 26 - close * 14;
    [[W / 2 - gap, 1], [W / 2 + gap, -1]].forEach(([x], i) => {
      g.fillStyle = '#0d0a1c';
      g.fillRect(x - 5, 58, 10, 22);
      g.fillRect(x - 4, 48, 8, 10);
      if (i) g.fillRect(x - 5, 48, 10, 14);
    });
    if (close > 0.9) {
      const k = (t * 0.8) % 1;
      g.fillStyle = `rgba(255,90,140,${1 - k})`;
      const y = 44 - k * 20;
      g.fillRect(W / 2 - 3, y, 3, 3);
      g.fillRect(W / 2 + 1, y, 3, 3);
      g.fillRect(W / 2 - 3, y + 2, 7, 3);
      g.fillRect(W / 2 - 1, y + 5, 3, 2);
    }
  }
}
