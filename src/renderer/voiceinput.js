// Global Push-to-Talk voice input: transcribes speech and asks the Persocon AI.
import { personaLine } from './persona.js';

export class VoiceInput {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.text = '';
    this.rec = null;
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
    window.petAPI?.onPttStart?.(() => this.start());
    window.petAPI?.onPttStop?.(() => this.stop());
  }

  start() {
    if (this.active || this.app.config.pttEnabled !== true) return;
    this.active = true;
    this.text = '';
    this.indicator.style.display = 'block';
    this.app.tts?.skip?.();
    if (!this.supported) {
      this.app.speech?.say(this.app.config.lang === 'en'
        ? 'Voice recognition is not available here.'
        : 'Reconhecimento de voz não disponível aqui.', 3);
      return;
    }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
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
        if (final) this.text += `${final} `;
        this.partial.textContent = interim || (this.text ? this.text.slice(-60) : '');
      };
      rec.onerror = (e) => { this.text = ''; this.app.pushStreamerState?.(true); };
      rec.start();
      this.rec = rec;
    } catch {
      this.text = '';
    }
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.indicator.style.display = 'none';
    this.partial.textContent = '';
    try { this.rec?.stop(); } catch {}
    this.rec = null;
    const said = String(this.text || '').trim().slice(0, 240);
    if (!said) return;
    const label = this.app.config?.lang === 'en' ? 'You' : 'Você';
    this.app.chatBox?.push?.('you', `${label}: ${said}`);
    this.app.voiceLog = [...(this.app.voiceLog || []), { user: label, text: said }].slice(-5);
    this.app.pushStreamerState?.(true);
    const c = this.app.config;
    if (c.aiEnabled === true) {
      const cfg = {
        lang: c.lang || 'pt',
        aiProviders: Array.isArray(c.aiProviders) ? c.aiProviders : [],
        aiAutoFallback: c.aiAutoFallback !== false,
        aiProvider: c.aiProvider || 'ollama', aiModel: c.aiModel || '',
        aiApiKey: c.aiApiKey || '', aiEndpoint: c.aiEndpoint || '',
      };
      const prompt = `${c.lang === 'en' ? 'The streamer said' : 'O dono do canal disse'}: ${said}`;
      window.petAPI?.aiReply?.(prompt, c.aiSystemPrompt || '', cfg)
        .then((reply) => {
          if (reply?.fallbackNotice) this.app.pushStreamerState?.(true);
          this.answer(String(reply?.text || '').trim());
        })
        .catch(() => this.answer(personaLine(this.app, 'hi'), true));
    } else {
      this.answer(personaLine(this.app, 'hi'), true);
    }
  }

  answer(text, fallback = false) {
    const out = String(text || '').trim().slice(0, 200);
    if (!out) return;
    this.app.chatBox?.push?.('pet', out);
    this.app.streamAlerts?.showReactionEmote?.(this.app.streamAlerts?.reactionForText?.(out) || 'normal', out);
    this.app.speech?.say(out, 4, { source: 'owner' });
  }
}
