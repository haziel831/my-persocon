// Jam (dances to the music playing on the PC) and Assistir (watches the video behind it),
// driven by the host's audio loopback analysis: { level, bass, mid, high, beat, bpm } ~30x/s.
import { icon } from './pixel.js';
import { TASTE_RANK } from './game.js';
import { isFocus } from './focusmode.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const SNACK_STAT = { comidas: 'hunger', bebidas: 'thirst' };
const SNACK_BELOW = 70;
const SNACK_CAP = 105;

export class Modes {
  constructor(app) {
    this.app = app;
    this.kind = null;
    this.hue = 0;
    this.glow = 0;
    this.avg = 0.02;
    this.mids = [];
    this.scareCool = 0;
    this.laughCool = 0;
    this.laughHits = 0;
    this.noteTimer = 0;
    this.listening = false;
    window.petAPI.onAudio?.((a) => this.onAudio(a));
    if (!window.__PET_TEST__) setInterval(() => this.probe(), 100000);
    app.pet.on((type, d) => {
      if (type === 'activityEnd' || type === 'death') this.stop(true);
    });
  }

  start(kind, marked = false, auto = false) {
    const { pet } = this.app;
    if (pet.mini) return;
    if (kind === 'watch' && !marked && this.app.markVideo && !window.__PET_TEST__) {
      this.app.markVideo((x) => {
        pet.watchTarget = x;
        this.start(kind, true, auto);
      });
      return true;
    }
    if (!pet.startActivity(kind)) return false;
    this.snackTimer = 15;
    this.kind = kind;
    this.auto = !!auto;
    // Manual: stays while hunger/thirst/energy > 50% (pauses to care, then resumes).
    // Auto: same care rule, but capped so she does not lock forever.
    this.left = auto
      ? (kind === 'jam' ? 240 + Math.random() * 180 : 300 + Math.random() * 240)
      : Infinity;
    this.karaoke = kind === 'jam' && !!this.wantKaraoke && !!pet.gear.microfone;
    this.wantKaraoke = false;
    if (this.karaoke) pet.carry = 'mic';
    if (!this.listening) {
      this.listening = true;
      window.petAPI.audioListen?.(true).catch(() => {});
    }
    if (kind === 'jam') {
      pet.fulfill?.('jam');
      this.app.trio?.jamStarted?.();
    }
    if (kind === 'watch') pet.fulfill?.('watch');
    return true;
  }

  stop(fromPet) {
    if (!this.kind) return;
    this.kind = null;
    if (this.karaoke && this.app.pet.carry === 'mic') this.app.pet.carry = null;
    this.karaoke = false;
    if (this.listening) {
      this.listening = false;
      window.petAPI.audioListen?.(false).catch(() => {});
    }
    if (!fromPet) this.app.pet.stopActivity();
  }

  // Listens for a few seconds; steady beats = music (Jam), voices without beat = a video (Assistir).
  probe() {
    const { pet, config } = this.app;
    if (config.autoActivity === false || isFocus(config, this.app) || this.kind || this.probing || pet.dead || pet.toyPlay || pet.chase || pet.mode !== 'ground') return;
    if (!['idle', 'walk', 'sit'].includes(pet.action) || Math.random() > 0.5) return;
    this.probing = { n: 0, level: 0, beats: 0 };
    window.petAPI.audioListen?.(true).catch(() => {});
    setTimeout(() => {
      const p = this.probing;
      this.probing = null;
      if (!this.kind) window.petAPI.audioListen?.(false).catch(() => {});
      if (!p || !p.n || this.kind) return;
      const level = p.level / p.n;
      if (level < 0.015) return;
      const kind = p.beats >= 6 ? 'jam' : 'watch';
      if (kind === 'watch') pet.watchTarget = null;
      this.start(kind, true, true);
    }, 6000);
  }

