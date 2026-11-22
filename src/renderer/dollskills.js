// Doll skills: 100% outside combat, no coins. Hidden until learned, like the Crow's.
import { teachSpeedMul } from './attrxp.js';
import { translate } from './i18n.js';

// Cooldowns vivem só em memória: performance.now()/Date.now() nunca entram no save.json.
const COOLDOWNS = new Map();
const TRAIN_COOLDOWNS = new Map();

export function trainCooldownMs(game) {
  return Math.max(45000, 120000 / teachSpeedMul(game));
}
export function trainRemaining(key, game) {
  return Math.max(0, (TRAIN_COOLDOWNS.get(key) || 0) - Date.now());
}
export function trainReady(key, game) {
  return trainRemaining(key, game) <= 0;
}
export function markTrain(key, game) {
  TRAIN_COOLDOWNS.set(key, Date.now() + trainCooldownMs(game));
}
export function fmtCooldown(ms) {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

export const DOLL_SKILLS = {
  curador: { name: 'Curador de Mangás', desc: 'Escolhe os mangás mais raros para a Persocon ler' },
  relaxar: { name: 'Massagem & Alongamento', desc: 'Alonga junto depois de jogos e estudos, reduzindo o desgaste' },
  cochilo: { name: 'Soneca em Dupla', desc: 'Deita ao lado da Persocon e acelera a recuperação de Energia' },
  dj: { name: 'DJ Miniatura', desc: 'Liga as luzes no Ouvir Música e aumenta Carisma e Humor' },
  guarda_chuva: { name: 'Guarda-Chuva em Dupla', desc: 'Fica ao lado com um mini guarda-chuva na chuva' },
  enfeitar: { name: 'Ajudante do Mural', desc: 'Enfeita o Mural com estrelinhas e chama a Persocon' },
  alimentar_peixes: { name: 'Tratador do Aquário', desc: 'Cuida dos peixes e amplia o bônus de Carisma' },
  olheiro: { name: 'Olheiro de Alvo', desc: 'Aponta o ritmo no Alvo/Arcade, dando mais Destreza e Percepção' },
  baba_tamapet: { name: 'Babá do Tamapet', desc: 'Cuida do Tamapet quando a Persocon está ocupada' },
  caca_clima: { name: 'Caçador de Clima', desc: 'Pega partículas do clima e rende Percepção e Humor' },
  explorador: { name: 'Guia de Janelas', desc: 'Acompanha a Persocon nas janelas, dando Agilidade' },
  plaquinha: { name: 'Assistente de Palco', desc: 'Erguenta plaquinhas fofas em emotes e no Streamer Mode' },
};

export const DOLL_XP = 100;

// Combat-only skills (no coins). Each maps to a Doll combat animation.
export const DOLL_COMBAT_SKILLS = {
  investida: { name: 'Investida Fofa', desc: 'Corre e tromba no inimigo', anim: 'combat_attack', combat: true },
  raio_cristal: { name: 'Raio do Cristal', desc: 'Feixe mágico que ignora parte da defesa', anim: 'combat_cast', combat: true },
  laco: { name: 'Laço de Fita', desc: 'Prende os pés do inimigo por 2 turnos', anim: 'combat_cast', combat: true },
  escudo: { name: 'Escudo do Boneco', desc: 'Absorve parte do próximo ataque', anim: 'combat_shield', combat: true },
  revigorar: { name: 'Abraço Revigorante', desc: 'Restaura Energia e limpa um debuff', anim: 'combat_cheer', combat: true },
  combo_dupla: { name: 'Combo Sincronizado', desc: 'Próximo golpe ganha dano e crítico', anim: 'combat_cheer', combat: true },
};

export const dollData = (app) => {
  const d = (app.game.profile.dollSkills ||= { focus: null, xp: {}, learned: [], trains: 0 });
  if (d.cool) delete d.cool; // saves antigos: cooldown persistido travava as skills
  return d;
};
export const dollHasSkill = (app, id) => (app.game.profile.dollSkills?.learned || []).includes(id);
export const dollReady = (app) => !!app.doll?.alive && !app.pomodoro?.active;

// Multiplier for an activity bonus (1 = no skill).
export function dollBonus(app, id, mult = 1.15) {
  return dollReady(app) && dollHasSkill(app, id) ? mult : 1;
}

// Skill reaction with a cooldown (seconds), so ambient effects do not spam.
export function dollWave(app, id, text, ic = '✨', cooldown = 180) {
  if (!dollReady(app) || !dollHasSkill(app, id)) return false;
  const now = Date.now();
  if (now < (COOLDOWNS.get(id) || 0)) return false;
  COOLDOWNS.set(id, now + cooldown * 1000);
  dollUseSkill(app, id, text, ic);
  return true;
}

// Records skill use in the gains feed ("Doll: <name>").
export function dollUseSkill(app, id, text, ic = '✨') {
  if (!dollHasSkill(app, id)) return false;
  const custom = String(app.game.profile.dollName || '').replace(/[<>&"']/g, '').trim().slice(0, 24);
  const who = custom || (app.config.lang === 'en' ? 'Doll' : 'Boneco');
  const skill = DOLL_SKILLS[id] || DOLL_COMBAT_SKILLS[id];
  app.gains?.show(text || '', 'buff', `${who}: ${translate(skill?.name || id)}`, ic);
  return true;
}

// Short teaching session by the Persocon; Carisma makes it faster and yields cha XP.
export function teachDollSkill(app, id) {
  if (!app.doll?.alive) return false;
  const d = dollData(app);
  const skill = DOLL_SKILLS[id] || DOLL_COMBAT_SKILLS[id];
  if (!skill || dollHasSkill(app, id)) return false;
  const rate = teachSpeedMul(app.game);
  d.focus = id;
  d.xp[id] = (d.xp[id] || 0) + Math.round(14 * rate);
  d.trains = (d.trains || 0) + 1;
  app.game.attrAdd?.('cha', Math.max(1, Math.round(1 * rate)), 'Ensino');
  app.gains?.show(`+${Math.round(14 * rate)}%`, 'buff', `Doll: ${translate(skill.name)}`, '🎓');
  if (d.xp[id] >= 100) {
    d.learned.push(id);
    d.focus = null;
    app.sound?.sfx?.('levelup');
    const skillName = translate(skill.name);
    const who = app.getDollName?.() || (app.config.lang === 'en' ? 'Doll' : 'Boneco');
    app.speech?.say(app.config.lang === 'en' ? `${who} learned: ${skillName}!` : `${who} aprendeu: ${skillName}!`, 3.5);
  }
  app.game.changed();
  return true;
}
