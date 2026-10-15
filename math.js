// Math question generators. Each returns { text, answer (number), display (string), explain }.
// gen(level, difficulty) — level 0..3, difficulty 1..10.

const MathGen = (() => {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
  const neg = (n) => (n < 0 ? `(−${-n})` : `${n}`);
  const sgn = (n) => (n < 0 ? `−${-n}` : `${n}`);
  const fracStr = (n, d) => {
    const g = gcd(n, d); n /= g; d /= g;
    if (d < 0) { n = -n; d = -d; }
    return d === 1 ? sgn(n) : `${sgn(n)}/${d}`;
  };
  const Q = (text, answer, explain, display) => ({ text, answer, explain, display: display ?? sgn(answer) });

  const NAMES = ['the dragon', 'a goblin', 'the wizard', 'a pirate', 'the knight', 'a fox'];
  const ITEMS = ['gems', 'eggs', 'coins', 'apples', 'feathers', 'shells'];

  // ---------- Level 0: Seedling (ages 5–7) ----------
  function seedling(d) {
    switch (d) {
      case 1: { const a = ri(0, 5), b = ri(0, 5); return Q(`${a} + ${b}`, a + b, `Start at ${a} and count up ${b}: ${a + b}.`); }
      case 2: { const a = ri(1, 9), b = ri(0, 10 - a); return Q(`${a} + ${b}`, a + b, `${a} and ${b} more makes ${a + b}.`); }
      case 3: { const a = ri(2, 10), b = ri(0, a); return Q(`${a} − ${b}`, a - b, `Start at ${a} and count back ${b}: ${a - b}.`); }
      case 4: {
        if (Math.random() < 0.5) { const a = ri(3, 10), b = ri(1, 10 - a); return Q(`${a} + ${b}`, a + b, `${a} + ${b} = ${a + b}.`); }
        const a = ri(4, 10), b = ri(1, a); return Q(`${a} − ${b}`, a - b, `${a} take away ${b} leaves ${a - b}.`);
      }
      case 5: { const a = ri(6, 12), b = ri(3, 9); return Q(`${a} + ${b}`, a + b, `${a} + ${b} = ${a + b}. Tip: fill up to 10 first, then add what is left.`); }
      case 6: { const a = ri(11, 20), b = ri(2, 9); return Q(`${a} − ${b}`, a - b, `Count back ${b} from ${a}: ${a - b}.`); }
      case 7: { const c = ri(5, 10), a = ri(1, c - 1); return Q(`${a} + ? = ${c}`, c - a, `What do you add to ${a} to get ${c}? ${c} − ${a} = ${c - a}.`); }
      case 8: {
        if (Math.random() < 0.5) { const a = ri(3, 10); return Q(`${a} + ${a}`, 2 * a, `Doubles! ${a} + ${a} = ${2 * a}.`); }
        const t = ri(1, 5) * 10, o = ri(1, 9); return Q(`${t} + ${o}`, t + o, `${t / 10} tens and ${o} ones make ${t + o}.`);
      }
      case 9: { const a = ri(1, 6), b = ri(1, 6), c = ri(1, 6); return Q(`${a} + ${b} + ${c}`, a + b + c, `${a} + ${b} = ${a + b}, then + ${c} = ${a + b + c}.`); }
      default: {
        if (Math.random() < 0.5) { const a = ri(11, 40), b = ri(10, 50); const fix = (a % 10) + (b % 10) > 9 ? b - (b % 10) : b; return Q(`${a} + ${fix}`, a + fix, `Add tens, then ones: ${a} + ${fix} = ${a + fix}.`); }
        const a = ri(25, 59), b = ri(1, a % 10) + 10 * ri(0, Math.floor(a / 10) - 1); return Q(`${a} − ${b}`, a - b, `Subtract tens, then ones: ${a} − ${b} = ${a - b}.`);
      }
    }
  }

  // ---------- Level 1: Explorer (ages 8–10) ----------
  function explorer(d) {
    switch (d) {
      case 1: { const a = ri(15, 89), b = ri(3, 9); return Q(`${a} + ${b}`, a + b, `${a} + ${b} = ${a + b}.`); }
      case 2: {
        const a = ri(20, 99), b = ri(11, 60);
        return Math.random() < 0.5 ? Q(`${a} + ${b}`, a + b, `Tens: ${a - a % 10} + ${b - b % 10}, ones: ${a % 10} + ${b % 10}. Total ${a + b}.`)
          : (a > b ? Q(`${a} − ${b}`, a - b, `${a} − ${b} = ${a - b}.`) : Q(`${b + a} − ${b}`, a, `${b + a} − ${b} = ${a}.`));
      }
      case 3: { const a = pick([2, 5, 10]), b = ri(1, 10); return Q(`${a} × ${b}`, a * b, `Skip-count by ${a}, ${b} times: ${a * b}.`); }
      case 4: { const a = ri(2, 6), b = ri(2, 10); return Q(`${a} × ${b}`, a * b, `${a} groups of ${b} is ${a * b}.`); }
      case 5: { const a = ri(3, 12), b = ri(3, 12); return Q(`${a} × ${b}`, a * b, `${a} × ${b} = ${a * b}.`); }
      case 6: { const a = ri(2, 12), b = ri(2, 12); return Q(`${a * b} ÷ ${a}`, b, `Think: ${a} × ? = ${a * b}. It's ${b}.`); }
      case 7: {
        const a = ri(220, 799), b = ri(101, 199);
        return Math.random() < 0.5 ? Q(`${a} + ${b}`, a + b, `Hundreds, tens, ones: ${a} + ${b} = ${a + b}.`) : Q(`${a} − ${b}`, a - b, `${a} − ${b} = ${a - b}.`);
      }
      case 8: { const a = ri(12, 49), b = ri(3, 9); return Q(`${a} × ${b}`, a * b, `${a - a % 10} × ${b} = ${(a - a % 10) * b}, ${a % 10} × ${b} = ${(a % 10) * b}. Add: ${a * b}.`); }
      case 9: {
        if (Math.random() < 0.5) { const a = ri(3, 12), b = ri(3, 12); return Q(`? × ${a} = ${a * b}`, b, `${a * b} ÷ ${a} = ${b}.`); }
        const n = pick(NAMES), it = pick(ITEMS), bags = ri(3, 9), each = ri(4, 12);
        return Q(`${n[0].toUpperCase() + n.slice(1)} has ${bags} bags with ${each} ${it} in each. How many ${it} in total?`, bags * each, `${bags} × ${each} = ${bags * each}.`);
      }
      default: {
        if (Math.random() < 0.5) { const a = ri(3, 9), b = ri(3, 9), c = ri(2, 20); return Q(`${a} × ${b} + ${c}`, a * b + c, `Multiply first: ${a} × ${b} = ${a * b}, then + ${c} = ${a * b + c}.`); }
        const it = pick(ITEMS), total = ri(4, 12) * ri(3, 9), kids = [3, 4, 5, 6, 7, 8, 9].find((k) => total % k === 0 && total / k > 1) || 1;
        return Q(`${total} ${it} are shared equally between ${kids} friends. How many does each friend get?`, total / kids, `${total} ÷ ${kids} = ${total / kids}.`);
      }
    }
  }

  // ---------- Level 2: Adventurer (ages 11–13) ----------
  function adventurer(d) {
    switch (d) {
      case 1: { const a = -ri(2, 15), b = ri(2, 20); return Math.random() < 0.5 ? Q(`${sgn(a)} + ${b}`, a + b, `Start at ${sgn(a)} and move ${b} right: ${sgn(a + b)}.`) : Q(`${b} + ${neg(a)}`, a + b, `Adding a negative is subtracting: ${b} − ${-a} = ${sgn(a + b)}.`); }
      case 2: {
        if (Math.random() < 0.5) { const a = ri(-12, 12) || 3, b = -ri(2, 12); return Q(`${sgn(a)} × ${neg(b)}`, a * b, `${a < 0 ? 'Negative × negative is positive' : 'Positive × negative is negative'}: ${sgn(a * b)}.`); }
        const a = ri(-10, 10), b = -ri(2, 12); return Q(`${sgn(a)} − ${neg(b)}`, a - b, `Subtracting a negative is adding: ${sgn(a)} + ${-b} = ${sgn(a - b)}.`);
      }
      case 3: {
        const a = ri(2, 20), b = ri(2, 9), c = ri(2, 9);
        return pick([
          () => Q(`${a} + ${b} × ${c}`, a + b * c, `Multiply before adding: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`),
          () => Q(`(${a} + ${b}) × ${c}`, (a + b) * c, `Brackets first: ${a + b}, then × ${c} = ${(a + b) * c}.`),
          () => Q(`${a * c + b * c} ÷ ${c} − ${b}`, a, `Divide first: ${a * c + b * c} ÷ ${c} = ${a + b}, then − ${b} = ${a}.`),
        ])();
      }
      case 4: { const den = ri(5, 12), a = ri(1, den - 2), b = ri(1, den - a - 1); return Q(`${a}/${den} + ${b}/${den}`, (a + b) / den, `Same bottom, add the tops: ${a + b}/${den}${gcd(a + b, den) > 1 ? ' = ' + fracStr(a + b, den) : ''}.`, fracStr(a + b, den)); }
      case 5: { const p = pick([10, 20, 25, 50, 75, 5]), base = ri(1, 12) * (p === 25 || p === 75 ? 4 : p === 5 ? 20 : 10); return Q(`${p}% of ${base}`, (p * base) / 100, `${p}% means ${p}/100. ${base} × ${p} ÷ 100 = ${(p * base) / 100}.`); }
      case 6: {
        const d1 = pick([2, 3, 4, 5]), d2 = pick([3, 4, 6, 8].filter((x) => x !== d1)), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1);
        const N = n1 * d2 + n2 * d1, D = d1 * d2;
        return Q(`${n1}/${d1} + ${n2}/${d2}`, N / D, `Common bottom ${D}: ${n1 * d2}/${D} + ${n2 * d1}/${D} = ${N}/${D}${gcd(N, D) > 1 ? ' = ' + fracStr(N, D) : ''}.`, fracStr(N, D));
      }
      case 7: {
        if (Math.random() < 0.5) { const a = ri(1, 9) / 10, b = ri(2, 9); const r = Math.round(a * b * 10) / 10; return Q(`${a} × ${b}`, r, `${a * 10} × ${b} = ${Math.round(a * b * 10)}, then divide by 10: ${r}.`); }
        const a = ri(10, 99) / 10, b = ri(10, 99) / 100 * 10; const A = Math.round(a * 10) / 10, B = Math.round(b * 100) / 100; const r = Math.round((A + B) * 100) / 100;
        return Q(`${A} + ${B}`, r, `Line up the decimal points: ${A} + ${B} = ${r}.`);
      }
      case 8: {
        const x = ri(2, 15);
        if (Math.random() < 0.5) { const a = ri(2, 20); return Q(`x + ${a} = ${x + a}.  x = ?`, x, `Subtract ${a} from both sides: x = ${x + a} − ${a} = ${x}.`); }
        const a = ri(2, 9); return Q(`${a}x = ${a * x}.  x = ?`, x, `Divide both sides by ${a}: x = ${a * x} ÷ ${a} = ${x}.`);
      }
      case 9: { const x = ri(1, 12), a = ri(2, 9), b = ri(1, 20); return Q(`${a}x + ${b} = ${a * x + b}.  x = ?`, x, `Subtract ${b}: ${a}x = ${a * x}. Divide by ${a}: x = ${x}.`); }
      default: {
        return pick([
          () => { const b = ri(2, 3), e = b === 2 ? ri(4, 8) : ri(2, 4); return Q(`${b}^${e}  (${b} to the power ${e})`, b ** e, `Multiply ${b} by itself ${e} times: ${b ** e}.`); },
          () => { const r = ri(4, 15); return Q(`√${r * r}`, r, `${r} × ${r} = ${r * r}, so √${r * r} = ${r}.`); },
          () => { const r = ri(11, 20); return Q(`${r}²`, r * r, `${r} × ${r} = ${r * r}.`); },
        ])();
      }
    }
  }

  // ---------- Level 3: Mastermind (ages 14+) ----------
  function mastermind(d) {
    switch (d) {
      case 1: { const x = ri(-9, 12), a = ri(2, 9), b = ri(2, 20); return Q(`${a}x − ${b} = ${sgn(a * x - b)}.  x = ?`, x, `Add ${b}: ${a}x = ${sgn(a * x)}. Divide by ${a}: x = ${sgn(x)}.`); }
      case 2: {
        const x = ri(-6, 10), c = ri(2, 6), a = c + ri(1, 6), b = ri(-10, 10), dd = (a - c) * x + b;
        return Q(`${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${c}x ${dd < 0 ? '−' : '+'} ${Math.abs(dd)}.  x = ?`, x, `Move x terms left, numbers right: ${a - c}x = ${sgn(dd - b)}, so x = ${sgn(x)}.`);
      }
      case 3: {
        const a = ri(2, 9), b = ri(2, 9);
        return pick([
          () => Q(`2^${a} · 2^${b} = 2^?`, a + b, `Same base, multiply → add exponents: ${a} + ${b} = ${a + b}.`),
          () => Q(`(x^${a})^${b} = x^?`, a * b, `Power of a power → multiply exponents: ${a} × ${b} = ${a * b}.`),
          () => { const big = a + b; return Q(`x^${big} ÷ x^${b} = x^?`, a, `Same base, divide → subtract exponents: ${big} − ${b} = ${a}.`); },
        ])();
      }
      case 4: {
        const a = ri(1, 4), b = ri(-6, 6), c = ri(-9, 9), x = ri(-4, 4), v = a * x * x + b * x + c;
        return Q(`f(x) = ${a === 1 ? '' : a}x² ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)}.  Find f(${x}).`, v,
          `${a}·(${x})² = ${a * x * x}, ${b}·(${x}) = ${b * x}, plus ${sgn(c)}: total ${sgn(v)}.`);
      }
      case 5: {
        const m = ri(-5, 5) || 2, x1 = ri(-5, 5), y1 = ri(-9, 9), dx = ri(1, 5), x2 = x1 + dx, y2 = y1 + m * dx;
        return Q(`Slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`, m, `Rise ÷ run = (${y2} − ${neg(y1)}) ÷ (${x2} − ${neg(x1)}) = ${m * dx} ÷ ${dx} = ${sgn(m)}.`);
      }
      case 6: { const x = ri(-5, 15), y = ri(-5, 15); return Q(`x + y = ${x + y}  and  x − y = ${sgn(x - y)}.  x = ?`, x, `Add the equations: 2x = ${sgn(2 * x)}, so x = ${sgn(x)}.`); }
      case 7: {
        let r1 = ri(-8, 9), r2 = ri(-8, 9); if (r1 === r2) r2 = r1 + ri(1, 4);
        const s = -(r1 + r2), p = r1 * r2, big = Math.max(r1, r2);
        return Q(`x² ${s < 0 ? '−' : '+'} ${Math.abs(s)}x ${p < 0 ? '−' : '+'} ${Math.abs(p)} = 0.  What is the LARGER root?`, big,
          `Factor: (x ${r1 < 0 ? '+' : '−'} ${Math.abs(r1)})(x ${r2 < 0 ? '+' : '−'} ${Math.abs(r2)}) = 0 → x = ${sgn(r1)} or ${sgn(r2)}. Larger: ${sgn(big)}.`);
      }
      case 8: { const b = pick([2, 3, 5, 10]), k = b === 2 ? ri(3, 10) : b === 10 ? ri(2, 6) : ri(2, 5); return Q(`log₍${b}₎ ${b ** k}`, k, `${b}^${k} = ${b ** k}, so log base ${b} of ${b ** k} is ${k}.`); }
      case 9: {
        const a = ri(1, 5), n = ri(2, 4), x = ri(-3, 3), v = a * n * x ** (n - 1);
        return Q(`f(x) = ${a === 1 ? '' : a}x^${n}.  What is f′(${x})?`, v, `Power rule: f′(x) = ${a * n}x^${n - 1}. At x = ${x}: ${sgn(v)}.`);
      }
      default: {
        return pick([
          () => { const n = ri(5, 9), r = ri(2, 3); let c = 1; for (let i = 0; i < r; i++) c = (c * (n - i)) / (i + 1); return Q(`How many ways to choose ${r} eggs from ${n}?  (${n}C${r})`, c, `${n}C${r} = ${n}! ÷ (${r}!·${n - r}!) = ${c}.`); },
          () => { const a = ri(1, 9), dd = ri(2, 7), n = ri(10, 30), v = a + (n - 1) * dd; return Q(`Sequence ${a}, ${a + dd}, ${a + 2 * dd}, …  What is term #${n}?`, v, `a + (n−1)d = ${a} + ${n - 1}×${dd} = ${v}.`); },
        ])();
      }
    }
  }

  const LEVELS = [
    { name: 'Seedling', ages: 'Ages 5–7', desc: 'Adding & taking away up to 20', emoji: '🌱', fn: seedling, choices: true },
    { name: 'Explorer', ages: 'Ages 8–10', desc: 'Times tables, division, big numbers', emoji: '🧭', fn: explorer },
    { name: 'Adventurer', ages: 'Ages 11–13', desc: 'Negatives, fractions, %, equations', emoji: '⚔️', fn: adventurer },
    { name: 'Mastermind', ages: 'Ages 14+', desc: 'Algebra, quadratics, logs, calculus', emoji: '🧠', fn: mastermind },
  ];

  function gen(level, d) {
    d = Math.max(1, Math.min(10, Math.round(d)));
    const q = LEVELS[level].fn(d);
    q.difficulty = d;
    if (LEVELS[level].choices) q.choices = choicesFor(q.answer);
    return q;
  }

  function choicesFor(ans) {
    const set = new Set([ans]);
    let tries = 0;
    while (set.size < 4 && tries++ < 50) {
      const c = ans + pick([-3, -2, -1, 1, 2, 3, 10, -10]);
      if (c >= 0) set.add(c);
    }
    return [...set].sort(() => Math.random() - 0.5);
  }

  // Parse user input: integers, decimals, fractions ("3/4"), mixed ("1 1/2"), unicode minus.
  function parse(str) {
    const s = String(str).trim().replace(/[−–]/g, '-').replace(/^x\s*=\s*/i, '').replace(/,/g, '');
    if (!s) return NaN;
    let m = s.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/);
    if (m) { const v = +m[2] + +m[3] / +m[4]; return m[1] ? -v : v; }
    m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
    if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
    return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
  }

  function check(q, input) {
    const v = typeof input === 'number' ? input : parse(input);
    if (!isFinite(v)) return false;
    const tol = Number.isInteger(q.answer) ? 1e-9 : 0.01;
    return Math.abs(v - q.answer) <= tol;
  }

  return { gen, check, parse, LEVELS };
})();

if (typeof module !== 'undefined') module.exports = MathGen;
