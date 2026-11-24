// Catálogo: opções/presets padrão, temas e utilitários de busca da Loja/Inventário.
// Extraído de ui.js para manter o painel menor e o catálogo fácil de estender.


// Defaults for options that changed after release (applied once to old configs, and by
// "Restaurar padrões").
export const DEFAULT_OPTS = {
  emoticonScale: 0.75, emoticonOffsetX: -26, emoticonOffsetY: 10,
  volume: 0.3, gbVolume: 0.7, footsteps: false, dayRoutine: true, weather: 'auto', dndEnabled: true, dndApps: '',
  emotesWithMe: true, // face reaction emotes during direct PTT/chat-box conversations
};

// Personality presets. `approach`/`screenHit`/`noAttention` are kept as requested aliases; the
// live equivalents used by the game are `closeupAuto`, `askAttention` and `anticsOff`.
export const PERSONALITY_PRESETS = [
  {
    id: 'calma', icon: '💤', name: 'Calma',
    desc: 'Mais sentada, soneca e calma. Sem roubar cursor, sem mexer nos ícones.',
    patch: {
      actionWeights: { sit: 30, sleep: 18, idle: 30, run: 0, walk: 20, emote: 6, hop: 2 },
      cursorSteal: false, iconPlay: false, screenHit: false, askAttention: false,
      emoticonRate: 0.7, anticsOff: true, focus: false, volume: 0.3, footsteps: false,
    },
  },
  {
    id: 'travessa', icon: '🎾', name: 'Travessa',
    desc: 'Muita energia, emotes e passeios. Rouba o cursor e brinca com os ícones.',
    patch: {
      actionWeights: { walk: 60, run: 22, emote: 30, sit: 6, idle: 12, sleep: 3 },
      approach: true, closeupAuto: true, cursorSteal: true, iconPlay: true,
      askAttention: true, screenHit: true, emoticonRate: 1.3, anticsOff: false, focus: false, volume: 0.3, footsteps: true,
    },
  },
  {
    id: 'estudo', icon: '📖', name: 'Estudo / Trabalho',
    desc: 'Companhia discreta: sem pedir atenção nem aprontar, passos e volume baixos.',
    patch: {
      noAttention: true, askAttention: false, closeupAuto: false, anticsOff: true,
      cursorSteal: false, iconPlay: false, screenHit: false, footsteps: false,
      volume: 0.12, emoticonRate: 0.5, focus: true,
    },
  },
  {
    id: 'streamer', icon: '🎥', name: 'Streamer',
    desc: 'Expressiva e ativa, mas deixa o mouse em paz para o jogo ou a gravação.',
    patch: {
      actionWeights: { emote: 34, walk: 50, run: 18, sit: 6, idle: 14, sleep: 3 },
      emoticons: true, cursorSteal: false, iconPlay: false, anticsOff: false, focus: false, volume: 0.3, footsteps: false,
    },
  },
];

export const THEMES = [
  ['padrao', 'Padrão', ['#1d2130', '#7aa2ff']],
  ['pixel', 'Pixel art', ['#2b2b45', '#ffcc4d']],
  ['retro', 'Retrô', ['#f1e4c3', '#c8553d']],
  ['synthwave', 'Synthwave', ['#1a0b2e', '#ff4fd8']],
  ['gameboy', 'GameBuddy', ['#0f380f', '#8bac0f']],
  ['gameboy-light', 'GameBuddy Light', ['#0a3d3a', '#38c7b2']],
  ['gameboy-color', 'GameBuddy Color', ['#3b2a6b', '#ffd23f']],
  ['gameboy-advance', 'GameBuddy Advance', ['#4b3f9e', '#9fd3ff']],
  ['dark', 'Dark', ['#121216', '#e8e8f0']],
  ['light', 'Light', ['#f4f5f8', '#3a6df0']],
  ['gamegear', 'GameGlow', ['#1e1e24', '#5ac8ff']],
  ['psp', 'PlayPocket 3000', ['#e9ecf2', '#14141e']],
  ['resourcepack', 'Resourcepack', ['#c6c6c6', '#3a6ea5']],
];

// Catalog search: accent/case-insensitive matching, no internet needed.
export const normText = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Flags used by the quick-filter chips on both Shop and Inventory rows.
export function itemFlags(game, item) {
  const flags = [item.cat];
  // Só comida de verdade e sobremesas entram no chip "Comidas". Bebidas (cafés, refrigerantes,
  // energéticos) e Medicamentos mantêm o próprio cat: um drink nunca é rotulado como remédio.
  if (item.cat === 'comidas' || item.cat === 'sobremesas') flags.push('comidas');
  if (item.toy || item.cat === 'fun') flags.push('brinquedos');
  if (item.cat === 'mobilia') flags.push('moveis');
  const taste = game.tasteOf?.(item.id);
  if (taste === 'love') flags.push('favoritos');
  if (!taste || !game.count?.(item.id)) flags.push('novos');
  return [...new Set(flags)].join(' ');
}

const QUICK_CHIPS = [
  ['todos', 'Todos'], ['comidas', 'Comidas'], ['brinquedos', 'Brinquedos'],
  ['moveis', 'Móveis'], ['favoritos', 'Favoritos'], ['novos', 'Novos'],
];

// `h` is the tiny DOM helper from ui.js; passing it avoids a circular import.
export function makeCatalogTools(h, { shop, search, quick, onSearch, onQuick, onChange }) {
  let input;
  input = h('input.catalog-search', {
    type: 'search',
    value: search,
    placeholder: shop ? 'Buscar item...' : 'Buscar no inventário...',
    oninput: (e) => { onSearch(e.target.value); onChange(); },
    onkeydown: (e) => {
      // Never let the app's global shortcuts fire while typing in the catalog.
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        onSearch('');
        input.value = '';
        onChange();
      }
    },
  });
  const row = h('div.quick-chips', {}, QUICK_CHIPS.map(([id, label]) => h(`button.quick-chip${quick === id ? '.active' : ''}`, {
    'data-quick': id,
    onclick: () => {
      onQuick(id);
      for (const b of row.querySelectorAll('.quick-chip')) b.classList.toggle('active', b.dataset.quick === id);
      onChange();
    },
  }, label)));
  return h('div.catalog-tools', {}, input, row, h('div.catalog-empty', {}, 'Nada encontrado.'));
}

// Hides rows in place (never rebuilds them), so typing keeps focus and the caret position.
export function applyCatalogFilter(panel, search, quick) {
  const q = normText(search).trim();
  let visible = 0;
  for (const row of panel.querySelectorAll('.item[data-name]')) {
    const ok = (!q || row.dataset.name.includes(q)) && (quick === 'todos' || (row.dataset.flags || '').split(' ').includes(quick));
    row.hidden = !ok;
    if (ok) visible++;
  }
  for (const group of panel.querySelectorAll('.group[data-seg]')) {
    let any = false;
    for (let n = group.nextElementSibling; n && !n.classList.contains('group'); n = n.nextElementSibling) {
      if (n.matches('.item') && !n.hidden) { any = true; break; }
    }
    group.hidden = !any;
  }
  const empty = panel.querySelector('.catalog-empty');
  if (empty) empty.hidden = visible > 0;
  return visible;
}
