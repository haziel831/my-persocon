import { PetView } from './view.js';
import { World } from './world.js';
import { Pet, AFFECTION_LEAVE, AFFECTION_MAX, DEBUFFS } from './behavior.js';
import { Emoticons } from './emoticons.js';
import { Menu, ImportDialog, ObjectsDialog, ImageDropDialog, showGameOver, prefLabel } from './ui.js';
import { DEFAULT_OPTS } from './catalog.js';
import { crowName } from './game.js';
import { Game, ITEMS, TASTE_MOOD, TASTE_RANK, BUFF_LABELS, BUFF_ICONS, itemById, HER_BAG } from './game.js';
import { demoLocked, demoGameLocked, shortVersion } from './edition.js';
import { Gains } from './gains.js';
import { Sound } from './sound.js';
import { Toys } from './toys.js';
import { Modes } from './modes.js';
import { GameScreen } from './games.js';
import { icon, glyphIcon, setArtStyle } from './pixel.js';
import { EventLog } from './eventlog.js';
import { createDock } from './dock.js';
import { Pomodoro } from './focus.js';
import { Weather } from './weather.js';
import { Trio } from './trio.js';
import './statusicons.js';
import { baseId } from './furniture.js';
import { Ball } from './ball.js';
import { Speech } from './speech.js';
import { applyFilter } from './filters.js';
import { Fx } from './fx.js';
import { XpLog } from './xplog.js';
import { Doll } from './doll.js';
import { Crow } from './crow.js';
import { Skins } from './skins.js';
import { Minigames, MINIGAMES, mgUnlocked } from './minigames.js';
import { Antics } from './antics.js';
import { DesktopGames } from './desktop.js';
import { DesktopWatch } from './watch.js';
import { TvWatch } from './tvwatch.js';
import { Interactions } from './interact.js';
import { COMBAT_META } from './combat.js';
import { Melee } from './melee.js';
import { Unknown } from './unknown.js';
import { CombatUI } from './combatui.js';
import { Closeup } from './closeup.js';
import { Rewards } from './rewards.js';
import { Care } from './care.js';
import { QuickMenu } from './quickmenu.js';
import { TrainingDummy } from './dummy.js';
import { setLang, setSex, translate } from './i18n.js';
import { isFocus } from './focusmode.js';
import { cleanName } from './names.js';
import { TitleScreen } from './title.js';
import { Intro } from './intro.js';
import { startTips } from './tips.js';
import { logInfo, logWarn, logError, logEnabled, setLogEnabled, flushLog, brief } from './logger.js';
import { DebugConsole } from './debugconsole.js';

const api = window.petAPI;

function drawDebug(canvas, world, on) {
  canvas.width = on ? world.width : 0;
  canvas.height = on ? world.height : 0;
  if (!on) return;
  const g = canvas.getContext('2d');
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(0,255,90,0.8)';
  for (const s of world.surfaces) {
    g.beginPath();
    g.moveTo(s.x1, s.y - 1.5);
    g.lineTo(s.x2, s.y - 1.5);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,150,0,0.8)';
  for (const w of world.walls) {
    g.beginPath();
    g.moveTo(w.x, w.y1);
    g.lineTo(w.x, w.y2);
    g.stroke();
  }
}

function portrait(view) {
  const c = document.createElement('canvas');
  const size = 64;
  c.width = c.height = size;
  const r = devicePixelRatio;
  const P = view.petHeight;
  const sx = (view.feetX - P * 0.3) * r;
  const sy = (view.feetY - P * 1.02) * r;
  c.getContext('2d').drawImage(view.canvas, sx, sy, P * 0.6 * r, P * 0.6 * r, 0, 0, size, size);
  return c.toDataURL('image/png');
}

