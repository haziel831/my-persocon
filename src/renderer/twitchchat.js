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

  // One-off welcome scene for the first real viewer of a connection session.
  firstViewerScene(user) {
    const app = this.app;
    const en = app.config?.lang === 'en';
    const text = en
      ? 'Someone just showed up in chat... Do you want me to read the chat out loud, or only answer when they call my name?'
      : 'Chegou gente no chat... você quer que eu leia o chat para você ou só responda quando chamarem o meu nome?';
    const read = en ? 'Read the chat' : 'Ler o chat';
    const named = en ? 'Only when called' : 'Só quando chamarem meu nome';
    app.firstViewerPrompt = { active: true, user, text, read, named };
    app.pushStreamerState?.(true);
    if (app.tts?.enabled && app.config.streamTtsSpeak !== false) {
      app.tts.enqueue(text, { priority: true, source: 'alert' });
    }
    app.closeup?.test({
      firstViewer: true,
      tag: en ? 'First viewer' : 'Primeiro viewer',
      text,
      actions: [[read, () => this.firstViewerChoose(true)], [named, () => this.firstViewerChoose(false)]],
      talkFor: 25,
      onTimeout: () => this.firstViewerChoose(null),
    });
  }

  firstViewerChoose(read) {
    const app = this.app;
    if (!app.firstViewerPrompt?.active) return;
    const en = app.config?.lang === 'en';
    if (read === true || read === false) {
      app.applyConfigPatch?.(read ? { streamTtsSpeak: true } : { streamTtsSpeak: false, aiEnabled: true });
      const thanks = read
        ? (en ? 'Got it, I will read the chat for you.' : 'Combinado, vou ler o chat para você.')
        : (en ? 'Got it, I will wait until you call me.' : 'Combinado, fico só quando chamarem meu nome.');
      // The confirmation is always spoken when TTS is on; the chat-reading flag must not mute it.
      if (app.tts?.enabled) app.tts.enqueue(thanks, { priority: true, source: 'alert' });
      app.speech?.say?.(thanks, 3, { noAutoTts: true, source: 'alert' });
    }
    app.firstViewerPrompt = { active: false };
    if (app.closeup?.cur?.firstViewer) app.closeup.leave();
    app.pushStreamerState?.(true);
  }

  maybeAi(text, user, deny) {
    const c = this.app.config;
    // `deny` only mutes the audio; the balloon/chat reply must still happen.
    if (c.aiEnabled !== true || this.aiBusy) return false;
    if (typeof window.petAPI?.aiReply !== 'function') {
      this.pushLog(user, 'aiReply indisponível', 'IA: erro');
      return false;
    }
    const active = String(c.name || '').toLowerCase().trim();
    const names = ['aghata', 'agatha', 'ninna'];
    if (active) names.push(active);
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const match = new RegExp(`\\b(${escaped.join('|')})\\b`, 'i').exec(text);
    if (!match) return false;
    const called = match[1].toLowerCase();
    if (c.aiAllNames !== true && !active.includes(called)) return false;
    const now = Date.now();
    if (now - this.lastAi < (Number(c.aiCooldown ?? 20) * 1000)) return false;
    this.lastAi = now;
    this.aiBusy = true;
    this.app.chatBox?.push?.('chat', `${user}: ${text}`);
    const cfg = {
      lang: c.lang || 'pt',
      aiProviders: Array.isArray(c.aiProviders) ? c.aiProviders : [],
      aiAutoFallback: c.aiAutoFallback !== false,
      aiProvider: c.aiProvider || 'ollama', aiModel: c.aiModel || '',
      aiApiKey: c.aiApiKey || '', aiEndpoint: c.aiEndpoint || '',
    };
    window.petAPI?.aiReply?.(text, c.aiSystemPrompt || '', cfg).then((reply) => {
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
    const cool = (app.config.streamReactCooldown || 30) * 1000;
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
    if (now - (this.cmdAt[cmd] || 0) < 15000) return 'ignorado: cooldown';
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
