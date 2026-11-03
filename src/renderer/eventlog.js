// Event log under the pinned status widget: the 5 latest big events (money, statuses, missions,
// prizes) as text lines, so they stay readable after the floating popups are gone.
export class EventLog {
  constructor(cfg) {
    this.cfg = cfg;
    this.lines = [];
    this.max = 5;
  }

  // [pt, en] pair: the dock picks the Persocon's language when it renders.
  push(pt, en) {
    this.lines.push([String(pt ?? ''), String(en ?? pt ?? '')]);
    if (this.lines.length > this.max) this.lines.shift();
  }
}
