// Queue-based offline TTS with text filters, audio FX and real-time lip sync.
import { isStoic } from './persona.js';

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
const DECOR_RE = /[♥❤★☆✨♪♫~*_^`|\\<>\[\]{}]/gu;
const PUNCT_RUN_RE = /([!?.,;:])\1+/g;
const PAUSE_RE = /(?:\.{3,}|—|–)+/g;
export const VOICE_PRESETS = {
  aghata: {
    voice: 'pf_dora',
    blend: [
      { voice: 'pf_dora', weight: 0.55 },
      { voice: 'jf_nezumi', weight: 0.3 },
      { voice: 'af_nicole', weight: 0.15 },
    ],
    speed: 0.88,
    pitch: -1,
    filter: 'warm',
  },
};

const LANG_BY_PREFIX = { a: 'en-us', b: 'en-gb', p: 'pt-br', j: 'ja', e: 'es', f: 'fr-fr', h: 'hi', i: 'it', z: 'zh' };
const langForVoice = (voice, fallback) => LANG_BY_PREFIX[String(voice || '').split('_')[0].charAt(0).toLowerCase()] || fallback;

export class VoiceTTS {
  constructor(app) {
    this.app = app;
    this.queue = [];
    this.speaking = false;
    this.mouthLevel = 0;
    this.ctx = null;
    this.current = null;
    this.muted = false; // quick mute: balloons and alerts keep working
    this.engine = 'offline'; // 'offline' (Offline TTS Studio) | 'windows' (speechSynthesis)
    this.engineNote = '';
    this.lastError = '';
    this.lastChatterAt = 0;
    this.gen = 0;
    this.lastAt = 0;
    this.userAt = new Map();
  }

  get enabled() {
    const c = this.app.config;
    return (!!window.__PET_STREAMER__ && c.ttsEnabled !== false)
      || (!window.__PET_STREAMER__ && c.offlineTts === true);
  }

  // Classified triggers for the normal game (idle chatter has its own cooldown).
  enqueueFor(kind, text, opts = {}) {
    if (window.__PET_STREAMER__) return this.enqueue(text, opts);
    const c = this.app.config;
    if (!c.offlineTts || this.app.dndActive || c.sound === false || this.app.pomodoro?.focusing) return false;
    if (kind === 'events' && this.idleNow) kind = 'chatter';
    if (kind === 'events' && c.offlineTtsEvents === false) return false;
    if (kind === 'interact' && c.offlineTtsInteract === false) return false;
    if (kind === 'chatter') {
      if (c.offlineTtsChatter !== true) return false;
      const gap = (Number(c.offlineTtsChatterMin ?? 4) * 60) * 1000;
      if (Date.now() - (this.lastChatterAt || 0) < gap) return false;
      this.lastChatterAt = Date.now();
    }
    return this.enqueue(text, opts);
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
    // Never let the engine read punctuation/symbol names aloud. Accented letters
    // are kept exactly as typed (valid UTF-8, no NFD splitting).
    s = s.replace(EMOJI_RE, ' ')
      .replace(DECOR_RE, ' ')
      .replace(PAUSE_RE, ',')
      .replace(PUNCT_RUN_RE, '$1')
      .replace(/["']/g, ' ')
      .replace(/\s*([,.!?;:])\s*/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return '';
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
  denyReason(opts) {
    const c = this.app.config;
    const user = String(opts.user || '').toLowerCase();
    const login = String(opts.login || opts.user || '').toLowerCase();
    const ignored = String(c.ttsIgnoredUsers ?? 'nightbot, streamelements, streamlabs, moobot, fossabot')
      .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    if ((user && ignored.includes(user)) || (login && ignored.includes(login))) return 'ignorado';
    const badges = String(opts.badges || '');
    const has = (name) => badges.split(',').some((b) => b.split('/')[0] === name);
    const channel = String(c.twitchChannel || '').replace(/^#/, '').toLowerCase();
    if (has('broadcaster') || (!!channel && (login === channel || user === channel))) return '';
    const who = c.ttsWho || 'all';
    if (who === 'alerts_only') return 'Só Alertas';
    if (who === 'mods') return (has('moderator')) ? '' : 'Apenas Mods';
    if (who === 'subs') return (has('moderator') || has('vip') || has('subscriber') || has('founder')) ? '' : 'Subs & VIPs';
    if (who === 'followers') {
      const privileged = has('moderator') || has('vip') || has('subscriber') || has('founder');
      const known = !!opts.follower || !!this.app.knownFollowers?.has(user) || !!this.app.knownFollowers?.has(login);
      return (privileged || known) ? '' : 'Seguidores+';
    }
    return '';
  }

  allowed(opts) {
    return !this.denyReason(opts);
  }

  enqueue(text, opts = {}) {
    if (!this.enabled || this.muted) return false;
    const c = this.app.config;
    if (opts.chat && !this.allowed(opts)) return false;
    const clean = this.prepareText(text, opts);
    if (!clean) return false;
    if (opts.chat && !opts.priority) {
      const now = Date.now();
      if (now - this.lastAt < (Number(c.ttsCooldown ?? 5) * 1000)) return false;
      const user = String(opts.login || opts.user || '').toLowerCase();
      if (user && now - (this.userAt.get(user) || 0) < (Number(c.ttsUserCooldown ?? 15) * 1000)) return false;
      this.lastAt = now;
      if (user) this.userAt.set(user, now);
    }
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
    const gen = ++this.gen;
    let playing = false;
    try {
      const c = this.app.config;
      const calm = isStoic(this.app);
      const preset = VOICE_PRESETS[c.voicePreset] || null;
      const chosen = String(job.voice || c.ttsVoice || preset?.voice || '').trim();
      const fallbackLang = c.lang === 'en' ? 'en-us' : 'pt-br';
      const lang = job.lang || langForVoice(chosen, fallbackLang);
      const voice = chosen || (lang.startsWith('en') ? 'af_nicole' : 'pf_dora');
      const speed = job.speed ?? c.ttsSpeed ?? preset?.speed ?? (calm ? 0.88 : 1);
      let data = null;
      try {
        data = await window.petAPI?.ttsSpeak?.(c.ttsDir || '', job.text, voice, lang, speed, job.blend || preset?.blend || null);
      } catch (err) {
        this.lastError = String(err?.message || err || 'offline TTS failed');
      }
      if (gen !== this.gen) return; // superseded by a newer preview/selection
      if (!data) {
        // The .zip can be installed without the Offline TTS Studio: use the
        // native Windows voice instead of leaving the game silent.
        if (this.speakWindows(job, lang, speed, gen)) { playing = true; return; }
        throw new Error(this.lastError || 'no audio');
      }
      const base64 = String(data).slice(String(data).indexOf(',') + 1);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      const src = this.ctx.createBufferSource();
      src.buffer = await this.ctx.decodeAudioData(bytes.buffer);
      src.detune.value = (Number(c.ttsPitch ?? preset?.pitch) || 0) * 100;
      const chain = [src];
      const filter = c.ttsFilter || preset?.filter || 'natural';
      if (filter === 'warm') {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 6000; lp.Q.value = 0.7;
        chain.push(lp);
        // discrete presence so the calm timbre stays intelligible in PT-BR
        const presence = this.ctx.createBiquadFilter();
        presence.type = 'peaking'; presence.frequency.value = 3200; presence.Q.value = 0.8; presence.gain.value = 1.5;
        chain.push(presence);
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
      playing = true;
      this.lastError = '';
      src.start();
      this.tick();
      this.app.pushStreamerState?.();
    } catch (err) {
      this.lastError = String(err?.message || err || 'erro desconhecido');
      console.error('[tts]', err);
      window.petAPI?.log?.('tts error:', this.lastError);
      this.app.pushStreamerState?.();
      this.stopCurrent();
      this.next();
    } finally {
      // Never leave the SFX ducked if anything above failed before playback started.
      if (!playing && gen === this.gen) this.duck(false);
    }
  }

  // Last-resort voice: Windows Speech Synthesis (SAPI/OneCore). Single queue,
  // smooth synthetic mouth level, same volume/rate/pitch and ducking behaviour.
  speakWindows(job, lang, speed, gen) {
    if (typeof speechSynthesis === 'undefined') return false;
    const synth = window.speechSynthesis;
    const c = this.app.config;
    const u = new SpeechSynthesisUtterance(job.text);
    const want = lang.startsWith('en') ? ['en-US', 'en-GB'] : ['pt-BR', 'pt-PT'];
    const voices = synth.getVoices() || [];
    const soft = ['maria', 'francisca', 'zira', 'aria', 'samantha', 'google português', 'microsoft helena'];
    const match = voices.find((v) => want.some((l) => v.lang?.toLowerCase() === l.toLowerCase()) && soft.some((s) => v.name?.toLowerCase().includes(s)))
      || voices.find((v) => want.some((l) => v.lang?.toLowerCase().startsWith(l.slice(0, 2).toLowerCase())));
    if (match) u.voice = match;
    u.lang = match?.lang || (lang.startsWith('en') ? 'en-US' : 'pt-BR');
    u.rate = Math.max(0.5, Math.min(2, speed));
    u.pitch = Math.max(0, Math.min(2, 1 + (Number(c.ttsPitch) || 0) * 0.05));
    u.volume = Math.max(0, Math.min(1, c.ttsVolume ?? 0.85));
    this.engine = 'windows';
    this.engineNote = c.lang === 'en'
      ? 'Using Windows voice (Offline TTS not found)'
      : 'Usando voz do Windows (Offline TTS não encontrado)';
    this.lastError = '';
    this.speaking = true;
    this.duck(true);
    const finish = () => {
      if (this._winTimer) { clearInterval(this._winTimer); this._winTimer = null; }
      if (gen !== this.gen) return;
      this.mouthLevel = 0;
      this.duck(false);
      this.next();
    };
    u.onend = finish;
    u.onerror = finish;
    try {
      synth.cancel();
      synth.speak(u);
    } catch { this.duck(false); return false; }
    this._winTimer = setInterval(() => {
      if (gen !== this.gen) { clearInterval(this._winTimer); this._winTimer = null; return; }
      this.mouthLevel = 0.25 + Math.random() * 0.5;
    }, 90);
    this.app.pushStreamerState?.();
    return true;
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
    this.gen = (this.gen || 0) + 1;
    if (this._winTimer) { clearInterval(this._winTimer); this._winTimer = null; }
    try { if (this.engine === 'windows' && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch {}
    if (this.current) {
      this.current.src.onended = null; // never let an old source advance the queue
      try { this.current.src.stop(); } catch {}
      this.current = null;
    }
    this.mouthLevel = 0;
    this.duck(false);
  }

  // Immediate audition: cancels whatever is playing, ignores chat cooldowns and quick mute.
  preview(text, voice) {
    // Explicit test always plays, even with TTS off / DND / sound muted.
    const clean = this.prepareText(text);
    if (!clean) return false;
    this.stopCurrent();
    this.queue.unshift({ text: clean, voice, test: true });
    this.speaking = false;
    this.next();
    return true;
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
    window.petAPI?.streamerPushState?.({
      tts: {
        queue: this.queue.length + (this.speaking ? 1 : 0),
        muted: this.muted,
        speaking: this.speaking,
      },
    }).catch?.(() => {});
  }
}
