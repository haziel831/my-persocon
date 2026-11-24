// Anonymous read-only Twitch IRC over WebSocket. No OAuth, no token, no password.
import { personaLine } from './persona.js';
import { translate } from './i18n.js';

const BOTS = ['nightbot', 'streamelements', 'streamlabs', 'moobot'];

export const DEFAULT_KEYWORD_RULES = [
  { words: 'gg', action: 'cheer', text: '' },
  { words: 'f', action: 'sad', text: '' },
  { words: 'kkk,haha,lol', action: 'laugh', text: '' },
  { words: 'postura,posture', action: 'posture', text: '' },
  { words: 'agua,água,hidrata,water', action: 'water', text: '' },
];

const ACTION_PERSONA = {
  cheer: 'gg', laugh: 'gg', sad: 'f', dance: 'dance', love: 'pat',
  scare: 'scare', sleep: 'brb', confetti: 'gg', posture: 'posture', water: 'water', say: 'gg',
};

export class TwitchChat {
  constructor(app) {
    this.app = app;
    this.ws = null;
    this.connected = false;
    this.retry = 0;
    this.lastReact = 0;
    this.cmdAt = {};
    this.recentLog = [];
    this.activeViewers = [];
    this.lastAi = 0;
    this.aiBusy = false;
    this.firstViewerDone = false;
    this.userPriority = false;
  }

  pushLog(user, text, status) {
    this.recentLog.unshift({
      user: String(user || '').slice(0, 24),
      text: String(text || '').slice(0, 60),
      status: String(status || 'ok'),
      at: Date.now(),
    });
    if (this.recentLog.length > 5) this.recentLog.length = 5;
    this.app.pushStreamerState?.(true);
  }

