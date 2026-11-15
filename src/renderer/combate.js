// Arena de combate: uma janela separada, com save próprio, que só serve para testar lutas.
// Ela reaproveita o motor do jogo (a onda do cartucho preto) sem passar por título, intro ou
// mundo da área de trabalho. Só o modo `--combate` (ou um .exe com "combate" no nome) cai aqui.
import { BLACK_WAVES, STRIKE_GAP } from './melee.js';
import { FULL_STATS } from './behavior.js';

const MODELS = ['models/MyPersocon', 'models/Aghata'];

const el = (tag, style = {}, text = '') => {
  const node = document.createElement(tag);
  if (typeof style === 'string') node.className = style;
  else Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
};

const shortDir = (dir) => (dir || '').split('/').pop() || '-';

export async function startArena(app) {
  const pet = app.pet;
  const unknown = app.unknown;
  let wave = Math.min(9, Math.max(1, app.game.profile.blackCartridgeWave || 1));

  const panel = el('div', {
    position: 'fixed', top: '10px', left: '10px', zIndex: '40',
    display: 'flex', flexDirection: 'column', gap: '6px',
    padding: '8px 10px', borderRadius: '6px',
    background: 'rgba(16, 14, 22, .82)', border: '1px solid rgba(200, 40, 60, .55)',
    font: '12px PxEmoji, monospace', color: '#e8e2f0', userSelect: 'none',
  });
  panel.append(el('div', { font: '11px PxEmoji, monospace', color: '#ff5a70', letterSpacing: '1px' }, 'ARENA DE COMBATE'));

  const select = el('select', { font: '12px PxEmoji, monospace', background: '#1c1824', color: '#e8e2f0', border: '1px solid #43394f' });
  for (let i = 1; i < BLACK_WAVES.length; i++) {
    const plan = BLACK_WAVES[i];
    select.append(el('option', {}, `Onda ${i} · ${plan.count}x nível ${plan.level}`));
  }
  select.value = String(wave);
  select.onchange = () => { wave = Number(select.value); };
  panel.append(select);

  const btn = (label, title, fn) => {
    const b = el('button', {
      font: '12px PxEmoji, monospace', padding: '3px 8px', cursor: 'pointer',
      background: '#241d2e', color: '#e8e2f0', border: '1px solid #4a3f58', borderRadius: '4px',
    }, label);
    b.title = title;
    b.onclick = fn;
    return b;
  };

  const startBtn = btn('Iniciar luta', 'Solta a horda da onda escolhida', () => startWave());
  const stopBtn = btn('Parar', 'Encerra a luta e limpa a horda', () => stopFight());
  const healBtn = btn('Curar', 'Restaura a saúde e a energia da Persocon', () => heal());
  const killBtn = btn('Matar', 'Zera a saúde para testar a derrota', () => kill());
  const modelBtn = btn('Modelo', 'Troca o modelo da Persocon', () => swapModel());
  panel.append(el('div', { display: 'flex', gap: '6px', flexWrap: 'wrap' }, ''), startBtn, stopBtn, healBtn, killBtn, modelBtn);

  const status = el('div', { font: '11px PxEmoji, monospace', color: '#9c93ad', whiteSpace: 'pre' });
  panel.append(status);
  document.body.append(panel);

  const fighting = () => unknown.state === 'erupt' || unknown.state === 'chase' || unknown.state === 'fight';

  function startWave() {
    if (fighting()) return;
    if (pet.dead) heal();
    app.game.profile.blackCartridgeWave = wave;
    pet.resume?.();
    unknown.erupt(wave);
  }

  function stopFight() {
    app.melee?.stop?.('cancelled');
    pet.endToy?.(true);
    unknown.fleeAll();
    pet.resume?.();
  }

  function heal() {
    app.gameOver?.remove();
    app.gameOver = null;
    app.uiChanged?.();
    if (pet.dead) return pet.revive();
    pet.stats = { ...FULL_STATS };
    // Curar NÃO mexe na luta: encerrar o toy matava a horda e deixava ela na guarda.
    if (pet.unconscious) return pet.reviveUnconscious?.();
    if (!fighting()) pet.resume?.();
  }

  function kill() {
    if (pet.dead) return;
    pet.stats.health = 0;
    pet.checkDeath();
  }

  async function swapModel() {
    const next = MODELS.find((m) => m !== app.config.modelDir) || MODELS[0];
    await window.petAPI.saveConfig({ modelDir: next });
    await app.reloadForModel();
  }

  // A morte aqui não encerra a sessão: ela volta sozinha e a arena segue de pé.
  pet.on((type) => {
    if (type !== 'death') return;
    setTimeout(() => {
      const button = app.gameOver?.querySelector('.modal-foot .primary, .retry');
      if (button) button.click();
      else heal();
    }, 2900);
  });

  // Ela nasce fora do meio, para a horda ter para onde correr.
  setTimeout(() => {
    if (pet.x === null) pet.spawn(app.world.width * 0.3);
  }, 400);

  const timer = setInterval(() => {
    const alive = unknown.slimes.filter((s) => s.hp > 0);
    const hp = Math.max(0, Math.round(pet.stats.health));
    const foesHp = unknown.slimes.reduce((sum, s) => sum + Math.max(0, s.hp), 0);
    const dist = app.melee?.distance?.();
    status.textContent = [
      `ela: ${hp} hp · energia ${Math.round(pet.stats.energy)} · ${pet.action}`,
      `horda: ${alive.length} viva(s) · ${Math.round(foesHp)} hp · ${unknown.state}`,
      `distância: ${dist === undefined ? '-' : Math.round(dist)} px (alvo ${Math.round(STRIKE_GAP * pet.P)})`,
      `modelo: ${shortDir(app.config.modelDir)}`,
    ].join('\n');
    startBtn.disabled = fighting();
  }, 250);
  timer.unref?.();

  app.uiChanged?.();
  // Os controles voltam para quem chamou (útil nos testes da arena).
  return { startWave, stopFight, heal, kill, swapModel };
}
