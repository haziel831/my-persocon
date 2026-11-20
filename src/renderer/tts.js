// Queue-based offline TTS with text filters, audio FX and real-time lip sync.
import { isStoic } from './persona.js';

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

export class VoiceTTS {
  constructor(app) {
    this.app = app;
    this.queue = [];
    this.speaking = false;
    this.mouthLevel = 0;
    this.ctx = null;
    this.current = null;
    this.muted = false; // quick mute: balloons and alerts keep working
    this.lastAt = 0;
    this.userAt = new Map();
  }

  get enabled() {
    const c = this.app.config;
    return !!window.__PET_STREAMER__ && c.ttsEnabled !== false;
  }

  // Turns raw text (or a chat line) into a clean, pronounceable sentence.
  prepareText(text, opts = {}) {
    const c = this.app.config;
    let s = String(text || '').replace(/<[^>]*>/g, ' ');
    if (opts.chat && c.ttsIgnoreCommands !== false && /^\s*[!/$?]/.test(s)) return '';
    if (c.ttsIgnoreLinks !== false) {
      s = s.replace(/https?:\/\/\S+/gi, ' ')
        .replace(/www\.\S+/gi, ' ')
        .replace(/\b[\w-]+(?:\.[a-z]{2,})+(?:\/[^\s]*)?\b/gi, ' ');
    }
    if (c.ttsIgnoreEmotes !== false) {
      for (const emote of opts.emotes || []) if (emote) s = s.split(emote).join(' ');
      s = s.replace(/:[\w+~-]+:/g, ' ').replace(EMOJI_RE, ' ');
    }
    if (c.ttsDedupeChars !== false) {
      s = s.replace(/(.)\1{2,}/g, (_m, ch) => (/[?!.,;:]/.test(ch) ? ch : /[aeiouáéíóúâêôãõàç]/i.test(ch) ? ch + ch : ch + ch + ch));
    }
    for (const line of String(c.ttsPronounce || '').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i < 0) continue;
      const term = line.slice(0, i).trim();
      const say = line.slice(i + 1).trim();
      if (!term || !say) continue;
      try {
        s = s.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, 'giu'), say);
      } catch {}
    }
    s = s.replace(/\s+/g, ' ').trim();
    if (opts.chat && c.ttsSpeakUser !== false && opts.user) {
      s = `${opts.user} ${c.lang === 'en' ? 'said:' : 'disse:'} ${s}`;
    }
    const max = Math.max(60, Math.min(250, Number(c.ttsMaxChars) || 150));
    if (s.length > max) {
      const cut = s.lastIndexOf(' ', max);
      s = s.slice(0, cut > max * 0.6 ? cut : max).trim();
    }
    return s;
  }

  // Badge / ignore-list gate for lines coming from the chat.
  allowed(opts) {
    const c = this.app.config;
    const user = String(opts.user || '').toLowerCase();
    const ignored = String(c.ttsIgnoredUsers ?? 'nightbot, streamelements, streamlabs, moobot, fossabot')
      .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    if (user && ignored.includes(user)) return false;
    const who = c.ttsWho || 'all';
    if (who === 'alerts_only') return false;
    const badges = String(opts.badges || '');
    const has = (name) => badges.split(',').some((b) => b.split('/')[0] === name);
    if (who === 'mods') return has('broadcaster') || has('moderator');
    if (who === 'subs') return has('broadcaster') || has('moderator') || has('vip') || has('subscriber') || has('founder');
    return true;
  }

  enqueue(text, opts = {}) {
    if (!this.enabled || this.muted) return false;
    const c = this.app.config;
    if (opts.chat && !this.allowed(opts)) return false;
    if (opts.chat && !opts.priority) {
      const now = Date.now();
      if (now - this.lastAt < (Number(c.ttsCooldown ?? 20) * 1000)) return false;
      const user = String(opts.user || '').toLowerCase();
      if (user && now - (this.userAt.get(user) || 0) < (Number(c.ttsUserCooldown ?? 30) * 1000)) return false;
      this.lastAt = now;
      if (user) this.userAt.set(user, now);
    }
    const clean = this.prepareText(text, opts);
    if (!clean) return false;
    const job = { text: clean, ...opts };
    if (job.priority) this.queue.unshift(job);
    else this.queue.push(job);
    this.reportQueue();
    if (!this.speaking) this.next();
    return true;
  }

  async next() {
    const job = this.queue.shift();
    this.reportQueue();
    if (!job) { this.speaking = false; this.stopCurrent(); return; }
    this.speaking = true;
    try {
      const c = this.app.config;
      const calm = isStoic(this.app);
      const lang = job.lang || (c.lang === 'en' ? 'en-us' : 'pt-br');
      const voice = job.voice || c.ttsVoice || (lang.startsWith('en') ? (calm ? 'af_nicole' : 'af_heart') : 'pf_dora');
      const speed = job.speed ?? c.ttsSpeed ?? (calm ? 0.88 : 1);
      const data = await window.petAPI?.ttsSpeak?.(c.ttsDir || '', job.text, voice, lang, speed);
      if (!data) throw new Error('no audio');
      const buf = await (await fetch(data)).arrayBuffer();
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ctx.createBufferSource();
      src.buffer = await this.ctx.decodeAudioData(buf.slice(0));
      src.detune.value = (Number(c.ttsPitch) || 0) * 100;
      const chain = [src];
      const filter = c.ttsFilter || 'natural';
      if (filter === 'warm') {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 6000; lp.Q.value = 0.7;
        chain.push(lp);
      } else if (filter === 'wired') {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.knee.value = 6; comp.ratio.value = 3;
        comp.attack.value = 0.01; comp.release.value = 0.2;
        chain.push(bp, comp);
      }
      const gain = this.ctx.createGain();
      gain.gain.value = c.ttsVolume ?? 0.85;
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      chain.push(gain, analyser);
      for (let i = 1; i < chain.length; i++) chain[i - 1].connect(chain[i]);
      analyser.connect(this.ctx.destination);
      this.current = { src, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
      src.onended = () => {
        this.current = null;
        this.mouthLevel = 0;
        this.duck(false);
        this.next();
      };
      this.duck(true);
      src.start();
      this.tick();
    } catch {
      this.stopCurrent();
      this.next();
    }
  }

  tick() {
    const cur = this.current;
    if (!cur) return;
    cur.analyser.getByteTimeDomainData(cur.data);
    let sum = 0;
    for (const v of cur.data) { const x = (v - 128) / 128; sum += x * x; }
    this.mouthLevel = Math.min(1, Math.sqrt(sum / cur.data.length) * 3.5);
    requestAnimationFrame(() => this.tick());
  }

  duck(on) {
    if (this.app.config.ttsDucking !== false) this.app.sound?.setDucking?.(on);
  }

  stopCurrent() {
    if (this.current) {
      try { this.current.src.stop(); } catch {}
      this.current = null;
    }
    this.mouthLevel = 0;
    this.duck(false);
  }

  skip() {
    this.stopCurrent();
    this.next();
  }

  clear() {
    this.queue.length = 0;
    this.stopCurrent();
    this.speaking = false;
    this.reportQueue();
  }

  setMuted(on) {
    this.muted = !!on;
    if (this.muted) {
      this.queue.length = 0;
      this.stopCurrent();
      this.speaking = false;
    }
    this.reportQueue();
  }

  reportQueue() {
    window.petAPI?.streamerRpc?.('stream-ctrl', {
      type: 'ttsQueue',
      count: this.queue.length + (this.speaking ? 1 : 0),
      muted: this.muted,
    });
  }
}
