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

// Expressions come from external YSM animation files, so they are never handed
// to eval/new Function: the source is tokenized and parsed once into a tree of
// closures. Unknown names, calls and malformed input evaluate to 0.

const FUNCTIONS = new Map();
for (const [name, fn] of Object.entries(M)) {
  if (typeof fn === 'function') FUNCTIONS.set(name, fn);
}

const NAMESPACES = {
  q: 'query', query: 'query',
  v: 'variable', variable: 'variable',
  t: 'temp', temp: 'temp',
  c: 'context', context: 'context',
  ysm: 'ysm',
};

const NUMBER_RE = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y;
const IDENT_RE = /[A-Za-z_][A-Za-z0-9_]*/y;
const OPS2 = new Set(['&&', '||', '==', '!=', '<=', '>=']);
const OPS1 = '+-*/%<>!?:(),=';
const START_IDENT = /[A-Za-z_]/;

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    NUMBER_RE.lastIndex = i;
    let m = NUMBER_RE.exec(src);
    if (m) {
      tokens.push({ t: 'n', v: Number(m[0]) });
      i = NUMBER_RE.lastIndex;
      continue;
    }

    IDENT_RE.lastIndex = i;
    m = IDENT_RE.exec(src);
    if (m) {
      let name = m[0];
      i = IDENT_RE.lastIndex;
      if (src[i] === '.' && START_IDENT.test(src[i + 1] || '')) {
        IDENT_RE.lastIndex = i + 1;
        const sub = IDENT_RE.exec(src);
        if (sub) {
          name += '.' + sub[0];
          i = IDENT_RE.lastIndex;
        }
      }
      tokens.push({ t: 'i', v: name });
      continue;
    }

    const two = src.slice(i, i + 2);
    if (OPS2.has(two)) {
      tokens.push({ t: 'o', v: two });
      i += 2;
      continue;
    }
    if (OPS1.includes(ch)) {
      tokens.push({ t: 'o', v: ch });
      i++;
      continue;
    }
    throw new Error('molang: unexpected character');
  }
  return tokens;
}

