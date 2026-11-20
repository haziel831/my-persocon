// Doll skills: 100% outside combat, no coins. Hidden until learned, like the Crow's.
import { teachSpeedMul } from './attrxp.js';

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

export const dollData = (app) => (app.game.profile.dollSkills ||= { focus: null, xp: {}, learned: [], trains: 0 });
export const dollHasSkill = (app, id) => (app.game.profile.dollSkills?.learned || []).includes(id);
export const dollReady = (app) => !!app.doll?.alive && !app.pomodoro?.active;

// Multiplier for an activity bonus (1 = no skill).
export function dollBonus(app, id, mult = 1.15) {
  return dollReady(app) && dollHasSkill(app, id) ? mult : 1;
}

// Skill reaction with a cooldown (seconds), so ambient effects do not spam.
export function dollWave(app, id, text, ic = '✨', cooldown = 180) {
  if (!dollReady(app) || !dollHasSkill(app, id)) return false;
  const d = dollData(app);
  d.cool ||= {};
  if (performance.now() < (d.cool[id] || 0)) return false;
  d.cool[id] = performance.now() + cooldown * 1000;
  dollUseSkill(app, id, text, ic);
  return true;
}

// Records skill use in the gains feed ("Doll: <name>").
export function dollUseSkill(app, id, text, ic = '✨') {
  if (!dollHasSkill(app, id)) return false;
  app.gains?.show(text || '', 'buff', `Doll: ${DOLL_SKILLS[id]?.name || id}`, ic);
  return true;
}

// Short teaching session by the Persocon; Carisma makes it faster and yields cha XP.
export function teachDollSkill(app, id) {
  const d = dollData(app);
  if (!DOLL_SKILLS[id] || dollHasSkill(app, id)) return false;
  const rate = teachSpeedMul(app.game);
  d.focus = id;
  d.xp[id] = (d.xp[id] || 0) + Math.round(14 * rate);
  d.trains = (d.trains || 0) + 1;
  app.game.attrAdd?.('cha', Math.max(1, Math.round(1 * rate)), 'Ensino');
  app.gains?.show(`+${Math.round(14 * rate)}%`, 'buff', `Doll: ${DOLL_SKILLS[id].name}`, '🎓');
  if (d.xp[id] >= 100) {
    d.learned.push(id);
    d.focus = null;
    app.sound?.sfx?.('levelup');
    app.speech?.say(app.config.lang === 'en' ? `The Doll learned: ${DOLL_SKILLS[id].name}!` : `O Doll aprendeu: ${DOLL_SKILLS[id].name}!`, 3.5);
  }
  app.game.changed();
  return true;
}
