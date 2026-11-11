// Combat animation controller: plays the close-combat clips by name, fires the hit event at
// the right frame, chains the combos and brings the pet back to the fighting stance.
import { COMBAT_META, COMBAT_ANIM_NAMES, COMBAT_CHAIN } from './combatanims.js';

export { COMBAT_META, COMBAT_ANIM_NAMES, COMBAT_CHAIN };

export class Combat {
  constructor(pet) {
    this.pet = pet;
    this.name = null;      // the clip being played
    this.t = 0;            // ms since it started
    this.hit = false;      // the hit frame already fired
    this.speed = 1;
  }

  // The combat clips this model actually has.
  available() {
    const anim = this.pet?.view?.animator;
    if (!anim) return [];
    return COMBAT_ANIM_NAMES.filter((n) => anim.has(n));
  }

  isCombatClip(name) {
    return !!COMBAT_META[name];
  }

  // Plays a combat clip. facing: 'front' | 'left' | 'right'.
  play(name, { facing = 'front', restart = true, speed = 1 } = {}) {
    const pet = this.pet;
    const view = pet?.view;
    if (!view?.animator?.has(name)) return false;
    this.name = name;
    this.t = 0;
    this.hit = false;
    this.speed = speed;
    pet.animName = name;
    view.setFacing(facing);
    view.play(name, { restart, fade: 0.08, speed });
    pet.emit?.('combatAnim', { name });
    return true;
  }

  // The next attack of the chain, when the combo window of the current one is open.
  chainNext(name = this.name) {
    const meta = COMBAT_META[name];
    if (!meta?.next) return null;
    const w = meta.comboWindowMs;
    if (!w || this.t < w.from || this.t > w.to) return null;
    return meta.next;
  }

  // The combo step: plays the next attack of the chain (or the given one) when allowed.
  chain(name = this.chainNext()) {
    if (!name) return false;
    return this.play(name);
  }

  // True while the combo window of the current clip is open.
  get canChain() {
    const meta = COMBAT_META[this.name];
    if (!meta?.comboWindowMs) return false;
    const w = meta.comboWindowMs;
    return this.t >= w.from && this.t <= w.to;
  }

  update(dt) {
    if (!this.name) return;
    const meta = COMBAT_META[this.name];
    if (!meta) return;             // not a combat clip: the pet handles it
    // Another clip took over (the state machine): the combo is over.
    const cur = this.pet?.view?.animator?.current?.name;
    if (cur && cur !== this.name) { this.name = null; return; }
    this.t += dt * 1000 * this.speed;
    // Hit frame: the damage/VFX/SFX moment.
    if (!this.hit && meta.hitFrameMs != null && this.t >= meta.hitFrameMs) {
      this.hit = true;
      this.pet.emit?.('combatHit', { name: this.name, at: meta.hitFrameMs });
    }
    // End of a one-shot: back to the fighting stance (or to the normal idle).
    if (meta.durationMs && this.t >= meta.durationMs) {
      const last = this.name;
      this.name = null;
      this.pet.anim?.('idle', { restart: true });
      this.pet.emit?.('combatAnimEnd', { name: last });
    }
  }

  // Stops the combat clip (the pet goes back to idle).
  stop() {
    if (!this.name) return;
    this.name = null;
    this.pet.anim?.('idle', { restart: true });
  }
}
