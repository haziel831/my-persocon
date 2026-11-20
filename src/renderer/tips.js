// Contextual tips: each shows once. Demo gets more guidance; player can turn them off anytime.
import { DEMO } from './edition.js';
import { HER_BAG } from './game.js';

const DAYS = DEMO ? 30 : 7;

// [id, when(ctx), pt, en]
const TIPS = [
  ['menu', (c) => c.t > 18,
    'Botão direito em {n} abre o menu: Ações, Brincar, Shop, Inventário e Opções.',
    'Right click {n} to open the menu: Actions, Play, Shop, Inventory and Options.'],
  ['dock', (c) => c.t > 35,
    'O painel de status no canto mostra Fome, Energia e o que ela quer. Clique nele para abrir o menu.',
    'The status panel in the corner shows Hunger, Energy and what she wants. Click it to open the menu.'],
  ['alwaysTop', (c) => c.t > 50,
    'Se {n} sumir atrás do Discord ou de outra janela: menu → botão ⬆ (Sempre no topo), ou Opções.',
    'If {n} hides behind Discord or another window: menu → ⬆ button (Always on top), or Options.'],
  ['hunger', (c) => c.s.hunger < 55,
    'A Fome de {n} está baixando. Menu → Ações → Alimentar (ou Shop → comprar comida).',
    "{n}'s Hunger is dropping. Menu → Actions → Feed (or Shop → buy food)."],
  ['thirst', (c) => (c.s.thirst ?? 100) < 55,
    'Sede baixa: dê uma bebida em Ações → Alimentar (filtre bebidas).',
    'Low Thirst: give a drink in Actions → Feed (pick drinks).'],
  ['pat', (c) => c.t > 90,
    'Clique em {n} para cafuné: sobe Humor e Afeição. Em Ações dá para ativar o modo cafuné (segurar e esfregar).',
    'Click {n} for a head pat: Mood and Affection go up. In Actions you can enable pat mode (hold and rub).'],
  ['wish', (c) => c.request || (c.wishes?.length > 0),
    'Quando aparece um balãozinho, ela está pedindo algo. Atender rende mais Afeição. Pedidos ficam no status por algumas horas.',
    'When a little balloon appears, she is asking for something. Fulfilling it gives more Affection. Wishes stay on the status for a few hours.'],
  ['herBag', (c) => HER_BAG && c.t > 140,
    '{n} tem inventário próprio (mochila). Em Inventário, "Dar a ela" guarda o item na bolsa dela. Ícone da mochila no status também abre.',
    '{n} has her own inventory (bag). In Inventory, "Give to her" stores the item in her bag. The bag icon on the status opens it too.'],
  ['jam', (c) => c.activity === 'jam' || c.t > 200,
    'Ouvir Música (Brincar → Ouvir Música): ela dança a música que está tocando no PC. Não dura para sempre — ela volta a fazer outras coisas sozinha.',
    'Listen to Music (Play → Listen to Music): she dances to the music playing on the PC. It does not last forever — she goes back to other things on her own.'],
  ['watch', (c) => c.activity === 'watch' || c.t > 260,
    'Modo Assistir (Brincar → Assistir): clique onde está o vídeo; ela senta e assiste. Use isso quando ela pedir "assistir" ou "cinema".',
    'Watch mode (Play → Watch): click where the video is; she sits and watches. Use this when she asks to "watch" or for a "movie".'],
  ['drag', (c) => c.t > 180,
    'Segure e arraste {n} para levá-la a qualquer lugar, inclusive para cima das janelas.',
    'Hold and drag {n} to take her anywhere, including on top of windows.'],
  ['monitor', (c) => c.mons > 1 && c.t > 220,
    'Vários monitores: em Opções → Monitor escolha em qual tela ela fica (por enquanto só um de cada vez).',
    'Several monitors: in Options → Monitor pick which screen she stays on (only one at a time for now).'],
  ['hygiene', (c) => (c.s.hygiene ?? 100) < 45,
    'Higiene baixa! Ações → Dar banho, ou coloque uma Banheira (Shop → Mobília).',
    'Low Hygiene! Actions → Give a bath, or place a Bathtub (Shop → Furniture).'],
  ['energy', (c) => c.s.energy < 35,
    'Energia baixa: deixe {n} dormir (Ações → Colocar para dormir) ou ela desmaia de cansaço.',
    'Low Energy: let {n} sleep (Actions → Put to sleep) or she may faint from exhaustion.'],
  ['coins', (c) => c.t > 280 && c.coins >= 200,
    'Moedas (¥) vêm com o tempo, lootboxes e gacha/slot. Na Demo a Shop tem menos itens — o resto fica na versão completa.',
    'Coins (¥) come with time, lootboxes and gacha/slot. The Demo Shop has fewer items — the rest is in the full version.'],
  ['furniture', (c) => c.t > 360,
    'Comprou mobília? Coloque pelo Inventário e use Ações → Editar mobília para arrastar, girar e espelhar.',
    'Bought furniture? Place it from Inventory and use Actions → Edit furniture to drag, rotate and flip.'],
  ['quick', (c) => c.t > 400,
    'Clique 2× no status fixo para o menu rápido (foco, volume…).',
    'Double click the pinned status for the quick menu (focus, volume…).'],
  ['minigame', (c) => c.t > 480,
    'Em Brincar há minijogos. Na Demo alguns estão com cadeado — desbloqueiam na versão completa ou com mais Afeição.',
    'Play has minigames. In the Demo some are locked — they unlock in the full version or with more Affection.'],
  ['tray', (c) => c.t > 560,
    'Ícone na bandeja do Windows: ocultar o app, Streamer Mode ou sair.',
    'Windows tray icon: hide the app, Streamer Mode or quit.'],
  ['options', (c) => c.t > 640,
    'Opções está completa na Demo (tamanho, sons, monitores…). Só Shop e alguns minijogos são cortados.',
    'Options is fully available in the Demo (size, sounds, monitors…). Only the Shop and some minigames are cut.'],
  ['save', (c) => c.t > 800,
    'O progresso da Demo salva separado da versão completa. Em Opções dá para gerar relatório de bug.',
    'Demo progress saves separately from the full version. In Options you can make a bug report.'],
];

