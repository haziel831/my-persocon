// Event log under the pinned status widget: the 5 latest big events (money, statuses, missions,
// prizes) as text lines, so they stay readable after the floating popups are gone.
export class EventLog {
  constructor(cfg) {
    this.cfg = cfg;
    this.lines = [];
    this.max = 5;
  }

  // [pt, en] pair: the dock picks the Persocon's language when it renders.
  push(pt, en, cat = 'general') {
    const a = String(pt ?? '');
    const b = String(en ?? pt ?? '');
    const c = String(cat || 'general');
    const last = this.lines[this.lines.length - 1];
    if (last && last[0] === a && last[1] === b && last[2] === c) {
      last[3] = (last[3] || 1) + 1;
    } else {
      this.lines.push([a, b, c, 1]);
    }
    if (this.lines.length > this.max) this.lines.shift();
  }
}
