// Anonymous read-only Twitch IRC over WebSocket. No OAuth, no token, no password.
import { personaLine } from './persona.js';

const BOTS = ['nightbot', 'streamelements', 'streamlabs', 'moobot'];

export class TwitchChat {
  constructor(app) {
    this.app = app;
    this.ws = null;
    this.connected = false;
    this.retry = 0;
    this.lastReact = 0;
    this.cmdAt = {};
    this.recentLog = [];
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

  clean(text) {
    return String(text || '').replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  connect(channel) {
    const name = this.clean(channel).replace(/^#/, '').toLowerCase();
    if (!name) return;
    if (this.connected && this.channel === name) return;
    if (this.ws) this.disconnect();
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
    let text = String(raw || '');
    for (const [a, b] of this.emoteSpans(t.emotes).sort((x, y) => y[0] - x[0])) {
      text = text.slice(0, a) + ' ' + text.slice(b + 1);
    }
    return this.app.tts?.enqueue?.(text, {
      chat: true, user, login, badges: t.badges || '',
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
        if (deny) status = `ignorado: ${deny}`;
        else if (this.app.config.streamTtsSpeak === false) status = 'ok (TTS desligado)';
        else status = (this.app.tts?.enabled && !this.app.tts?.muted && spoke === false) ? 'ignorado: cooldown' : 'ok';
      }
      this.pushLog(displayName, text, status);
      this.app.chatBox?.push?.('chat', `${displayName}: ${text}`);
    }
  }

  replyLine(key, vars, duration = 3.5) {
    const app = this.app;
    const line = personaLine(app, key, vars);
    if (!line) return;
    app.speech?.say(line, duration);
    if (app.config.streamTtsSpeak !== false) {
      // Replies to commands/keywords are priority lines: they ignore the chat
      // permission gate so the stage always reacts, even under Seguidores+.
      app.tts?.enqueue?.(line, { priority: true, test: true });
    }
  }

  react(text, user) {
    const now = Date.now();
    const cool = (this.app.config.streamReactCooldown || 30) * 1000;
    if (now - this.lastReact < cool) return '';
    const t = text.toLowerCase();
    const app = this.app;
    if (/\bgg\b/.test(t)) { app.pet?.react?.('cheer'); this.replyLine('gg'); this.lastReact = now; return 'reação: gg'; }
    if (/^f[!.?]?$/.test(t)) { app.pet?.react?.('sad'); this.replyLine('f'); this.lastReact = now; return 'reação: f'; }
    if (/\b(kkk|haha|lol)\b/.test(t)) { app.pet?.react?.('laugh'); return 'reação: risada'; }
    if (/\b(postura|posture)\b/.test(t)) { this.replyLine('posture'); this.lastReact = now; return 'reação: postura'; }
    if (/\b(agua|água|hidrata|hydrate|water)\b/.test(t)) { this.replyLine('water'); this.lastReact = now; return 'reação: água'; }
    return '';
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