export function startTips(app, busy) {
  const { pet, game } = app;
  let t = 0;
  let quietUntil = 0;
  let card = null;
  const seen = () => (game.profile.tips ||= []);
  const off = () => !!game.profile.tipsOff;
  const expired = () => !DEMO && Date.now() - (game.profile.born || 0) > DAYS * 864e5;
  const done = () => off() || expired() || seen().length >= TIPS.length;
  const close = (turnOff) => {
    card?.remove();
    card = null;
    if (turnOff) {
      game.profile.tipsOff = true;
      game.changed?.();
    }
  };
  const show = ([id, , pt, en]) => {
    if (!seen().includes(id)) {
      seen().push(id);
      game.changed?.();
    }
    const isEn = app.config.lang === 'en';
    const text = (isEn ? en : pt).replace('{n}', app.config.name || 'Persocon').replace('{c}', Math.floor(game.coins));
    card = document.createElement('div');
    card.className = 'tip-card hitzone';
    card.dataset.noI18n = '';
    card.innerHTML = `<b>💡 ${isEn ? 'Tip' : 'Dica'}</b><p></p><div><button class="tip-off">${isEn ? "Don't show tips" : 'Não mostrar dicas'}</button><button class="tip-ok">OK</button></div>`;
    card.querySelector('p').textContent = text;
    card.querySelector('.tip-ok').onclick = () => close();
    card.querySelector('.tip-off').onclick = () => close(true);
    document.body.appendChild(card);
    const shown = card;
    setTimeout(() => { if (card === shown) close(); }, DEMO ? 22000 : 16000);
  };
  const timer = setInterval(() => {
    if (off() || expired()) { if (!card) clearInterval(timer); return; }
    if (pet.offstage || app.intro || pet.dead || pet.powerOff || game.profile.booted === false) return;
    // Dica é coisa da área de trabalho: em combate ela fica quieta.
    if (app.melee?.active || pet.combatMode) return;
    t += 2;
    if (card || t < quietUntil || busy()) return;
    const ctx = {
      t,
      s: pet.stats,
      coins: game.coins,
      request: !!pet.request,
      wishes: pet.wishes,
      activity: pet.activity,
      mons: app.monitors?.()?.length || 1,
    };
    const tip = TIPS.find(([id, when]) => !seen().includes(id) && when(ctx));
    if (!tip) return;
    show(tip);
    quietUntil = t + (DEMO ? 55 : 75);
  }, 2000);
}

/** Reset tips so they can show again (Opções). */
export function resetTips(game) {
  game.profile.tipsOff = false;
  game.profile.tips = [];
  game.changed?.();
}
