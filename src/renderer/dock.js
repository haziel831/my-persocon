// Status Dock: always-visible bars, chips and logs in a corner of the screen.
// Extracted from pet.js — all markup, classes, translations and caches stay identical.
import { AFFECTION_MAX, DEBUFFS } from './behavior.js';
import { BUFF_ICONS, BUFF_LABELS, itemById } from './game.js';
import { translate } from './i18n.js';
import { icon } from './pixel.js';

export function createDock({ config, pet, game, app, sound, rewards, eventLog, isHidden, setHidden, toggleLogFilter, focusLabel }) {
  let el = null;
  let t = 0;
  let menuEl = null;
  let menuOff = null;
  let menuKey = null;
  let moving = false;
  // Cached DOM writes: only touch the element when a value actually changed.
  let movingLast = null;
  let geo = null;
  let w = 0;
  let h = 0;
  let hint = null;
  let html = '';

  const invalidate = () => { t = 0; };
  // Full cache reset (a fresh element also gets this on creation).
  const reset = () => { t = 0; html = ''; geo = null; w = 0; h = 0; hint = null; movingLast = null; };

  function closeMenu() {
    if (!menuEl) return;
    menuEl.remove();
    menuEl = null;
    window.removeEventListener('pointerdown', menuOff, true);
    if (menuKey) window.removeEventListener('keydown', menuKey);
    menuKey = null;
    app.uiChanged();
  }

  // Right-click on the docked status: always on top, click through, move it, close it.
  function openMenu(x, y) {
    closeMenu();
    app.closeAllMenus?.();
    const m = document.createElement('div');
    m.className = 'toy-menu hitzone';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Status fixo';
    m.append(title);
    const item = (label, on, fn) => {
      const b = document.createElement('button');
      b.textContent = `${on === undefined ? '' : on ? '✓ ' : '◻ '}${label}`;
      b.onclick = (e) => {
        e.stopPropagation();
        closeMenu();
        sound.play('ok', { volume: 0.4 });
        fn();
      };
      m.append(b);
    };
    item('Sempre na frente', config.alwaysOnTop !== false, () => app.setOption('alwaysOnTop', config.alwaysOnTop === false));
    item('Clicar através', !!config.clickThrough, () => app.setOption('clickThrough', !config.clickThrough));
    item(isHidden() ? 'Mostrar o app' : 'Esconder o app', undefined, () => setHidden(!isHidden()));
    item('✥ Mudar a posição', undefined, () => { moving = true; invalidate(); });
    const k = config.statusDockScale ?? 1.3;
    const scale = (v) => { app.setOption('statusDockScale', Math.round(Math.min(2.5, Math.max(0.8, v)) * 10) / 10); invalidate(); };
    item(`➕ Aumentar (${Math.round(k * 100)}%)`, undefined, () => scale(k + 0.2));
    item('➖ Diminuir', undefined, () => scale(k - 0.2));
    item('Filtro do log: status', config.logFilter?.status !== false, () => toggleLogFilter('status'));
    item('Filtro do log: missões', config.logFilter?.mission !== false, () => toggleLogFilter('mission'));
    item('Filtro do log: moedas', config.logFilter?.money !== false, () => toggleLogFilter('money'));
    item('Filtro do log: corvo', config.logFilter?.crow !== false, () => toggleLogFilter('crow'));
    item('Chat log (o que ela fala)', config.chatLogOff !== true, () => { app.setOption('chatLogOff', config.chatLogOff !== true); invalidate(); });
    item('Registro de XP (o que ela treina)', config.xpLogOff !== true, () => { app.setOption('xpLogOff', config.xpLogOff !== true); invalidate(); });
    item('✕ Fechar', undefined, () => app.setOption('statusDock', 'off'));
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(m);
    m.style.left = `${Math.min(x, innerWidth - m.offsetWidth - 6)}px`;
    m.style.top = `${Math.min(y, innerHeight - m.offsetHeight - 6)}px`;
    menuEl = m;
    menuOff = (e) => !m.contains(e.target) && closeMenu();
    setTimeout(() => menuEl === m && window.addEventListener('pointerdown', menuOff, true), 0);
    menuKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', menuKey);
    sound.play('blip', { volume: 0.4 });
    app.uiChanged();
  }

  // "Mudar a posição": drag the status anywhere; released, it stays there.
  function drag(e) {
    const r = el.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    const move = (ev) => {
      config.statusDock = 'free';
      config.statusDockAt = { x: ev.clientX - ox, y: ev.clientY - oy };
      invalidate();
      update();
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      setTimeout(() => { moving = false; }, 0);
      app.setOption('statusDockAt', config.statusDockAt);
      app.setOption('statusDock', config.statusDock);
      app.uiChanged();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  // Wishes still pending (up to 3 hours): an icon each, the hover says what she wants.
  function wishChips() {
    // Em combate ela não pede nada: os chips "Quer" somem enquanto a luta acontece.
    if (pet.combatMode) return '';
    const now = Date.now();
    const list = (pet.wishes || []).filter((w) => w.until > now);
    if (!list.length) return '';
    const en = config.lang === 'en';
    const what = (w) => w.label || { food: w.name || (en ? 'Food' : 'Comida'), drink: w.name || (en ? 'Drink' : 'Bebida'), dessert: w.name || (en ? 'Dessert' : 'Sobremesa'), pat: en ? 'Head pat' : 'Cafuné', play: en ? 'Play' : 'Brincar' }[w.kind] || w.kind;
    const chip = (w) => {
      const left = Math.max(1, Math.round((w.until - now) / 60000));
      const time = left >= 60 ? `${Math.floor(left / 60)}h${String(left % 60).padStart(2, '0')}` : `${left} min`;
      const tip = `${en ? 'She wants' : 'Ela quer'}: ${String(what(w)).replace(/[<>&"]/g, '')} · ${en ? 'still' : 'ainda'} ${time}`;
      const src = w.img || icon({ food: 'food', drink: 'cup', pat: 'hand', play: 'ball' }[w.kind] || 'ball');
      return `<span title="${tip}"><img src="${src}" alt=""></span>`;
    };
    return `<div class="sd-queue sd-wishes"><b>${en ? 'Wants' : 'Quer'}</b>${list.map(chip).join('')}</div>`;
  }

  // Meals / pending action / current activity — shown while she is busy with something else.
  function queueChips() {
    const en = config.lang === 'en';
    const chips = [];
    const push = (title, markup) => chips.push(`<span title="${String(title).replace(/[<>&"]/g, '')}">${markup}</span>`);
    if (pet.activity === 'jam') push(en ? 'Listen to Music' : 'Ouvir Música', '🎵');
    if (pet.activity === 'watch') push(en ? 'Watch mode' : 'Modo Assistir', '📺');
    if (pet.pending) push(en ? `Next: ${pet.pending}` : `Próximo: ${pet.pending}`, '⏭');
    if (pet.toyPlay?.id) push(pet.toyPlay.id, '🎮');
    if (pet.chase) push(en ? 'Tag' : 'Pega-pega', '🏃');
    for (const it of [pet.eating?.item, ...(pet.meals || [])].filter(Boolean)) {
      push(it.name, it.img ? `<img src="${it.img}" alt="" style="image-rendering:pixelated${it.tint ? `;filter:${it.tint}` : ''}">` : (it.icon || '•'));
    }
    for (const q of pet.actionQueue || []) {
      const qIcon = q.kind === 'sleep' ? '🌙' : q.kind === 'bath' ? '🛁' : q.kind === 'box' ? '🎁' : '⏭';
      push(q.label || q.kind, qIcon);
    }
    for (const id of pet.afterPlay || []) {
      const it = itemById(id);
      if (it) push(it.name, it.img ? `<img src="${it.img}" alt="" style="image-rendering:pixelated${it.tint ? `;filter:${it.tint}` : ''}">` : (it.icon || '•'));
    }
    if (!chips.length) return '';
    if (pet.eating && chips.length) {
      const i = chips.findIndex((c) => c.includes('img') || c.includes('•'));
      // mark first meal chip as current when possible
      void i;
    }
    return `<div class="sd-queue"><b>${en ? 'Queue' : 'Fila'}</b>${chips.slice(0, 8).join('')}${chips.length > 8 ? `<em>+${chips.length - 8}</em>` : ''}</div>`;
  }

  function buffChips() {
    const now = Date.now();
    const on = Object.entries(pet.buffs || {}).filter(([, time]) => time > now);
    return on.length ? `<div class="sd-buffs">${on.map(([k, time]) => `<span title="${BUFF_LABELS[k] || k}">${BUFF_ICONS[k] || '✨'} ${Math.ceil((time - now) / 60000)}m</span>`).join('')}</div>` : '';
  }

  // Negative statuses: pixel-art cards with the name anchored at the bottom of the icon.
  function debuffChips() {
    const now = Date.now();
    const en = config.lang === 'en';
    const on = Object.entries(pet.debuffs || {}).filter(([, time]) => time > now);
    return on.length
      ? `<div class="sd-debuffs">${on.map(([id, time]) => {
        const d = DEBUFFS[id];
        const L = d ? d[en ? 'en' : 'pt'] : null;
        const title = L ? `${L.name} — ${L.desc} · ${L.cure} (${Math.ceil((time - now) / 60000)}m)` : id;
        return `<span class="sd-debuff" style="--c:${d?.color || '#e2475a'}" title="${title.replace(/[<>&"]/g, '')}">`
          + `<img src="${icon(d?.art || 'db_gripe')}" alt=""><u>${L ? L.name : id}</u></span>`;
      }).join('')}</div>`
      : '';
  }

  // Daily missions as a list with their exact names: hidden once all three are done.
  function missionChip() {
    const list = rewards.missions();
    if (!list.length || list.every((m) => m.done)) return '';
    const en = config.lang === 'en';
    const rows = list.map((m) => `<li class="${m.done ? 'done' : ''}">${m.done ? '✔' : '·'} ${String(en ? translate(m.text) : m.text).replace(/[<>&"]/g, '')} <em>${Math.min(m.n, m.goal)}/${m.goal}</em></li>`).join('');
    return `<div class="sd-missions"><b>📅 ${en ? 'Daily missions' : 'Missões do dia'}</b><ul>${rows}</ul></div>`;
  }

  // Event log right under the pinned status: 5 latest lines, with a toggle to collapse it.
  function logBlock() {
    const en = config.lang === 'en';
    const open = !config.logOff;
    const tip = en ? 'Show or hide the log' : 'Mostrar ou ocultar o registro';
    const head = `<div class="sd-log-head"><b>📝 ${en ? 'Log' : 'Registro'}</b><button class="sd-log-toggle" type="button" title="${tip}" aria-label="${tip}">${open ? 'X' : '+'}</button></div>`;
    if (!open) return `<div class="sd-log sd-eventlog">${head}</div>`;
    const rows = eventLog.lines.filter((r) => (config.logFilter?.[r[2] || 'general'] ?? true)).map(([pt, enText, , n]) => `<div>${String(en ? enText : pt).replace(/[<>&"]/g, '')}${n > 1 ? ` <b>(${n}x)</b>` : ''}</div>`).join('') || `<div>${en ? 'No events yet' : 'Ainda sem eventos'}</div>`;
    return `<div class="sd-log sd-eventlog">${head}<div class="sd-log-rows">${rows}</div></div>`;
  }

  // Chat log right under the event log: the last 5 phrases the Persocon said.
  function chatLogBlock() {
    const en = config.lang === 'en';
    const open = config.chatLogOff !== true;
    const tip = en ? 'Show or hide the chat log' : 'Mostrar ou ocultar o chat log';
    const head = `<div class="sd-log-head"><b>💬 ${en ? 'Chat' : 'Chat'}</b><button class="sd-chat-toggle" type="button" title="${tip}" aria-label="${tip}">${open ? 'X' : '+'}</button></div>`;
    if (!open) return `<div class="sd-log sd-chat">${head}</div>`;
    const rows = (app.speechHistory || []).slice(-5).reverse().map((text) => `<div>${String(text).replace(/[<>&"]/g, '')}</div>`).join('') || `<div>${en ? 'She has not spoken yet' : 'Ela ainda não falou'}</div>`;
    return `<div class="sd-log sd-chat">${head}<div class="sd-log-rows">${rows}</div></div>`;
  }

  // The XP log right under the chat: what she is training right now and how much.
  function xpLogBlock() {
    const en = config.lang === 'en';
    const open = config.xpLogOff !== true;
    const tip = en ? 'Show or hide the XP log' : 'Mostrar ou ocultar o registro de XP';
    const head = `<div class="sd-log-head"><b>⭐ XP</b><button class="sd-xp-toggle" type="button" title="${tip}" aria-label="${tip}">${open ? 'X' : '+'}</button></div>`;
    if (!open) return `<div class="sd-log sd-xp">${head}</div>`;
    const rows = (app.xpLog?.lines?.(5) || []).slice().reverse().map((text) => `<div>${String(text).replace(/[<>&"]/g, '')}</div>`).join('') || `<div>${en ? 'No XP yet' : 'Ainda sem XP'}</div>`;
    return `<div class="sd-log sd-xp">${head}<div class="sd-log-rows">${rows}</div></div>`;
  }

  function update() {
    const pos = config.statusDock ?? 'tr';
    if (pos === 'off') {
      el?.remove();
      el = null;
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.className = 'status-dock hitzone';
      el.title = translate('Clique: menu · 2×: menu rápido · botão direito: opções');
      let rmb = null;
      let clickTimer = null;
      const internal = (t) => t.closest('.sd-hide, .sd-log-toggle, .sd-chat-toggle, .sd-xp-toggle, .sd-focus, .sd-log-f, button, input');
      el.addEventListener('click', (e) => {
        if (moving || rmb?.moved || e.button !== 0) return;
        if (e.target.closest('.sd-focus')) {
          e.stopPropagation();
          app.pomodoro?.cancel?.();
          return;
        }
        if (e.target.closest('.sd-hide') || isHidden()) return setHidden(!isHidden());
        if (e.target.closest('.sd-log-toggle')) { app.setOption('logOff', !config.logOff); invalidate(); return; }
        if (e.target.closest('.sd-chat-toggle')) { app.setOption('chatLogOff', !config.chatLogOff); invalidate(); return; }
        if (e.target.closest('.sd-xp-toggle')) { app.setOption('xpLogOff', !config.xpLogOff); invalidate(); return; }
        if (internal(e.target)) return;
        clearTimeout(clickTimer);
        const x = e.clientX;
        const y = e.clientY;
        clickTimer = setTimeout(() => {
          clickTimer = null;
          app.showMenu?.(x, y);
        }, 220);
      });
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        clearTimeout(clickTimer);
        clickTimer = null;
        if (moving || internal(e.target)) return;
        const r = el.getBoundingClientRect();
        app.quick?.show?.(e.clientX || r.left + r.width / 2, e.clientY || r.bottom);
      });
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (moving && e.button === 0) return drag(e);
        if (e.button !== 2) return;
        const sx = e.clientX;
        const sy = e.clientY;
        rmb = { moved: false };
        const move = (ev) => {
          if (!rmb.moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
            rmb.moved = true;
            moving = true;
            drag(ev);
          }
        };
        const up = () => {
          removeEventListener('pointermove', move);
          removeEventListener('pointerup', up);
          setTimeout(() => { rmb = null; }, 0);
        };
        addEventListener('pointermove', move);
        addEventListener('pointerup', up);
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (rmb?.moved || moving) return;
        openMenu(e.clientX, e.clientY);
      });
      document.body.append(el);
      reset();
    }
    if (el.dataset.pos !== pos) el.dataset.pos = pos;
    const k = String(config.statusDockScale ?? 1.3);
    if (el.style.getPropertyValue('--sdk') !== k) {
      el.style.setProperty('--sdk', k);
      w = 0; // scale changed: the cached size is stale
    }
    const at = pos === 'free' && config.statusDockAt;
    // Measure before keying the cache: on the first frame the element may not be laid out yet.
    if (at && !w) {
      w = el.offsetWidth;
      h = el.offsetHeight;
    }
    const key = at ? `${Math.round(at.x)}|${Math.round(at.y)}|${w}|${h}|${innerWidth}|${innerHeight}` : 'none';
    if (key !== geo) {
      // Never lock in a 0|0 geometry — keep re-measuring until layout gives a real size.
      if (!at || (w > 0 && h > 0)) geo = key;
      if (at) {
        el.style.left = `${Math.round(Math.min(Math.max(0, at.x), innerWidth - w))}px`;
        el.style.top = `${Math.round(Math.min(Math.max(0, at.y), innerHeight - h))}px`;
      } else {
        el.style.left = '';
        el.style.top = '';
      }
    }
    if (movingLast !== moving) {
      movingLast = moving;
      el.classList.toggle('moving', moving);
    }
    const tip = config.lang === 'en' ? 'Drag to move' : 'Arraste para mover';
    if (hint !== tip) {
      hint = tip;
      el.dataset.hint = tip;
    }
    if ((t -= 1) > 0) return;
    t = 15;
    const s = pet.stats;
    const bar = (ic, v, col) => `<div class="sd-row"><span>${ic}</span><i><b style="width:${Math.round(Math.max(0, Math.min(100, v)))}%;background:${col}"></b></i></div>`;
    const hideTip = isHidden() ? (config.lang === 'en' ? 'Show the app' : 'Mostrar o app') : (config.lang === 'en' ? 'Hide the app' : 'Esconder o app');
    const maxHp = Math.max(1, pet.maxHealth?.() ?? 100);
    // Pomodoro countdown: own block at the very end of the pinned dock; ⏱ is a PxEmoji glyph.
    const focusText = focusLabel?.();
    const focusTip = translate('Clique para encerrar o modo foco');
    const focusChip = focusText ? `<button type="button" class="sd-focus hitzone" title="${focusTip}">⏱ ${String(focusText).replace(/[<>&"]/g, '')}</button>` : '';
    const next = `<div class="sd-name">${(config.name || 'Ninna').replace(/[<>&']/g, '')} · ¥ ${Math.floor(game.coins)} · ${config.lang === 'en' ? 'Wallet' : 'Carteira'} ¥ ${Math.floor(game.profile?.wallet || 0)} · ${config.lang === 'en' ? 'Doing' : 'Fazendo'}: ${String(pet.activity || pet.action || 'idle').replace(/[<>&']/g, '')}`
      + `<button class="sd-hide" type="button" title="${hideTip}" aria-label="${hideTip}">${isHidden() ? '😑' : '👁'}</button></div>`
      + bar('❤️', (Math.min(s.health, maxHp) / maxHp) * 100, '#e2475a') + bar('🍗', s.hunger, '#f0a030') + bar('💧', s.thirst, '#3fa2e8')
      + bar('😊', s.mood, '#f2d23c') + bar('⚡', s.energy, '#62c94a') + bar('🛁', s.hygiene, '#7fd8d0')
      + bar('💗', (pet.affection / AFFECTION_MAX) * 100, '#ff7eb6').replace('</i>', `</i><em>${Math.round(pet.affection)}</em>`)
      + buffChips() + debuffChips() + missionChip() + queueChips() + wishChips() + logBlock() + chatLogBlock() + xpLogBlock() + focusChip;
    // Rebuilding the markup kills the click on the hide button and the selection, so only do it
    // when something visible actually changed.
    if (next !== html) {
      html = next;
      el.innerHTML = html;
      w = 0;
      h = 0;
      // O feed de ganhos fica logo abaixo da caixinha de XP (ele segue o dock).
      app.gains?.place?.();
    }
  }

  return {
    update,
    reset,
    invalidate,
    closeMenu,
    // The bag menu shares the same outside-click dismissal as the status menu.
    setMenu: (m, off) => {
      closeMenu();
      app.closeAllMenus?.();
      menuEl = m;
      menuOff = off;
      setTimeout(() => menuEl === m && window.addEventListener('pointerdown', menuOff, true), 0);
      menuKey = (e) => { if (e.key === 'Escape') closeMenu(); };
      window.addEventListener('keydown', menuKey);
    },
    setMoving: (v) => { moving = !!v; },
    get el() { return el; },
    get moving() { return moving; },
    get menuOpen() { return !!menuEl; },
  };
}