function div(className, html = '') {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export async function startPet(files, config) {
  setArtStyle(config.artStyle);
  if ((config.defaultsRev ?? 0) < 1) {
    Object.assign(config, DEFAULT_OPTS, { defaultsRev: 1 });
    api.saveConfig({ ...DEFAULT_OPTS, defaultsRev: 1 }).catch(() => {});
  }
  if (config.lang !== 'pt' && config.lang !== 'en') {
    config.lang = /^pt/i.test(navigator.language || '') ? 'pt' : 'en';
    api.saveConfig({ lang: config.lang }).catch(() => {});
  }
  const canvas = document.getElementById('pet');
  const debugCanvas = document.getElementById('debug');
  const view = files.vrm
    ? await (await import('./vrmview.js')).VrmView.create(files, config.petHeight, canvas)
    : await PetView.create(files, config.petHeight, canvas);
  view.animator.disabled = new Set(config.animOff?.[config.modelDir] || []);
  const world = new World(config.petHeight);
  const saved = await Game.load();
  const pet = new Pet(view, world, config, saved?.stats);
  // Off the desktop until the title screen (or the intro) lets it in. The arena has no front end.
  pet.offstage = window.__PET_COMBATE__ ? false : (!window.__PET_TEST__ || /[?&]title=1/.test(location.search));
  const game = new Game(pet, saved);
  const emoticons = new Emoticons(config, () => (pet.dead ? null : pet.stats));
  emoticons.setSize(config.petHeight);
  const sound = new Sound(config);
  sound.load();
  document.body.dataset.theme = config.theme || 'padrao';
  if (window.__PET_TEST__) view.smoothTurn = false;
  // She asks for things she likes or hasn't tried, never for free items or ones she dislikes.
  pet.requestPool = (cat) => {
    // Desserts are only requested when the player already owns them.
    const owned = (i) => cat === 'sobremesas' ? game.count(i.id) > 0 : true;
    const list = ITEMS.filter((i) => i.cat === cat && !i.legacy && i.price > 0 && !i.watchOnly && !demoLocked(i.id) && owned(i) && (TASTE_RANK[game.tasteOf(i.id)] ?? 2) >= 2);
    const fav = list.filter((i) => TASTE_RANK[game.tasteOf(i.id)] >= 3);
    const pool = fav.length && Math.random() < 0.6 ? fav : list;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  // Wishes: only things that exist in this game right now. Doing what she asks earns affection.
  pet.wishPool = () => {
    const out = [];
    const add = (w, kind, extra) => out.push({ w, kind, ...extra });
    const placed = (id) => {
      const t = game.toys[id];
      return t?.placed && !t.broken && toys.here(t);
    };
    for (const [id, t] of Object.entries(game.toys)) {
      const b = baseId(id);
      const it = itemById(b);
      if (!it || !placed(id) || b === 'pelucia' || !((it.toy && !it.furn) || toys.fun.owns(b))) continue;
      add(1, 'toy', { id, name: it.name, img: it.img, label: it.name, say: [`Brinca comigo de ${it.name}?`, `Me deixa usar ${it.name}?`], en: [`Play ${it.name} with me?`, `Can I use the ${it.name}?`] });
    }
    if (pet.stats.hygiene < 70) add(2, 'bath', { label: 'Banho', img: glyphIcon('🛁'), say: ['Me dá um banho?', 'Tô precisando de um banho...'], en: ['Give me a bath?', 'I really need a bath...'] });
    add(0.8, 'jam', { label: 'Ouvir Música', img: glyphIcon('🎵'), say: ['Põe uma música e vamos dançar? É só ir em Brincar → Ouvir Música!', 'Bora! Menu → Brincar → Ouvir Música!'], en: ['Put on music and let us dance? Just go to Play → Listen to Music!', 'Come on! Menu → Play → Listen to Music!'] });
    add(0.8, 'watch', { label: 'Modo Assistir', img: glyphIcon('🍿'), say: ['Vamos no Modo Assistir? Clique no vídeo pra eu ver!', 'Cinema! Menu → Brincar → Modo Assistir!'], en: ['Watch mode? Click the video so I can see it!', 'Movie time! Menu → Play → Watch mode!'] });
    if (placed('videogame')) add(1, 'tv', { label: 'TV', img: glyphIcon('📺'), say: ['Liga a TV pra gente?', 'Vamos ver alguma coisa na TV?'], en: ['Turn on the TV for us?', "Let's watch something on TV?"] });
    add(0.7, 'ball', { label: 'Bola', img: icon('ball'), say: ['Joga a bola pra mim?', 'Bora jogar bola?'], en: ['Throw me the ball?', "Let's play ball?"] });
    if (placed('estante')) add(0.7, 'manga', { label: 'Mangá', img: glyphIcon('📖'), say: ['Lê um mangá comigo?', 'Quero ler um mangá da estante!'], en: ['Read a manga with me?', 'I want to read a manga from the shelf!'] });
    if (placed('gacha')) add(0.5, 'gacha', { label: 'Gacha', img: glyphIcon('🎰'), say: ['Gira a Gacha comigo?', 'Será que sai um raro na Gacha?'], en: ['Spin the Gacha with me?', 'Maybe a rare one comes out of the Gacha?'] });
    if (placed('slot')) add(0.4, 'slot', { label: 'Caça-níquel', img: glyphIcon('🎰'), say: ['Posso jogar no caça-níquel?', 'Hoje eu tô com sorte, deixa eu jogar!'], en: ['Can I play the slot machine?', "I'm lucky today, let me play!"] });
    const minis = MINIGAMES.filter((m) => mgUnlocked(m.id, pet.affection) && !demoGameLocked(m.id));
    if (minis.length && pet.stats.energy > 35) {
      const m = minis[Math.floor(Math.random() * minis.length)];
      add(1, 'mini', { id: m.id, label: m.name, img: glyphIcon(m.icon), say: [`Vamos jogar ${m.name}?`, `Bora uma partida de ${m.name}? Tô afiada!`], en: [`Let's play ${m.name}?`, `One round of ${m.name}? I'm on fire!`] });
    }
    if ((game.profile.wallet ?? 0) < 40) add(0.6, 'wallet', { label: 'Mesada', img: glyphIcon('🪙'), say: ['Me dá uma mesada? Minha carteira tá vazia...', 'Umas moedinhas pra carteira?'], en: ['Allowance? My wallet is empty...', 'A few coins for my wallet?'] });
    if (!out.length) return null;
    let r = Math.random() * out.reduce((s, o) => s + o.w, 0);
    return out.find((o) => (r -= o.w) <= 0) || out[0];
  };

  view.play('idle', { fade: 0 });
  view.update(0);
  const avatar = portrait(view);

  // ---------- settings ----------
  let pending = {};
  let saveTimer = 0;
  const save = (patch) => {
    Object.assign(pending, patch);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api.saveConfig(pending).catch((e) => api.log('save failed', e));
      pending = {};
    }, 400);
  };
  const flushConfig = () => {
    clearTimeout(saveTimer);
    const p = pending;
    pending = {};
    return api.saveConfig(p).catch(() => {});
  };

  const app = {
    config,
    dndActive: false,
    version: '',
    pet,
    game,
    view,
    sound,
    avatar,
    gameOver: null,
    debugConsole: null,
    openDebugConsole: () => app.debugConsole.show(),
    emoticons,
    previewEmoticon: () => emoticons.preview(),
    pause: () => pet.pause(),
    resume: () => pet.resume(),
    restart: () => pet.restart(),
    quit: () => flushLog().finally(() => api.quit()),
    focus: () => api.focusWindow(),
    openImport: () => importDialog.show(),
    openObjects: (id, preset) => new ObjectsDialog(app).show(id, preset),
    // Clicks on the pet never close the menu (it can be carried around while the menu stays open).
    overPet: (x, y) => suppressContext || !!press || hitPet(x, y),
    hitPet: (x, y) => hitPet(x, y),
    // The window lets go of the mouse and the press is re-sent to whatever is underneath.
    passClick() {
      if (config.streamer || window.__PET_COMBATE__ || !api.passClick) return false;
      interactive = false;
      interactiveWant = false;
      api.passClick().catch?.(() => {});
      return true;
    },
    uiChanged: () => {
      if (uiOpen()) api.focusWindow();
      misses = 99;
      refreshInteractive();
    },
    setSize(P) {
      config.petHeight = P;
      view.resize(P);
      pet.setSize(P);
      emoticons.setSize(P);
      if (config.filter && config.filter !== 'nenhum') applyFilter(canvas, view, config.filter, P, config.filterStrength ?? 1);
      save({ petHeight: P });
    },
    setName(name) {
      name = cleanName(name) || 'Persocon';
      config.name = name;
      save({ name });
    },
    setOption(key, value) {
      config[key] = value;
      if (key === 'speedScale') pet.setSize(pet.P);
      if (key === 'debug') {
        drawDebug(debugCanvas, world, value);
        if (!value) flushLog();
        setLogEnabled(value);
        // Opening debug always shows the console; turning debug off leaves it open until closed.
        if (value) app.debugConsole?.show();
      }
      if (key === 'emoticonScale') emoticons.setSize(pet.P);
      if (key === 'volume' || key === 'sound') sound.applyVolume();
      if (key === 'voiceVolume' || key === 'voicePitch') sound.voice(3);
      if (key === 'theme') document.body.dataset.theme = value;
      if (key === 'artStyle') setArtStyle(value);
      if (key === 'filter' || key === 'filterStrength') applyFilter(canvas, view, config.filter || 'nenhum', pet.P, config.filterStrength ?? 1);
      if (key === 'alwaysOnTop') api.setAlwaysOnTop?.(value).catch?.(() => {});
      if (key === 'clickThrough') refreshInteractive();
      if (key === 'streamer' || key === 'streamerBg') applyStreamer();
      if (key === 'soundSeed') sound.reseed();
      if (key === 'lang') setLang(value);
      save({ [key]: value });
    },
    // Apply a whole personality preset at once (saved immediately, not debounced).
    applyConfigPatch(patch) {
      clearTimeout(saveTimer);
      pending = {};
      Object.assign(config, patch);
      if (patch.anticsOff && app.antics?.cur) app.antics.stop(false);
      if ('volume' in patch || 'sound' in patch) sound.applyVolume();
      if ('emoticonScale' in patch) emoticons.setSize(pet.P);
      if ('filter' in patch || 'filterStrength' in patch) applyFilter(canvas, view, config.filter || 'nenhum', pet.P, config.filterStrength ?? 1);
      if ('alwaysOnTop' in patch) api.setAlwaysOnTop?.(!!patch.alwaysOnTop).catch?.(() => {});
      if ('clickThrough' in patch) refreshInteractive();
      if ('streamer' in patch || 'streamerBg' in patch) applyStreamer();
      if ('lang' in patch) setLang(patch.lang);
      api.saveConfig(patch).catch((e) => api.log('save failed', e));
      app.uiChanged?.();
    },
    files,
    openMenu(cat) {
      menu.show(Math.min(pet.x + pet.P * 0.4, innerWidth - 380), Math.max(40, pet.y - pet.P));
      if (cat) menu.select(cat);
    },
    openOptions() {
      menu.show(innerWidth / 2 - 190, innerHeight / 2);
      menu.select('opcoes');
    },
    log: (mod, msg) => logInfo(mod, msg),
    closeMenu: () => menu.close(),
    world,
    head: null,
    startChase: () => countdown(),
    startMode: (kind) => modes.start(kind),
    stopMode: () => modes.stop(),
    // Debug: list, preview and turn off the model's animations.
    animList: () => [...view.animator.clips.keys()].sort().map((name) => ({
      name, generated: !!view.generated?.includes(name), on: !view.animator.disabled.has(name),
    })),
    previewAnim(name) {
      if (!app.previewing) {
        app.previewing = { wasPaused: pet.paused };
        if (!pet.paused) app.pause();
      }
      view.setFacing('front');
      view.play(name, { restart: true, force: true });
    },
    // Debug: preview a close-combat clip and fire its hit frame (VFX/SFX hook).
    previewCombat(name) {
      // O preview do debug ignora o liga/desliga das animações (só o clipe precisa existir).
      if (!view.animator.clips.has(name)) return false;
      app.previewAnim(name);
      const meta = COMBAT_META[name];
      if (meta?.hitFrameMs != null) {
        setTimeout(() => {
          pet.emit('combatHit', { name, at: meta.hitFrameMs });
          logInfo('combat', `hit ${name} @ ${meta.hitFrameMs}ms`);
        }, meta.hitFrameMs);
      }
      return true;
    },
    // Debug: entra no COMBAT_MODE na hora, contra o Sucataoxidado, sem boneco nem energia.
    debugFight() {
      const melee = app.melee;
      if (!melee) return false;
      if (melee.active) melee.stop('cancelled');
      if (pet.dead) pet.revive?.();
      if (pet.unconscious) pet.reviveUnconscious?.();
      // Ela larga o que estava fazendo (sem congelar a IA: a luta assume em seguida).
      app.unknown?.interruptPet?.();
      pet.resume?.();
      app.toys?.screen?.stop?.();
      // Sem energia a luta pararia na hora ("cansada"): o debug começa com gás.
      if (pet.stats.energy < 50) { pet.stats.energy = 80; app.game.changed?.(); }
      const ok = melee.startSparring(true);
      if (ok) pet.setCombat?.(true, 'combat');
      return ok;
    },
    stopPreview() {
      const p = app.previewing;
      if (!p) return;
      app.previewing = null;
      if (!p.wasPaused) app.resume();
      else pet.anim('idle', { restart: true });
    },
    setAnimOn(name, on) {
      const off = view.animator.disabled;
      if (on) off.delete(name);
      else off.add(name);
      config.animOff = { ...(config.animOff || {}), [config.modelDir]: [...off] };
      save({ animOff: config.animOff });
      pet.setRoles(pet.roles);
    },
    placeToy: (id) => toys.place(id),
    editFurniture: () => toys.startEdit(),
    // A new game always starts with the box again (the old save stays as a backup).
    deleteSave() {
      modes.stop();
      if (!api.resetSave) {
        game.reset();
        return pet.revive();
      }
      game.frozen = true;
      api.resetSave().catch(() => {}).finally(() => {
        sessionStorage.setItem('mp-new', '1');
        location.reload();
      });
    },
    // Swapping the model reloads the page: the save is kept and the title screen is skipped.
    async reloadForModel() {
      await game.persist();
      sessionStorage.setItem('mp-resume', '1');
      location.reload();
    },
    // Cafuné / tapa cursor: 'pat' rubs while held over the pet, 'slap' hits on click. null = off.
    setHand(mode) {
      app.hand = app.hand === mode ? null : mode;
      app.handKey = app.hand ? handKey() : null;
      document.body.dataset.hand = app.hand || '';
      if (app.hand) sound.play('blip', { volume: 0.4 });
      app.uiChanged();
    },
    hand: null,
    monitors: () => monitors,
    display: () => display,
    allowedMonitor: (i) => {
      const only = config.monitors?.[0] ?? config.display ?? 0;
      return i === only;
    },
    setMonitors(list) {
      const one = [list[0] ?? 0];
      config.monitors = one;
      save({ monitors: one });
      if (display !== one[0]) switchDisplay(one[0], { spawn: true });
    },
    setDisplay: (i) => switchDisplay(i, { spawn: true }),
  };
  app.debugConsole = new DebugConsole(app);
  const menu = new Menu(app);
  const quick = new QuickMenu(app);
  app.quick = quick;
  const importDialog = new ImportDialog(app);
  const screen = new GameScreen(sound);
  screen.el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const m = document.createElement('div');
    m.className = 'toy-menu hitzone';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = config.lang === 'en' ? 'Console screen' : 'Tela do console';
    m.append(title);
    const btn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = (ev) => {
        ev.stopPropagation();
        sound.play('ok', { volume: 0.4 });
        fn();
        m.remove();
        app.uiChanged();
      };
      m.append(b);
    };
    btn(config.lang === 'en' ? 'Opacity 30%' : 'Opacidade 30%', () => { screen.el.style.opacity = '0.3'; });
    btn(config.lang === 'en' ? 'Opacity 60%' : 'Opacidade 60%', () => { screen.el.style.opacity = '0.6'; });
    btn(config.lang === 'en' ? 'Opacity 100%' : 'Opacidade 100%', () => { screen.el.style.opacity = '1.0'; });
    const zoom = (v) => { gbZoom = clamp(v, 0.6, 1.6); app.setOption('gbZoom', gbZoom); };
    btn(config.lang === 'en' ? 'Small' : 'Pequeno', () => zoom(0.7));
    btn(config.lang === 'en' ? 'Normal' : 'Normal', () => zoom(1));
    btn(config.lang === 'en' ? 'Large' : 'Grande', () => zoom(1.4));
    document.body.append(m);
    m.style.left = `${Math.min(e.clientX, innerWidth - m.offsetWidth - 8)}px`;
    m.style.top = `${Math.min(e.clientY, innerHeight - m.offsetHeight - 8)}px`;
    const off = (ev) => { if (!m.contains(ev.target)) { m.remove(); window.removeEventListener('pointerdown', off, true); } };
    setTimeout(() => window.addEventListener('pointerdown', off, true), 0);
  });
  const toys = new Toys(app, screen);
  const dummy = new TrainingDummy(app);
  app.dummy = dummy;
  // COMBAT_MODE: the red frame that burns around the screen while she fights.
  const combatFrame = document.createElement('div');
  combatFrame.className = 'combat-frame';
  document.body.append(combatFrame);
  app.combatFrame = combatFrame;
  pet.bouncer = (x, y0, y1) => toys.bounceAt(x, y0, y1);
  const modes = new Modes(app);
  const ball = new Ball(app);
  const speech = new Speech(app);
  app.speechHistory = [];
  // Lines said straight from other modules are Portuguese; the balloon types them letter by
  // letter, so it is translated up front instead of by the page translator.
  speech.el.dataset.noI18n = '';
  {
    let own = false;
    const sayRaw = speech.say.bind(speech);
    speech.say = (text, life) => sayRaw(config.lang === 'en' && !own ? translate(text) : text, life);
    for (const k of ['react', 'idle']) {
      const raw = speech[k].bind(speech);
      speech[k] = (...args) => {
        own = true;
        try {
          return raw(...args);
        } finally {
          own = false;
        }
      };
    }
  }
  app.toys = toys;
  app.modes = modes;
  app.ball = ball;
  app.speech = speech;
  app.view = view;   // os VFX (afterimage) recortam o canvas do renderer
  pet.app = app;
  const fx = new Fx(app);
  app.fx = fx;
  app.gains = new Gains(app);
  app.xpLog = new XpLog(app);
  const skins = new Skins(app);
  app.skins = skins;
  skins.load();
  const doll = new Doll(app);
  app.doll = doll;
  const crow = new Crow(app);
  app.crow = crow;
  const minigames = new Minigames(app);
  app.minigames = minigames;
  const antics = new Antics(app);
  app.antics = antics;
  const desktopGames = new DesktopGames(app);
  app.desktopGames = desktopGames;
  const watch = new DesktopWatch(app);
  app.watch = watch;
  const tvWatch = new TvWatch(app);
  app.tvWatch = tvWatch;
  const interact = new Interactions(app);
  app.interact = interact;
  // The melee engine (turns, COMBAT_MODE, combat track).
  const melee = new Melee(app);
  app.melee = melee;
  // A interface de combate JRPG (fila de turnos, anel de chão, banners, modais de lore).
  const combatUI = new CombatUI(app);
  app.combatUI = combatUI;
  // Os gatilhos dos modais de lore sombrios (uma vez cada).
  pet.on((type) => {
    if (type === 'blackCartGet') combatUI.loreModal('cart');
    else if (type === 'cristalDrop') combatUI.loreModal('crystal');
  });
  // The event of the mysterious black cartridge (the "Unknown" that comes out of the TV).
  const unknown = new Unknown(app);
  app.unknown = unknown;
  const closeup = new Closeup(app);
  app.closeup = closeup;
  const rewards = new Rewards(app);
  app.rewards = rewards;
  // Cooperative Pomodoro: she and the Doll keep the user company through a focus session.
  app.pomodoro = new Pomodoro(app);
  app.weather = new Weather(app);
  app.trio = new Trio(app);
  const care = new Care(app);
  app.display = () => display;
  const modelKey = () => config.modelDir || 'models/MyPersocon';
  // Models used most recently first (Importar modelo lists them to switch back).
  {
    const prev = (config.recentModels || []).find((r) => r.dir === modelKey());
    const recent = [{ dir: modelKey(), name: prev?.name || '', at: Date.now() }, ...(config.recentModels || []).filter((r) => r.dir !== modelKey())].slice(0, 12);
    const was = config.recentModels?.[0];
    if (was?.dir !== recent[0].dir || was?.name !== recent[0].name) app.setOption('recentModels', recent);
  }
  app.hiddenParts = () => config.hiddenParts?.[modelKey()] || [];
  app.setHiddenParts = (list) => {
    config.hiddenParts = { ...(config.hiddenParts || {}), [modelKey()]: list };
    view.setHidden?.(list);
    save({ hiddenParts: config.hiddenParts });
  };
  view.setHidden?.(app.hiddenParts());
  applyFilter(canvas, view, config.filter || 'nenhum', pet.P, config.filterStrength ?? 1);
  if (pet.affection <= AFFECTION_LEAVE) setTimeout(() => showGameOver(app, () => app.deleteSave(), 'leave'), 500);
  if (window.__PET_TEST__) window.__app = app;
  api.getVersion?.().then((v) => { app.version = shortVersion(v); }).catch(() => {});
  api.getAutostart?.().then((v) => { app.autostart = !!v; }).catch(() => {});

  // ---------- title screen / first run ----------
  const booted = !!saved && saved.profile?.booted !== false;
  const beginIntro = () => {
    if (saved && !booted) game.reset();
    app.intro = new Intro(app);
    app.intro.onDone = () => { app.intro = null; };
    app.intro.start();
  };
  const beginPlay = () => { pet.offstage = false; };
  const newGame = async () => {
    if (!booted) return beginIntro();
    game.frozen = true;
    await api.resetSave?.().catch(() => {});
    sessionStorage.setItem('mp-new', '1');
    location.reload();
  };
  const startFlow = async () => {
    if (!pet.offstage) return;
    const restart = sessionStorage.getItem('mp-new') === '1';
    const resume = sessionStorage.getItem('mp-resume') === '1';
    sessionStorage.removeItem('mp-new');
    sessionStorage.removeItem('mp-resume');
    const reopen = sessionStorage.getItem('mp-intro-open');
    sessionStorage.removeItem('mp-intro-open');
    if (reopen && !booted) {
      beginIntro();
      app.intro.resumeOpen(JSON.parse(reopen));
      return;
    }
    if (restart) beginIntro();
    else if ((resume || config.autostarted) && booted) beginPlay();
    else {
      app.version = shortVersion(await Promise.race([api.getVersion?.() ?? '', new Promise((r) => setTimeout(() => r(''), 800))]).catch(() => '')) || app.version;
      new TitleScreen(app, { canContinue: booted, onContinue: beginPlay, onNewGame: newGame }).show();
    }
  };
  if (config.alwaysOnTop === false) api.setAlwaysOnTop?.(false).catch(() => {});

  // ---------- sound effects ----------
  // A low descending sting: the "something is wrong" cue when a negative status lands.
  const EVENT_SOUNDS = {
    debuff: (d) => { if (!d?.on) return; sound.tone8(190, 95, 0.4, 'sawtooth', 0.12); sound.play('cancel', { volume: 0.3, rate: 0.85 }); },
    bump: () => sound.play('bonk', { volume: 0.8 }),
    hardLand: (d) => sound.play(d.thrown ? 'explode' : 'hit', { volume: d.thrown ? 0.5 : 0.8 }),
    slap: () => sound.play('hit', { volume: 0.9 }),
    wakeAngry: () => sound.play('hit', { volume: 0.7 }),
    land: (d) => sound.play('landing', { volume: clamp(0.25 + (d.impact || 0) / 20, 0.25, 0.8) }),
    hop: () => sound.play('jump', { volume: 0.5 }),
    chaseJump: () => sound.play('jump', { volume: 0.5 }),
    climb: (d) => d.jump && sound.play('jump', { volume: 0.4 }),
    grab: () => sound.play('blip', { volume: 0.5 }),
    release: (d) => d.speed > 12 && sound.play('blastoff', { volume: 0.45 }),
    restart: () => sound.play('teleport', { volume: 0.4 }),
    bite: (d) => (d.drink ? sound.sip() : sound.chew()),
    ate: (d) => (d.drink ? sound.refreshed() : sound.swallow()),
    qteStart: () => sound.play('ok', { volume: 0.6 }),
    qteEscape: () => sound.play('blastoff', { volume: 0.5 }),
    chaseStart: () => sound.play('ok', { volume: 0.5 }),
    chaseEnd: (d) => sound.play(d.caught ? 'ok' : 'cancel', { volume: 0.6 }),
    notSleepy: () => sound.play('cancel', { volume: 0.5 }),
    tooTired: () => sound.play('cancel', { volume: 0.5 }),
    leap: () => sound.play('jump', { volume: 0.45, rate: 0.9 }),
    wallJump: () => sound.play('jump', { volume: 0.5, rate: 1.2 }),
    ambush: () => sound.play('jump', { volume: 0.6, rate: 0.8 }),
    patAngry: () => { sound.play('cancel', { volume: 0.6 }); sound.voice(2); },
    // PowerUps / rare loot: Fx plays the get-jingle; plain medicine keeps the soft chirp.
    medicine: (d) => {
      const it = d?.item;
      if (it?.buff || it?.buffs || ['raro', 'lendario', 'epico'].includes(it?.rarity)) return;
      sound.refreshed();
    },
    bought: () => sound.voice(3),
    requestDone: () => sound.voice(3),
    hookFire: () => sound.hookshot('fire'),
    hookHit: () => sound.hookshot('hit'),
    hookEnd: () => sound.hookshot('end'),
    ballKick: () => sound.play('jump', { volume: 0.3, rate: 1.3 }),
    ballHeader: () => sound.play('bonk', { volume: 0.4, rate: 1.2 }),
    ballJump: () => sound.play('jump', { volume: 0.45 }),
    leave: () => sound.voice(6),
    // Playing along with the living Doll: a short cue, at most every few seconds.
    dollToy: (d) => {
      if (pet.clock - dollToyAt < 4) return;
      dollToyAt = pet.clock;
      if (d.kind === 'cubeLose') sound.play('cancel', { volume: 0.35 });
      else if (d.kind === 'cubeWin') sound.play('ok', { volume: 0.45 });
      else sound.voice(2);
    },
  };
  let dollToyAt = -9;

  // Events that make a wish come true: [request kind, id].
  const WISH_EVENTS = {
    toyStart: (d) => ['toy', d.id],
    activity: (d) => [d.kind],
    bath: () => ['bath'],
    ballStart: () => ['ball'],
    ballFetch: () => ['ball'],
    readManga: () => ['manga'],
    gachaStart: () => ['gacha'],
    slotStart: () => ['slot'],
    walletGift: () => ['wallet'],
    tvStart: () => ['tv'],
    miniEnd: (d) => ['mini', d.id],
  };

  // VRoid expressions for events.
  const EXPRESSIONS = {
    pet: 'happy', ate: 'happy', bought: 'happy', requestDone: 'happy', ballFetch: 'happy', gameExcite: 'happy', toyRepaired: 'happy',
    dollHug: 'happy', dollFound: 'happy', dollAlive: 'surprised', dollToy: 'happy',
    crowBorn: 'surprised', crowLearn: 'happy', crowGift: 'happy', crowPlay: 'happy', crowTrick: 'happy',
    slap: 'angry', patAngry: 'angry', wakeAngry: 'angry', toyBroke: 'sad', leave: 'sad', death: 'sad', toySad: 'sad',
    grab: 'surprised', qteStart: 'surprised', ambush: 'surprised', hardLand: 'surprised', react: 'surprised',
  };

  const LOG_EVENTS = new Set(['toyStart', 'toyEnd', 'toyBroke', 'toyRepaired', 'activity', 'activityEnd', 'bought', 'lootOpen', 'lootPrize',
    'gachaStart', 'gachaPrize', 'slotStart', 'slotEnd', 'vendStart', 'vendBuy', 'vendStuck', 'miniEnd', 'chaseStart', 'chaseEnd', 'ballStart', 'ballEnd',
    'bath', 'bathEnd', 'medicine', 'achievement', 'missionDone', 'versusStart', 'versusEnd', 'desktopGamePlay', 'dollGameEnd', 'walletGift',
    'readManga', 'figurePlay', 'request', 'requestDone', 'pause', 'resume', 'restart', 'death', 'leave', 'left']);
  let prefsAt = null;
  // Affection reached a new hundred: CRT glitch over the screen and the border pulses pink 4 times with heartbeats.
  function loveFx(level) {
    const el = document.createElement('div');
    el.className = 'love-fx';
    el.innerHTML = `<i class="love-crt"></i><i class="love-border"></i><b>💗 ${level}</b>`;
    document.body.append(el);
    document.body.classList.add('love-glitch');
    setTimeout(() => document.body.classList.remove('love-glitch'), 700);
    for (let i = 0; i < 4; i++) setTimeout(() => sound.sfx('heartbeat', 2.2), 250 + i * 800);
    setTimeout(() => el.remove(), 3700);
  }
  app.loveFx = loveFx;

  // Ominous popup above her head + a log line whenever a negative status starts or ends.
  function debuffEvent(data) {
    const d = DEBUFFS[data.id];
    const L = d && d[config.lang === 'en' ? 'en' : 'pt'];
    if (!L) return;
    if (data.on) {
      const el = document.createElement('div');
      el.className = 'debuff-pop';
      el.innerHTML = `<img src="${icon(d.art)}" alt=""><b>${L.name.replace(/[<>&"]/g, '')}</b>`;
      if (pet.x != null) {
        el.style.left = `${Math.round(pet.x)}px`;
        el.style.top = `${Math.round(pet.y - pet.P * 1.3)}px`;
        document.body.append(el);
        setTimeout(() => el.remove(), 2800);
      }
      pushLog(`Status negativo: ${L.name}`, `Negative status: ${L.name}`, 'status');
    } else pushLog(`${L.name} curada`, `${L.name} cured`, 'status');
  }

  pet.on((type, data) => {
    if (type === 'loveMilestone' && data.level > (game.profile.loveTop || 0)) {
      game.profile.loveTop = data.level;
      game.dirty = true;
      loveFx(data.level);
    }
    emoticons.react(type, data);
    EVENT_SOUNDS[type]?.(data);
    if (type === 'debuff') debuffEvent(data);
    if (type === 'missionDone' && data.name) pushLog(`Missão concluída: ${data.name}`, `Mission done: ${translate(data.name)}`, 'mission');
    if (type === 'achievement' && data.name) pushLog(`Conquista: ${data.name}`, `Achievement: ${translate(data.name)}`, 'mission');
    if ((type === 'lootPrize' || type === 'gachaPrize') && data.name && !/moedas/i.test(data.name)) pushLog(`Prêmio: ${data.name}`, `Prize: ${translate(data.name)}`, 'prize');
    
    if (EXPRESSIONS[type]) view.setExpression?.(type === 'react' && data.kind !== 'scare' ? 'happy' : type === 'dollToy' && data.kind === 'cubeLose' ? 'surprised' : EXPRESSIONS[type]);
    if (LOG_EVENTS.has(type) && logEnabled()) logInfo('evento', `${type} ${brief(data)}`);
    if (type === 'earn' && !(data.src || '').toLowerCase().includes('tempo')) pushLog(`+${data.n} ¥ (${data.src || '?'})`, `+${data.n} ¥ (${data.src || '?'})`, 'money');
    if (type === 'pay') pushLog(`-${data.n} ¥ (${data.src || '?'})`, `-${data.n} ¥ (${data.src || '?'})`, 'money');
    if (type === 'crowSkill' && data?.name) {
      const who = crowName(app);
      pushLog(`${who} usou: ${data.name}`, `${who} used: ${data.name}`, 'crow');
    }
    if (type === 'pet') patHand.t = 1.3;
    if (type === 'bounce') {
      if (data.sfx === 'tramp') {
        sound.toy('tramp', 1.3);
        sound.toy('trampCreak', 0.8);
      } else sound.sfx('bedBounce', 1.3);
    }
    const w = (pet.request?.wish || pet.wishes?.some((x) => x.wish)) && WISH_EVENTS[type]?.(data || {});
    if (w) pet.fulfill(...w);
    if (type === 'requestDone' && data.love) toys.furn.floatText(pet.x, pet.y - pet.P * 1.2, `♥ +${data.love} Afeição`);
    if (type === 'taste' && data.deal) toys.furn.floatText(pet.x, pet.y - pet.P * 1.15, '✊ Trato é trato!');
    else if (type === 'taste' && TASTE_MOOD[data.taste]) {
      const v = TASTE_MOOD[data.taste];
      toys.furn.floatText(pet.x, pet.y - pet.P * 1.15, `${{ love: '♥', like: '👍', dislike: '👎', hate: '💢' }[data.taste]} ${v > 0 ? '+' : '−'}${Math.abs(v)} Humor`);
    }
    if (type === 'prefs' && (!data.up || pet.clock - (prefsAt || -9) > 1.5)) {
      prefsAt = pet.clock;
      const pct = Math.round((2 ** data.value - 1) * 100);
      toys.furn.floatText(pet.x, pet.y - pet.P * 1.15, `${data.up ? '👍' : '👎'} ${prefLabel(data.key)} ${pct > 0 ? '+' : ''}${pct}%`);
    }
    if (type === 'bought') toys.bought(data.item);
    if (type === 'request') showRequest(data);
    if (type === 'requestDone' || type === 'requestEnd' || type === 'death') showRequest(null);
    if (type === 'bite' && !data.drink) crumbs();
    if (type === 'qteStart') startQteInput();
    if (type === 'qteEscape' || type === 'chaseEnd') stopQteInput();
    if (type === 'death' || type === 'leave') {
      if (press) endPress();
      menu.close();
      importDialog.close();
      modes.stop();
    }
    // Nocaute em combate: quem cuida é o combate (ela desmaia e acorda sozinha depois).
    if (type === 'death' && !pet.unconscious) setTimeout(() => { if (!pet.unconscious) showGameOver(app, () => pet.revive()); }, 2500);
    if (type === 'left') setTimeout(() => showGameOver(app, () => app.deleteSave(), 'leave'), 800);
  });

  // Countdown shown above the pet during the mouse chase.
  const hud = div('hud');
  let hudSecs = -1; // last whole second written to the DOM

  // ---------- cafuné hand, request balloon, held toy, chase bell, countdown ----------
  const patHand = { el: div('pat-hand', `<img src="${icon('hand')}" draggable="false">`), t: 0 };
  const requestEl = div('request');
  requestEl.style.pointerEvents = 'none';
  const toyEl = div('held-toy');
  // A espada equipada fica presa à cintura (e vai para a mão enquanto ela luta).
  const swordEl = div('held-sword');
  const bell = { el: div('bell', `<img src="${icon('bell')}" draggable="false">`), a: 0, w: 0, x: null, vx: 0, cool: 0 };
  const countEl = div('countdown');
  const chainEl = div('hook-chain');
  const tipEl = div('hook-tip', `<img src="${icon('hooktip')}" draggable="false">`);
  chainEl.style.backgroundImage = `url(${icon('chain')})`;
  let counting = false;
  let screenAt = null;
  let screenOff = null;
  let screenDragging = false;
  // Zoom do casco do console (tela GameBuddy/GG/PSP), pelo menu de contexto; fica no config.
  let gbZoom = clamp(Number(config.gbZoom) || 1, 0.6, 1.6);

  // Assistir: the player clicks where the video is so the pet sits turned toward it.
  app.markVideo = (done) => {
    const el = div('mark-video', '<div class="mark-hint">Clique onde está o vídeo · Esc ou botão direito para pular</div>');
    app.marking = el;
    app.uiChanged();
    const finish = (x) => {
      el.remove();
      app.marking = null;
      window.removeEventListener('keydown', key);
      app.uiChanged();
      done(x);
    };
    const key = (e) => e.key === 'Escape' && finish(null);
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button === 0) {
        const dot = div('mark-dot');
        dot.style.transform = `translate(${e.clientX - 12}px, ${e.clientY - 12}px)`;
        setTimeout(() => dot.remove(), 900);
        sound.play('ok', { volume: 0.5 });
      }
      finish(e.button === 0 ? e.clientX : null);
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', key);
  };

  function showRequest(r) {
    requestEl.style.display = r ? 'block' : 'none';
    if (!r) return;
    const src = r.img || icon({ food: 'food', drink: 'cup', dessert: 'food', pat: 'hand', play: 'ball' }[r.kind] || 'ball');
    const text = r.label || { food: r.name || 'Comida', drink: r.name || 'Bebida', dessert: r.name || 'Sobremesa', pat: 'Cafuné', play: 'Brincar' }[r.kind];
    requestEl.innerHTML = `<img src="${src}" draggable="false" style="image-rendering:pixelated"><span>${text}?</span>`;
  }

  function countdown() {
    if (counting || pet.dead) return;
    if (app.care?.refuse()) return;
    if (pet.stats.energy < 12) return pet.play();
    counting = true;
    pet.stopActivity();
    let n = 3;
    const tick = () => {
      countEl.textContent = n > 0 ? String(n) : 'Já!';
      countEl.classList.remove('pop');
      void countEl.offsetWidth;
      countEl.classList.add('pop');
      countEl.style.display = 'block';
      sound.tone8(n > 0 ? 440 : 880, n > 0 ? 440 : 880, n > 0 ? 0.12 : 0.3, 'square', 0.12);
      if (n-- > 0) return setTimeout(tick, 800);
      setTimeout(() => (countEl.style.display = 'none'), 600);
      counting = false;
      pet.play();
      api.focusWindow();
    };
    tick();
  }

  // Bell hanging from the cursor during the chase: a pendulum pushed by the cursor movement.
  function updateBell(dt, hidden) {
    const on = pet.chase && cursor && !hidden;
    bell.el.style.display = on ? 'block' : 'none';
    if (!on) {
      bell.x = null;
      return;
    }
    if (bell.x === null) bell.x = cursor.x;
    const vx = (cursor.x - bell.x) / Math.max(dt, 1e-3);
    bell.x += (cursor.x - bell.x) * Math.min(1, dt * 25);
    const ax = (vx - bell.vx) / Math.max(dt, 1e-3);
    bell.vx = vx;
    const L = 26;
    bell.w += (-(900 / L) * Math.sin(bell.a) - (Math.max(-6000, Math.min(6000, ax)) / L) * 0.02 * Math.cos(bell.a) - 2.5 * bell.w) * dt;
    bell.a = Math.max(-1.3, Math.min(1.3, bell.a + bell.w * dt));
    bell.cool -= dt;
    if (Math.abs(bell.w) > 6 && bell.cool <= 0) {
      bell.cool = 0.18;
      sound.bell(Math.abs(bell.w) / 14);
    }
    const s = 22;
    bell.el.style.width = `${s}px`;
    bell.el.style.transform = `translate(${Math.round(bell.x - s / 2)}px, ${Math.round(cursor.y + 14)}px) rotate(${bell.a}rad)`;
  }

  // Docked status window: always-visible bars in a corner of the screen (Opções → Status fixo).
  let bagDockEl = null;
  let appHidden = false;
  let bagDockT = 0;
  let bagDockMoving = false;
  // Event log under the dock: 5 latest big events, [pt, en] pairs picked at render time.
  const eventLog = new EventLog(config);
  // The dock owns its DOM, drag state, menu and caches (see dock.js).
  const dock = createDock({
    config, pet, game, app, sound, rewards, eventLog,
    isHidden: () => appHidden,
    setHidden: (on) => setAppHidden(on),
    toggleLogFilter: (cat) => toggleLogFilter(cat),
    focusLabel: () => app.pomodoro?.label ?? null,
  });
  app.dock = dock;
  const pushLog = (pt, en, cat = 'general') => { eventLog.push(pt, en, cat); dock.invalidate(); };
  const toggleLogFilter = (cat) => {
    config.logFilter = { ...(config.logFilter || {}), [cat]: !(config.logFilter?.[cat] ?? true) };
    app.setOption('logFilter', config.logFilter);
    dock.invalidate();
    app.uiChanged();
  };

  const closeDockMenu = () => dock.closeMenu();

  function bagDockMenu(x, y) {
    closeDockMenu();
    const el = document.createElement('div');
    el.className = 'toy-menu hitzone';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Inventário dela';
    el.append(title);
    const item = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = (e) => {
        e.stopPropagation();
        closeDockMenu();
        sound.play('ok', { volume: 0.4 });
        fn();
      };
      el.append(b);
    };
    item('✥ Mudar a posição', () => { bagDockMoving = true; bagDockT = 0; });
    const k = config.herBagIconScale ?? 1.2;
    const scale = (v) => { app.setOption('herBagIconScale', Math.round(Math.min(2.5, Math.max(0.7, v)) * 10) / 10); bagDockT = 0; };
    item(`➕ Aumentar (${Math.round(k * 100)}%)`, () => scale(k + 0.2));
    item('➖ Diminuir', () => scale(k - 0.2));
    item('✕ Fechar', () => app.setOption('herBagIcon', 'off'));
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(el);
    el.style.left = `${Math.min(x, innerWidth - el.offsetWidth - 6)}px`;
    el.style.top = `${Math.min(y, innerHeight - el.offsetHeight - 6)}px`;
    dock.setMenu(el, (e) => !el.contains(e.target) && closeDockMenu());
    sound.play('blip', { volume: 0.4 });
    app.uiChanged();
  }

  // "Esconder o app": everything but the docked status disappears (and lets clicks through) until shown again.
  function setAppHidden(on) {
    appHidden = on;
    document.body.classList.toggle('app-hidden', on);
    if (on) {
      app.closeMenu?.();
      app.toys?.fun?.cleanupBubbles?.();
      app.toys?.fun?.cleanupPlane?.();
      app.toys?.fun?.cleanupDrawing?.();
    }
    dock.invalidate();
    bagDockT = 0;
    app.uiChanged();
  }

