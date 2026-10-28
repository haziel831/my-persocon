// Minimal Molang evaluator: enough for the expressions YSM models use in animations.
// Unknown variables evaluate to 0. Trigonometry follows Molang (degrees).

const D2R = Math.PI / 180;

const M = {
  sin: (x) => Math.sin(x * D2R),
  cos: (x) => Math.cos(x * D2R),
  asin: (x) => Math.asin(x) / D2R,
  acos: (x) => Math.acos(x) / D2R,
  atan: (x) => Math.atan(x) / D2R,
  atan2: (y, x) => Math.atan2(y, x) / D2R,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,
  exp: Math.exp,
  ln: Math.log,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  trunc: Math.trunc,
  min: Math.min,
  max: Math.max,
  mod: (a, b) => a % b,
  clamp: (v, a, b) => Math.min(Math.max(v, a), b),
  lerp: (a, b, t) => a + (b - a) * t,
  random: (a, b) => a + Math.random() * (b - a),
  pi: Math.PI,
};

const SAFE = /^[\w\s.+\-*/%()?:<>=!&|,]*$/;

export function compileMolang(expr) {
  if (typeof expr === 'number') return () => expr;
  if (typeof expr === 'boolean') return () => (expr ? 1 : 0);
  const src = String(expr ?? '').trim();
  if (src === '') return () => 0;
  const num = Number(src);
  if (!Number.isNaN(num)) return () => num;
  if (!SAFE.test(src)) return () => 0;

  const js = src
    .toLowerCase()
    .replace(/\bmath\.pi\b/g, 'M.pi')
    .replace(/\bmath\.(\w+)/g, 'M.$1')
    .replace(/\b(query|q|ysm|variable|v|temp|t|context|c)\.(\w+)/g, (_, ns, name) => {
      const n = { q: 'query', v: 'variable', t: 'temp', c: 'context' }[ns] || ns;
      return `(ctx.${n}_${name}||0)`;
    })
    .replace(/(^|[^=!<>])=(?!=)/g, '$1==');

  try {
    const fn = new Function('ctx', 'M', `return (${js});`);
    return (ctx) => {
      try {
        const v = Number(fn(ctx, M));
        return Number.isFinite(v) ? v : 0;
      } catch {
        return 0;
      }
    };
  } catch {
    return () => 0;
  }
}
