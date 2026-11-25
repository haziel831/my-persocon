// Global Push-to-Talk voice input: transcribes speech and asks the Persocon AI.
import { personaLine } from './persona.js';
import { actionPrompt, parseAction, runAction } from './voicecommands.js';
import { translate } from './i18n.js';

export class VoiceInput {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.text = '';
    this.rec = null;
    this.priority = false;       // USER_PRIORITY flag (absolute focus on the creator)
    this.pausedByPtt = false;
    this.releaseTimer = null;
    this.recorder = null;        // MediaRecorder (real audio for Groq Whisper)
    this.chunks = [];
    this.stream = null;
    this.mime = 'audio/webm';
    this.mode = null;            // 'groq' | 'browser' | null
    this.indicator = document.createElement('div');
    this.indicator.className = 'ptt-indicator';
    this.dot = document.createElement('span');
    this.dot.className = 'ptt-dot';
    this.label = document.createElement('span');
    this.partial = document.createElement('span');
    this.partial.className = 'ptt-partial';
    this.indicator.append(this.dot, this.label, this.partial);
    this.label.textContent = app.config?.lang === 'en' ? 'Listening...' : 'Ouvindo...';
    this.indicator.style.display = 'none';
    document.body.append(this.indicator);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SR;
    // Diagnostics: make it obvious in the log if the global key event never reaches the webview.
    window.petAPI?.onPttStart?.(() => { app.log?.('ptt', 'evento ptt-start recebido'); this.start(); });
    window.petAPI?.onPttStop?.(() => { app.log?.('ptt', 'evento ptt-stop recebido'); this.stop(); });
    // There is no host-side "audio ended" event: the TTS line-end callback drives the resume.
    if (this.app.tts) {
      this.app.tts.onOwnerLineEnd = (job) => {
        if (!job?.ownerPriority) return;
        // Hold the big avatar and her balloon for a few seconds after the audio ends.
        this.app.closeup?.hold?.(9000);
        this.app.speech?.hold?.(9000);
        this.scheduleRelease(9000);
      };
    }
  }

  // ---------- USER_PRIORITY ----------

  // Immediate interruption: kill audio, drop the queue, silence autonomous speech and chat,
  // and put the pet in a still, front-facing listening pose.
  enterPriority() {
    if (this.priority) return;
    this.priority = true;
    const app = this.app;
    app.tts?.clear();
    if (app.tts) app.tts.userPriority = true;
    if (app.speech) app.speech.userPriority = true;
    if (app.twitch) app.twitch.userPriority = true;
    const pet = app.pet;
    this.pausedByPtt = !!pet && !pet.paused && !pet.dead;
    if (this.pausedByPtt) app.pause?.();
    pet?.anim?.('idle', { facing: 'front', restart: true });
    this.indicator.classList.add('listening');
    document.body.classList.add('ptt-active');
    clearTimeout(this.releaseTimer);
  }

  // Stay in the focused conversation for ~9s after the owner's reply audio ends. Re-arming
  // while TTS is still generating/playing also covers slow remote voices and the Windows voice.
  scheduleRelease(ms = 9000) {
    clearTimeout(this.releaseTimer);
    this.releaseTimer = setTimeout(() => {
      if (this.app.tts?.speaking) { this.scheduleRelease(ms); return; }
      this.releasePriority();
    }, ms);
  }

  releasePriority() {
    if (!this.priority) return;
    this.priority = false;
    const app = this.app;
    if (app.tts) app.tts.userPriority = false;
    if (app.speech) app.speech.userPriority = false;
    if (app.twitch) app.twitch.userPriority = false;
    this.indicator.classList.remove('listening');
    document.body.classList.remove('ptt-active');
    if (this.pausedByPtt) { app.resume?.(); this.pausedByPtt = false; }
  }

  // Short, soft sine beep generated locally (no external file, low volume for live streams).
  beep(freq = 820, ms = 55, volume = 0.03) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.audio ||= new Ctx();
      if (this.audio.state === 'suspended') this.audio.resume?.();
      const t = this.audio.currentTime;
      const osc = this.audio.createOscillator();
      const gain = this.audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain).connect(this.audio.destination);
      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
    } catch {}
  }

  // Every recognized chunk goes straight to both chat boxes and to the pinned panel.
  say(text) {
    const said = String(text || '').trim().slice(0, 240);
    if (!said) return;
    const label = this.app.config?.lang === 'en' ? 'You' : 'Você';
    this.app.chatBox?.push?.('you', `${label}: ${said}`);
    this.app.voiceLog = [...(this.app.voiceLog || []), { user: label, text: said }].slice(-5);
    this.app.pushStreamerState?.(true);
    this.pushedText = `${this.pushedText || ''}${said} `;
  }

  // Immediate response to the PTT toggle (dock / Quick Menu / Options), in both editions.
  setEnabled(on) {
    if (on || !this.active) return;
    this.active = false;
    this.text = '';
    try { this.rec?.stop(); } catch {}
    this.rec = null;
    if (this.recorder && this.recorder.state !== 'inactive') { try { this.recorder.stop(); } catch {} }
    this.recorder = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.indicator.style.display = 'none';
    this.partial.textContent = '';
    this.releasePriority();
    this.app.log?.('ptt', 'Push-to-Talk desligado');
  }

  // The Groq key is read from the saved config when used — never stored in source or logs.
  hasGroqKey() {
    return (Array.isArray(this.app.config?.aiProviders) ? this.app.config.aiProviders : []).some((p) => {
      const brand = `${p?.provider || ''} ${p?.name || ''} ${p?.endpoint || ''}`.toLowerCase();
      return brand.includes('groq') && !!(p?.apiKey || '').trim();
    });
  }

  start() {
    if (this.active || this.app.config.pttEnabled !== true) return;
    this.active = true;
    this.text = '';
    this.pushedText = '';
    this.enterPriority();
    this.beep();
    this.indicator.style.display = 'block';
    this.app.log?.('ptt', `tecla pressionada · captura ${this.hasGroqKey() ? 'Groq Whisper' : 'navegador'}`);
    if (this.hasGroqKey() && navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      this.startRecording();
    } else {
      this.startSpeechRecognition();
    }
  }

  // WebView2 has no working SpeechRecognition: record real audio and let Rust call Groq Whisper.
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.active) { stream.getTracks().forEach((t) => t.stop()); return; }
      this.stream = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find((t) => window.MediaRecorder.isTypeSupported(t)) || 'audio/webm';
      this.mime = mime;
      this.mode = 'groq';
      this.chunks = [];
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data?.size) this.chunks.push(e.data); };
      rec.onerror = (e) => this.fail(`Falha na gravação: ${e?.error || 'erro'}`);
      rec.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        this.stream = null;
        if (this.active) this.processRecording();
      };
      rec.start();
      this.recorder = rec;
    } catch (e) {
      this.fail(`Microfone negado ou indisponível: ${e?.message || e}`, true);
    }
  }

  async processRecording() {
    try {
      const blob = new Blob(this.chunks, { type: this.mime });
      this.chunks = [];
      if (!blob.size) { this.fail('Nenhum áudio capturado'); return; }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const text = await window.petAPI.transcribeAudio(btoa(bin), this.mime, this.app.config.lang || 'pt');
      this.text = String(text || '').trim();
      this.app.log?.('ptt', `transcrição: ${this.text.slice(0, 120)}`);
      this.say(this.text);
      this.finish();
    } catch (e) {
      this.fail(`Falha na transcrição (Groq Whisper): ${e?.message || e}`, false);
    }
  }

  // Fallback: browser SpeechRecognition (works in some Chromium builds, rarely in WebView2).
  startSpeechRecognition() {
    if (!this.supported) {
      this.fail(translate('Configure uma chave gratuita da Groq em IAs para usar Push-to-Talk por voz.'), false);
      return;
    }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      this.mode = 'browser';
      // Recognition language follows the game language; the command matcher ignores accents,
      // so commands spoken in the other language are still understood.
      rec.lang = this.app.config?.lang === 'en' ? 'en-US' : 'pt-BR';
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let final = '', interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (final) { this.text += `${final} `; this.say(final); }
        this.partial.textContent = interim || (this.text ? this.text.slice(-60) : '');
      };
      rec.onerror = (e) => {
        const why = String(e?.error || 'erro desconhecido');
        this.text = '';
        this.app.log?.('ptt', `Falha no reconhecimento: ${why}`);
        if (why !== 'no-speech' && why !== 'aborted') {
          this.app.speech?.say(this.app.config.lang === 'en'
            ? 'Microphone or voice recognition failed.'
            : 'Falha no microfone ou no reconhecimento de voz.', 3, { noAutoTts: true });
        }
        this.app.pushStreamerState?.(true);
      };
      rec.start();
      this.rec = rec;
    } catch (e) {
      this.text = '';
      this.app.log?.('ptt', `Não foi possível iniciar a captura: ${e?.message || e}`);
    }
  }

  // Visible failure: log + discreet balloon, no silent drop.
  fail(msg, tryFallback = false) {
    this.app.log?.('ptt', msg);
    this.active = false;
    this.recorder = null;
    this.indicator.style.display = 'none';
    this.partial.textContent = '';
    this.app.speech?.say(`${translate('Falha no Push-to-Talk')}: ${msg.slice(0, 120)}`, 4, { noAutoTts: true });
    if (tryFallback && this.supported) {
      this.active = true;
      this.indicator.style.display = 'block';
      this.enterPriority();
      this.startSpeechRecognition();
      return;
    }
    this.scheduleRelease(1200);
  }

  stop() {
    if (!this.active) return;
    this.beep(560, 35, 0.014);
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.stop(); } catch (e) { this.fail(`Não foi possível parar a gravação: ${e?.message || e}`); }
      return; // onstop -> processRecording -> finish
    }
    this.active = false;
    this.indicator.style.display = 'none';
    this.partial.textContent = '';
    try { this.rec?.stop(); } catch {}
    this.rec = null;
    this.finish();
  }

  finish() {
    this.active = false;
    this.indicator.style.display = 'none';
    this.partial.textContent = '';
    const said = String(this.text || '').trim().slice(0, 240);
    if (!said) { this.scheduleRelease(1200); return; }
    // Some browsers only deliver the final transcript on stop: show it then.
    if (!String(this.pushedText || '').trim()) this.say(said);
    // While awaiting the first-chat TTS preference, the voice answer IS the choice.
    if (this.app.firstViewerPrompt?.active && this.app.twitch?.resolveChatTtsChoice?.(said)) {
      this.scheduleRelease(2000);
      return;
    }
    // Natural PT/EN commands (TV, banho, dormir, jogar, dançar, cafuné...) run right away.
    if (this.app.runVoiceCommand?.(said)) { this.scheduleRelease(); return; }
    const c = this.app.config;
    if (c.aiEnabled === true) {
      const cfg = {
        lang: c.lang || 'pt',
        aiProviders: Array.isArray(c.aiProviders) ? c.aiProviders : [],
        aiAutoFallback: c.aiAutoFallback !== false,
        aiProvider: c.aiProvider || 'ollama', aiModel: c.aiModel || '',
        aiApiKey: c.aiApiKey || '', aiEndpoint: c.aiEndpoint || '',
        userPriority: true, // tells the host to wrap the system prompt as a max-priority order
      };
      // PTT is always a direct address: no name mention required (unlike Twitch viewers).
      const prompt = c.lang === 'en'
        ? `The creator is speaking directly to you right now (highest priority — no name needed). Answer them in character: ${said}`
        : `O criador está falando diretamente com você agora (prioridade máxima — não precisa citar seu nome). Responda no personagem: ${said}`;
      const system = [c.aiSystemPrompt, actionPrompt(c.lang)].filter(Boolean).join('\n');
      window.petAPI?.aiReply?.(prompt, system, cfg)
        .then((reply) => {
          this.app.aiStatus = { active: reply?.usedProvider || '', notice: reply?.fallbackNotice || '' };
          this.app.pushStreamerState?.(true);
          this.answer(String(reply?.text || '').trim());
        })
        .catch(() => this.answer(personaLine(this.app, 'hi'), true));
    } else {
      this.answer(personaLine(this.app, 'hi'), true);
    }
  }

  answer(text, fallback = false) {
    let raw = String(text || '').trim().slice(0, 200);
    if (!raw) { this.scheduleRelease(); return; }
    const { text: out, name, arg } = parseAction(raw);
    if (!fallback && name) runAction(name, arg, this.app);
    const spoken = out || (fallback ? raw : '');
    if (spoken) {
      this.app.chatBox?.push?.('pet', spoken);
      this.app.streamAlerts?.showReactionEmote?.(this.app.streamAlerts?.reactionForText?.(spoken) || 'normal', spoken, 'owner');
      // With the big avatar on screen her answer also goes to the close-up balloon, but the
      // priority TTS always plays (its onended drives the extended hold and the resume).
      this.app.closeup?.say?.(spoken);
      this.app.speech?.say(spoken, 4, { source: 'owner', ownerPriority: true });
    }
    this.scheduleRelease();
  }
}
