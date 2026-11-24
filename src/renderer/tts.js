// Queue-based offline TTS with text filters, audio FX and real-time lip sync.
import { isStoic, replacePetNames } from './persona.js';

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
const CTRL_RE = /[\u0000-\u001F\u007F-\u009F]/g;

// Single strict whitelist used by every speech path (offline and Windows fallback).
// Keeps letters (with their composed accents), digits, spaces and basic punctuation only.
export function sanitizeForTts(text, app) {
  let s = String(replacePetNames(app, text) || '').normalize('NFC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(EMOJI_RE, ' ')
    .replace(CTRL_RE, ' ')
    .replace(/(?:\.{3,}|…|—|–|;|:)/g, ',')
    .replace(/[^\p{L}\p{N}\s,.\?!-]/gu, ' ')
    .replace(/([!?.,])\1+/g, '$1')
    .replace(/\s*([,.!?])\s*/g, '$1 ')
    .replace(/(^|\s)[,.\?!-]+(?=\s|$)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}
export const EDGE_VOICES = {
  pt: ['pt-BR-LeticiaNeural', 'pt-BR-GiovannaNeural', 'pt-BR-ManuelaNeural', 'pt-BR-FranciscaNeural', 'pt-BR-ThalitaMultilingualNeural'],
  en: ['en-US-AnaNeural', 'en-US-JennyNeural', 'en-US-AriaNeural', 'en-US-EmmaMultilingualNeural', 'en-US-AvaMultilingualNeural'],
};

export const VOICE_PRESETS = {
  aghata: {
    pt: {
      voice: 'pf_dora', edgeVoice: 'pt-BR-LeticiaNeural', lang: 'pt-br',
      blend: [
        { voice: 'pf_dora', weight: 0.55 },
        { voice: 'jf_nezumi', weight: 0.3 },
        { voice: 'af_nicole', weight: 0.15 },
      ],
      speed: 0.88, pitch: -1, filter: 'warm',
    },
    en: {
      voice: 'af_nicole', edgeVoice: 'en-US-AnaNeural', lang: 'en-us',
      blend: [
        { voice: 'af_nicole', weight: 0.55 },
        { voice: 'af_sky', weight: 0.3 },
        { voice: 'af_nicole', weight: 0.15 },
      ],
      speed: 0.88, pitch: -1, filter: 'warm',
    },
  },
};

// Personality → suggested neural voice and prosody (no protected character names).
export const PERSONA_VOICE = {
  estoica: { pt: { edge: 'pt-BR-LeticiaNeural', rate: -0.06, pitchHz: 0 }, en: { edge: 'en-US-AnaNeural', rate: -0.06, pitchHz: 0 } },
  genki: { pt: { edge: 'pt-BR-LeticiaNeural', rate: 0.06, pitchHz: 6 }, en: { edge: 'en-US-AnaNeural', rate: 0.06, pitchHz: 6 } },
  tsundere: { pt: { edge: 'pt-BR-GiovannaNeural', rate: 0.04, pitchHz: 4 }, en: { edge: 'en-US-AriaNeural', rate: 0.04, pitchHz: 4 } },
  dandere: { pt: { edge: 'pt-BR-LeticiaNeural', rate: -0.08, pitchHz: 0 }, en: { edge: 'en-US-EmmaMultilingualNeural', rate: -0.08, pitchHz: 0 } },
  chuuni: { pt: { edge: 'pt-BR-ManuelaNeural', rate: 0.02, pitchHz: 2 }, en: { edge: 'en-US-JennyNeural', rate: 0.02, pitchHz: 2 } },
};

export function personaVoiceSuggestion(app) {
  const c = app?.config || {};
  const id = c.persona || (c.streamPersona === 'estoica' ? 'estoica' : 'genki');
  const s = (PERSONA_VOICE[id] || PERSONA_VOICE.genki)[c.lang === 'en' ? 'en' : 'pt'];
  const remote = ['edge', 'fish'].includes(c.ttsEngine);
  return remote
    ? { ttsVoice: s.edge, ttsSpeed: Math.max(0.7, Math.min(1.4, 1 + s.rate)), ttsPitch: 0 }
    : { ttsSpeed: Math.max(0.7, Math.min(1.4, 1 + s.rate)), ttsPitch: s.pitchHz ? Math.round(s.pitchHz / 4) : 0 };
}

// Which language a voice can speak, from the engine ID or the Windows voice tag.
export function voiceLanguage(v) {
  const info = typeof v === 'string' ? { id: v, lang: '' } : (v || {});
  const lang = String(info.lang || info.culture || '').toLowerCase();
  if (/^pt\b|^pt[-_]/.test(lang)) return 'pt';
  if (/^en\b|^en[-_]/.test(lang)) return 'en';
  const id = String(info.id || info.name || '').replace(/^neural:/, '').toLowerCase();
  const code = id.split('_')[0].charAt(0);
  if (code === 'p') return 'pt';
  if (['a', 'b'].includes(code)) return 'en';
  return ''; // j/e/f/h/i/z: other languages, not offered for pt/en playback
}

export const filterVoicesForLang = (list, lang) =>
  (Array.isArray(list) ? list : []).filter((v) => voiceLanguage(v) === (lang === 'en' ? 'en' : 'pt'));

export function presetForLang(preset, lang) {
  if (!preset) return null;
  return preset[lang === 'en' ? 'en' : 'pt'] || preset.pt || preset;
}



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
    // USER_PRIORITY: while the creator holds PTT, only the owner's own reply may be spoken.
    this.userPriority = false;
    this.onOwnerLineEnd = null;
  }

  get enabled() {
    const c = this.app.config;
    return (!!window.__PET_STREAMER__ && c.ttsEnabled !== false)
      || (!window.__PET_STREAMER__ && c.offlineTts === true);
  }

  // Called when the game language changes: keep the selected voice/preset in sync
  // so the lang parameter sent to the engine always matches the active language.
  applyLanguage(lang) {
    const c = this.app.config;
    const active = lang === 'en' ? 'en' : 'pt';
    if (c.voicePreset && VOICE_PRESETS[c.voicePreset]) {
      const p = presetForLang(VOICE_PRESETS[c.voicePreset], active);
      const edge = c.ttsEngine === 'edge' || c.ttsEngine === 'fish';
      this.app.applyConfigPatch?.({
        ttsVoice: edge ? p.edgeVoice : p.voice,
        ttsSpeed: p.speed,
        ttsPitch: edge ? 0 : p.pitch,
        ttsFilter: p.filter,
      });
      return;
    }
    const current = String(c.ttsVoice || '').replace(/^neural:/, '');
    if (current && voiceLanguage({ id: current, lang: '' }) !== active) {
      this.app.setOption?.('ttsVoice', active === 'en' ? 'af_nicole' : 'pf_dora');
    }
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
    s = sanitizeForTts(s, this.app);
    if (!s) return '';
    if (opts.chat && c.ttsSpeakUser !== false && c.ttsHideViewerNames !== true && opts.user) {
      s = sanitizeForTts(`${opts.user} ${c.lang === 'en' ? 'said' : 'disse'} ${s}`, this.app);
    }
    if (!s) return '';
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

  sourceAllowed(source) {
    // First-chat preference overrides the legacy respond mode for the rest of the session.
    if (this.app.chatTtsConfigured && this.app.ttsTargetMode) {
      const target = this.app.ttsTargetMode;
      if (target === 'USER_ONLY') return source === 'owner';
      if (target === 'CHAT_ONLY') return source === 'viewer' || source === 'alert';
      return true; // ALL
    }
    const mode = this.app.config.ttsRespondMode || 'mixed';
    if (mode === 'never') return false;
    if (mode === 'always' || mode === 'mixed') return true;
    if (mode === 'viewers_only') return source === 'viewer' || source === 'alert';
    if (mode === 'me_only') return source === 'owner';
    if (mode === 'viewers_and_me') return source === 'viewer' || source === 'alert' || source === 'owner';
    return true;
  }

  enqueue(text, opts = {}) {
    if (!this.enabled || this.muted) return false;
    // USER_PRIORITY blocks every autonomous/chat line; only the PTT reply (ownerPriority) plays.
    if (this.userPriority && !opts.ownerPriority) return false;
    // AWAITING_TTS_PREFERENCE: silence automatic chat TTS until the creator chooses.
    if (this.app.firstViewerPrompt?.active && opts.source === 'viewer' && !opts.ownerPriority) return false;
    if (!opts.ownerPriority && !this.sourceAllowed(opts.source || 'auto')) return false;
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
      const preset = presetForLang(VOICE_PRESETS[c.voicePreset], c.lang);
      const activeLang = c.lang === 'en' ? 'en-us' : 'pt-br';
      const engine = c.ttsEngine || 'offline';
      const remote = engine === 'edge' || engine === 'fish';
      const chosen = String(job.voice || c.ttsVoice || (remote && c.voicePreset ? preset?.edgeVoice : '') || preset?.voice || '').trim();
      const lang = job.lang || activeLang;
      const voice = chosen || (remote
        ? (c.lang === 'en' ? 'en-US-AnaNeural' : 'pt-BR-LeticiaNeural')
        : (c.lang === 'en' ? 'af_nicole' : 'pf_dora'));
      const speed = job.speed ?? c.ttsSpeed ?? preset?.speed ?? (calm ? 0.88 : 1);
      const pitchHz = Number(c.ttsPitch) ? Number(c.ttsPitch) * 4 : 6;
      let data = null;
      try {
        data = remote
          ? await window.petAPI?.ttsSpeakRemote?.(engine, job.text, voice, lang, speed, pitchHz, c.fishApiKey, c.fishVoiceId)
          : await window.petAPI?.ttsSpeak?.(c.ttsDir || '', job.text, voice, lang, speed, job.blend || preset?.blend || null);
      } catch (err) {
        this.lastError = String(err?.message || err || 'TTS failed');
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
      // Native neural voices carry their own pitch via SSML: no formant-destroying detune.
      src.detune.value = remote ? 0 : (Number(c.ttsPitch ?? preset?.pitch) || 0) * 100;
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
      this.current = { src, analyser, gain, data: new Uint8Array(analyser.frequencyBinCount) };
      src.onended = () => {
        this.current = null;
        this.mouthLevel = 0;
        this.duck(false);
        this.onOwnerLineEnd?.(job);
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

  // Live updates while a line is already playing (volume/pitch sliders).
  applyLive() {
    const c = this.app.config;
    const cur = this.current;
    if (cur?.gain) cur.gain.gain.setTargetAtTime(c.ttsVolume ?? 0.85, this.ctx.currentTime, 0.05);
    if (cur?.src) {
      const remote = ['edge', 'fish'].includes(c.ttsEngine);
      cur.src.detune.value = remote ? 0 : (Number(c.ttsPitch) || 0) * 100;
    }
    if (this._winUtterance && typeof speechSynthesis !== 'undefined') {
      this._winUtterance.volume = c.ttsVolume ?? 0.85;
      this._winUtterance.pitch = Math.max(0, Math.min(2, 1 + (Number(c.ttsPitch) || 0) * 0.05));
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
    this._winUtterance = u;
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
      this.onOwnerLineEnd?.(job);
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

  // Drops pending lines only; whatever is already playing finishes uninterrupted.
  clearQueue() {
    this.queue.length = 0;
    this.reportQueue();
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