function parse(tokens) {
  let p = 0;

  const isOp = (v) => Boolean(tokens[p]) && tokens[p].t === 'o' && tokens[p].v === v;
  const take = (v) => {
    if (!isOp(v)) throw new Error('molang: expected ' + v);
    p++;
  };
  const ZERO = () => 0;
  const CONST = (n) => () => n;

  // Each level emits a closure; precedence follows Molang/JS.

  function expr() {
    return ternary();
  }

  function ternary() {
    const cond = or();
    if (!isOp('?')) return cond;
    p++;
    const a = expr();
    take(':');
    const b = ternary();
    return (ctx) => (cond(ctx) ? a(ctx) : b(ctx));
  }

  function or() {
    let node = and();
    while (isOp('||')) {
      p++;
      const r = and();
      const l = node;
      node = (ctx) => l(ctx) || r(ctx);
    }
    return node;
  }

  function and() {
    let node = equality();
    while (isOp('&&')) {
      p++;
      const r = equality();
      const l = node;
      node = (ctx) => l(ctx) && r(ctx);
    }
    return node;
  }

  function equality() {
    let node = relational();
    while (isOp('==') || isOp('!=') || isOp('=')) {
      const o = tokens[p++].v;
      const r = relational();
      const l = node;
      node = o === '!=' ? (ctx) => l(ctx) != r(ctx) : (ctx) => l(ctx) == r(ctx);
    }
    return node;
  }

  function relational() {
    let node = additive();
    for (;;) {
      let cmp;
      if (isOp('<')) cmp = (a, b) => a < b;
      else if (isOp('<=')) cmp = (a, b) => a <= b;
      else if (isOp('>')) cmp = (a, b) => a > b;
      else if (isOp('>=')) cmp = (a, b) => a >= b;
      else return node;
      p++;
      const r = additive();
      const l = node;
      node = (ctx) => cmp(l(ctx), r(ctx));
    }
  }

  function additive() {
    let node = multiplicative();
    for (;;) {
      let fn;
      if (isOp('+')) fn = (a, b) => a + b;
      else if (isOp('-')) fn = (a, b) => a - b;
      else return node;
      p++;
      const r = multiplicative();
      const l = node;
      node = (ctx) => fn(l(ctx), r(ctx));
    }
  }

  function multiplicative() {
    let node = unary();
    for (;;) {
      let fn;
      if (isOp('*')) fn = (a, b) => a * b;
      else if (isOp('/')) fn = (a, b) => a / b;
      else if (isOp('%')) fn = (a, b) => a % b;
      else return node;
      p++;
      const r = unary();
      const l = node;
      node = (ctx) => fn(l(ctx), r(ctx));
    }
  }

  function unary() {
    if (isOp('+')) {
      p++;
      const n = unary();
      return (ctx) => +n(ctx);
    }
    if (isOp('-')) {
      p++;
      const n = unary();
      return (ctx) => -n(ctx);
    }
    if (isOp('!')) {
      p++;
      const n = unary();
      return (ctx) => !n(ctx);
    }
    return primary();
  }

  function callNode(raw, args) {
    const parts = raw.toLowerCase().split('.');
    if (parts.length === 2 && parts[0] === 'math') {
      const fn = FUNCTIONS.get(parts[1]);
      if (fn) {
        const n = args.length;
        if (n === 0) return () => fn();
        if (n === 1) {
          const a = args[0];
          return (ctx) => fn(a(ctx));
        }
        if (n === 2) {
          const a = args[0];
          const b = args[1];
          return (ctx) => fn(a(ctx), b(ctx));
        }
        if (n === 3) {
          const a = args[0];
          const b = args[1];
          const c = args[2];
          return (ctx) => fn(a(ctx), b(ctx), c(ctx));
        }
        return (ctx) => fn(...args.map((x) => x(ctx)));
      }
    }
    // Unknown function: args were still parsed, the call itself is inert.
    return ZERO;
  }

  function variableNode(raw) {
    const name = raw.toLowerCase();
    if (name === 'true') return CONST(1);
    if (name === 'false') return CONST(0);

    const dot = name.indexOf('.');
    if (dot < 0) return ZERO;

    const head = name.slice(0, dot);
    const tail = name.slice(dot + 1);
    if (head === 'math') return tail === 'pi' ? CONST(Math.PI) : ZERO;

    const ns = NAMESPACES[head];
    if (!ns) return ZERO;

    const key = `${ns}_${tail}`;
    return (ctx) => (ctx && ctx[key]) || 0;
  }

  function primary() {
    const tok = tokens[p];
    if (!tok) throw new Error('molang: unexpected end');

    if (tok.t === 'n') {
      p++;
      return CONST(tok.v);
    }

    if (tok.t === 'i') {
      p++;
      if (isOp('(')) {
        p++;
        const args = [];
        if (!isOp(')')) {
          args.push(expr());
          while (isOp(',')) {
            p++;
            args.push(expr());
          }
        }
        take(')');
        return callNode(tok.v, args);
      }
      return variableNode(tok.v);
    }

    if (tok.t === 'o' && tok.v === '(') {
      p++;
      const node = expr();
      take(')');
      return node;
    }

    throw new Error('molang: unexpected token');
  }

  const node = expr();
  if (p !== tokens.length) throw new Error('molang: trailing tokens');
  return node;
}

export function compileMolang(expr) {
  if (typeof expr === 'number') return Number.isFinite(expr) ? () => expr : () => 0;
  if (typeof expr === 'boolean') return () => (expr ? 1 : 0);

  const src = String(expr ?? '').trim();
  if (src === '') return () => 0;

  const num = Number(src);
  if (Number.isFinite(num)) return () => num;

  let node;
  try {
    node = parse(tokenize(src));
  } catch {
    return () => 0;
  }

  return (ctx) => {
    try {
      const v = Number(node(ctx));
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  };
}
