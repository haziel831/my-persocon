// O log de XP: mostra em tempo real quanto a Persocon está ganhando e em quê.
// Fica logo abaixo da caixa de Chat, no dock do canto da tela, e pode ser recolhido.
//
// As linhas são tipo: "+12 XP em Combate Corpo a Corpo" · "+4 XP em Força (Treino Pesado)".
import { ATTRS } from './game.js';
import { SKILL_DEFS } from './skills.js';
import { ATTR_SOURCES } from './attrxp.js';

// Quantas linhas ficam guardadas (a tela mostra as 5 últimas).
const MAX = 12;

const ATTR_LABELS = Object.fromEntries(ATTRS);

// "12,5" vira "12,5" · "12,0" vira "12".
const fmt = (v) => {
  const n = Math.round((v || 0) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
};

export class XpLog {
  constructor(app) {
    this.app = app;
    this.rows = [];
    app.pet?.on((type, data) => {
      if (type === 'attrXp') this.attr(data);
      else if (type === 'skillXp') this.skill(data);
    });
  }

  // O XP de um atributo (Força, Constituição...).
  attr({ id, amount, up, level, source }) {
    const what = ATTR_LABELS[id] || id;
    const from = ATTR_SOURCES[source];
    const label = from ? `${what} (${from})` : what;
    this.push(amount, label, up ? `Nv ${level}` : '');
  }

  // O XP de uma arte (Combate Corpo a Corpo, Arremesso...).
  skill({ id, amount, up, level }) {
    const art = SKILL_DEFS[id]?.art || SKILL_DEFS[id]?.name || id;
    this.push(amount, art, up ? `Nv ${level}` : '');
  }

  push(amount, what, extra = '') {
    if (!(amount > 0)) return;
    const line = `+${fmt(amount)} XP em ${what}${extra ? ` · ${extra}` : ''}`;
    // A linha repetida some: só o total recente interessa.
    const last = this.rows[this.rows.length - 1];
    if (last && last.text.startsWith('+') && last.what === what) {
      last.amount += amount;
      // A subida de nível mais recente aparece na linha juntada.
      last.extra = extra || last.extra;
      last.text = `+${fmt(last.amount)} XP em ${what}${last.extra ? ` · ${last.extra}` : ''}`;
      last.t = Date.now();
      return;
    }
    this.rows.push({ text: line, amount, what, extra, t: Date.now() });
    while (this.rows.length > MAX) this.rows.shift();
  }

  // As últimas linhas (a mais nova por último).
  lines(n = 5) {
    return this.rows.slice(-n).map((r) => r.text);
  }
}