  trackViewer(user) {
    const name = String(user || '').replace(/[@,]/g, '').trim().slice(0, 40);
    if (!name) return;
    const channel = String(this.app.config.twitchChannel || '').replace(/^#/, '').toLowerCase();
    if (name.toLowerCase() === channel) return; // broadcaster
    this.activeViewers = [name, ...this.activeViewers.filter((u) => u.toLowerCase() !== name.toLowerCase())].slice(0, 30);
  }

  clean(text) {
    return String(text || '').replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  // Matches a Twitch channel-point redemption to the configured reward.
  // Case-insensitive, trimmed; accepts reward id, configured !command or the reward name.
  matchRedeem(rewardId, text, map) {
    const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/^!+/, '');
    const id = norm(rewardId);
    const raw = String(text || '').trim();
    const cmd = raw.startsWith('!') ? norm(raw.slice(1).trim().split(/\s+/)[0]) : '';
    for (const [name, cfg] of Object.entries(map || {})) {
      if (cfg?.enabled === false) continue;
      if (id && norm(cfg?.rewardId) === id) return { name, cfg };
      if (cmd && (norm(cfg?.command) === cmd || norm(name) === cmd)) return { name, cfg };
      if (id && raw && norm(name) === norm(raw)) return { name, cfg };
    }
    return null;
  }

  connect(channel) {
    const name = this.clean(channel).replace(/^#/, '').toLowerCase();
    if (!name) return;
    if (this.connected && this.channel === name) return;
    if (this.ws) this.disconnect();
    this.firstViewerDone = false; // one special scene per connection session
    this.channel = name;
    try { this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443'); } catch { return; }
    const ws = this.ws;
    ws.onopen = () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('PASS SCHMOOPIIE');
      ws.send(`NICK justinfan${Math.floor(100000 + Math.random() * 900000)}`);
      ws.send(`JOIN #${this.channel}`);
      this.connected = true;
      this.retry = 0;
      this.app.pushStreamerState?.(true);
    };
    ws.onmessage = (e) => this.message(String(e.data || ''));
    ws.onclose = () => {
      this.connected = false;
      this.app.pushStreamerState?.(true);
      if (this.channel && this.app.config.twitchAutoReconnect !== false) {
        const delay = Math.min(60000, 2000 * 2 ** this.retry++);
        setTimeout(() => { if (this.channel) this.connect(this.channel); }, delay);
      }
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }

  disconnect() {
    this.channel = null;
    this.connected = false;
    this.firstViewerDone = false;
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.app.pushStreamerState?.(true);
  }

  // IRCv3 tag block (CAP REQ :twitch.tv/tags) → simple object.
  tags(raw) {
    const out = {};
    for (const part of String(raw || '').split(';')) {
      const i = part.indexOf('=');
      if (i < 0) continue;
      out[part.slice(0, i)] = part.slice(i + 1);
    }
    return out;
  }

  // emotes=25:0-4,12-16/1902:6 → [[0,4],[12,16],[6,6]] (character spans in the raw message).
  emoteSpans(raw) {
    const out = [];
    for (const part of String(raw || '').split('/')) {
      const pieces = part.split(':').slice(1).join(':').split(',');
      for (const piece of pieces) {
        const [a, b] = piece.split('-').map(Number);
        if (Number.isFinite(a)) out.push([a, Number.isFinite(b) ? b : a]);
      }
    }
    return out;
  }

  speakChat(raw, user, t, login) {
    // Twitch spans count Unicode code points, not UTF-16 units.
    const chars = Array.from(String(raw || ''));
    for (const [a, b] of this.emoteSpans(t.emotes).sort((x, y) => y[0] - x[0])) {
      chars.splice(a, b - a + 1, ' ');
    }
    const text = chars.join('');
    return this.app.tts?.enqueue?.(text, {
      chat: true, source: 'viewer', user, login, badges: t.badges || '',
      follower: t.follower === '1' || t.follower === 'true'
        || this.app.knownFollowers?.has(String(user || '').toLowerCase())
        || this.app.knownFollowers?.has(String(login || '').toLowerCase()),
    });
  }

  message(raw) {
    if (this.userPriority) return; // USER_PRIORITY: no chat event competes with the creator's voice.
    for (const line of raw.split(/\r?\n/)) {
      if (!line) continue;
      if (line.startsWith('PING')) {
        const suffix = line.slice(4).trim();
        this.ws?.send(suffix ? `PONG ${suffix}` : 'PONG :tmi.twitch.tv');
        continue;
      }
      const m = /^(?:@([^ ]+)\s+)?:([^!\s]+)(?:![^@\s]+@[^\s]+)?\s+PRIVMSG\s+#([^\s]+)\s+:(.*)$/.exec(line);
      if (!m) continue;
      const t = this.tags(m[1]);
      const login = m[2];
      const displayName = this.clean(t['display-name']).slice(0, 40) || login;
      this.trackViewer(displayName);
      if (BOTS.includes(login.toLowerCase())) continue;
      const text = this.clean(m[4]);
      if (!text) continue;
      const blocked = String(this.app.config.streamBlockedWords || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      if (blocked.some((w) => text.toLowerCase().includes(w))) {
        this.pushLog(displayName, text, 'ignorado: bloqueado');
        continue;
      }
      const chatOpts = {
        chat: true,
        user: displayName,
        login,
        badges: t.badges || '',
        follower: t.follower === '1' || t.follower === 'true'
          || this.app.knownFollowers?.has(displayName.toLowerCase())
          || this.app.knownFollowers?.has(login.toLowerCase()),
      };
      const deny = this.app.tts?.denyReason?.(chatOpts) || '';
      const own = String(this.app.config.twitchChannel || '').replace(/^#/, '').toLowerCase();
      if (!this.firstViewerDone && !deny && own
        && login.toLowerCase() !== own && displayName.toLowerCase() !== own) {
        this.firstViewerDone = true;
        this.firstViewerScene(displayName);
      }
      const rewardId = String(t['custom-reward-id'] || '').trim();
      const redeem = this.matchRedeem(rewardId, text, this.app.config.streamRedeems);
      if (redeem) {
        this.app.streamAlerts?.push?.({ type: 'redeem', user: displayName, reward: redeem.name,
          rewardId, text });
        this.pushLog(displayName, text, `resgate: ${redeem.name}`);
        continue;
      }
      if (this.maybeAi(text, displayName, deny)) {
        this.pushLog(displayName, text, 'IA: respondendo...');
        continue;
      }
      // Natural commands from chat only when she is addressed (or via !command).
      const petName = String(this.app.config.name || '').toLowerCase().trim();
      const names = ['aghata', 'agatha', 'ninna', petName].filter(Boolean).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const addressed = text.startsWith('!') || (names.length > 0 && new RegExp(`\\b(${names.join('|')})\\b`, 'i').test(text));
      if (addressed && this.app.runVoiceCommand?.(text)) {
        this.pushLog(displayName, text, 'comando: ok');
        continue;
      }
      const canSpeak = !deny && this.app.config.streamTtsSpeak !== false;
      const spoke = canSpeak ? this.speakChat(m[4], displayName, t, login) : false;
      let status = '';
      if (this.app.config.streamCommands !== false && text.startsWith('!')) {
        status = this.command(text, displayName) || '';
        if (status) status += canSpeak ? '' : ` (sem TTS: ${deny || 'desligado'})`;
      }
      if (!status && this.app.config.streamKeywords !== false) {
        status = this.react(text, displayName) || '';
        if (status) status += canSpeak ? '' : ` (sem TTS: ${deny || 'desligado'})`;
      }
      if (!status) {
        // Plain chat read aloud by TTS: here the permission gate really does block the line.
        if (deny) status = translate(`ignorado: ${deny}`);
        else if (this.app.config.streamTtsSpeak === false) status = 'ok (TTS desligado)';
        else status = (this.app.tts?.enabled && !this.app.tts?.muted && spoke === false) ? 'ignorado: cooldown' : 'ok';
      }
      this.pushLog(displayName, text, status);
      this.app.chatBox?.push?.('chat', `${displayName}: ${text}`);
    }
  }

  // First chat message of the session: ask ONCE which TTS target to use. No timeout — the
  // question stays up until the creator answers by voice, by text or with the avatar buttons.
  firstViewerScene(user) {
    const app = this.app;
    const en = app.config?.lang === 'en';
    const text = en
      ? 'Someone just wrote in chat! Should I use TTS only with you, only with the chat, or with both?'
      : 'Alguém falou no chat! Você quer que eu use o TTS só com você, só com o chat, ou com os dois?';
    app.chatTtsConfigured = false;
    app.ttsTargetMode = null;
    app.firstViewerPrompt = { active: true, awaiting: true, user, text };
    app.pushStreamerState?.(true);
    // ownerPriority bypasses the awaiting-chat gate below, so the question is always spoken.
    if (app.tts?.enabled) app.tts.enqueue(text, { priority: true, ownerPriority: true, source: 'alert' });
    app.closeup?.test({
      firstViewer: true,
      tag: en ? 'First viewer' : 'Primeiro viewer',
      text,
      actions: [
        [en ? 'Only me' : 'Só comigo', () => this.resolveChatTtsChoice('USER_ONLY')],
        [en ? 'Only chat' : 'Só com o chat', () => this.resolveChatTtsChoice('CHAT_ONLY')],
        [en ? 'Both' : 'Os dois', () => this.resolveChatTtsChoice('ALL')],
      ],
      talkFor: 1e7, // AWAITING_TTS_PREFERENCE: no timeout, wait indefinitely
    });
  }

  // Single decision point for PTT, the chat-box input and the avatar buttons.
  // Returns true only when an answer was actually consumed.
  resolveChatTtsChoice(input) {
    const app = this.app;
    if (!app.firstViewerPrompt?.active) return false;
    const raw = String(input || '').trim().toUpperCase();
    const s = String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[.!?]+$/, '');
    let mode = ['ALL', 'USER_ONLY', 'CHAT_ONLY'].includes(raw) ? raw : null;
    if (!mode && /^(os dois|ambos|todos|tudo|both|all|geral|mixed)$/.test(s)) mode = 'ALL';
    else if (!mode && /^(so comigo|so voce|so com voce|apenas voce|me|eu|user|only me|me only)$/.test(s)
      || /^(so|apenas) (comigo|voce)$/.test(s)) mode = 'USER_ONLY';
    else if (!mode && /^(so com o chat|so o chat|chat|viewers|viewer|only chat|chat only)$/.test(s)) mode = 'CHAT_ONLY';
    if (!mode) return false;
    app.ttsTargetMode = mode;
    app.chatTtsConfigured = true;
    app.firstViewerPrompt = { active: false, mode };
    const en = app.config?.lang === 'en';
    const thanks = mode === 'USER_ONLY'
      ? (en ? 'Got it, only with you.' : 'Combinado, só com você.')
      : mode === 'CHAT_ONLY'
        ? (en ? 'Got it, only with the chat.' : 'Combinado, só com o chat.')
        : (en ? 'Got it, with both of you.' : 'Combinado, com os dois.');
    if (app.tts?.enabled) app.tts.enqueue(thanks, { priority: true, ownerPriority: true, source: 'alert' });
    app.speech?.say?.(thanks, 3, { noAutoTts: true, source: 'alert' });
    if (app.closeup?.cur?.firstViewer) app.closeup.leave();
    app.pushStreamerState?.(true);
    return true;
  }

  maybeAi(text, user, deny, direct = false) {
    const c = this.app.config;
    // `deny` only mutes the audio; the balloon/chat reply must still happen.
    if (this.userPriority || c.aiEnabled !== true || this.aiBusy) return false;
    if (typeof window.petAPI?.aiReply !== 'function') {
      this.pushLog(user, 'aiReply indisponível', 'IA: erro');
      return false;
    }
    let called = '';
    if (!direct) {
      // Twitch viewers must mention her name. Direct chat / PTT bypass this filter.
      const active = String(c.name || '').toLowerCase().trim();
      const names = ['aghata', 'agatha', 'ninna'];
      if (active) names.push(active);
      const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const match = new RegExp(`\\b(${escaped.join('|')})\\b`, 'i').exec(text);
      if (!match) return false;
      called = match[1].toLowerCase();
    }
    if (!direct && c.aiAllNames !== true && called && !String(c.name || '').toLowerCase().includes(called)) return false;
    const now = Date.now();
    // AI calls cost tokens: keep a dedicated 15–20s cooldown, independent of fast commands.
    const aiGap = Math.min(20, Math.max(15, Number(c.aiCooldown ?? 20))) * 1000;
    if (now - this.lastAi < aiGap) return false;
    this.lastAi = now;
    this.aiBusy = true;
    this.app.chatBox?.push?.('chat', `${user}: ${text}`);
    const cfg = {
      lang: c.lang || 'pt',
      aiProviders: Array.isArray(c.aiProviders) ? c.aiProviders : [],
      aiAutoFallback: c.aiAutoFallback !== false,
      aiProvider: c.aiProvider || 'ollama', aiModel: c.aiModel || '',
      aiApiKey: c.aiApiKey || '', aiEndpoint: c.aiEndpoint || '',
      userPriority: direct,
    };
    const prompt = direct
      ? (c.lang === 'en' ? `Direct message from the creator: ${text}` : `Mensagem direta do criador: ${text}`)
      : text;
    window.petAPI?.aiReply?.(prompt, c.aiSystemPrompt || '', cfg).then((reply) => {
      const out = String(reply?.text || '').trim();
      this.app.aiStatus = { active: reply?.usedProvider || '', notice: reply?.fallbackNotice || '' };
      if (!out) throw new Error('empty');
      this.app.chatBox?.push?.('pet', out);
      this.app.streamAlerts?.showReactionEmote?.(this.app.streamAlerts?.reactionForText?.(out) || 'normal', out);
      this.app.speech?.say(out, 4, { source: 'viewer', noAutoTts: !!deny });
      this.pushLog(user, out, 'IA: ok');
    }).catch((err) => {
      const msg = String(err?.message || err || 'erro').slice(0, 180);
      this.pushLog(user, msg, 'IA: erro');
    }).finally(() => { this.aiBusy = false; });
    return true;
  }

  replyLine(key, vars, duration = 3.5) {
    const app = this.app;
    const line = personaLine(app, key, vars);
    if (!line) return;
    this.app.streamAlerts?.showReactionEmote?.(this.app.streamAlerts?.reactionForText?.(line) || 'normal', line);
    app.speech?.say(line, duration);
    if (app.config.streamTtsSpeak !== false) {
      // Replies to commands/keywords are priority lines: they ignore the chat
      // permission gate so the stage always reacts, even under Seguidores+.
      app.tts?.enqueue?.(line, { priority: true, test: true, source: 'viewer' });
    }
  }

  react(text, user) {
    const app = this.app;
    const rules = Array.isArray(app.config.streamKeywordRules)
      ? app.config.streamKeywordRules : DEFAULT_KEYWORD_RULES;
    const t = text.toLowerCase();
    const hit = rules.find((r) => String(r?.words || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean)
      .some((w) => (w.length === 1 ? new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i').test(t)
        : t.includes(w))));
    if (!hit) return '';
    const now = Date.now();
    // Light antispam only (2–3s): keyword reactions never spend AI tokens.
    const cool = Math.min(3, Math.max(2, Number(app.config.streamReactCooldown ?? 3))) * 1000;
    if (now - this.lastReact < cool) return '';
    this.lastReact = now;
    const action = hit.action || 'say';
    const reactMap = { cheer: 'cheer', laugh: 'laugh', sad: 'sad', dance: 'happy', love: 'love', scare: 'scare', sleep: 'sleep' };
    if (reactMap[action]) app.pet?.react?.(reactMap[action]);
    if (action === 'dance') app.startMode?.('jam');
    if (action === 'confetti') app.fx?.confettiRain?.(24);
    const key = ACTION_PERSONA[action] || 'gg';
    let line = String(hit.text || '').trim().replace(/\{user\}/gi, user).slice(0, 180)
      || personaLine(app, key, { user });
    this.app.streamAlerts?.showReactionEmote?.(this.app.streamAlerts?.reactionForText?.(line) || 'normal', line);
    app.speech?.say(line, 3.5, { source: 'viewer' });
    if (app.config.streamTtsSpeak !== false) app.tts?.enqueue?.(line, { priority: true, source: 'viewer' });
    return `reação: ${action}`;
  }

  command(text, user) {
    const app = this.app;
    const [cmd, ...rest] = text.toLowerCase().split(/\s+/);
    const now = Date.now();
    // Fast commands use a light 2.5s antispam, never the AI cooldown.
    if (now - (this.cmdAt[cmd] || 0) < 2500) return 'ignorado: cooldown';
    if (['!oi', '!hi'].includes(cmd)) { this.cmdAt[cmd] = now; this.replyLine('hi', { user }, 3); return `comando ${cmd}`; }
    if (['!cafune', '!pat'].includes(cmd)) { this.cmdAt[cmd] = now; app.setHand?.('pat'); this.replyLine('pat', { user }, 3); return `comando ${cmd}`; }
    if (['!dancar', '!dance'].includes(cmd)) { this.cmdAt[cmd] = now; app.startMode?.('jam'); this.replyLine('dance', {}, 3); return `comando ${cmd}`; }
    if (cmd === '!clima') {
      const kind = ['chuva', 'sakura', 'neve', 'vagalumes'].find((k) => rest.includes(k));
      if (kind && app.weather) {
        this.cmdAt[cmd] = now;
        app.weather.start(kind);
        app.weather.until = Date.now() + 90000;
        this.replyLine('climate', { kind }, 3);
        return `comando ${cmd}`;
      }
    }
    return '';
  }
}