  onAudio(a) {
    if (this.probing) {
      this.probing.n++;
      this.probing.level += a.level;
      if (a.beat) this.probing.beats++;
    }
    if (!this.kind) return;
    const { pet } = this.app;
    this.avg = this.avg * 0.985 + a.level * 0.015;
    if (this.kind === 'jam') {
      if (a.bpm > 0) pet.danceSpeed = clamp(a.bpm / 115, 0.6, 1.8);
      if (pet.action === 'jam') this.app.view.animator.speed = a.level < 0.005 ? 0.35 : pet.danceSpeed;
      if (a.beat) {
        this.glow = 1;
        this.hue = (this.hue + 40 + Math.random() * 40) % 360;
        this.note(true);
        // Karaoke: sings along, the pitch following how bright the music sounds right now.
        if (this.karaoke) {
          const bright = clamp(a.high / (a.mid + a.bass + 1e-4), 0, 1.5);
          const scale = [0, 2, 4, 7, 9, 12, 14];
          const f = 262 * Math.pow(2, scale[Math.round(bright * 4) % scale.length] / 12) * (Math.random() < 0.2 ? 2 : 1);
          this.app.sound.tone8(f, f * 1.01, 60 / Math.max(80, a.bpm || 110) * 0.8, this.app.sound.voiceWave || 'square', 0.06 * (this.app.config.voiceVolume ?? 0.7));
          this.app.view.setMouth?.(0.8);
          setTimeout(() => this.app.view.setMouth?.(0), 180);
        }
        if (Math.random() < 0.04) pet.react('cheer');
      }
      return;
    }
    // Assistir: a sudden loud spike = jump-scare; a 4-7 Hz pulsing in the voice band = laughter.
    this.scareCool -= 1 / 30;
    this.laughCool -= 1 / 30;
    if (this.scareCool <= 0 && a.level > 0.12 && a.level > this.avg * 4) {
      this.scareCool = 5;
      pet.react('scare');
      return;
    }
    // Sustained heavy bass = action/tension; a long quiet stretch = a serious or sad scene.
    this.bassAvg = (this.bassAvg ?? a.bass) * 0.97 + a.bass * 0.03;
    this.bassLong = (this.bassLong ?? a.bass) * 0.998 + a.bass * 0.002;
    this.quiet = a.level < Math.max(0.006, this.avg * 0.4) ? (this.quiet || 0) + 1 / 30 : 0;
    this.moodCool = (this.moodCool ?? 10) - 1 / 30;
    if (this.moodCool <= 0 && this.bassAvg > this.bassLong * 2.2 && this.bassAvg > 0.04) {
      this.moodCool = 20;
      pet.react('tense');
      return;
    }
    if (this.moodCool <= 0 && this.quiet > 18) {
      this.moodCool = 30;
      this.quiet = 0;
      pet.react('sad');
      return;
    }
    this.mids.push(a.mid);
    if (this.mids.length > 45) this.mids.shift();
    if (this.mids.length < 45 || this.laughCool > 0) return;
    const mean = this.mids.reduce((s, v) => s + v, 0) / 45;
    const sd = Math.sqrt(this.mids.reduce((s, v) => s + (v - mean) ** 2, 0) / 45);
    let crossings = 0;
    for (let i = 1; i < 45; i++) if ((this.mids[i - 1] - mean) * (this.mids[i] - mean) < 0) crossings++;
    const hz = crossings / 2 / 1.5;
    const laughing = mean > 0.015 && sd > mean * 0.35 && hz >= 3.5 && hz <= 8;
    this.laughHits = laughing ? this.laughHits + 1 : Math.max(0, this.laughHits - 1);
    if (this.laughHits >= 20) {
      this.laughHits = 0;
      this.laughCool = 8;
      pet.react('laugh');
    }
  }

