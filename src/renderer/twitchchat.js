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
  }

  clean(text) {
    return String(text || '').replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  connect(channel) {
    const name = this.clean(channel).replace(/^#/, '').toLowerCase();
    if (!name || this.connected) return;
    this.channel = name;
    try { this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443'); } catch { return; }
    const ws = this.ws;
    ws.onopen = () => {
      ws.send('CAP REQ :twitch.tv/tags');
      ws.send('PASS SCHMOOPIIE');
      ws.send(`NICK justinfan${Math.floor(100000 + Math.random() * 900000)}`);
      ws.send(`JOIN #${this.channel}`);
      this.connected = true;
      this.retry = 0;
    };
    ws.onmessage = (e) => this.message(String(e.data || ''));
    ws.onclose = () => {
      this.connected = false;
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

  speakChat(raw, user, t) {
    let text = String(raw || '');
    for (const [a, b] of this.emoteSpans(t.emotes).sort((x, y) => y[0] - x[0])) {
      text = text.slice(0, a) + ' ' + text.slice(b + 1);
    }
    this.app.tts?.enqueue?.(text, { chat: true, user, badges: t.badges || '' });
  }

  message(raw) {
    for (const line of raw.split('\r\n')) {
      if (!line) continue;
      if (line.startsWith('PING')) { this.ws?.send('PONG'); continue; }
      const m = /^(?:@([^ ]+) )?:([\w-]+)![\w-]+@[\w-]+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.*)$/.exec(line);
      if (!m) continue;
      const t = this.tags(m[1]);
      const user = this.clean(t['display-name']).slice(0, 40) || m[2];
      const login = m[2];
      if (BOTS.includes(login.toLowerCase())) continue;
      const text = this.clean(m[3]);
      const blocked = String(this.app.config.streamBlockedWords || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      if (blocked.some((w) => text.toLowerCase().includes(w))) continue;
      this.speakChat(m[3], user, t);
      if (this.app.config.streamKeywords !== false) this.react(text, user);
      if (this.app.config.streamCommands !== false && text.startsWith('!')) this.command(text, user);
    }
  }

  react(text, user) {
    const now = Date.now();
    const cool = (this.app.config.streamReactCooldown || 30) * 1000;
    if (now - this.lastReact < cool) return;
    const t = text.toLowerCase();
    const app = this.app;
    const say = (key, vars) => {
      const line = personaLine(app, key, vars);
      if (!line) return;
      app.speech?.say(line, 3.5);
    };
    if (/\bgg\b/.test(t)) { app.pet?.react?.('cheer'); say('gg'); this.lastReact = now; }
    else if (/^f[!.?]?$/.test(t)) { app.pet?.react?.('sad'); say('f'); this.lastReact = now; }
    else if (/\b(kkk|haha|lol)\b/.test(t)) { app.pet?.react?.('laugh'); this.lastReact = now; }
    else if (/\b(postura|posture)\b/.test(t)) { say('posture'); this.lastReact = now; }
    else if (/\b(agua|água|hidrata|hydrate|water)\b/.test(t)) { say('water'); this.lastReact = now; }
  }

  command(text, user) {
    const app = this.app;
    const [cmd, ...rest] = text.toLowerCase().split(/\s+/);
    const now = Date.now();
    if (now - (this.cmdAt[cmd] || 0) < 15000) return;
    this.cmdAt[cmd] = now;
    const speak = (key, vars) => {
      const line = personaLine(app, key, vars);
      if (!line) return;
      app.speech?.say(line, 3);
    };
    if (['!oi', '!hi'].includes(cmd)) speak('hi', { user });
    else if (['!cafune', '!pat'].includes(cmd)) { app.setHand?.('pat'); speak('pat', { user }); }
    else if (['!dancar', '!dance'].includes(cmd)) { app.startMode?.('jam'); speak('dance'); }
    else if (cmd === '!clima') {
      const kind = ['chuva', 'sakura', 'neve', 'vagalumes'].find((k) => rest.includes(k));
      if (kind && app.weather) { app.weather.start(kind); app.weather.until = Date.now() + 90000; speak('climate', { kind }); }
    }
  }
}