api.onTrayClick?.(() => {
    setAppHidden(false);
    appHidden = false;
    dock.invalidate();
    api.focusWindow?.();
    app.uiChanged();
  });

  function dragBagDock(e) {
    const r = bagDockEl.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    const move = (ev) => {
      config.herBagIcon = 'free';
      config.herBagIconAt = { x: ev.clientX - ox, y: ev.clientY - oy };
      bagDockT = 0;
      updateBagDock();
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      setTimeout(() => { bagDockMoving = false; }, 0);
      app.setOption('herBagIconAt', config.herBagIconAt);
      app.setOption('herBagIcon', config.herBagIcon);
      app.uiChanged();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  function updateBagDock() {
    // Personal bag UI paused — no dock icon (leftovers: menu rápido → Inventário dela).
    if (!HER_BAG) {
      bagDockEl?.remove();
      bagDockEl = null;
      return;
    }
    // Default: under the pinned status (top-right), so it is hard to miss.
    let pos = config.herBagIcon;
    if (pos == null || pos === '') {
      pos = 'tr';
      config.herBagIcon = 'tr';
    }
    if (pos === 'off') {
      bagDockEl?.remove();
      bagDockEl = null;
      return;
    }
    if (!bagDockEl) {
      bagDockEl = document.createElement('div');
      bagDockEl.className = 'bag-dock hitzone';
      bagDockEl.title = 'Inventário dela · botão direito: mover / tamanho';
      bagDockEl.addEventListener('click', (e) => {
        if (bagDockMoving) return;
        e.stopPropagation();
        const r = bagDockEl.getBoundingClientRect();
        app.quick?.showBag?.(r.left, r.bottom + 4);
      });
      bagDockEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (bagDockMoving && e.button === 0) dragBagDock(e);
      });
      bagDockEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bagDockMenu(e.clientX, e.clientY);
      });
      document.body.append(bagDockEl);
      bagDockT = 0;
    }
    bagDockEl.dataset.pos = pos;
    const k = String(config.herBagIconScale ?? 1.4);
    if (bagDockEl.style.getPropertyValue('--bdk') !== k) bagDockEl.style.setProperty('--bdk', k);
    const at = pos === 'free' && config.herBagIconAt;
    // Clear conflicting anchors so corner CSS (right/bottom) can apply.
    if (at) {
      bagDockEl.style.left = `${Math.round(Math.min(Math.max(0, at.x), innerWidth - bagDockEl.offsetWidth))}px`;
      bagDockEl.style.top = `${Math.round(Math.min(Math.max(0, at.y), innerHeight - bagDockEl.offsetHeight))}px`;
      bagDockEl.style.right = '';
      bagDockEl.style.bottom = '';
    } else {
      bagDockEl.style.left = '';
      bagDockEl.style.top = '';
      bagDockEl.style.right = '';
      bagDockEl.style.bottom = '';
    }
    bagDockEl.classList.toggle('moving', bagDockMoving);
    bagDockEl.dataset.hint = config.lang === 'en' ? 'Drag to move' : 'Arraste para mover';
    bagDockEl.style.display = 'flex';
    bagDockEl.style.visibility = 'visible';
    if ((bagDockT -= 1) > 0) return;
    bagDockT = 15;
    const n = (game.herBag?.() || []).length;
    const bagCap = game.bagCap?.() || 1;
    bagDockEl.title = config.lang === 'en' ? 'Her bag (items given with “Give to her”)' : 'Mochila dela (itens com “Dar a ela”)';
    bagDockEl.innerHTML = `<img src="${icon('backpack')}" alt=""><span>${n}/${bagCap}</span>`;
  }

  function updateDock() {
    updateBagDock();
    dock.update();
  }

  function updateOverlays(dt, head, hidden, calm) {
    const P = pet.P;
    // Pixel hand rubbing the head.
    patHand.t -= dt;
    const showHand = patHand.t > 0 && !hidden;
    patHand.el.style.display = showHand ? 'block' : 'none';
    if (showHand) {
      const s = Math.round(P * 0.32);
      const rub = Math.sin(patHand.t * 14) * P * 0.08;
      patHand.el.style.width = `${s}px`;
      patHand.el.style.transform = `translate(${Math.round(head.x - s / 2 + rub)}px, ${Math.round(head.y - s * 0.55)}px) rotate(${Math.sin(patHand.t * 14) * 8}deg) scaleY(-1)`;
    }
    // Request balloon beside the head.
    if (pet.request && !hidden) {
      requestEl.style.display = 'block';
      const w = requestEl.offsetWidth;
      let x = calm.x + P * 0.3;
      if (x + w > innerWidth - 4) x = calm.x - P * 0.3 - w;
      const y = Math.max(4, calm.y - requestEl.offsetHeight - P * 0.05);
      requestEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    } else requestEl.style.display = 'none';
    // Toy in the hands (or the bindle when leaving, or the hookshot while firing it).
    const tp = pet.toyPlay;
    const hp = tp ? view.handsPoint() || { x: 0, y: P * 0.55 } : null;
    app.hands = hp && { x: place.left + view.feetX + hp.x, y: place.top + view.feetY - hp.y };
    // Each hand on its own (the yo-yo string hangs from the throwing hand).
    const side = tp?.armPose?.side;
    const toScreen = (q) => {
      if (!q) return null;
      const dx = view.feetX + q.x - place.ox;
      const dy = view.feetY - q.y - place.oy;
      const c = Math.cos(place.tilt || 0);
      const s = Math.sin(place.tilt || 0);
      return { x: place.left + place.ox + dx * c - dy * s, y: place.top + place.oy + dx * s + dy * c };
    };
    app.hand1 = side ? toScreen(view.handPoint?.(side)) : null;
    app.hand2 = side ? toScreen(view.handPoint?.(side === 'Right' ? 'Left' : 'Right')) : null;
    const src = tp?.hold && tp.t >= tp.holdFrom ? tp.hold : pet.carryImg || (pet.carry ? icon(pet.carry) : pet.hook ? icon('hook') : null);
    const holding = !!src && !hidden;
    toyEl.style.display = holding ? 'block' : 'none';
    if (holding) {
      if (toyEl.dataset.src !== src) {
        toyEl.dataset.src = src;
        toyEl.innerHTML = `<img src="${src}" draggable="false">`;
      }
      const id = tp?.hold ? String(tp.id).split('#')[0] : pet.carryImg ? 'parcel' : pet.carry === 'mic' ? 'mic' : pet.carry ? 'carry' : 'hook';
      const s = Math.round(P * ((tp?.hold && tp.holdSize) || ({ gameboy: 0.13, gamegear: 0.22, psp: 0.26, videogame: 0.12, pelucia: 0.16, estante: 0.1, espada: 0.06, mic: 0.068, carry: 0.3, hook: 0.24, inspect: 0.16, parcel: 0.2 }[id] ?? 0.24) * (tp?.cartIn ? 0.6 : 1)));
      const hands = hp || view.handsPoint() || { x: 0, y: P * 0.55 };
      const x = place.left + view.feetX + hands.x;
      const y = place.top + view.feetY - hands.y;
      const flip = id === 'hook' && pet.dir < 0 ? ' scaleX(-1)' : '';
      // Long things are held by the handle, handhelds a bit below the middle: that point of the
      // picture sits in the hands and is the pivot.
      const grip = { espada: 0.85, mic: 0.7, gameboy: 0.62, gamegear: 0.62, psp: 0.62 }[id];
      const img = toyEl.firstChild;
      // Portáteis: proporção do sprite (FURN), não esticar o casco atrás da tela.
      const ratio = id === 'mic' ? 18 / 8
        : (id === 'espada' || id === 'gameboy' || id === 'gamegear' || id === 'psp') ? toys.ratio(id)
        : img?.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
      const lift = grip ? s * ratio * grip : id === 'carry' ? s * 0.8 : s * 0.15;
      toyEl.style.width = `${s}px`;
      toyEl.style.height = `${Math.round(s * ratio)}px`;
      toyEl.style.transformOrigin = grip ? `50% ${grip * 100}%` : '50% 50%';
      toyEl.style.transform = `translate(${Math.round(x - s / 2)}px, ${Math.round(y - lift + (tp?.bob || 0))}px) rotate(${pet.tilt * 57 + (tp?.angle || 0)}deg)${flip}`;
    }
    // Espada equipada: pendurada na cintura (e na mão, na direção da lâmina, enquanto ela luta).
    const swordUp = app.game.profile.swordEquipped === true && !hidden;
    swordEl.style.display = swordUp ? 'block' : 'none';
    if (swordUp) {
      const item = itemById('espada');
      const swordSrc = skins.art('espada', item?.img) || item?.img;
      if (swordEl.dataset.src !== swordSrc) {
        swordEl.dataset.src = swordSrc;
        swordEl.innerHTML = `<img src="${swordSrc}" draggable="false">`;
      }
      const sp = view.swordPoint?.();
      const hand = melee.swordOut && sp ? toScreen(sp) : null;
      const waist = hand ? null : toScreen(view.waistPoint?.());
      const at = hand || waist;
      if (at) {
        const s = Math.round(P * (hand ? 0.055 : 0.05));
        const h = Math.round(s * 4.5);
        const ang = hand ? sp.angle + place.tilt * 57 : -22;
        swordEl.style.width = `${s}px`;
        swordEl.style.height = `${h}px`;
        swordEl.style.transform = `translate(${Math.round(at.x - s / 2)}px, ${Math.round(at.y - h * 0.85)}px) rotate(${ang}deg)${pet.dir < 0 ? ' scaleX(-1)' : ''}`;
      } else swordEl.style.display = 'none';
    }
    // GameBuddy screen: placed once when the game starts, then stays put while the pet moves.
    const tv = tp?.tv && tp.picked && !hidden ? toys.tvRect() : null;
    if (tv && screen.game) {
      screen.setHd(!!toys.app.game.toys.videogame?.up);
      screen.update(dt);
      const el = screen.el;
      // TV: the screen sits on the TV, behind the pet and the Doll playing in front of it.
      if (!el.classList.contains('tvback')) {
        el.classList.remove('behind');
        el.classList.add('tvback');
        document.body.append(el);
      }
      el.style.width = `${Math.round(tv.w)}px`;
      el.style.height = `${Math.round(tv.h)}px`;
      el.style.transformOrigin = `${Math.round(tv.ox - tv.x)}px ${Math.round(tv.oy - tv.y)}px`;
      el.style.transform = `translate(${Math.round(tv.x)}px, ${Math.round(tv.y)}px)${tv.rot ? ` rotate(${tv.rot}deg)` : ''}`;
      screenAt = null;
    } else if (tp?.console && !tp.tv && tp.picked && !hidden) {
      // GameGlow / PlayPocket: mesmos gráficos HD da TV; limpa tamanho residual da TV.
      screen.setHd(tp.console === 'psp' || tp.console === 'gamegear');
      screen.update(dt);
      const el = screen.el;
      el.classList.remove('tvback');
      el.style.width = el.style.height = el.style.minWidth = el.style.transformOrigin = '';
      const w = el.offsetWidth || 110;
      const h = el.offsetHeight || 110;
      // Kept at the same spot relative to the pet (where the player last dragged it, in pet
      // heights); versus: a bigger screen, centered over the pet.
      if (!screenOff) {
        const saved = !tp.versus && config.gbScreenOffset;
        let y = head.y - h - P * 0.25;
        if (y < 4) y = head.y + P * 0.6;
        screenOff = saved ? { dx: saved.dx * P, dy: saved.dy * P } : { dx: head.x - w / 2 - pet.x, dy: y - pet.y };
        el.classList.toggle('behind', !!saved?.behind);
      }
      if (!screenDragging) {
        screenAt = {
          x: Math.round(Math.min(Math.max(4, pet.x + screenOff.dx), innerWidth - w - 4)),
          y: Math.round(Math.min(Math.max(4, pet.y + screenOff.dy), innerHeight - h - 4)),
        };
      }
      el.style.transform = `translate(${screenAt.x}px, ${screenAt.y}px)${gbZoom !== 1 ? ` scale(${gbZoom})` : ''}`;
    } else {
      screenAt = screenOff = null;
      screen.el.classList.remove('tvback');
      if (screen.game && !tp?.console) screen.stop();
      if (!screen.game) {
        screen.el.style.width = screen.el.style.height = screen.el.style.minWidth = screen.el.style.transformOrigin = '';
      }
    }
    // Grappling hook chain, from the hands to the hook tip.
    const hk = pet.hook;
    chainEl.style.display = tipEl.style.display = hk && !hidden ? 'block' : 'none';
    if (hk && !hidden) {
      const o = pet.hookOrigin();
      const dx = hk.tipX - o.x;
      const dy = hk.tipY - o.y;
      const len = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const th = Math.max(3, Math.round(P * 0.035));
      chainEl.style.width = `${Math.round(len)}px`;
      chainEl.style.height = `${th}px`;
      chainEl.style.backgroundSize = `${th * 2}px ${th}px`;
      chainEl.style.transform = `translate(${Math.round(o.x)}px, ${Math.round(o.y - th / 2)}px) rotate(${a}rad)`;
      const ts = Math.round(P * 0.12);
      tipEl.style.width = `${ts}px`;
      tipEl.style.transform = `translate(${Math.round(hk.tipX - ts / 2)}px, ${Math.round(hk.tipY - ts / 2)}px) rotate(${a}rad)`;
    }
    if (countEl.style.display === 'block') {
      countEl.style.transform = `translate(${Math.round(head.x - countEl.offsetWidth / 2)}px, ${Math.round(Math.max(4, head.y - countEl.offsetHeight - 20))}px)`;
    }
    // Hiding behind a window during the chase: cut the window's area out of the pet.
    const r = pet.hideRect;
    if (r) {
      const W = view.width;
      const H = view.height;
      const x1 = r.x - place.left;
      const y1 = r.y - place.top;
      const x2 = x1 + r.w;
      const y2 = y1 + r.h;
      canvas.style.clipPath = `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
    } else if (canvas.style.clipPath) canvas.style.clipPath = '';
    updateBell(dt, hidden);
  }

  // ---------- food held in the hands while eating ----------
  const foodEl = div('held-food');
  let foodShown = null;
  const foodPos = { x: 0, y: 0, size: 0 };

  function crumbs() {
    for (let i = 0; i < 5; i++) {
      const c = div('crumb');
      c.style.left = `${foodPos.x + (Math.random() - 0.5) * foodPos.size * 0.5}px`;
      c.style.top = `${foodPos.y - foodPos.size * 0.2}px`;
      c.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
      c.style.setProperty('--dy', `${20 + Math.random() * 25}px`);
      setTimeout(() => c.remove(), 700);
    }
  }

  function updateFood(hidden) {
    const e = pet.eating;
    const visible = e && !hidden && (e.drink || e.done < e.bites);
    foodEl.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    if (foodShown !== e.item) {
      foodShown = e.item;
      foodEl.replaceChildren(Object.assign(document.createElement('i'), { className: 'straw-tube' }));
      const foodSrc = skins.art(e.item.id, e.item.img);
      if (foodSrc) {
        const img = document.createElement('img');
        img.src = foodSrc;
        img.draggable = false;
        if (e.item.tint) img.style.filter = e.item.tint;
        foodEl.append(img);
      } else {
        const span = document.createElement('span');
        span.textContent = e.item.icon || '🍙';
        foodEl.append(span);
      }
    }
    const P = pet.P;
    const size = Math.round(P * (e.drink ? 0.24 : 0.26));
    const hands = view.handsPoint() || { x: 0, y: P * 0.55 };
    const x = place.left + view.feetX + hands.x;
    const y = place.top + view.feetY - hands.y;
    Object.assign(foodPos, { x, y, size });
    foodEl.style.width = foodEl.style.height = `${size}px`;
    foodEl.style.fontSize = `${Math.round(size * 0.8)}px`;
    foodEl.classList.toggle('straw', !!(e.drink && e.straw));
    const bob = e.drink ? Math.sin(e.t * 9) * 0.02 * e.raise : Math.sin(e.raise * Math.PI) * 0.06;
    const strawDrop = e.drink && e.straw ? size * 0.4 * e.raise : 0;
    foodEl.style.transform = `translate(${Math.round(x - size / 2)}px, ${Math.round(y - size * 0.45 + strawDrop)}px) scale(${1 + bob})`;
    // Bites are taken out of the top-right corner.
    const bitten = e.drink ? 0 : e.done / e.bites;
    const r = Math.round(14 + bitten * 46);
    const mask = bitten > 0 ? `radial-gradient(circle at 88% 12%, transparent ${r}%, #000 ${r + 1}%)` : 'none';
    foodEl.style.maskImage = foodEl.style.webkitMaskImage = mask;
    foodEl.style.opacity = e.drink && e.done >= e.bites ? '0.55' : '1';
  }

  // ---------- quick-time event (escaping the pet during the chase) ----------
  const qteEl = div('qte', `
    <div class="title">Fuja! Aperte ← → rápido</div>
    <div class="keys"><span class="key" data-k="left">←</span><div class="joy"></div><span class="key" data-k="right">→</span></div>
    <div class="meter"><div class="fill"></div></div>
    <div class="time"><div></div></div>
    <div class="info"></div>`);
  const joy = qteEl.querySelector('.joy');
  const keyEls = { left: qteEl.querySelector('[data-k="left"]'), right: qteEl.querySelector('[data-k="right"]') };
  let qteInput = null;

  function startQteInput() {
    qteInput = { hostKeys: false, joyTimer: 0 };
    api.watchKeys(true).catch(() => {});
    api.focusWindow();
  }

  function stopQteInput() {
    if (!qteInput) return;
    clearTimeout(qteInput.joyTimer);
    qteInput = null;
    api.watchKeys(false).catch(() => {});
  }

  function qteKey(side) {
    const q = pet.chase?.qte;
    if (!q || !qteInput) return;
    pet.qtePress(side);
    sound.play('blip', { volume: 0.35, rate: 0.9 + q.bar * 0.6, vary: 0.02 });
    joy.style.backgroundPositionX = `${side === 'left' ? -3 * 64 : -5 * 64}px`;
    for (const [k, el] of Object.entries(keyEls)) el.classList.toggle('hit', k === side);
    clearTimeout(qteInput.joyTimer);
    qteInput.joyTimer = setTimeout(() => {
      joy.style.backgroundPositionX = `${-4 * 64}px`;
      for (const el of Object.values(keyEls)) el.classList.remove('hit');
    }, 90);
  }

  function updateQte(head, hidden) {
    const q = pet.chase?.qte;
    if (!q || hidden) {
      qteEl.style.display = 'none';
      return;
    }
    qteEl.style.display = 'grid';
    qteEl.querySelector('.meter .fill').style.width = `${Math.round(q.bar * 100)}%`;
    qteEl.querySelector('.time div').style.width = `${Math.max(0, (q.t / q.total) * 100)}%`;
    const h = Math.round(pet.stats.health);
    qteEl.querySelector('.info').textContent = `Força da Persocon: ${h >= 70 ? 'alta' : h >= 40 ? 'média' : 'baixa'} (Saúde ${h}%)`;
    const w = qteEl.offsetWidth;
    const ht = qteEl.offsetHeight;
    let x = pet.x + pet.P * 0.45;
    if (x + w > innerWidth - 6) x = pet.x - pet.P * 0.45 - w;
    const y = clamp(head.y - ht * 0.5, 6, innerHeight - ht - 6);
    qteEl.style.transform = `translate(${Math.round(clamp(x, 6, innerWidth - w - 6))}px, ${Math.round(y)}px)`;
  }

  // ---------- mouse interaction ----------
  // The overlay ignores the mouse except while the cursor is over a drawn pixel of the pet
  // (polled from the host, since a click-through window receives no mouse events) or a UI is open.
  const place = { left: 0, top: 0, ox: 0, oy: 0, tilt: 0 };
  let cursor = null;
  let interactive = false;
  let interactiveWant = null;   // último estado pedido ao host (watchdog reaplica)
  let misses = 0;
  let press = null;
  let suppressContext = false;

  const uiOpen = () => (menu.open && !config.menuPinned) || quick.open || dock.menuOpen || dock.moving || bagDockMoving || importDialog.open || !!app.gameOver || !!toys.popup || !!toys.menuEl || !!toys.shelfPopup || !!app.marking || !!app.dialog || !!toys.editing || !!minigames.active || !!minigames.guide || !!doll.brain.betEl || !!app.combatUI?.modalOpen;

  app.uiOpen = uiOpen;
  startTips(app, () => uiOpen() || !!menu.open || !!pet.toyPlay || pet.mode === 'held');

  const hitPet = (x, y) => {
    if (pet.x === null || pet.offstage || canvas.style.visibility === 'hidden') return false;
    let lx = x - place.left;
    let ly = y - place.top;
    if (place.tilt) {
      const c = Math.cos(-place.tilt);
      const s = Math.sin(-place.tilt);
      const dx = lx - place.ox;
      const dy = ly - place.oy;
      lx = place.ox + dx * c - dy * s;
      ly = place.oy + dx * s + dy * c;
    }
    return view.hitTest(lx, ly, 3);
  };

  // Pede ao host (set_ignore_cursor_events) o estado do mouse. Guarda o último pedido para
  // reaplicar quando o host perder o estado (janela recriada/perda de foco) e nunca engolir
  // o clique quando o invoke falha.
  const setInteractive = (value, force = false) => {
    interactive = value;
    if (!force && interactiveWant === value) return;
    interactiveWant = value;
    try {
      const p = api.setInteractive(value);
      if (p && typeof p.catch === 'function') {
        p.catch((e) => {
          interactiveWant = null;
          console.warn('[clickThrough] set_interactive falhou', e);
        });
      }
    } catch (e) {
      interactiveWant = null;
      console.warn('[clickThrough] set_interactive falhou', e);
    }
  };

  let lastRefreshKey = null;
  let lastRefreshAt = 0;
  function refreshInteractive() {
    // A arena é uma janela normal: tudo nela precisa aceitar clique o tempo todo.
    if (window.__PET_COMBATE__) {
      document.body.classList.remove('hover');
      return setInteractive(true);
    }
    if (uiOpen() || press) {
      document.body.classList.remove('hover');
      // Panels closed/open change what is clickable: force a full check on the next tick.
      lastRefreshKey = null;
      return setInteractive(true);
    }
    // Um jogo em tela cheia cobre a tela: o overlay fica transparente E devolve o mouse
    // (senão o jogo perde o cursor). O título/intro continuam clicáveis (são .hitzone).
    if (canvas.style.visibility === 'hidden') {
      document.body.classList.remove('hover');
      lastRefreshKey = null;
      misses = 0;
      return setInteractive(false);
    }
    // Cursor in the same place with the same toggles: the hit result cannot have changed.
    // The 500 ms fallback re-checks anyway (panels moving without a cursor move).
    const now = performance.now();
    const key = `${Math.round(cursor?.x ?? -1)}|${Math.round(cursor?.y ?? -1)}|${Math.round((pet.x ?? 0) / 4)}|${Math.round((pet.y ?? 0) / 4)}|${Math.round(place.left)}|${Math.round(place.top)}|${config.clickThrough ? 1 : 0}|${appHidden ? 1 : 0}|${config.streamer ? 1 : 0}`;
    if (key === lastRefreshKey && now - lastRefreshAt < 500) return;
    lastRefreshKey = key;
    lastRefreshAt = now;
    const zone = !!cursor && [...document.querySelectorAll('.hitzone')].some((el) => {
      if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
      if (appHidden && !el.closest('.status-dock, .bag-dock, .toy-menu, .her-bag')) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;   // fechado/fora da tela
      return cursor.x >= r.left && cursor.x <= r.right && cursor.y >= r.top && cursor.y <= r.bottom;
    });
    const through = config.clickThrough && !app.hand;
    const hit = zone || (!!cursor && !through && !appHidden && (hitPet(cursor.x, cursor.y) || toys.hit(cursor.x, cursor.y) || ball.hit(cursor.x, cursor.y) || doll.hit(cursor.x, cursor.y) || crow.hit(cursor.x, cursor.y) || !!ball.held || !!app.hand));
    document.body.classList.toggle('hover', hit);
    if (config.streamer) return setInteractive(true);
    if (hit) {
      misses = 0;
      setInteractive(true);
    } else if (++misses >= 2) {
      setInteractive(false);
    }
  }

  // Cão de guarda do click-through: se o host perder o estado (janela recriada, foco
  // roubado, invoke falho), o overlay volta a engolir clique. Reafirma o estado "atravessa"
  // de tempos em tempos — nunca o contrário (ficar interativo é o estado seguro).
  setInterval(() => {
    if (interactiveWant !== false || window.__PET_COMBATE__) return;
    if (uiOpen() || press || canvas.style.visibility === 'hidden') return;
    setInteractive(false, true);
  }, 800);

  // O cursor saiu da janela: solta o mouse na hora (sem isso o overlay prende o clique
  // até o próximo poll do host, e o clique se perde).
  const releaseMouse = (e) => {
    if (e?.relatedTarget || !interactive || uiOpen() || press || window.__PET_COMBATE__) return;
    misses = 99;
    document.body.classList.remove('hover');
    setInteractive(false);
  };
  window.addEventListener('pointerout', releaseMouse);
  document.documentElement.addEventListener('mouseleave', releaseMouse);

  const startGrab = () => {
    if (!press || press.grabbing || app.intro?.busy) return;
    press.grabbing = true;
    if (press.button === 2) suppressContext = true;
    pet.grab(press.x, press.y);
    pet.drag(press.lx, press.ly);
    document.body.classList.add('grabbing');
  };

  // What she is doing, for the cafuné mode: it turns off when this changes. Idle wandering counts as one thing.
  function handKey() {
    const k = pet.actKey();
    return ['idle', 'walk', 'sit', 'emote', 'antic', 'react', 'hurt'].includes(k) ? 'idle' : k;
  }

  // Glove and red-hand cursors, drawn at 32 px from the pixel icons.
  for (const [k, n] of [['pat', 'glove'], ['slap', 'slapcur']]) {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(im, 0, 0, 32, 32);
      document.body.style.setProperty(`--cur-${k}`, `url(${c.toDataURL()})`);
    };
    im.src = icon(n);
  }

  // Cafuné mode: just moving the glove over her head rubs it, no click needed.
  let hover = null;
  function hoverRub(e) {
    const h = app.head;
    if (!h || pet.dead || !hitPet(e.clientX, e.clientY) || e.clientY > h.y + pet.P * 0.5 || Math.abs(e.clientX - h.x) > pet.P * 0.45) {
      hover = null;
      return;
    }
    if (!hover) hover = { x: e.clientX, y: e.clientY, dist: 0 };
    hover.dist += Math.hypot(e.clientX - hover.x, e.clientY - hover.y);
    hover.x = e.clientX;
    hover.y = e.clientY;
    if (hover.dist > 36) {
      hover.dist = 0;
      rubOnce();
    }
  }
  function rubOnce() {
    const at = pet.rubAt;
    pet.rub();
    if (pet.rubAt === at) return;
    sound.sfx('rub', 1.6);
    if (Math.random() < 0.3) setTimeout(() => sound.sfx('purr', 1), 90);
  }

  function slapHand(x, y) {
    sound.sfx('slap', 2.2);
    setTimeout(() => sound.sfx('ouch', 1.2), 120);
    const el = div('slap-hand', `<img src="${icon('slapcur')}" draggable="false">`);
    const s = Math.round(pet.P * 0.3);
    el.style.width = `${s}px`;
    el.style.left = `${x - s / 2}px`;
    el.style.top = `${y - s / 2}px`;
    setTimeout(() => el.remove(), 450);
  }

  // Dragging the GameBuddy screen moves it; dropped over the pet it goes behind it.
  function startScreenDrag(e) {
    if (e.button !== 0 || !screen.game || screen.el.style.display === 'none' || !screenAt) return false;
    const r = screen.el.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return false;
    const ox = e.clientX - screenAt.x;
    const oy = e.clientY - screenAt.y;
    screenDragging = true;
    const move = (ev) => {
      screenAt.x = Math.round(ev.clientX - ox);
      screenAt.y = Math.round(ev.clientY - oy);
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      const b = screen.el.getBoundingClientRect();
      const top = pet.y - pet.P;
      const over = b.right > pet.x - pet.P * 0.3 && b.left < pet.x + pet.P * 0.3 && b.bottom > top && b.top < pet.y;
      screen.el.classList.toggle('behind', over);
      screenDragging = false;
      screenOff = { dx: screenAt.x - pet.x, dy: screenAt.y - pet.y };
      app.setOption('gbScreenOffset', { dx: screenOff.dx / pet.P, dy: screenOff.dy / pet.P, behind: over });
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    return true;
  }

  // A click: cafuné. Double click: Quick Menu.
  let lastClick = null;
  const click = () => {
    if (app.intro?.onPetClick()) return;
    if (pet.unconscious) return;   // INCONSCIENTE: nenhum clique toca ela
    const now = performance.now();
    const dbl = !!lastClick && now - lastClick.t < 350 && Math.hypot(press.x - lastClick.x, press.y - lastClick.y) < 12;
    if (dbl) lastClick = null;
    // COMBAT_MODE: two clicks cancel the fight (the way out if it gets stuck).
    // (A batalha do cartucho NÃO cancela no duplo clique — acidentes de clique não derrubam ela.)
    if (pet.combatMode) {
      if (dbl && app.melee?.kind !== 'unknown') app.melee?.stop?.('cancelled');
      else lastClick = { t: now, x: press.x, y: press.y };
      return;
    }
    // Menu rápido agora é com a tecla X sobre ela (duplo clique só vale no combate).
    lastClick = { t: now, x: press.x, y: press.y };
    if (pet.toyPlay?.versus) return;
    pet.pat();
  };

  const endPress = () => {
    if (!press) return;
    clearTimeout(press.timer);
    if (press.grabbing) pet.release();
    else if (press.button === 0 && !press.rub) click();
    press = null;
    document.body.classList.remove('grabbing');
  };

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (suppressContext) {
      suppressContext = false;
      return;
    }
    if (pet.unconscious) return;   // INCONSCIENTE: nada de menu na pós-derrota
    if (!uiOpen() && !press && !app.intro?.busy && !pet.closeup && hitPet(e.clientX, e.clientY)) {
      // COMBAT_MODE: the menu (manual commands) is locked during the fight.
      if (pet.combatMode) return;
      sound.play('blip', { volume: 0.5 });
      menu.show(e.clientX, e.clientY);
    }
  });
  // Left button: click = cafuné, hold/drag = carry. Right button: drag = carry (keeps the menu open).
  window.addEventListener('pointerdown', (e) => {
    if (quick.open) {
      if (!quick.el.contains(e.target)) quick.close();
      return;
    }
    if (toys.popup && !toys.popup.contains(e.target)) toys.closeBag();
    if (toys.editing) {
      if (!e.target.closest?.('.toy, .hitzone')) toys.select(null);
      return;
    }
    if ((e.button !== 0 && e.button !== 2) || press || importDialog.open || app.gameOver) return;
    if (menu.open && e.target !== menu.backdrop && !(config.menuPinned && !menu.el.contains(e.target))) return;
    if (app.hand && e.button === 2) {
      app.setHand(null);
      suppressContext = true;
      return;
    }
    if (startScreenDrag(e)) return;
    if (e.target.closest?.('.hitzone')) return;
    // INCONSCIENTE: ela não responde a clique, arraste ou tapa — nem durante a recuperação.
    if (pet.unconscious) return;
    if (pet.closeup || !hitPet(e.clientX, e.clientY)) return;
    // COMBAT_MODE: the fight is not interrupted by petting, slapping or dragging.
    // Only the press is registered, so two clicks can cancel the fight.
    if (pet.combatMode) {
      press = { button: e.button, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, grabbing: false };
      return;
    }
    suppressContext = false;
    if (app.hand === 'slap' && e.button === 0) {
      slapHand(e.clientX, e.clientY);
      pet.slap();
      return;
    }
    if (app.hand === 'pat' && e.button === 0) {
      press = { button: 0, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, grabbing: false, rub: true, dist: 0 };
      return;
    }
    press = { button: e.button, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, grabbing: false };
    if (e.button === 0) press.timer = setTimeout(startGrab, 170);
    try {
      document.body.setPointerCapture(e.pointerId);
    } catch {}
  });
  window.addEventListener('pointermove', (e) => {
    if (app.hand === 'pat' && (!press || press.rub) && !uiOpen()) return hoverRub(e);
    if (!press) return;
    press.lx = e.clientX;
    press.ly = e.clientY;
    if (!press.grabbing && Math.hypot(press.lx - press.x, press.ly - press.y) > 5) startGrab();
    if (press.grabbing) {
      pet.drag(press.lx, press.ly);
      // Carried past the edge of this monitor onto another allowed one.
      const m = monitors[display];
      if (m && !config.streamer && (e.clientX < 0 || e.clientY < 0 || e.clientX >= innerWidth || e.clientY >= innerHeight)) {
        const gx = m[0] + e.clientX * devicePixelRatio;
        const gy = m[1] + e.clientY * devicePixelRatio;
        const j = monitors.findIndex((o, i) => i !== display && app.allowedMonitor(i) && gx >= o[0] && gx < o[0] + o[2] && gy >= o[1] && gy < o[1] + o[3]);
        if (j >= 0) {
          endPress();
          switchDisplay(j, { atCursor: true });
        }
      }
    }
  });
  window.addEventListener('pointerup', endPress);
  window.addEventListener('pointercancel', endPress);
  window.addEventListener('keydown', (e) => {
    // Quick Menu: mouse over the Persocon + X (replaces the old click gesture).
    if ((e.key === 'x' || e.key === 'X') && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const tgt = e.target;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (cursor && hitPet(cursor.x, cursor.y) && !pet.closeup && !pet.combatMode && !app.intro?.busy) {
        e.preventDefault();
        if (quick.open) quick.close();
        else if (!uiOpen()) quick.show(cursor.x, cursor.y);
        return;
      }
    }
    // Porta do menu de debug (só com o debug ligado): Ctrl+Shift+D abre as Opções no Debug.
    if (config.debug && e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      if (menu.open && menu.category === 'opcoes') return menu.close();
      app.openMenu('opcoes');
      setTimeout(() => menu.el?.querySelector('.group.debug')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 80);
      return;
    }
    if (pet.chase?.qte && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (!e.repeat && qteInput && !qteInput.hostKeys) qteKey(e.key === 'ArrowLeft' ? 'left' : 'right');
      return;
    }
    if (e.key === 'Escape') {
      if (quick.open) return quick.close();
      if (toys.editing) return toys.stopEdit();
      if (app.hand) app.setHand(null);
      if (toys.stopVersus()) return;
      menu.close();
    }
  });
  window.addEventListener('blur', () => {
    quick.close();
    if (menu.open && !importDialog.open && !config.menuPinned) menu.close();
  });

  // ---------- monitors ----------
  let monitors = [];
  let display = config.display ?? 0;
  let arrival = null;

  function switchDisplay(i, how) {
    if (i === display || arrival) return;
    arrival = { display: i, ...how };
    config.display = i;
    save({ display: i });
    api.setDisplay(i).catch(() => {});
  }

  // Multi-monitor walking disabled for now (Opções → Monitor picks a single screen).
  pet.onScreenEdge = () => false;

  function arrive(a) {
    if (a.atCursor && cursor) {
      pet.x = clamp(cursor.x, pet.P * 0.3, world.width - pet.P * 0.3);
      pet.y = clamp(cursor.y + pet.P * 0.8, pet.P * 1.2, world.height);
    } else if (a.edge) {
      pet.dir = a.edge;
      pet.x = a.edge > 0 ? pet.P * 0.3 : world.width - pet.P * 0.3;
      pet.y = (world.surfaces[0]?.y ?? world.height) - 1;
    } else return pet.restart();
    pet.fall(a.edge ? a.edge * pet.walkSpeed : 0, 0);
  }

  // ---------- world ----------
  api.onWorld((raw) => {
    monitors = raw.monitors || [];
    display = raw.display ?? display;
    const s = devicePixelRatio;
    const data = {
      ...raw,
      width: raw.width / s,
      height: raw.height / s,
      windows: raw.windows.map((w) => ({ ...w, x: w.x / s, y: w.y / s, w: w.w / s, h: w.h / s })),
    };
    cursor = raw.cursor ? { x: raw.cursor[0] / s, y: raw.cursor[1] / s } : null;
    pet.cursor = cursor;
    // Transient Do Not Disturb: match the foreground app against the configured list.
    const dndTerms = config.dndEnabled === false ? [] : String(config.dndApps || '')
      .split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const dndNow = dndTerms.length > 0 && !!raw.active_app && dndTerms.some((t) => raw.active_app.includes(t));
    if (dndNow !== app.dndActive) {
      app.dndActive = dndNow;
      sound.setDnd(dndNow);
    }
    if (raw.keys && qteInput) {
      qteInput.hostKeys = true;
      if (raw.keys[0]) qteKey('left');
      if (raw.keys[1]) qteKey('right');
    }
    const moved = world.update(data);
    if (!config.streamer) watch.onWorld(moved);
    if (arrival && display === arrival.display) {
      const a = arrival;
      arrival = null;
      arrive(a);
    } else if (!arrival && !config.streamer && monitors.length > 1 && !app.allowedMonitor(display)) {
      const first = monitors.findIndex((m, i) => app.allowedMonitor(i));
      if (first >= 0) switchDisplay(first, { spawn: true });
    }
    pet.onWorldUpdate(moved);
    // While watching a video the pet stays visible over fullscreen players too.
    canvas.style.visibility = data.fullscreen && pet.activity !== 'watch' ? 'hidden' : 'visible';
    if (config.debug) drawDebug(debugCanvas, world, true);
    refreshInteractive();
  });

  // ---------- Streamer Mode ----------
  // Opaque chroma-key window by default (OBS Window Capture). Transparent layered WebView2
  // often captures as black or freezes the stream on Windows 10/11.
  const STREAMER_BG = { verde: '#00ff00', azul: '#0000ff', magenta: '#ff00ff' };
  const streamerSolid = () => !!STREAMER_BG[config.streamerBg || 'verde'];
  // Switching swaps the window for a new one (a new window drops OBS's capture border), so this
  // page is about to close: everything is saved first.
  function applyStreamer(switching = true) {
    const on = !!config.streamer;
    if (on && !config.streamerBg) config.streamerBg = 'verde';
    const bg = on ? (STREAMER_BG[config.streamerBg] || 'transparent') : '';
    document.body.classList.toggle('streamer', on);
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    const solid = streamerSolid();
    const modeChanged = on !== streamerOn;
    const solidChanged = solid !== streamerSolidOn;
    streamerOn = on;
    streamerSolidOn = solid;
    menu.close();
    misses = 99;
    refreshInteractive();
    // Only CSS change (same opaque/transparent mode): no window rebuild.
    if (!modeChanged && !(on && solidChanged)) return;
    // Startup: the native window already matches config — CSS only. Calling setStreamer(true)
    // while already in Streamer Mode used to rebuild the window in a loop and crash the app.
    if (!switching) return;
    save({ streamer: on, streamerBg: config.streamerBg || 'verde' });
    Promise.all([flushConfig(), game.persist()]).then(() => api.setStreamer(on)).catch(() => {});
  }
  let streamerOn = false;
  let streamerSolidOn = streamerSolid();
  api.onStreamer((on) => on !== !!config.streamer && app.setOption('streamer', on));

  // ---------- drag & drop files onto the pet ----------
  const dropHint = () => translate('Solte imagem, MIDI (.mid) ou modelo (.vrm/.glb/.zip)');
  const sayDrop = (pt) => app.speech?.say(translate(pt), 3);
  const skinSizeOk = (dataUrl) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width === 64 && (img.height === 64 || img.height === 32));
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
  const readAs = (file, as) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    if (as === 'url') r.readAsDataURL(file);
    else r.readAsArrayBuffer(file);
  });
  const imageExt = (e) => ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(e);
  const showImageDialog = async (data, name) => new ImageDropDialog(app).show(data, name, await skinSizeOk(data));
  let lastDomDrop = 0;
  app.handleDropPath = async (path) => {
    const name = String(path || '').split(/[\\/]/).pop() || '';
    const ext = (name.split('.').pop() || '').toLowerCase();
    try {
      if (ext === 'mid' || ext === 'midi') {
        const data = await api.readFileData(path);
        const buf = await (await fetch(data)).arrayBuffer();
        app.toys?.fun?.storeMidi(name.replace(/\.midi?$/i, ''), buf);
        sayDrop('Música importada! Ela vai tocar.');
      } else if (['vrm', 'glb', 'zip'].includes(ext)) {
        importDialog.openPath(path);
        sayDrop('Modelo aberto para importação.');
      } else if (imageExt(ext)) {
        const data = await api.readFileData(path);
        await showImageDialog(data, name.replace(/\.[^.]+$/, ''));
      } else {
        throw new Error('ext');
      }
    } catch {
      app.sound?.play?.('cancel', { volume: 0.5 });
      sayDrop('Arquivo não suportado.');
    }
  };
  // Tauri 2 gives real local paths (needed by inspect_model / read_file_data).
  api.onFileDropHover?.(() => interact.fileDrop(true, dropHint()));
  api.onFileDropCancel?.(() => interact.fileDrop(false));
  api.onFileDrop?.((payload) => {
    if (Date.now() - lastDomDrop < 600) return;
    interact.fileDrop(false);
    const paths = Array.isArray(payload) ? payload : payload?.paths;
    if (paths?.[0]) app.handleDropPath(paths[0]);
  });
  api.onFileDropOver?.(() => interact.fileDrop(true, dropHint()));
  // Browser-level fallback (also covers drag highlighting when Tauri's drop is off).
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  window.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    interact.fileDrop(true, dropHint());
  }, true);
  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) interact.fileDrop(false);
  }, true);
  window.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    interact.fileDrop(false);
    lastDomDrop = Date.now();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    try {
      if (ext === 'mid' || ext === 'midi') {
        app.toys?.fun?.storeMidi(file.name.replace(/\.midi?$/i, ''), await readAs(file, 'buf'));
        sayDrop('Música importada! Ela vai tocar.');
      } else if (imageExt(ext)) {
        const data = await readAs(file, 'url');
        await showImageDialog(data, file.name.replace(/\.[^.]+$/, ''));
      } else {
        // Models need a local path: Tauri's native drop event handles those.
        sayDrop('Arquivo não suportado.');
      }
    } catch {
      app.sound?.play?.('cancel', { volume: 0.5 });
      sayDrop('Arquivo não suportado.');
    }
  }, true);
  api.onClickThrough?.(() => app.setOption('clickThrough', !config.clickThrough));
  if (config.streamer) applyStreamer(false);
  setLang(config.lang);
  setSex(game.profile.sex);
  app.setSex = (s) => { game.profile.sex = s; game.changed(); setSex(s); };

  // ---------- debug log ----------
  // Action changes (at most one line per second, counting the skipped ones) and a heartbeat every 60 s.
  logInfo('app', `início · modelo ${modelKey()} · dpr=${devicePixelRatio} tela=${innerWidth}x${innerHeight} · idioma ${config.lang || 'pt'}`);
  let logState = '';
  let logStateAt = 0;
  let logSkipped = 0;
  let fpsFrames = 0;
  let fpsFrom = performance.now();
  let beatAt = performance.now();
  const r0 = (v) => (Number.isFinite(v) ? Math.round(v) : String(v));
  setInterval(() => {
    if (!logEnabled()) {
      fpsFrames = 0;
      fpsFrom = beatAt = performance.now();
      return;
    }
    const now = performance.now();
    const state = `${pet.mode}/${pet.action}${pet.toyPlay ? `:${pet.toyPlay.id}` : ''}`;
    if (state !== logState) {
      if (now - logStateAt >= 1000) {
        logInfo('pet', `ação ${logState || '-'} → ${state}${logSkipped ? ` (+${logSkipped} trocas)` : ''}`);
        logState = state;
        logStateAt = now;
        logSkipped = 0;
      } else logSkipped++;
    }
    if (now - beatAt < 60000) return;
    beatAt = now;
    const fps = fpsFrames / Math.max(0.001, (now - fpsFrom) / 1000);
    fpsFrames = 0;
    fpsFrom = now;
    const mem = performance.memory ? ` · mem ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB` : '';
    const stats = Object.entries(pet.stats).map(([k, v]) => `${k}=${r0(v)}`).join(' ');
    logInfo('heartbeat', `${state} · pos (${r0(pet.x)}, ${r0(pet.y)})${pet.activity ? ` · ${pet.activity}` : ''} · ${stats} afeto=${r0(pet.affection)} moedas=${game.coins}`
      + ` · fps ${fps.toFixed(1)}${offscreen ? ' (minimizado)' : ''}${mem}${menu.open ? ' · menu aberto' : ''}`);
  }, 250);

  // ---------- footsteps ----------
  let stepTimer = 0;
  let lastX = null;
  let lastY = null;
  function footsteps(dt) {
    const dx = lastX === null ? 0 : Math.abs(pet.x - lastX);
    const dy = lastY === null ? 0 : Math.abs(pet.y - lastY);
    lastX = pet.x;
    lastY = pet.y;
    if (config.footsteps !== true || isFocus(config, app)) return;
    const walking = pet.mode === 'ground' && ['walk', 'run', 'chase'].includes(pet.action) && dx > 0.05;
    const climbing = pet.mode === 'wall' && (pet.action === 'climbUp' || pet.action === 'climbDown') && dy > 0.05;
    if (!walking && !climbing) {
      stepTimer = 0.08;
      return;
    }
    stepTimer -= dt;
    if (stepTimer > 0) return;
    const k = config.speedScale ?? 1;
    if (climbing) {
      stepTimer = 0.5 / k;
      sound.play('footstep', { volume: 0.14, rate: 0.8, vary: 0.1 });
    } else if (pet.action === 'walk') {
      stepTimer = 0.42 / k;
      sound.play('footstep', { volume: 0.2, vary: 0.12 });
    } else {
      stepTimer = 0.26 / k;
      sound.play('footstep', { volume: 0.28, rate: 1.1, vary: 0.12 });
    }
  }

  // ---------- frame loop ----------
  // How much each negative status weighs on the visual "debuff level" (allocated once).
  const DEBUFF_WEIGHT = { lesao:3, nausea:2.5, fome:2, desidratacao:2, prisao:1.5, exausta:1.2, gripe:1.2, estressada:1.5, abatida:1, suja:0.8, tedio:0.8 };
  let last = performance.now();
  let lastRaf = last;
  let offscreen = false;
  let calmTop = null;
  let lastHasDebuff = null;
  let lastDebuffLevel = -1;
  let menuRect = null;
  let menuRectT = 0;
  const step = (now) => {
    // rAF timestamps are the frame start, so they can be older than the catch-up timer's clock.
    if (now < last) now = last;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    pet.update(dt);
    // Negative statuses: occasionally complain; subtle visual class on the body.
    // Only touch the DOM when the state actually changed (the body style is expensive to restyle).
    const hasDebuff = Object.keys(pet.debuffs || {}).length > 0;
    if (hasDebuff !== lastHasDebuff) {
      lastHasDebuff = hasDebuff;
      document.body.classList.toggle('pet-debuffed', hasDebuff);
    }
    const level = Object.keys(pet.debuffs || {}).reduce((a,id)=>a+(DEBUFF_WEIGHT[id]||1),0);
    if (level !== lastDebuffLevel) {
      lastDebuffLevel = level;
      document.body.style.setProperty('--debuff-level', String(level || 0));
    }
    if (hasDebuff) {
      pet.complainT = (pet.complainT || 0) + dt;
      // Rolled once per complaint, not every frame: the wait is uniform 18s..43s.
      if (pet.complainNext == null) pet.complainNext = 18 + Math.random() * 25;
      if (!pet.offstage && !pet.dead && !pet.combatMode && !app.melee?.active && pet.complainT >= pet.complainNext) {
        pet.complainT = 0;
        pet.complainNext = 18 + Math.random() * 25;
        const en = config.lang === 'en';
        const lines = en
          ? ['I feel awful...', 'Something is wrong with me...', 'I do not feel well...', 'Ouch... I hurt...']
          : ['Tô me sentindo mal...', 'Tem algo de errado comigo...', 'Não estou me sentindo bem...', 'Ai... tô dolorida...'];
        speech.say(lines[Math.floor(Math.random() * lines.length)], 3.2);
      }
    } else {
      pet.complainT = 0;
      pet.complainNext = null;
    }
    closeup.update(dt, offscreen || appHidden);
    const tp = pet.toyPlay;
    const holdingToy = tp?.hold && tp.t >= tp.holdFrom;
    // Arcade (facing the machine) and other toys can raise arms via tp.reach without a hold sprite.
    const reachToy = holdingToy || (tp?.reach != null && tp.picked);
    view.setArmPose?.(tp?.armPose && !pet.eating ? tp.armPose : null);
    view.setReach(pet.eating ? pet.eating.raise : pet.action === 'qte' ? 0.7 + 0.2 * Math.sin(now / 70) : reachToy ? tp.reach ?? (tp.id === 'gameboy' ? 0.3 : 0.15) : pet.hook ? 0.55 : pet.carry === 'mic' ? 0.5 : null);
    modes.update(dt);
    app.intro?.update(dt);
    view.mood = pet.stats.mood;
    view.update(dt);
    const shown = pet.offstage ? 'none' : '';
    if (canvas.style.display !== shown) canvas.style.display = shown;
    if (pet.x !== null) {
      place.left = Math.round(pet.x + (pet.shiftX || 0) - view.feetX);
      const zoom = pet.zoom || 1;
      place.top = Math.round(pet.y - view.feetY - (pet.lift || 0) + (pet.bodyY || 0) + (zoom - 1) * pet.P * 0.55);
      place.ox = view.feetX + pet.tiltPivot.x;
      place.oy = view.feetY + pet.tiltPivot.y;
      place.tilt = Math.abs(pet.tilt) < 0.002 ? 0 : pet.tilt;
      // Squash & stretch from the procedural antics (antics.js), around the feet.
      const sx = zoom * (pet.squash?.x ?? 1);
      const sy = zoom * (pet.squash?.y ?? 1);
      canvas.style.transformOrigin = `${place.ox}px ${place.oy}px`;
      canvas.style.transform = `translate(${place.left}px, ${place.top}px) rotate(${place.tilt}rad)${sx !== 1 || sy !== 1 ? ` scale(${sx.toFixed(3)}, ${sy.toFixed(3)})` : ''}`;

      // Point just above the head, rotated with the body while it swings.
      const px = view.bounds.centerX - pet.tiltPivot.x;
      const py = -view.bounds.top - 4 - pet.tiltPivot.y;
      const c = Math.cos(place.tilt);
      const s = Math.sin(place.tilt);
      const head = {
        x: pet.x + pet.tiltPivot.x + px * c - py * s,
        y: pet.y + pet.tiltPivot.y + px * s + py * c,
      };
      // Anchor for speech/request balloons: no tilt, and only big height changes (sitting, lying)
      // move it, never the bobbing of each step or swing.
      const top = view.bounds.top + 4;
      if (calmTop === null) calmTop = top;
      else if (Math.abs(top - calmTop) > pet.P * 0.08) calmTop += (top - calmTop) * Math.min(1, dt * 5);
      const calm = { x: pet.x, y: pet.y - (pet.lift || 0) + (zoom - 1) * pet.P * 0.55 - calmTop * zoom };
      const hidden = offscreen || appHidden || canvas.style.visibility === 'hidden';
      app.head = head;
      app.headCalm = calm;
      if (app.hand === 'pat' && handKey() !== app.handKey) app.setHand(null);
      const quiet = hidden || !!pet.closeup;
      emoticons.update(dt, head, pet.mode === 'ground' && pet.action === 'sleep', quiet);
      updateFood(hidden);
      updateQte(head, hidden);
      updateOverlays(dt, head, hidden, calm);
      toys.update(dt, hidden);
      dummy.update(dt);
      unknown.update(dt, hidden);
      tvWatch.update(dt, hidden);
      ball.update(dt, hidden);
      doll.update(dt, hidden);
      crow.update(dt, hidden);
      minigames.update(dt, hidden);
      antics.update(dt, hidden);
      interact.update(dt, hidden);
      if (!hidden) {
        desktopGames.update(dt);
        watch.update(dt);
      }
      care.update(dt, hidden);
      rewards.update(dt, hidden);
      app.pomodoro.update(dt);
      app.weather.update(dt, hidden, canvas.style.visibility === 'hidden');
      app.trio.update(dt);
      updateDock();
      speech.update(dt, calm, quiet);
      fx.update(dt, head, quiet);
      footsteps(dt);

      if (pet.chase && !pet.chase.qte && !hidden) {
        const secs = Math.ceil(pet.chase.t);
        if (secs !== hudSecs) {
          hudSecs = secs;
          const label = `🎾 Pega o mouse! ${secs}s`;
          hud.textContent = config.lang === 'en' ? translate(label) : label;
        }
        hud.style.display = 'block';
        const hx = pet.x - hud.offsetWidth / 2;
        const below = pet.y + 6;
        const hy = below + hud.offsetHeight < innerHeight ? below : head.y - hud.offsetHeight - 40;
        hud.style.transform = `translate(${Math.round(Math.min(Math.max(4, hx), innerWidth - hud.offsetWidth - 4))}px, ${Math.round(Math.max(2, hy))}px)`;
      } else {
        hudSecs = -1;
        hud.style.display = 'none';
      }

      // The menu turns see-through while the pet is behind it.
      if (menu.open) {
        // Measuring forces a layout sync: the rect only moves when the menu itself moves, so
        // refresh every ~10 frames instead of 60 times per second.
        if (!menuRect || menuRectT-- <= 0) {
          menuRect = menu.el.getBoundingClientRect();
          menuRectT = 10;
        }
        const r = menuRect;
        const half = pet.P * 0.35;
        const top = pet.y - Math.max(view.bounds.top, pet.P * 0.5);
        const behind = pet.x + half > r.left && pet.x - half < r.right && pet.y > r.top && top < r.bottom && !hidden;
        menu.el.classList.toggle('ghost', behind);
      } else menuRect = null;
    }
  };
  // Safety net: an action whose owner is gone (or a broken timer) would leave the pet standing
  // still forever; after 2 s it just picks something new.
  let stuckT = 0;
  const watchdog = (dt) => {
    if (pet.x !== null && (!Number.isFinite(pet.x) || !Number.isFinite(pet.y))) {
      logWarn('watchdog', `posição inválida (${pet.x}, ${pet.y}) em "${pet.action}"`);
      const floor = pet.world.surfaces.find((s) => s.id === 'floor') || pet.world.surfaces[0];
      antics.stop(false);
      pet.endToy?.(true);
      pet.hook = null;
      pet.goal = null;
      pet.x = pet.world.width / 2;
      if (floor) pet.land(floor);
      if (pet.mode === 'ground' && !pet.dead) pet.chooseNext();
      return;
    }
    const a = pet.action;
    const free = !minigames.active && !pet.mini && !doll.brain?.duo && !crow.duo;
    const orphan = pet.mode === 'ground' && !pet.dead && !pet.paused && !pet.leaving && (Number.isNaN(pet.timer)
      || (a === 'antic' && !antics.cur)
      || (a === 'toy' && !pet.toyPlay)
      || (a === 'eat' && !pet.eating && !pet.meals.length)
      || (a === 'ball' && !pet.ballPlay)
      || (a === 'hook' && !pet.hook)
      || (a === 'goto' && !pet.goal)
      || ((a === 'chase' || a === 'qte') && !pet.chase)
      || (a === 'mini' && free)
      || (a === 'idle' && pet.timer === Infinity && free));
    stuckT = orphan ? stuckT + dt : 0;
    if (stuckT < 2) return;
    stuckT = 0;
    logWarn('watchdog', `presa em "${a}" (timer ${pet.timer}) · toy=${pet.toyPlay?.id ?? '-'} goal=${pet.goal ? 'sim' : '-'}`);
    pet.chooseNext();
  };
  let errAt = 0;
  const safeStep = (now) => {
    try {
      step(now);
      watchdog(Math.max(0, Math.min(0.05, (now - lastStep) / 1000)));
    } catch (err) {
      console.error(err);
      logError('loop', `${pet.mode}/${pet.action}: ${err?.stack || err}`);
      if (performance.now() - errAt > 5000) {
        errAt = performance.now();
        // Whatever broke mid-action: start over from a clean state.
        try {
          antics.stop(false);
          pet.endToy?.(true);
          if (pet.mode === 'ground' && !pet.dead) pet.chooseNext();
        } catch {}
      }
    }
    lastStep = now;
  };
  let lastStep = performance.now();
  const frame = (now) => {
    lastRaf = performance.now();
    offscreen = false;
    fpsFrames++;
    requestAnimationFrame(frame);
    safeStep(now);
  };
  requestAnimationFrame(frame);
  if (window.__PET_COMBATE__) {
    pet.offstage = false;
  } else {
    startFlow().catch((err) => {
      logError('title', String(err?.stack || err));
      pet.offstage = false;
    });
  }
  // Debug already on from a previous session: open the console (it stays until closed by hand).
  if (config.debug) setTimeout(() => app.debugConsole.show(), 0);
  // Minimized (Streamer Mode) the page gets no animation frames: keeps the pet living on a timer,
  // catching up on the time that passed.
  setInterval(() => {
    const now = performance.now();
    if (now - lastRaf < 500) return;
    offscreen = true;
    let left = Math.min(120, (now - last) / 1000);
    while (left > 0.001) {
      const d = Math.min(0.05, left);
      safeStep(last + d * 1000);
      left -= d;
    }
  }, 250);
  return app;
}