  // A musical note floating up around the pet, colored and glowing with the beat.
  note(big) {
    const { pet, head } = this.app;
    if (!head) return;
    const el = document.createElement('div');
    el.className = 'music-note';
    const size = Math.round(pet.P * (big ? 0.16 : 0.11));
    const src = icon('note');
    el.style.width = `${size}px`;
    el.style.height = `${Math.round(size * 1.3)}px`;
    el.style.maskImage = el.style.webkitMaskImage = `url(${src})`;
    const color = `hsl(${this.hue}, 95%, 65%)`;
    el.style.background = color;
    el.style.filter = `drop-shadow(0 0 ${big ? 8 : 4}px ${color})`;
    el.style.left = `${head.x + (Math.random() - 0.5) * pet.P * 0.9}px`;
    el.style.top = `${head.y + Math.random() * pet.P * 0.3}px`;
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 40}px`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  // While watching, the pet snacks on its own from the inventory, but only when hungry/thirsty
  // enough for the whole item to count (never on a full belly, nothing wasted above SNACK_CAP).
  snack(dt) {
    const { pet, game } = this.app;
    this.snackTimer -= dt;
    if (this.snackTimer > 0 || (pet.action !== 'watch' && pet.action !== 'eat')) return;
    if (pet.action === 'eat' || pet.eating || pet.meals?.length) return;
    this.snackTimer = 18 + Math.random() * 18;
    const s = pet.stats;
    const cats = Object.keys(SNACK_STAT).filter((c) => (s[SNACK_STAT[c]] ?? 100) < SNACK_BELOW)
      .sort((a, b) => s[SNACK_STAT[a]] - s[SNACK_STAT[b]]);
    for (const cat of cats) {
      const k = SNACK_STAT[cat];
      const room = SNACK_CAP - s[k];
      const fits = (i) => i.cat === cat && (i.effects?.[k] || 0) > 0 && i.effects[k] <= room;
      const snacks = game.items((i) => fits(i) && i.watchOnly);
      // Never picks the free leftovers / tap water or something she dislikes while watching.
      const list = snacks.length ? snacks : game.items((i) => fits(i) && i.price !== 0 && (TASTE_RANK[game.tasteOf(i.id)] ?? 2) >= TASTE_RANK.ok);
      if (!list.length) continue;
      const best = Math.max(...list.map((e) => e.item.effects[k]));
      const top = list.filter((e) => e.item.effects[k] >= best * 0.75);
      const food = top[Math.floor(Math.random() * top.length)].item;
      // Bypass busyForQueue (watch counts as busy) so she eats sitting instead of queuing afterPlay.
      if (!pet.feed(food)) continue;
      game.take(food.id);
      return;
    }
  }

  update(dt) {
    const pet = this.app.pet;
    const s = pet.stats;
    if (!this.kind) return;
    // Snacking while Assistir: keep the activity; she eats sitting facing the video.
    const snacking = this.kind === 'watch' && (pet.eating || pet.action === 'eat' || pet.meals?.length);
    // Player queued something (afterPlay, care queue, chase, toy…): yield immediately.
    if (!snacking && (pet.afterPlay?.length || pet.actionQueue?.length
      || pet.chase || pet.pending || pet.toyPlay || pet.mini || pet.ballPlay
      || (pet.meals?.length && this.kind !== 'watch'))) {
      this.stop();
      if (pet.afterPlay?.length || pet.meals?.length || pet.actionQueue?.length) pet.chooseNext();
      return;
    }
    // Timer only ticks while she is actually in the activity (not while tending).
    if (!this.tending && Number.isFinite(this.left) && (this.left -= dt) <= 0) {
      this.stop();
      return;
    }
    // Prefer snacking from inventory while Assistir before leaving to tend.
    if (this.kind === 'watch' && !snacking) this.snack(dt);
    // Below 50% hunger/thirst/energy: pause, care, then chooseNext brings her back.
    const watching = ['jam', 'watch', 'react', 'eat'].includes(pet.action);
    if (watching && !pet.eating) this.tending = false;
    if (watching && !pet.eating && (this.tendT = (this.tendT || 0) - dt) <= 0) {
      this.tendT = 1;
      const low = s.hunger <= 50 || (s.thirst ?? 100) <= 50 || s.energy <= 50
        || s.health < 30 || (s.hygiene ?? 100) < 15;
      // Still hungry after snack attempt with nothing left: go care / buy.
      if (low && pet.tendNeed?.()) {
        this.tending = true;
        pet.emit('activityPause', { kind: this.kind });
        return;
      }
    }
    // Too hungry, thirsty, tired, sad or hurt and nothing to fix it with: stops on its own.
    if (!this.tending && !pet.eating && Math.min(s.hunger, s.thirst ?? 100, s.energy, s.mood, s.health) < 12) {
      this.stop();
      this.app.pet.emit('activityTired');
      return;
    }
    if (this.kind !== 'jam') return;
    this.glow = Math.max(0, this.glow - dt * 2.5);
    this.noteTimer -= dt;
    if (this.noteTimer <= 0 && this.avg > 0.01) {
      this.noteTimer = 0.6;
      this.note(false);
    }
  }
}
