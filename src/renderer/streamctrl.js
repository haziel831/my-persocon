// Lightweight control panel for Streamer Mode (second monitor). No WebGL / no pet loop.
import { translate } from './i18n.js';
import { defaultPersona, personaLine } from './persona.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export async function startStreamerControl(config) {
  document.body.classList.add('stream-ctrl');
  const root = el('div', 'stream-ctrl-root');
  const head = el('div', 'stream-ctrl-head');
  head.append(el('h1', '', 'My Persocon · Controle Streamer'));
  root.append(head);

  const cats = [
    ['streamer', '🎥 Streamer'], ['acoes', 'Ações'], ['brincar', 'Brincar'], ['loja', 'Loja'],
    ['inventario', 'Inventário'], ['perfil', 'Perfil'], ['modelo', 'Modelo'], ['temas', 'Temas'], ['opcoes', 'Opções'],
  ];
  const nav = el('div', 'stream-ctrl-nav');
  const body = el('div', 'stream-ctrl-body');
  const rpc = (payload) => window.petAPI?.streamerRpc?.('stream', payload);
  window.petAPI?.onStreamerRpc?.((p) => {
    if (p?.type !== 'ttsQueue') return;
    const label = document.querySelector('.stream-voice-queue');
    if (label) label.textContent = `${translate('Fila')}: ${p.count}`;
    const mute = document.querySelector('.stream-voice-mute');
    if (mute) {
      mute.classList.toggle('active', !!p.muted);
      mute.textContent = `🔇 ${translate(p.muted ? 'Mudo (ligado)' : 'Mudo rápido')}`;
    }
  });
  const openCat = (id, button) => {
    for (const b of nav.children) b.classList.toggle('active', b === button);
    body.textContent = '';
    if (id !== 'streamer') {
      body.append(el('div', 'note', translate('Use esta categoria na janela do palco; aqui você controla a live.')));
      rpc({ type: 'openMenu', cat: id });
      return;
    }
    body.append(el('h2', '', translate('🎥 Streamer')));
    body.append(el('div', 'note', translate('Base para Twitch / Ponte Local / Pontos do Canal na Fase 2.')));

    body.append(el('h3', '', translate('Fundo Chroma Key')));
    const bg = el('div', 'stream-ctrl-row');
    for (const [value, label] of [
      ['verde', 'Verde'], ['azul', 'Azul'], ['magenta', 'Magenta'], ['transparente', 'Transparente'],
    ]) {
      const b = el('button', config.streamerBg === value ? 'active' : '', translate(label));
      b.onclick = () => {
        window.petAPI?.saveConfig?.({ streamerBg: value });
        window.petAPI?.setStreamer?.(true);
      };
      bg.append(b);
    }
    body.append(bg);

    const clean = el('label', 'stream-ctrl-toggle');
    const cleanBox = el('input');
    cleanBox.type = 'checkbox';
    cleanBox.checked = config.streamerClean !== false;
    cleanBox.onchange = () => {
      window.petAPI?.saveConfig?.({ streamerClean: cleanBox.checked });
      rpc({ type: 'cleanStage', value: cleanBox.checked });
    };
    clean.append(cleanBox, el('span', '', translate('Palco limpo (ocultar Dock/UI na janela do OBS)')));
    body.append(clean);

    body.append(el('h3', '', translate('Moedas do Canal')));
    const coins = el('div', 'stream-ctrl-row');
    for (const n of [10, 50, 100]) {
      const b = el('button', '', `+${n} ¥`);
      b.onclick = () => rpc({ type: 'coins', n });
      coins.append(b);
    }
    const drop = el('button', 'primary', translate('Dropar item do céu'));
    drop.onclick = () => rpc({ type: 'drop', id: 'maca' });
    coins.append(drop);
    body.append(coins);

    // --- Kokoro TTS ---
    body.append(el('h3', '', translate('🗣️ Voz Kokoro (TTS offline)')));
    const addToggle = (label, key, def = true) => {
      const b = el('input'); b.type = 'checkbox'; b.checked = config[key] ?? def;
      b.onchange = () => window.petAPI?.saveConfig?.({ [key]: b.checked });
      const l = el('label', 'stream-ctrl-toggle'); l.append(b, el('span', '', translate(label)));
      body.append(l);
      return b;
    };
    const addSlider = (label, key, min, max, step, def, format) => {
      const wrap = el('label', 'stream-ctrl-field');
      const input = el('input'); input.type = 'range'; input.min = String(min); input.max = String(max);
      input.step = String(step); input.value = String(config[key] ?? def);
      const out = el('span', 'stream-voice-val', format ? format(Number(input.value)) : String(input.value));
      input.oninput = () => { out.textContent = format ? format(Number(input.value)) : input.value; };
      input.onchange = () => window.petAPI?.saveConfig?.({ [key]: Number(input.value) });
      wrap.append(el('span', '', translate(label)), input, out);
      body.append(wrap);
      return input;
    };
    const addSelect = (label, key, choices, def) => {
      body.append(el('span', 'stream-voice-val', translate(label)));
      const s = el('select');
      s.replaceChildren(...choices.map(([value, text]) => {
        const o = el('option', '', translate(text)); o.value = value; return o;
      }));
      s.value = config[key] ?? def;
      s.onchange = () => window.petAPI?.saveConfig?.({ [key]: s.value });
      body.append(s);
      return s;
    };

    // Emergency bar: always reachable during a live.
    const bar = el('div', 'stream-voice-bar');
    const muteBtn = el('button', 'stream-voice-mute', `🔇 ${translate('Mudo rápido')}`);
    muteBtn.onclick = () => rpc({ type: 'ttsMute' });
    const skipBtn = el('button', '', `⏭ ${translate('Pular fala')}`);
    skipBtn.onclick = () => rpc({ type: 'skipTts' });
    const clearBtn = el('button', '', `🗑️ ${translate('Limpar fila')}`);
    clearBtn.onclick = () => rpc({ type: 'clearTts' });
    const queueOut = el('span', 'stream-voice-queue', `${translate('Fila')}: 0`);
    bar.append(muteBtn, skipBtn, clearBtn, queueOut);
    body.append(bar);
    rpc({ type: 'ttsState' });

    addToggle('🗣️ Voz Kokoro (TTS offline)', 'ttsEnabled');
    body.append(el('span', 'stream-voice-val', translate('Pasta do TTS')));
    const ttsDir = el('input'); ttsDir.type = 'text'; ttsDir.value = config.ttsDir || 'D:\\Program Files\\Offline TTS';
    ttsDir.onchange = () => window.petAPI?.saveConfig?.({ ttsDir: ttsDir.value });
    const pickDir = el('button', '', `📁 ${translate('Escolher pasta')}`);
    pickDir.onclick = async () => {
      const p = await window.petAPI?.pickModelSource?.(true);
      if (p) { ttsDir.value = p; window.petAPI?.saveConfig?.({ ttsDir: p }); fillVoices(); }
    };
    const dirRow = el('div', 'stream-ctrl-row'); dirRow.append(ttsDir, pickDir);
    body.append(dirRow);

    body.append(el('span', 'stream-voice-val', translate('Voz')));
    const voice = el('select');
    const fillVoices = async () => {
      try {
        const list = await window.petAPI?.ttsVoices?.(ttsDir.value);
        const arr = Array.isArray(list) ? list : list?.voices || [];
        voice.replaceChildren(...arr.map((v) => {
          const o = el('option', '', typeof v === 'string' ? v : v.name || v.id);
          o.value = typeof v === 'string' ? v : v.id || v.name;
          return o;
        }));
        if (voice.options.length) {
          const calm = (config.streamPersona || defaultPersona({ config })) === 'estoica';
          const preferred = calm ? (config.lang === 'en' ? ['af_nicole', 'af_sarah', 'pf_dora'] : ['pf_dora']) : (config.lang === 'en' ? ['af_heart'] : ['pf_dora']);
          const options = [...voice.options].map((o) => o.value);
          const wanted = config.ttsVoice || preferred.find((v) => options.includes(v)) || preferred[0];
          voice.value = options.includes(wanted) ? wanted : options[0];
        }
      } catch {}
    };
    fillVoices();
    voice.onchange = () => window.petAPI?.saveConfig?.({ ttsVoice: voice.value });
    body.append(voice);

    const speed = addSlider('Velocidade', 'ttsSpeed', 0.7, 1.4, 0.05, 1, (v) => `${v.toFixed(2)}×`);
    addSlider('Volume da Voz', 'ttsVolume', 0, 1, 0.05, 0.85, (v) => `${Math.round(v * 100)}%`);
    addSlider('Tom (semitons)', 'ttsPitch', -6, 6, 1, 0, (v) => `${v > 0 ? '+' : ''}${v}`);
    addSelect('Filtro de timbre', 'ttsFilter', [
      ['natural', 'Natural'], ['warm', 'Suave/Quente'], ['wired', 'Lo-Fi / The Wired'],
    ], 'natural');
    addToggle('Ducking de áudio', 'ttsDucking');
    const testFilters = el('button', '', `🔊 ${translate('Testar voz com filtros')}`);
    testFilters.onclick = () => rpc({ type: 'ttsTest' });
    const testRow = el('div', 'stream-ctrl-row'); testRow.append(testFilters);
    body.append(testRow);

    body.append(el('h3', '', translate('Filtros de texto')));
    addToggle('Ignorar comandos (! / $)', 'ttsIgnoreCommands');
    addToggle('Ignorar links', 'ttsIgnoreLinks');
    addToggle('Ignorar emotes', 'ttsIgnoreEmotes');
    addToggle('Compactar repetições', 'ttsDedupeChars');
    addToggle('Falar o nome do viewer', 'ttsSpeakUser');
    addSlider('Máx. de caracteres', 'ttsMaxChars', 60, 250, 10, 150, (v) => String(v));

    body.append(el('h3', '', translate('Chat: permissões e frequência')));
    addSelect('Quem pode falar', 'ttsWho', [
      ['all', 'Todos'], ['subs', 'Subs & VIPs'], ['mods', 'Apenas Mods'], ['alerts_only', 'Só Alertas e Pontos'],
    ], 'all');
    addSlider('Cooldown global do chat (s)', 'ttsCooldown', 0, 120, 5, 20, (v) => `${v}s`);
    addSlider('Cooldown por usuário (s)', 'ttsUserCooldown', 0, 120, 5, 30, (v) => `${v}s`);
    body.append(el('span', 'stream-voice-val', translate('Usuários ignorados')));
    const ignored = el('input'); ignored.type = 'text'; ignored.value = config.ttsIgnoredUsers ?? 'nightbot, streamelements, streamlabs, moobot, fossabot';
    ignored.onchange = () => window.petAPI?.saveConfig?.({ ttsIgnoredUsers: ignored.value });
    body.append(ignored);
    body.append(el('span', 'stream-voice-val', translate('Dicionário de pronúncia')));
    const pronounce = el('textarea'); pronounce.rows = 3; pronounce.placeholder = translate('um por linha: termo = como ler');
    pronounce.value = config.ttsPronounce || '';
    pronounce.onchange = () => window.petAPI?.saveConfig?.({ ttsPronounce: pronounce.value });
    body.append(pronounce);

    // --- Personality / cadence ---
    body.append(el('h3', '', translate('Personalidade na live')));
    const persona = el('select');
    const personaChoices = [['padrao', 'Padrão (animada)'], ['estoica', 'Estóica (calma)']];
    persona.replaceChildren(...personaChoices.map(([value, label]) => {
      const o = el('option', '', translate(label));
      o.value = value;
      return o;
    }));
    persona.value = config.streamPersona || defaultPersona({ config });
    if (!config.ttsSpeed) speed.value = persona.value === 'estoica' ? '0.88' : '1';
    persona.onchange = () => {
      speed.value = persona.value === 'estoica' ? '0.88' : '1';
      window.petAPI?.saveConfig?.({ streamPersona: persona.value, ttsSpeed: Number(speed.value) });
    };
    const testPersona = el('button', '', translate('🔊 Testar frase estóica'));
    testPersona.onclick = () => rpc({ type: 'say', text: personaLine({ config }, 'brb') || translate('Pausa na transmissão... já voltamos.') });
    const personaRow = el('div', 'stream-ctrl-row'); personaRow.append(persona, testPersona);
    body.append(personaRow);

    // --- Twitch chat ---
    body.append(el('h3', '', 'Twitch'));
    const channel = el('input'); channel.type = 'text'; channel.placeholder = 'canal'; channel.value = config.twitchChannel || '';
    channel.onchange = () => window.petAPI?.saveConfig?.({ twitchChannel: channel.value });
    const chatBtn = el('button', '', translate('Conectar'));
    chatBtn.onclick = () => rpc({ type: channel.value ? 'twitchConnect' : 'twitchDisconnect', channel: channel.value });
    const status = el('span', '', translate('Desconectado'));
    const chatRow = el('div', 'stream-ctrl-row'); chatRow.append(channel, chatBtn, status);
    body.append(chatRow);
    for (const [key, label] of [['streamKeywords', 'Reagir a palavras-chave'], ['streamCommands', 'Permitir comandos !'], ['streamTtsSpeak', 'Falar respostas no TTS']]) {
      const b = el('input'); b.type = 'checkbox'; b.checked = config[key] !== false;
      b.onchange = () => window.petAPI?.saveConfig?.({ [key]: b.checked });
      const l = el('label', 'stream-ctrl-toggle'); l.append(b, el('span', '', translate(label)));
      body.append(l);
    }
    const blocked = el('input'); blocked.type = 'text'; blocked.placeholder = translate('Palavras bloqueadas'); blocked.value = config.streamBlockedWords || '';
    blocked.onchange = () => window.petAPI?.saveConfig?.({ streamBlockedWords: blocked.value });
    body.append(blocked);

    // --- Local bridge + simulator ---
    body.append(el('h3', '', translate('Ponte local de alertas')));
    const endpoint = el('input'); endpoint.readOnly = true; endpoint.value = `http://127.0.0.1:${config.streamBridgePort || 48321}/event`;
    const copy = el('button', '', translate('Copiar'));
    copy.onclick = () => navigator.clipboard?.writeText(endpoint.value);
    const bridgeOn = el('input'); bridgeOn.type = 'checkbox'; bridgeOn.onchange = () => {
      if (bridgeOn.checked) window.petAPI?.streamBridgeStart?.(config.streamBridgePort || 48321, config.bridgeToken || '');
      else window.petAPI?.streamBridgeStop?.();
    };
    const bridgeRow = el('div', 'stream-ctrl-row'); bridgeRow.append(endpoint, copy, bridgeOn);
    body.append(bridgeRow);
    const sim = el('div', 'stream-ctrl-row');
    for (const [type, label] of [['follow', 'Testar Follow'], ['sub', 'Testar Sub'], ['raid', 'Testar Raid'], ['bits', 'Testar Bits']]) {
      const b = el('button', '', translate(label));
      b.onclick = () => rpc({ type: 'simulate', event: { type, user: 'Viewer', amount: 100 } });
      sim.append(b);
    }
    body.append(sim);
    const say = el('input'); say.type = 'text'; say.placeholder = translate('Fazer ela falar...');
    const sayBtn = el('button', '', '🔊'); sayBtn.onclick = () => { rpc({ type: 'say', text: say.value }); say.value = ''; };
    const sayRow = el('div', 'stream-ctrl-row'); sayRow.append(say, sayBtn);
    body.append(sayRow);

    // --- Channel point redeems ---
    body.append(el('h3', '', translate('Pontos do Canal')));
    const redeems = el('textarea'); redeems.rows = 4; redeems.value = Object.entries(config.streamRedeems || {}).map(([n, c]) => `${n}=${c.action}:${c.coins || 0}`).join('\n');
    const saveRedeems = el('button', '', translate('Salvar'));
    saveRedeems.onclick = () => {
      const map = {};
      for (const line of redeems.value.split('\n')) {
        const [name, rest] = line.split('=');
        if (!name || !rest) continue;
        const [action, coins] = rest.split(':');
        map[name.trim()] = { action: action.trim(), coins: Number(coins) || 0 };
      }
      window.petAPI?.saveConfig?.({ streamRedeems: map });
    };
    body.append(redeems, saveRedeems);

    // --- BRB ---
    body.append(el('h3', '', translate('☕ Modo Volto Já (BRB)')));
    const brb = el('input'); brb.type = 'checkbox'; brb.checked = !!config.streamBrb;
    brb.onchange = () => { window.petAPI?.saveConfig?.({ streamBrb: brb.checked }); rpc({ type: 'brb', value: brb.checked, text: brbText.value }); };
    const brbText = el('input'); brbText.type = 'text'; brbText.value = config.streamBrbText || (config.lang === 'en' ? 'Be right back!' : 'Volto já!');
    brbText.onchange = () => window.petAPI?.saveConfig?.({ streamBrbText: brbText.value });
    const brbRow = el('div', 'stream-ctrl-row'); brbRow.append(brb, brbText);
    body.append(brbRow);

    const danger = el('div', 'stream-ctrl-row');
    const reset = el('button', '', translate('Resetar save do Streamer'));
    reset.onclick = () => window.petAPI?.resetSave?.();
    const exit = el('button', 'danger', translate('Sair do Modo Streamer'));
    exit.onclick = () => window.petAPI?.setStreamer?.(false);
    danger.append(reset, exit);
    body.append(danger);
  };

  for (const [id, label] of cats) {
    const b = el('button', id === 'streamer' ? 'active' : '', translate(label));
    b.onclick = () => openCat(id, b);
    nav.append(b);
  }
  root.append(nav, body);
  document.body.append(root);
  openCat('streamer', nav.firstElementChild);
}
