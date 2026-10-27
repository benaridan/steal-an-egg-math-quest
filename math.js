// Math questions, grouped by school grade (from skills/math.txt). The player ticks the topics they want;
// gen(topicIds, difficulty) picks one of them and builds a question.
// difficulty 1..10 rises with zone depth and egg rarity: it makes the numbers bigger and the steps trickier,
// and leans the pick toward the later (harder) topics in the player's list.
// A question is { text, answer, explain, display, choices?, svg?, tol? }:
//  - answer is a number (typed), or the right option's text when there are choices
//  - svg is a picture (clock, chart, shape...) shown under the text
//  - explain doubles as the hint (the answer inside it is hidden)

const MathGen = (() => {
  // ---------- helpers ----------
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  const N = (n) => r6(n).toLocaleString('en-US', { maximumFractionDigits: 6 });
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const pad2 = (m) => String(m).padStart(2, '0');
  const money = (cents) => (cents % 100 === 0 ? `$${N(cents / 100)}` : `$${(cents / 100).toFixed(2)}`);
  const frac = (n, d) => { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? `${n}` : `${n}/${d}`; };
  const mixed = (n, d) => { const g = gcd(n, d); n /= g; d /= g; const w = Math.floor(n / d), r = n % d; return r === 0 ? `${w}` : w ? `${w} ${r}/${d}` : `${r}/${d}`; };
  const factorsOf = (n) => { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f; };
  const isPrime = (n) => n > 1 && factorsOf(n).length === 2;

  const NAMES = ['Maya', 'Leo', 'Ava', 'Noah', 'Zoe', 'Sam', 'Lily', 'Omar', 'Mia', 'Ben', 'Nina', 'Kai'];
  const ITEMS = ['gems', 'eggs', 'coins', 'stickers', 'marbles', 'cards', 'shells', 'feathers'];
  const who = () => pick(NAMES);

  const Q = (text, answer, explain, o = {}) => ({ text, answer, explain, display: N(answer), ...o });
  // Multiple choice: the answer is the right option's text.
  const MC = (text, right, wrong, explain, o = {}) => {
    const opts = [String(right)];
    for (const w of wrong) { const s = String(w); if (!opts.includes(s) && opts.length < 4) opts.push(s); }
    return { text, answer: String(right), explain, display: String(right), choices: shuffle(opts), ...o };
  };
  const TF = (text, truth, explain) => MC(text, truth ? 'True' : 'False', [truth ? 'False' : 'True'], explain);
  const SIGN = (a, b) => (a > b ? '>' : a < b ? '<' : '=');

  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function words(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + words(n % 100) : '');
    for (const [v, w] of [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]) {
      if (n >= v) return words(Math.floor(n / v)) + ' ' + w + (n % v ? ' ' + words(n % v) : '');
    }
    return String(n);
  }
  const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
  // a number with `digits` digits; zeros appear inside it with probability z
  function withZeros(digits, z = 0) {
    let s = String(ri(1, 9));
    for (let i = 1; i < digits; i++) s += chance(z) ? '0' : String(ri(1, 9));
    return +s;
  }
  function distinctDigits(digits) {
    const ds = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).slice(0, digits);
    if (ds[0] === 0) [ds[0], ds[1]] = [ds[1], ds[0]];
    return +ds.join('');
  }
  // numbers a child might confuse with n: swapped digits and a slipped place value
  function lookalikes(n) {
    const s = String(n), out = [];
    for (let i = 0; i < s.length - 1; i++) if (s[i] !== s[i + 1] && !(i === 0 && s[1] === '0')) out.push(+(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2)));
    const p = 10 ** ri(1, Math.max(1, s.length - 1));
    out.push(n + p, n - p > 0 ? n - p : n + 2 * p);
    return shuffle(out);
  }
  // two numbers with `digits` digits for column addition; carry = whether some column must carry
  function addPair(digits, carry) {
    for (;;) {
      const a = [], b = [];
      for (let i = 0; i < digits; i++) {
        const top = i === 0;
        const x = ri(top ? 1 : 0, carry ? 9 : 8);
        a.push(x); b.push(carry ? ri(top ? 1 : 0, 9) : ri(top ? 1 : 0, Math.max(top ? 1 : 0, 9 - x)));
      }
      const A = +a.join(''), B = +b.join('');
      const carries = a.some((x, i) => x + b[i] > 9);
      if (carry === carries && (carry || a.every((x, i) => x + b[i] <= 9))) return [A, B];
    }
  }
  function subPair(digits, borrow) {
    for (;;) {
      const a = [], b = [];
      for (let i = 0; i < digits; i++) {
        const top = i === 0, x = ri(top ? 2 : 0, 9);
        a.push(x); b.push(borrow ? ri(top ? 1 : 0, top ? x - 1 : 9) : ri(top ? 1 : 0, Math.max(top ? 1 : 0, x)));
      }
      const A = +a.join(''), B = +b.join('');
      if (B >= A || B <= 0) continue;
      const borrows = a.some((x, i) => x < b[i]);
      if (borrow === borrows) return [A, B];
    }
  }

  // ---------- pictures (inline SVG; light lines on the dark quiz panel) ----------
  const C = { line: '#cfd3db', fill: '#ffcc33', empty: '#2a2d36', blue: '#5ab0ff', green: '#4cd28a', red: '#ff6b7a', purple: '#b88cff', text: '#f4f5f7', muted: '#8a90a0' };
  const PAL = [C.fill, C.blue, C.green, C.red, C.purple, '#ff9a3c'];
  const svg = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" class="qsvg" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${body}</svg>`;
  const tx = (x, y, s, size = 14, anchor = 'middle', fill = C.text) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${s}</text>`;
  const ln = (x1, y1, x2, y2, col = C.line, w = 2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" ${extra}/>`;
  const f1 = (x) => Math.round(x * 10) / 10;

  function fracBar(k, n) {
    const w = 280 / n;
    let b = '';
    for (let i = 0; i < n; i++) b += `<rect x="${f1(10 + i * w)}" y="10" width="${f1(w)}" height="44" fill="${i < k ? C.fill : C.empty}" stroke="${C.line}" stroke-width="2"/>`;
    return svg(300, 64, b, 'fraction bar');
  }
  function fracPie(k, n) {
    let b = '';
    const cx = 70, cy = 70, r = 60;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      b += `<path d="M${cx},${cy} L${f1(cx + r * Math.cos(a0))},${f1(cy + r * Math.sin(a0))} A${r},${r} 0 ${1 / n > 0.5 ? 1 : 0} 1 ${f1(cx + r * Math.cos(a1))},${f1(cy + r * Math.sin(a1))} Z" fill="${i < k ? C.fill : C.empty}" stroke="${C.line}" stroke-width="2"/>`;
    }
    return svg(140, 140, b, 'fraction circle');
  }
  function dots(counts, cols = 6) {
    const all = counts.flatMap((c, i) => Array(c).fill(PAL[i]));
    const rows = Math.ceil(all.length / cols), W = Math.min(all.length, cols) * 40 + 10;
    return svg(W, rows * 40 + 10, all.map((c, i) => `<circle cx="${25 + (i % cols) * 40}" cy="${25 + Math.floor(i / cols) * 40}" r="15" fill="${c}" stroke="${C.line}" stroke-width="2"/>`).join(''), 'counters');
  }
  function clock(h, m) {
    let b = `<circle cx="80" cy="80" r="70" fill="#1b1d24" stroke="${C.line}" stroke-width="4"/>`;
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * 2 * Math.PI - Math.PI / 2; b += tx(f1(80 + 55 * Math.cos(a)), f1(85 + 55 * Math.sin(a)), i, 15); }
    for (let i = 0; i < 60; i++) { const a = (i / 60) * 2 * Math.PI, r0 = i % 5 ? 66 : 62; b += ln(f1(80 + r0 * Math.sin(a)), f1(80 - r0 * Math.cos(a)), f1(80 + 70 * Math.sin(a)), f1(80 - 70 * Math.cos(a)), C.muted, 1.5); }
    const ha = (((h % 12) + m / 60) / 12) * 2 * Math.PI, ma = (m / 60) * 2 * Math.PI;
    b += ln(80, 80, f1(80 + 34 * Math.sin(ha)), f1(80 - 34 * Math.cos(ha)), C.fill, 6, 'stroke-linecap="round"');
    b += ln(80, 80, f1(80 + 54 * Math.sin(ma)), f1(80 - 54 * Math.cos(ma)), C.blue, 4, 'stroke-linecap="round"');
    return svg(160, 160, b + `<circle cx="80" cy="80" r="5" fill="${C.text}"/>`, 'clock');
  }
  // ticks 0..count; labels at the given tick indexes (label(i) gives the text); arrow at tick `mark`
  function numberLine(count, labelAt, label, mark) {
    const x = (i) => f1(20 + (i * 300) / count);
    let b = ln(10, 50, 330, 50, C.line, 3);
    for (let i = 0; i <= count; i++) b += ln(x(i), labelAt.includes(i) ? 38 : 42, x(i), labelAt.includes(i) ? 62 : 58, C.line, 2);
    for (const i of labelAt) b += tx(x(i), 82, label(i), 15);
    b += `<path d="M${x(mark)},44 l-8,-16 h16 Z" fill="${C.red}"/>`;
    return svg(340, 92, b, 'number line');
  }
  function grid(cols, rows, cells) {
    const s = Math.min(28, Math.floor(280 / cols));
    let b = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) b += `<rect x="${5 + x * s}" y="${5 + y * s}" width="${s}" height="${s}" fill="${cells.has(x + ',' + y) ? C.blue : C.empty}" stroke="${C.muted}" stroke-width="1.5"/>`;
    return svg(cols * s + 10, rows * s + 10, b, 'squares');
  }
  function barChart(cats, vals, step) {
    const top = Math.ceil(Math.max(...vals) / step + 0.5) * step, H = 150, W = 300, x0 = 44, y0 = 165, bw = Math.min(50, (W - x0) / cats.length - 14);
    const lines = top / step, every = lines > 10 ? 2 : 1;
    let b = '';
    for (let i = 0; i <= lines; i++) {
      const y = f1(y0 - (i * step * H) / top);
      b += ln(x0, y, W, y, i ? '#3a3e4a' : C.line, i ? 1 : 2);
      if (i % every === 0) b += tx(x0 - 6, y + 5, N(i * step), 12, 'end', C.muted);
    }
    cats.forEach((c, i) => {
      const x = f1(x0 + 12 + i * ((W - x0) / cats.length)), h = f1((vals[i] * H) / top);
      b += `<rect x="${x}" y="${f1(y0 - h)}" width="${f1(bw)}" height="${h}" fill="${PAL[i % PAL.length]}"/>` + tx(f1(x + bw / 2), y0 + 18, c, 13);
    });
    return svg(W + 10, y0 + 26, b, 'bar chart');
  }
  function polygonSvg(n, irregular) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI - Math.PI / 2, r = irregular ? 40 + Math.random() * 26 : 60; pts.push(`${f1(80 + r * Math.cos(a))},${f1(75 + r * Math.sin(a))}`); }
    return svg(160, 150, `<polygon points="${pts.join(' ')}" fill="${C.blue}55" stroke="${C.blue}" stroke-width="3"/>`, 'shape');
  }
  function angleSvg(deg) {
    const vx = deg > 100 ? 190 : 80, vy = 120, a = (deg * Math.PI) / 180;
    let b = ln(vx, vy, vx + 130, vy, C.line, 4) + ln(vx, vy, f1(vx + 120 * Math.cos(a)), f1(vy - 120 * Math.sin(a)), C.line, 4);
    if (deg === 90) b += `<path d="M${vx + 20},${vy} v-20 h-20" fill="none" stroke="${C.fill}" stroke-width="3"/>`;
    else b += `<path d="M${vx + 28},${vy} A28,28 0 0 0 ${f1(vx + 28 * Math.cos(a))},${f1(vy - 28 * Math.sin(a))}" fill="none" stroke="${C.fill}" stroke-width="3"/>`;
    return svg(340, 135, b, 'angle');
  }
  function linesSvg(kind) {
    let b;
    if (kind === 'parallel') { const s = ri(-30, 30); b = ln(30, 40 + s, 290, 40 - s, C.blue, 4) + ln(30, 100 + s, 290, 100 - s, C.blue, 4); }
    else if (kind === 'perpendicular') b = ln(40, 70, 280, 70, C.blue, 4) + ln(160, 10, 160, 130, C.blue, 4) + `<path d="M176,70 v-16 h-16" fill="none" stroke="${C.fill}" stroke-width="3"/>`;
    else { const a = ri(25, 60) * (Math.PI / 180); b = ln(40, 70, 280, 70, C.blue, 4) + ln(f1(160 - 70 * Math.cos(a)), f1(70 + 60 * Math.sin(a)), f1(160 + 70 * Math.cos(a)), f1(70 - 60 * Math.sin(a)), C.blue, 4); }
    return svg(320, 140, b, 'lines');
  }
  function rectSvg(w, h, lw, lh) {
    const k = Math.min(220 / w, 110 / h), W = f1(w * k), H = f1(h * k);
    return svg(300, 150, `<rect x="40" y="15" width="${W}" height="${H}" fill="${C.green}44" stroke="${C.green}" stroke-width="3"/>` + tx(f1(40 + W / 2), f1(15 + H + 20), lw, 15) + tx(f1(40 + W + 8), f1(15 + H / 2 + 5), lh, 15, 'start'), 'rectangle');
  }
  // triangle or parallelogram with its height dashed in; labels: base, height and the slanted side
  function heightSvg(kind, lb, lh, ls) {
    const B = 170, H = 100, off = kind === 'tri' ? 120 : 60, x0 = 40, y0 = 125;
    const pts = kind === 'tri' ? [[x0, y0], [x0 + B, y0], [x0 + off, y0 - H]] : [[x0, y0], [x0 + B, y0], [x0 + B + off, y0 - H], [x0 + off, y0 - H]];
    const foot = x0 + off;
    let b = `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${C.purple}44" stroke="${C.purple}" stroke-width="3"/>`;
    b += ln(foot, y0 - H, foot, y0, C.fill, 2.5, 'stroke-dasharray="6 5"') + `<path d="M${foot},${y0 - 12} h12 v12" fill="none" stroke="${C.fill}" stroke-width="2"/>`;
    b += tx(x0 + B / 2, y0 + 20, lb, 15) + tx(foot + 16, y0 - H / 2 + 5, lh, 15, 'start', C.fill);
    const sx = kind === 'tri' ? (x0 + B + x0 + off) / 2 + 12 : (x0 + x0 + off) / 2 - 10;
    b += tx(f1(sx), y0 - H / 2, ls, 15, kind === 'tri' ? 'start' : 'end');
    return svg(kind === 'tri' ? 300 : 330, 150, b, kind === 'tri' ? 'triangle' : 'parallelogram');
  }
  function circleSvg(lbl, kind) {
    let b = `<circle cx="80" cy="80" r="66" fill="${C.blue}33" stroke="${C.blue}" stroke-width="3"/><circle cx="80" cy="80" r="4" fill="${C.text}"/>`;
    b += kind === 'd' ? ln(14, 80, 146, 80, C.fill, 3) : ln(80, 80, 146, 80, C.fill, 3);
    return svg(240, 160, b + tx(156, 85, lbl, 15, 'start'), 'circle');
  }
  function cuboidSvg(ll, lw, lh) {
    const p = (x, y) => `${x},${y}`, X = 30, Y = 50, L = 150, H = 80, D = 40;
    let b = `<polygon points="${p(X, Y)} ${p(X + L, Y)} ${p(X + L, Y + H)} ${p(X, Y + H)}" fill="${C.green}44" stroke="${C.green}" stroke-width="3"/>`;
    b += `<polygon points="${p(X, Y)} ${p(X + D, Y - D * 0.7)} ${p(X + L + D, Y - D * 0.7)} ${p(X + L, Y)}" fill="${C.green}66" stroke="${C.green}" stroke-width="3"/>`;
    b += `<polygon points="${p(X + L, Y)} ${p(X + L + D, Y - D * 0.7)} ${p(X + L + D, Y + H - D * 0.7)} ${p(X + L, Y + H)}" fill="${C.green}22" stroke="${C.green}" stroke-width="3"/>`;
    return svg(300, 160, b + tx(X + L / 2, Y + H + 22, ll, 15) + tx(X + L + D / 2 + 8, Y + H - 4, lw, 15, 'start') + tx(X - 6, Y + H / 2 + 5, lh, 15, 'end'), 'box');
  }
  function pieSvg(parts) {
    let b = '', a = -Math.PI / 2;
    const cx = 80, cy = 80, r = 68;
    parts.forEach((pt, i) => {
      const a1 = a + (pt.pct / 100) * 2 * Math.PI;
      b += `<path d="M${cx},${cy} L${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))} A${r},${r} 0 ${pt.pct > 50 ? 1 : 0} 1 ${f1(cx + r * Math.cos(a1))},${f1(cy + r * Math.sin(a1))} Z" fill="${PAL[i]}" stroke="#16181e" stroke-width="2"/>`;
      b += `<rect x="170" y="${20 + i * 26}" width="16" height="16" fill="${PAL[i]}"/>` + tx(194, 33 + i * 26, `${pt.label} ${pt.show ?? pt.pct + '%'}`, 14, 'start');
      a = a1;
    });
    return svg(330, 160, b, 'pie chart');
  }
  function ruler(len, maxCm) {
    const k = 280 / maxCm;
    let b = `<rect x="15" y="40" width="${f1(len * k)}" height="16" rx="4" fill="${C.red}"/><rect x="10" y="60" width="${f1(maxCm * k + 10)}" height="44" fill="#d9c27a" rx="4"/>`;
    for (let i = 0; i <= maxCm * 10; i++) { const x = f1(15 + (i * k) / 10); b += ln(x, 60, x, 60 + (i % 10 ? (i % 5 ? 7 : 11) : 16), '#3a2e10', 1.2); if (i % 10 === 0) b += tx(x, 96, i / 10, 12, 'middle', '#3a2e10'); }
    return svg(310, 112, b + tx(f1(15 + maxCm * k), 30, 'cm', 12, 'end', C.muted), 'ruler');
  }

  // ---------- word problem bits ----------
  const CHART_SETS = [
    { title: 'Favourite fruit', cats: ['Apple', 'Pear', 'Grape', 'Kiwi'] },
    { title: 'Pets in our class', cats: ['Dog', 'Cat', 'Fish', 'Bird'] },
    { title: 'Eggs stolen', cats: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { title: 'Favourite colour', cats: ['Red', 'Blue', 'Green', 'Yellow'] },
  ];
  function chartData(k, nCats, steps = [1, 2, 5, 10, 25]) {
    const set = pick(CHART_SETS), cats = set.cats.slice(0, Math.min(nCats, set.cats.length));
    const step = k.band(...steps), vals = cats.map(() => step * ri(1, 9));
    return { ...set, cats, vals, step };
  }
  function chartQuestion(k, ch) {
    const i = ri(0, ch.cats.length - 1); let j = ri(0, ch.cats.length - 1); if (j === i) j = (i + 1) % ch.cats.length;
    const vi = ch.vals[i], vj = ch.vals[j], s = barChart(ch.cats, ch.vals, ch.step), tot = ch.vals.reduce((a, b) => a + b, 0);
    const kinds = k.d <= 3 ? ['read', 'most'] : k.d <= 6 ? ['read', 'diff', 'sum2', 'most'] : ['diff', 'sum2', 'total', 'least'];
    switch (pick(kinds)) {
      case 'read': return Q(`${ch.title}: how many for ${ch.cats[i]}?`, vi, `Read across from the top of the ${ch.cats[i]} bar: ${vi}.`, { svg: s });
      case 'diff': if (vi === vj) return Q(`${ch.title}: how many for ${ch.cats[i]}?`, vi, `The ${ch.cats[i]} bar reaches ${vi}.`, { svg: s });
        return Q(`${ch.title}: how many more for ${vi > vj ? ch.cats[i] : ch.cats[j]} than ${vi > vj ? ch.cats[j] : ch.cats[i]}?`, Math.abs(vi - vj), `${Math.max(vi, vj)} − ${Math.min(vi, vj)} = ${Math.abs(vi - vj)}.`, { svg: s });
      case 'sum2': return Q(`${ch.title}: how many for ${ch.cats[i]} and ${ch.cats[j]} together?`, vi + vj, `${vi} + ${vj} = ${vi + vj}.`, { svg: s });
      case 'total': return Q(`${ch.title}: what is the total of all the bars?`, tot, `${ch.vals.join(' + ')} = ${tot}.`, { svg: s });
      case 'least': {
        const mn = Math.min(...ch.vals); if (ch.vals.filter((v) => v === mn).length > 1) return Q(`${ch.title}: what is the total of all the bars?`, tot, `${ch.vals.join(' + ')} = ${tot}.`, { svg: s });
        const c = ch.cats[ch.vals.indexOf(mn)]; return MC(`${ch.title}: which has the fewest?`, c, ch.cats.filter((x) => x !== c), `${c} has the shortest bar (${mn}).`, { svg: s });
      }
      default: {
        const mx = Math.max(...ch.vals); if (ch.vals.filter((v) => v === mx).length > 1) return Q(`${ch.title}: how many for ${ch.cats[i]}?`, vi, `The ${ch.cats[i]} bar reaches ${vi}.`, { svg: s });
        const c = ch.cats[ch.vals.indexOf(mx)]; return MC(`${ch.title}: which has the most?`, c, ch.cats.filter((x) => x !== c), `${c} has the tallest bar (${mx}).`, { svg: s });
      }
    }
  }
  // four-operation word problems, numbers sized by difficulty
  function oneStep(k) {
    const a = who(), it = pick(ITEMS);
    switch (pick(['add', 'sub', 'mul', 'div'])) {
      case 'add': { const x = k.ri(10, 40, 600), y = k.ri(5, 30, 400); return Q(`${a} has ${x} ${it} and finds ${y} more. How many ${it} now?`, x + y, `${x} + ${y} = ${x + y}.`); }
      case 'sub': { const x = k.ri(20, 50, 900), y = ri(5, x - 5); return Q(`${a} had ${x} ${it} and gave away ${y}. How many are left?`, x - y, `${x} − ${y} = ${x - y}.`); }
      case 'mul': { const x = k.ri(2, 5, 9), y = k.ri(2, 6, 12); return Q(`${a} fills ${x} bags with ${y} ${it} in each. How many ${it} is that?`, x * y, `${x} × ${y} = ${x * y}.`); }
      default: { const x = k.ri(2, 5, 9), y = k.ri(2, 6, 12); return Q(`${a} shares ${x * y} ${it} equally between ${x} friends. How many does each friend get?`, y, `${x * y} ÷ ${x} = ${y}.`); }
    }
  }
  function twoStep(k) {
    const a = who(), it = pick(ITEMS);
    switch (pick([0, 1, 2, 3])) {
      case 0: { const x = k.ri(5, 20, 80), p = k.ri(2, 4, 9), e = k.ri(2, 5, 10); return Q(`${a} has ${x} ${it} and buys ${p} packs of ${e}. How many ${it} now?`, x + p * e, `${p} × ${e} = ${p * e}, then ${x} + ${p * e} = ${x + p * e}.`); }
      case 1: { const p = k.ri(2, 5, 9), e = k.ri(3, 6, 12), g = ri(1, p * e - 1); return Q(`There are ${p} boxes with ${e} ${it} in each. ${a} gives away ${g}. How many are left?`, p * e - g, `${p} × ${e} = ${p * e}, then ${p * e} − ${g} = ${p * e - g}.`); }
      case 2: { const x = k.ri(10, 40, 300), y = k.ri(5, 30, 200), z = ri(1, x + y - 1); return Q(`${a} had ${x} ${it}, found ${y} more, then lost ${z}. How many now?`, x + y - z, `${x} + ${y} = ${x + y}, then − ${z} = ${x + y - z}.`); }
      default: { const f = k.ri(2, 4, 8), e = k.ri(2, 6, 10), extra = ri(1, f - 1 || 1); const tot = f * e + extra; return Q(`${tot} ${it} are shared equally between ${f} friends, and ${extra} are left over. How many does each friend get?`, e, `Take away the ${extra} left over: ${tot} − ${extra} = ${f * e}, then ${f * e} ÷ ${f} = ${e}.`); }
    }
  }

  // ---------- Grade 3 ----------
  const g3 = [
    ['read', 'Read and write numbers up to 10,000', (k) => {
      const n = withZeros(k.d <= 2 ? 3 : 4, k.t * 0.45);
      if (k.d <= 5) return MC(`Which number is “${words(n)}”?`, N(n), lookalikes(n).map(N), `“${words(n)}” is written ${N(n)}.`);
      return Q(`Write in digits: “${words(n)}”`, n, `“${cap(words(n))}” is ${N(n)}.`);
    }],
    ['place', 'Understand place value: ones, tens, hundreds, thousands', (k) => {
      const n = distinctDigits(k.d <= 3 ? 3 : 4), s = String(n), p = ri(0, s.length - 1 - (s[0] === '0' ? 1 : 0)), dg = +s[s.length - 1 - p];
      if (dg === 0 || chance(0.4)) return Q(`In ${N(n)}, which digit is in the ${PLACES[p]} place?`, dg, `Count places from the right: ones, tens, hundreds, thousands. The ${PLACES[p]} digit is ${dg}.`);
      if (p === 0) return Q(`In ${N(n)}, which digit is in the ${PLACES[p]} place?`, dg, `Count places from the right: ones, tens, hundreds, thousands. The ${PLACES[p]} digit is ${dg}.`);
      return Q(`What is the value of the digit ${dg} in ${N(n)}?`, dg * 10 ** p, `The ${dg} is in the ${PLACES[p]} place, so it is worth ${N(dg * 10 ** p)}.`);
    }],
    ['expand', 'Break numbers into place values', (k) => {
      const n = withZeros(k.d <= 3 ? 3 : 4, k.t * 0.4), s = String(n), parts = [...s].map((c, i) => +c * 10 ** (s.length - 1 - i)).filter((x) => x);
      if (k.d >= 8 && n >= 1000) { const th = Math.floor(n / 1000), te = ri(10, 19), o = ri(0, 9); const v = th * 1000 + te * 10 + o; return Q(`${th} thousands + ${te} tens + ${o} ones = ?`, v, `${te} tens is ${te * 10}, so ${N(th * 1000)} + ${te * 10} + ${o} = ${N(v)}.`); }
      if (parts.length > 2 && chance(0.5)) { const h = ri(0, parts.length - 1), miss = parts[h]; return Q(`${N(n)} = ${parts.map((x, i) => (i === h ? '?' : N(x))).join(' + ')}`, miss, `${N(n)} splits into ${parts.map(N).join(' + ')}, so the missing part is ${N(miss)}.`); }
      const shown = k.d >= 5 ? shuffle(parts) : parts;
      return Q(`${shown.map(N).join(' + ')} = ?`, n, `Put each part in its place: ${N(n)}.`);
    }],
    ['compare', 'Compare and order numbers', (k) => {
      const dig = k.d <= 3 ? 3 : 4, a = withZeros(dig, 0.2), b = pick(lookalikes(a).filter((x) => x > 0 && String(x).length === dig)) || a + 10;
      const kind = pick(k.d <= 4 ? ['sign', 'max'] : ['sign', 'max', 'order']);
      if (kind === 'sign') return MC(`Which sign goes in the gap?\n${N(a)}  ◻  ${N(b)}`, SIGN(a, b), ['<', '>', '='], `Compare from the biggest place: ${N(a)} ${SIGN(a, b)} ${N(b)}.`);
      const set = [...new Set([a, b, ...lookalikes(a)].filter((x) => x > 0))].slice(0, 4), big = chance(0.5), ans = big ? Math.max(...set) : Math.min(...set);
      if (kind === 'max') return MC(`Which number is the ${big ? 'largest' : 'smallest'}?`, N(ans), set.map(N), `Look at the thousands, then hundreds, then tens: ${N(ans)} is the ${big ? 'largest' : 'smallest'}.`);
      const three = set.slice(0, 3), right = [...three].sort((x, y) => x - y), wrongs = [[...right].reverse(), [right[1], right[0], right[2]], [right[0], right[2], right[1]]];
      return MC('Which list goes from smallest to largest?', right.map(N).join(', '), wrongs.map((w) => w.map(N).join(', ')), `Smallest to largest: ${right.map(N).join(', ')}.`);
    }],
    ['numline', 'Place numbers on a number line', (k) => {
      const step = k.band(1, 2, 5, 10, 25, 50, 100), start = step * k.ri(0, 5, 40), mark = ri(1, 9);
      const labels = k.d <= 3 ? [0, 5, 10] : [0, 10], v = start + mark * step;
      return Q('What number is the arrow pointing to?', v, `Each tick counts ${step}. ${mark} ticks after ${N(start)} is ${N(v)}.`, { svg: numberLine(10, labels, (i) => N(start + i * step), mark) });
    }],
    ['mental', 'Add mentally using tens and hundreds', (k) => {
      if (k.d <= 3) { const a = ri(11, 69), b = 10 * ri(1, 9 - Math.floor(a / 10)); return Q(`${a} + ${b}`, a + b, `Add the tens: ${a} + ${b} = ${a + b}.`); }
      if (k.d <= 6) { const a = ri(1, 7) * 100 + ri(1, 9) * 10, b = chance(0.5) ? 100 * ri(1, 2) : 10 * ri(2, 9); return Q(`${a} + ${b}`, a + b, `Count on in ${b % 100 ? 'tens' : 'hundreds'}: ${a} + ${b} = ${N(a + b)}.`); }
      const a = ri(12, 75) * 10, b = ri(12, 45) * 10, c = 100 * ri(1, 3); return Q(`${a} + ${b} + ${c}`, a + b + c, `${a} + ${b} = ${N(a + b)}, then + ${c} = ${N(a + b + c)}.`);
    }],
    ['addnc', 'Written addition without carrying', (k) => { const [a, b] = addPair(k.d <= 3 ? 2 : k.d <= 7 ? 3 : 4, false); return Q(`${N(a)} + ${N(b)}`, a + b, `Add each column from the ones: ${N(a)} + ${N(b)} = ${N(a + b)}.`); }],
    ['addc', 'Written addition with carrying', (k) => { const [a, b] = addPair(k.d <= 3 ? 2 : k.d <= 7 ? 3 : 4, true); return Q(`${N(a)} + ${N(b)}`, a + b, `Add the ones first and carry any ten to the next column: ${N(a)} + ${N(b)} = ${N(a + b)}.`); }],
    ['subnb', 'Written subtraction without borrowing', (k) => { const [a, b] = subPair(k.d <= 3 ? 2 : k.d <= 7 ? 3 : 4, false); return Q(`${N(a)} − ${N(b)}`, a - b, `Subtract each column from the ones: ${N(a)} − ${N(b)} = ${N(a - b)}.`); }],
    ['subb', 'Written subtraction with borrowing', (k) => { const [a, b] = subPair(k.d <= 3 ? 2 : k.d <= 7 ? 3 : 4, true); return Q(`${N(a)} − ${N(b)}`, a - b, `When the top digit is smaller, borrow 1 from the next column: ${N(a)} − ${N(b)} = ${N(a - b)}.`); }],
    ['subzero', 'Subtract across zeros', (k) => {
      const a = k.d <= 3 ? 100 * ri(1, 9) : k.d <= 6 ? 100 * ri(2, 9) + (chance(0.5) ? ri(1, 9) : 0) : 1000 * ri(2, 9) + (chance(0.5) ? ri(1, 9) : 0);
      const b = ri(Math.floor(a / 10) + 1, a - 1); return Q(`${N(a)} − ${N(b)}`, a - b, `Borrow across the zeros (e.g. 400 = 3 hundreds, 9 tens, 10 ones): ${N(a)} − ${N(b)} = ${N(a - b)}.`);
    }],
    ['groups', 'Understand multiplication as equal groups and repeated addition', (k) => {
      const g = k.ri(2, 4, 9); let s = k.ri(2, 5, 9); if (s === g) s = g === 9 ? 8 : g + 1; const rep = Array(g).fill(s).join(' + ');
      switch (pick([0, 1, 2])) {
        case 0: return Q(`${rep} = ? × ${s}`, g, `There are ${g} groups of ${s}, so it's ${g} × ${s}.`);
        case 1: return MC(`Which is the same as ${rep}?`, `${g} × ${s}`, [`${s} × ${s}`, `${g} + ${s}`, `${g * s} × ${g}`, `${g + 1} × ${s}`], `${g} groups of ${s} is ${g} × ${s}.`);
        default: { const it = pick(ITEMS); return Q(`There are ${g} plates with ${s} ${it} on each. How many ${it} in all?`, g * s, `${g} equal groups of ${s}: ${g} × ${s} = ${g * s}.`, { svg: g * s <= 36 ? dots([g * s], s) : undefined }); }
      }
    }],
    ['tables', 'Learn multiplication tables', (k) => {
      const a = pick(k.band([2, 5, 10], [2, 3, 4, 5, 10], [3, 4, 6, 8], [6, 7, 8, 9])), b = k.ri(1, 6, 10);
      if (k.d >= 8 && chance(0.4)) return Q(`? × ${a} = ${a * b}`, b, `${a * b} ÷ ${a} = ${b}.`);
      return Q(`${a} × ${b}`, a * b, `${b} groups of ${a}: ${a} × ${b} = ${a * b}.`);
    }],
    ['mult10', 'Multiply by 10 and 100', (k) => {
      const m = k.d <= 3 ? 10 : pick([10, 100]), n = k.d <= 3 ? ri(2, 9) : k.ri(2, 30, 99);
      if (k.d >= 8 && chance(0.4)) return Q(`? × ${m} = ${N(n * m)}`, n, `Multiplying by ${m} adds ${m === 10 ? 'one zero' : 'two zeros'}, so take ${m === 10 ? 'it' : 'them'} off: ${n}.`);
      return Q(`${n} × ${m}`, n * m, `Multiplying by ${m} moves each digit ${m === 10 ? 'one place' : 'two places'} left: ${N(n * m)}.`);
    }],
    ['m2x1', 'Multiply a two-digit number by a one-digit number', (k) => {
      const a = k.ri(11, 25, 99), b = k.ri(2, 4, 9), t = a - (a % 10), o = a % 10;
      return Q(`${a} × ${b}`, a * b, `${t} × ${b} = ${t * b} and ${o} × ${b} = ${o * b}. Add them: ${a * b}.`);
    }],
    ['divshare', 'Understand division as equal sharing and grouping', (k) => {
      const dv = k.ri(2, 5, 10), q = k.ri(2, 5, 10), n = dv * q, it = pick(ITEMS), a = who();
      if (chance(0.5)) return Q(`${a} shares ${n} ${it} equally between ${dv} friends. How many does each get?`, q, `Sharing ${n} into ${dv} equal groups: ${n} ÷ ${dv} = ${q}.`);
      return Q(`${a} puts ${n} ${it} into bags of ${dv}. How many bags are filled?`, q, `How many groups of ${dv} fit in ${n}? ${n} ÷ ${dv} = ${q}.`);
    }],
    ['divmult', 'Connect division to multiplication', (k) => {
      const a = k.ri(2, 5, 10), b = k.ri(2, 6, 10), c = a * b;
      switch (pick([0, 1, 2])) {
        case 0: return MC(`Which division matches ${a} × ${b} = ${c}?`, `${c} ÷ ${a} = ${b}`, [`${c} ÷ ${a} = ${a}`, `${b} ÷ ${a} = ${c}`, `${c} ÷ ${c} = ${a}`], `Division undoes multiplication: ${c} ÷ ${a} = ${b}.`);
        case 1: return Q(`? ÷ ${a} = ${b}`, c, `Multiply back: ${a} × ${b} = ${c}.`);
        default: return MC(`Which fact helps you work out ${c} ÷ ${a}?`, `${a} × ${b} = ${c}`, [`${a} + ${b} = ${a + b}`, `${c} − ${a} = ${c - a}`, `${a} × ${a} = ${a * a}`], `${c} ÷ ${a} asks “${a} times what is ${c}?”, and ${a} × ${b} = ${c}.`);
      }
    }],
    ['divrem', 'Divide with remainders', (k) => {
      const dv = k.ri(2, 5, 9), q = k.ri(2, 6, 12), r = ri(1, dv - 1), n = dv * q + r;
      // the hint ends with the asked-for number, so hiding its last appearance hides the right one
      const it = pick(ITEMS), how = (end) => `${dv} × ${q} = ${dv * q}, and ${n} − ${dv * q} = ${r}, so ${n} ÷ ${dv} = ${q} remainder ${r}. ${end}`;
      switch (pick(k.d <= 4 ? [0, 1] : [0, 1, 2])) {
        case 0: return Q(`${n} ${it} are put into bags of ${dv}. How many ${it} are left over?`, r, how(`Left over: ${r}.`));
        case 1: return Q(`What is the remainder when ${n} is divided by ${dv}?`, r, how(`The remainder is ${r}.`));
        default: return Q(`${n} ${it} are put into bags of ${dv}. How many bags are filled?`, q, how(`Bags filled: ${q}.`));
      }
    }],
    ['missing', 'Find missing numbers in calculations', (k) => {
      const ops = k.d <= 3 ? ['+', '−'] : k.d <= 6 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
      switch (pick(ops)) {
        case '+': { const a = k.ri(5, 30, 400), c = a + k.ri(5, 30, 400); return chance(0.5) ? Q(`${a} + ? = ${c}`, c - a, `${c} − ${a} = ${c - a}.`) : Q(`? + ${a} = ${c}`, c - a, `${c} − ${a} = ${c - a}.`); }
        case '−': { const a = k.ri(20, 60, 800), b = ri(5, a - 5); return chance(0.5) ? Q(`${a} − ? = ${a - b}`, b, `${a} − ${a - b} = ${b}.`) : Q(`? − ${b} = ${a - b}`, a, `${a - b} + ${b} = ${a}.`); }
        case '×': { const a = ri(2, 10), b = ri(2, 10); return Q(`? × ${a} = ${a * b}`, b, `${a * b} ÷ ${a} = ${b}.`); }
        default: { const a = ri(2, 10), b = ri(2, 10); return Q(`${a * b} ÷ ? = ${b}`, a, `${b} × ? = ${a * b}, so it's ${a}.`); }
      }
    }],
    ['parens', 'Use parentheses and basic order of operations', (k) => {
      const a = k.ri(2, 6, 12), b = k.ri(2, 5, 9), c = k.ri(2, 4, 9);
      switch (pick(k.d <= 4 ? [0, 1] : [0, 1, 2, 3])) {
        case 0: return Q(`(${a} + ${b}) × ${c}`, (a + b) * c, `Brackets first: ${a} + ${b} = ${a + b}, then × ${c} = ${(a + b) * c}.`);
        case 1: return Q(`${a} + ${b} × ${c}`, a + b * c, `Multiply before adding: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`);
        case 2: { const big = b * c + a; return Q(`${big} − ${b} × ${c}`, a, `Multiply first: ${b} × ${c} = ${b * c}, then ${big} − ${b * c} = ${a}.`); }
        default: { const s = a * c + c; return Q(`(${s} − ${c}) ÷ ${c}`, a, `Brackets first: ${s} − ${c} = ${s - c}, then ÷ ${c} = ${a}.`); }
      }
    }],
    ['fracparts', 'Understand fractions as equal parts of a whole', (k) => {
      const n = pick(k.band([2, 3, 4], [3, 4, 5, 6], [5, 6, 8], [6, 8, 10, 12])), s = ri(1, n - 1);
      const pic = k.d >= 5 && n <= 10 && chance(0.5) ? fracPie(s, n) : fracBar(s, n);
      if (k.d >= 7 && chance(0.5)) return Q('What fraction is NOT shaded?', (n - s) / n, `${n} equal parts, ${n - s} not shaded: ${n - s}/${n}.`, { svg: pic, display: `${n - s}/${n}` });
      return Q('What fraction is shaded?', s / n, `There are ${n} equal parts and ${s} are shaded: ${s}/${n}.`, { svg: pic, display: `${s}/${n}` });
    }],
    ['unitfrac', 'Recognize halves, thirds, quarters and other unit fractions', (k) => {
      const NAME = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 8: 'eighth', 10: 'tenth' };
      const n = pick(k.band([2, 3, 4], [2, 3, 4, 5, 6], [4, 5, 6, 8, 10]));
      switch (pick([0, 1, 2])) {
        case 0: return MC('What fraction is shaded?', `1/${n}`, [`1/${n + 1}`, `${n}/1`, `1/${n - 1 || 3}`, `2/${n}`], `1 of ${n} equal parts is one ${NAME[n]}: 1/${n}.`, { svg: fracBar(1, n) });
        case 1: { const thing = pick(['pizza', 'cake', 'pie', 'chocolate bar']); return Q(`A ${thing} is cut into ${n} equal pieces. What fraction is one piece?`, 1 / n, `One of ${n} equal pieces is 1/${n}.`, { display: `1/${n}` }); }
        default: return Q(`How many ${NAME[n] === 'half' ? 'halves' : NAME[n] + 's'} make one whole?`, n, `A whole split into ${n} equal parts has ${n} of them.`);
      }
    }],
    ['compunit', 'Compare unit fractions', (k) => {
      const [a, b] = shuffle([2, 3, 4, 5, 6, 8, 10, 12].slice(0, k.up(4, 8))).slice(0, 2);
      if (k.d >= 7 && chance(0.5)) { const set = shuffle([2, 3, 4, 5, 6, 8, 10, 12]).slice(0, 4), mx = Math.max(...set); return MC('Which fraction is the smallest?', `1/${mx}`, set.map((x) => `1/${x}`), `More equal parts means smaller parts, so 1/${mx} is the smallest.`); }
      if (chance(0.5)) return MC(`Which sign goes in the gap?\n1/${a}  ◻  1/${b}`, a < b ? '>' : '<', ['<', '>', '='], `More equal parts means smaller parts: 1/${a} ${a < b ? '>' : '<'} 1/${b}.`, { svg: fracBar(1, a) + fracBar(1, b) });
      return MC('Which fraction is bigger?', `1/${Math.min(a, b)}`, [`1/${Math.max(a, b)}`], `Cutting into fewer parts gives bigger pieces, so 1/${Math.min(a, b)} is bigger.`);
    }],
    ['measure', 'Measure lengths and use common measurement units', (k) => {
      switch (pick(k.d <= 3 ? ['ruler', 'unit'] : ['ruler', 'unit', 'conv', 'conv'])) {
        case 'ruler': { const max = 10, half = k.d >= 6 && chance(0.5); const len = half ? ri(2, 18) / 2 : ri(2, 9); return half ? Q('How long is the red bar, in millimetres (mm)?', len * 10, `It ends at ${len} cm, and 1 cm = 10 mm, so ${len * 10} mm.`, { svg: ruler(len, max) }) : Q('How long is the red bar, in centimetres?', len, `The bar starts at 0 and ends at ${len}: ${len} cm.`, { svg: ruler(len, max) }); }
        case 'unit': { const [thing, unit] = pick([['a pencil', 'cm'], ['a classroom', 'm'], ['the road to the next town', 'km'], ['an ant', 'mm'], ['a book', 'cm'], ['a football pitch', 'm'], ['a fingernail', 'mm'], ['a car trip', 'km']]); return MC(`Which unit is best for measuring the length of ${thing}?`, unit, ['mm', 'cm', 'm', 'km'], `${cap(thing)} is best measured in ${unit}.`); }
        default: {
          const c = pick(k.d <= 6 ? [['m', 'cm', 100], ['cm', 'mm', 10], ['km', 'm', 1000]] : [['m', 'cm', 100], ['km', 'm', 1000], ['cm', 'mm', 10], ['mix']]);
          if (c[0] === 'mix') { const m = ri(1, 9), cm = ri(5, 95); return Q(`${m} m ${cm} cm = ? cm`, m * 100 + cm, `${m} m = ${m * 100} cm, plus ${cm} cm = ${m * 100 + cm} cm.`); }
          const n = ri(2, 9); return k.d >= 7 && chance(0.5) ? Q(`${N(n * c[2])} ${c[1]} = ? ${c[0]}`, n, `1 ${c[0]} = ${c[2]} ${c[1]}, so ${N(n * c[2])} ÷ ${c[2]} = ${n}.`) : Q(`${n} ${c[0]} = ? ${c[1]}`, n * c[2], `1 ${c[0]} = ${c[2]} ${c[1]}, so ${n} × ${c[2]} = ${N(n * c[2])}.`);
        }
      }
    }],
    ['time', 'Read clocks and calculate simple time durations', (k) => {
      const ts = (h, m) => `${((h - 1 + 12) % 12) + 1}:${pad2(m)}`;
      switch (pick(k.d <= 3 ? ['read'] : ['read', 'dur', 'after'])) {
        case 'read': {
          const h = ri(1, 12), m = pick(k.band([0, 30], [0, 15, 30, 45], [5, 10, 20, 25, 35, 40, 50, 55]));
          const swap = ts(Math.max(1, Math.round(m / 5)) || 12, ((h % 12) * 5) % 60);
          return MC('What time does the clock show?', ts(h, m), [swap, ts(h + 1, m), ts(h, (m + 15) % 60), ts(h - 1, m)], `The short hand is past ${h}, the long hand shows ${m} minutes: ${ts(h, m)}.`, { svg: clock(h, m) });
        }
        case 'dur': { const h = ri(1, 10), m = 5 * ri(0, 11), dur = 5 * k.ri(3, 9, 23), e = h * 60 + m + dur; return Q(`A film starts at ${ts(h, m)} and ends at ${ts(Math.floor(e / 60), e % 60)}. How many minutes long is it?`, dur, `Count on from ${ts(h, m)} to ${ts(Math.floor(e / 60), e % 60)}: ${dur} minutes.`); }
        default: { const h = ri(1, 11), m = 5 * ri(4, 11), add = 5 * k.ri(3, 8, 17), e = h * 60 + m + add; const right = ts(Math.floor(e / 60), e % 60); return MC(`What time is it ${add} minutes after ${ts(h, m)}?`, right, [ts(h, (m + add) % 60), ts(Math.floor(e / 60) + 1, e % 60), ts(Math.floor(e / 60), (e + 10) % 60)], `${ts(h, m)} + ${add} minutes = ${right}.`); }
      }
    }],
    ['money', 'Calculate with money', (k) => {
      const cents = k.d >= 4, p1 = cents ? 5 * k.ri(10, 60, 400) : 100 * ri(1, 9), p2 = cents ? 5 * k.ri(10, 60, 400) : 100 * ri(1, 9), a = who();
      switch (pick(k.d <= 6 ? [0, 1] : [0, 1, 2])) {
        case 0: return Q(`A toy costs ${money(p1)} and a book costs ${money(p2)}. How much for both?`, (p1 + p2) / 100, `${money(p1)} + ${money(p2)} = ${money(p1 + p2)}.`, { display: money(p1 + p2) });
        case 1: { const pay = Math.ceil((p1 + 1) / 500) * 500; return Q(`${a} buys a snack for ${money(p1)} and pays with ${money(pay)}. How much change?`, (pay - p1) / 100, `${money(pay)} − ${money(p1)} = ${money(pay - p1)}.`, { display: money(pay - p1) }); }
        default: { const pay = Math.ceil((p1 + p2 + 1) / 1000) * 1000; return Q(`${a} buys two things for ${money(p1)} and ${money(p2)}, and pays with ${money(pay)}. How much change?`, (pay - p1 - p2) / 100, `Total ${money(p1 + p2)}, change ${money(pay)} − ${money(p1 + p2)} = ${money(pay - p1 - p2)}.`, { display: money(pay - p1 - p2) }); }
      }
    }],
    ['polygons', 'Recognize polygons and their properties', (k) => {
      const SH = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' };
      const n = pick(k.d <= 3 ? [3, 4, 5, 6] : [3, 4, 5, 6, 8]);
      switch (pick(k.d <= 3 ? [0, 1] : [0, 1, 2, 3])) {
        case 0: return MC('What is this shape called?', SH[n], Object.values(SH), `It has ${n} straight sides, so it is a ${SH[n]}.`, { svg: polygonSvg(n, k.d >= 5) });
        case 1: return Q('How many sides does this shape have?', n, `Count the straight sides: ${n}.`, { svg: polygonSvg(n, k.d >= 5) });
        case 2: return Q(`How many vertices (corners) does a ${SH[n]} have?`, n, `A ${SH[n]} has ${n} sides and ${n} vertices.`);
        default: return MC('Which of these is NOT a polygon?', 'circle', ['triangle', 'hexagon', 'pentagon', 'octagon'], 'A polygon has only straight sides, so a circle is not one.');
      }
    }],
    ['perim', 'Calculate perimeter', (k) => {
      const w = k.ri(2, 8, 25), h = k.ri(2, 6, 18);
      switch (pick(k.d <= 3 ? [0, 1] : k.d <= 7 ? [0, 1, 2] : [0, 2, 3])) {
        case 0: return Q('What is the perimeter of the rectangle?', 2 * (w + h), `Add all four sides: ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`, { svg: rectSvg(w, h, `${w} cm`, `${h} cm`), display: `${2 * (w + h)}` });
        case 1: { const SH = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon' }, n = ri(3, 6), s = k.ri(2, 6, 15); return Q(`A ${SH[n]} has every side ${s} cm long. What is its perimeter in cm?`, n * s, `${n} sides × ${s} cm = ${n * s} cm.`); }
        case 2: { const a = ri(3, 15), b = ri(3, 15), c = ri(Math.abs(a - b) + 1, a + b - 1); return Q(`A triangle has sides of ${a} cm, ${b} cm and ${c} cm. What is its perimeter in cm?`, a + b + c, `${a} + ${b} + ${c} = ${a + b + c} cm.`); }
        default: return Q(`A rectangle has a perimeter of ${2 * (w + h)} cm and a length of ${w} cm. How wide is it?`, h, `Half the perimeter is ${w + h} cm, and ${w + h} − ${w} = ${h} cm.`);
      }
    }],
    ['areacount', 'Measure area by counting squares', (k) => {
      const cols = k.up(4, 8), rows = k.up(3, 6), cells = new Set();
      if (k.d <= 3) { const w = ri(2, cols), h = ri(2, rows); for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) cells.add(x + ',' + y); }
      else { cells.add(`${ri(0, cols - 1)},${ri(0, rows - 1)}`); const target = k.ri(5, 8, 22); while (cells.size < target) { const [x, y] = pick([...cells]).split(',').map(Number), [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (x + dx >= 0 && x + dx < cols && y + dy >= 0 && y + dy < rows) cells.add(`${x + dx},${y + dy}`); } }
      return Q('Each square is 1 square unit. What is the area of the blue shape?', cells.size, `Count the blue squares: ${cells.size} square units.`, { svg: grid(cols, rows, cells) });
    }],
    ['areamult', 'Connect rectangle area to multiplication', (k) => {
      const w = k.ri(2, 6, 12), h = k.ri(2, 4, 9);
      if (k.d <= 3) { const cells = new Set(); for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) cells.add(x + ',' + y); return Q(`${h} rows of ${w} squares. What is the area in squares?`, w * h, `${h} rows × ${w} = ${w * h} squares.`, { svg: grid(w, h, cells) }); }
      if (k.d >= 7 && chance(0.5)) return Q(`A rectangle has an area of ${w * h} square cm. One side is ${w} cm. How long is the other side?`, h, `Area = length × width, so ${w * h} ÷ ${w} = ${h} cm.`);
      return Q(`A rectangle is ${w} cm long and ${h} cm wide. What is its area in square cm?`, w * h, `Area = length × width = ${w} × ${h} = ${w * h} square cm.`, { svg: rectSvg(w, h, `${w} cm`, `${h} cm`) });
    }],
    ['charts', 'Read tables and bar charts', (k) => chartQuestion(k, chartData(k, 4, [1, 2, 5]))],
    ['word1', 'Solve one-step word problems', (k) => oneStep(k)],
    ['word2', 'Solve simple two-step word problems', (k) => twoStep(k)],
  ];

  // ---------- Grade 4 ----------
  const g4 = [
    ['bignum', 'Read and write larger whole numbers', (k) => {
      const n = withZeros(k.band(4, 5, 6, 7), 0.3);
      switch (pick([0, 1, 2])) {
        case 0: return MC(`Which number is “${words(n)}”?`, N(n), lookalikes(n).map(N), `“${words(n)}” is ${N(n)}.`);
        case 1: return Q(`Write in digits: “${words(n)}”`, n, `“${cap(words(n))}” is ${N(n)}.`);
        default: { const s = String(n); let p = ri(1, s.length - 1); while (s[s.length - 1 - p] === '0' && p > 0) p--; const dg = +s[s.length - 1 - p]; return Q(`What is the value of the digit ${dg} in ${N(n)}?`, dg * 10 ** p, `The ${dg} is in the ${PLACES[p]} place: ${N(dg * 10 ** p)}.`); }
      }
    }],
    ['compbig', 'Compare and order larger numbers', (k) => {
      const dig = k.up(5, 7), a = withZeros(dig, 0.2), set = [...new Set([a, ...lookalikes(a)].filter((x) => String(x).length === dig))].slice(0, 4);
      if (chance(0.5) && set.length > 1) return MC(`Which sign goes in the gap?\n${N(set[0])}  ◻  ${N(set[1])}`, SIGN(set[0], set[1]), ['<', '>', '='], `Compare digit by digit from the left: ${N(set[0])} ${SIGN(set[0], set[1])} ${N(set[1])}.`);
      const big = chance(0.5), ans = big ? Math.max(...set) : Math.min(...set);
      return MC(`Which number is the ${big ? 'largest' : 'smallest'}?`, N(ans), set.map(N), `Compare from the biggest place value: ${N(ans)}.`);
    }],
    ['round', 'Round numbers and estimate answers', (k) => {
      const to = k.band(10, 100, 1000), n = ri(to + 1, to * k.up(20, 99)) + ri(1, 9);
      if (k.d >= 6 && chance(0.5)) { const a = ri(to, to * 9) + ri(1, to - 1), b = ri(to, to * 9) + ri(1, to - 1), ra = Math.round(a / to) * to, rb = Math.round(b / to) * to; return Q(`Estimate ${N(a)} + ${N(b)} by rounding each number to the nearest ${N(to)}.`, ra + rb, `${N(a)} ≈ ${N(ra)} and ${N(b)} ≈ ${N(rb)}, so about ${N(ra + rb)}.`); }
      const r = Math.round(n / to) * to; return Q(`Round ${N(n)} to the nearest ${N(to)}.`, r, `Look at the digit to the right of the ${PLACES[Math.log10(to)]}: 5 or more rounds up. ${N(n)} → ${N(r)}.`);
    }],
    ['addsub', 'Add and subtract larger numbers', (k) => {
      const dig = k.band(3, 3, 4, 5, 6);
      if (chance(0.5)) { const [a, b] = addPair(dig, true); return Q(`${N(a)} + ${N(b)}`, a + b, `Add column by column from the ones, carrying tens: ${N(a + b)}.`); }
      const [a, b] = subPair(dig, true); return Q(`${N(a)} − ${N(b)}`, a - b, `Subtract column by column from the ones, borrowing when needed: ${N(a - b)}.`);
    }],
    ['inverse', 'Check addition and subtraction using inverse operations', (k) => {
      // a + b = s, and someone's worked answer that is sometimes off by a slipped place value
      const a = ri(...k.band([30, 200], [100, 900], [500, 5000], [1000, 9000])), b = ri(10, Math.max(20, Math.round(a * 0.8))), s = a + b, name = who();
      const slip = pick([10, 100, -10, -100].filter((x) => a + x > 0)), sub = chance(0.5);
      switch (pick([0, 1, 2])) {
        case 0: return sub
          ? MC(`${name} worked out ${N(s)} − ${N(b)} = ${N(a)}. Which calculation checks it?`, `${N(a)} + ${N(b)}`, [`${N(a)} − ${N(b)}`, `${N(s)} + ${N(b)}`, `${N(s)} + ${N(a)}`], `Addition undoes subtraction: ${N(a)} + ${N(b)} should give back ${N(s)}.`)
          : MC(`${name} worked out ${N(a)} + ${N(b)} = ${N(s)}. Which calculation checks it?`, `${N(s)} − ${N(b)}`, [`${N(s)} + ${N(b)}`, `${N(a)} − ${N(b)}`, `${N(s)} + ${N(a)}`], `Subtraction undoes addition: ${N(s)} − ${N(b)} should give back ${N(a)}.`);
        case 1: {
          const ok = chance(0.5), claim = ok ? a : a + slip, back = claim + b;
          return MC(`${name} says ${N(s)} − ${N(b)} = ${N(claim)}. Check it with addition. Is ${name} right?`, ok ? 'yes' : 'no', ['yes', 'no'],
            `${N(claim)} + ${N(b)} = ${N(back)}${ok ? `, which matches ${N(s)}: yes` : `, not ${N(s)}: no. The answer is ${N(a)}`}.`);
        }
        default: return Q(`${name} says ${N(s)} − ${N(b)} = ${N(a + slip)}, but ${N(a + slip)} + ${N(b)} = ${N(a + slip + b)}, not ${N(s)}. What is the right answer?`, a,
          `The check is off by ${N(Math.abs(slip))}, so the answer is ${N(a)}: ${N(a)} + ${N(b)} = ${N(s)}.`);
      }
    }],
    ['mmulti1', 'Multiply a multi-digit number by a one-digit number', (k) => { const dg = k.band(2, 3, 3, 4), a = ri(10 ** (dg - 1) + 1, k.d <= 3 ? 50 : 10 ** dg - 1), b = k.d <= 3 ? ri(2, 5) : ri(2, 9); return Q(`${N(a)} × ${b}`, a * b, `Multiply each place by ${b} and add: ${N(a * b)}.`); }],
    ['partial', 'Understand partial products', (k) => {
      if (k.d <= 5) { const a = 10 * ri(1, 9) + ri(2, 9), b = ri(3, 9), t = a - (a % 10), o = a % 10; return Q(`${a} × ${b} = ${t} × ${b} + ${o} × ${b} = ${t * b} + ?`, o * b, `${o} × ${b} = ${o * b}.`); }
      const a = ri(12, 99), bt = 10 * k.ri(1, 2, 9), bo = ri(2, 9), bb = bt + bo;
      return chance(0.5) ? Q(`${a} × ${bb} = ${a} × ${bt} + ${a} × ${bo} = ${N(a * bt)} + ?`, a * bo, `${a} × ${bo} = ${a * bo}.`) : Q(`${a} × ${bb} = ${N(a * bt)} + ${N(a * bo)} = ?`, a * bb, `${N(a * bt)} + ${N(a * bo)} = ${N(a * bb)}.`);
    }],
    ['m2d', 'Multiply by a two-digit number', (k) => { const [am, bm] = k.band([15, 12], [30, 15], [60, 40], [400, 99]), a = ri(11, am), b = k.d <= 3 ? pick([10, 11, 20]) : ri(11, bm), bt = b - (b % 10); return Q(`${N(a)} × ${b}`, a * b, `${N(a)} × ${bt} = ${N(a * bt)} and ${N(a)} × ${b % 10} = ${N(a * (b % 10))}. Add: ${N(a * b)}.`); }],
    ['divbig', 'Divide larger numbers by a one-digit number', (k) => { const dv = k.d <= 3 ? ri(2, 5) : k.d <= 6 ? ri(2, 6) : ri(2, 9), q = ri(...k.band([4, 12], [6, 15], [12, 40], [30, 400])); return Q(`${N(dv * q)} ÷ ${dv}`, q, `Divide each place from the left: ${N(dv * q)} ÷ ${dv} = ${N(q)}. Check: ${dv} × ${N(q)} = ${N(dv * q)}.`); }],
    ['longdiv', 'Use written division', (k) => {
      const dv = k.d <= 3 ? ri(2, 5) : k.d <= 6 ? ri(2, 7) : ri(3, 9), q = ri(...k.band([3, 9], [5, 12], [10, 30], [25, 300])), r = ri(1, dv - 1), n = dv * q + r;
      const how = (ask) => `${dv} × ${N(q)} = ${N(dv * q)}, and ${N(n)} − ${N(dv * q)} = ${r}, so ${N(n)} ÷ ${dv} = ${N(q)} remainder ${r}. ${ask}`;
      return chance(0.5)
        ? Q(`${N(n)} ÷ ${dv} doesn't divide evenly. What is the whole-number answer? (Leave out the remainder.)`, q, how(`The whole-number answer is ${N(q)}.`))
        : Q(`What is the remainder of ${N(n)} ÷ ${dv}?`, r, how(`The remainder is ${r}.`));
    }],
    ['interprem', 'Interpret remainders in word problems', (k) => {
      const per = k.ri(4, 8, 12), full = k.ri(3, 8, 20), r = ri(1, per - 1), n = per * full + r;
      switch (pick([0, 1, 2])) {
        case 0: return Q(`${n} kids are going on a trip. Each van holds ${per} kids. How many vans are needed?`, full + 1, `${n} ÷ ${per} = ${full} R ${r}. The ${r} extra kids still need a van: ${full + 1}.`);
        case 1: return Q(`${n} eggs are packed into boxes of ${per}. How many boxes are completely full?`, full, `${n} ÷ ${per} = ${full} R ${r}, so ${full} full boxes.`);
        default: return Q(`${n} stickers are shared equally between ${per} friends. How many stickers are left over?`, r, `${n} ÷ ${per} = ${full} R ${r}: ${r} left over.`);
      }
    }],
    ['multfact', 'Recognize multiples and factors', (k) => {
      const n = pick(k.band([12, 15, 16, 18, 20], [24, 30, 36, 40], [42, 48, 60, 72]));
      const fs = factorsOf(n), non = [...Array(n).keys()].slice(2).filter((x) => n % x);
      switch (pick(k.d <= 5 ? [0, 1, 2] : [0, 1, 2, 3])) {
        case 0: { const f = pick(fs.filter((x) => x > 1 && x < n)); return MC(`Which number is a factor of ${n}?`, f, shuffle(non).slice(0, 3), `${n} ÷ ${f} = ${n / f}, with nothing left over.`); }
        case 1: { const m = ri(3, 9), x = m * ri(3, 12); return MC(`Which number is a multiple of ${m}?`, x, [x + 1, x - 1, x + ri(2, m - 1)].filter((y) => y % m), `${x} = ${m} × ${x / m}.`); }
        case 2: { const m = ri(3, 12), i = ri(3, 10); return Q(`What is the ${i}th multiple of ${m}?`, m * i, `${m} × ${i} = ${m * i}.`); }
        default: return Q(`How many factors does ${n} have?`, fs.length, `The factors of ${n} are ${fs.join(', ')}: ${fs.length} of them.`);
      }
    }],
    ['missing4', 'Solve missing-number calculations', (k) => {
      switch (pick([0, 1, 2, 3])) {
        case 0: { const a = k.ri(20, 90, 5000), c = a + k.ri(10, 60, 5000); return Q(`${N(a)} + ? = ${N(c)}`, c - a, `${N(c)} − ${N(a)} = ${N(c - a)}.`); }
        case 1: { const t = k.band(100, 100, 1000, 10000), b = ri(t / 10, t - 1); return Q(`${N(t)} − ? = ${N(t - b)}`, b, `${N(t)} − ${N(t - b)} = ${N(b)}.`); }
        case 2: { const a = ri(3, 9), b = k.ri(2, 10, 150); return Q(`? × ${a} = ${N(a * b)}`, b, `${N(a * b)} ÷ ${a} = ${b}.`); }
        default: { const a = ri(3, 9), b = k.ri(2, 10, 150); return Q(`? ÷ ${a} = ${b}`, a * b, `${b} × ${a} = ${N(a * b)}.`); }
      }
    }],
    ['ooo4', 'Apply order of operations with all four operations', (k) => {
      const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9), dd = ri(2, 9);
      switch (pick([0, 1, 2])) {
        case 0: return Q(`${a * b} ÷ ${a} + ${c} × ${dd}`, b + c * dd, `Divide and multiply first: ${a * b} ÷ ${a} = ${b}, ${c} × ${dd} = ${c * dd}. Then ${b} + ${c * dd} = ${b + c * dd}.`);
        case 1: { const big = c * dd + a + ri(1, 30); return Q(`${big} − ${c} × ${dd} + ${a}`, big - c * dd + a, `Multiply first: ${c} × ${dd} = ${c * dd}. Then left to right: ${big} − ${c * dd} + ${a} = ${big - c * dd + a}.`); }
        default: { const cc = Math.min(c, a * b - 1); return Q(`${a} × ${b} − ${cc * dd} ÷ ${dd}`, a * b - cc, `${a} × ${b} = ${a * b} and ${cc * dd} ÷ ${dd} = ${cc}, so ${a * b} − ${cc} = ${a * b - cc}.`); }
      }
    }],
    ['parens4', 'Use parentheses in mixed calculations', (k) => {
      const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9);
      switch (pick([0, 1, 2])) {
        case 0: {
          // the bracket's sum and the answer stay inside the times tables early on
          const sum = ri(...k.band([3, 10], [4, 12], [6, 18])), q = ri(...k.band([2, 10], [3, 12], [4, 18])), x1 = ri(1, sum - 1), x2 = sum - x1;
          return Q(`${sum * q} ÷ (${x1} + ${x2})`, q, `Brackets first: ${x1} + ${x2} = ${sum}, then ${sum * q} ÷ ${sum} = ${q}.`);
        }
        case 1: { const inner = ri(...k.band([2, 6], [3, 10], [10, 20])), m = k.d <= 3 ? ri(2, 5) : a, cc = Math.min(c, m * inner - 1), big = inner + b; return Q(`${m} × (${big} − ${b}) − ${cc}`, m * inner - cc, `Brackets: ${big} − ${b} = ${inner}. Then ${m} × ${inner} = ${m * inner}, − ${cc} = ${m * inner - cc}.`); }
        default: return MC(`Where do the brackets go to make it true?\n${a} + ${b} × ${c} = ${(a + b) * c}`, `(${a} + ${b}) × ${c}`, [`${a} + (${b} × ${c})`, `${a} + ${b} × ${c}`], `(${a} + ${b}) × ${c} = ${a + b} × ${c} = ${(a + b) * c}.`);
      }
    }],
    ['numden', 'Understand numerators and denominators', (k) => {
      const d = ri(3, 12), n = ri(1, d - 1);
      switch (pick([0, 1, 2])) {
        case 0: return Q(`In the fraction ${n}/${d}, what is the denominator?`, d, `The denominator is the bottom number: how many equal parts the whole has (${d}).`);
        case 1: return Q(`In the fraction ${n}/${d}, what is the numerator?`, n, `The numerator is the top number: how many parts we have (${n}).`);
        default: { const thing = pick(['cake', 'pizza', 'garden', 'chocolate bar']); return Q(`A ${thing} has ${d} equal parts and ${n} are eaten. What fraction is eaten?`, n / d, `${n} parts out of ${d}: ${n}/${d}.`, { display: `${n}/${d}` }); }
      }
    }],
    ['fracpics', 'Represent fractions using pictures', (k) => {
      const d = pick(k.band([2, 3, 4, 6], [4, 5, 6, 8], [6, 8, 10, 12])), n = ri(1, d - 1);
      const kind = pick(['bar', 'pie', 'set']), pic = kind === 'bar' ? fracBar(n, d) : kind === 'pie' && d <= 10 ? fracPie(n, d) : dots([n, d - n]);
      return Q(kind === 'set' ? 'What fraction of the counters are yellow?' : 'What fraction is shaded?', n / d, `${n} out of ${d} equal parts: ${n}/${d}.`, { svg: pic, display: `${n}/${d}` });
    }],
    ['fracline', 'Place fractions on a number line', (k) => {
      const d = pick(k.band([2, 4], [3, 4, 5], [4, 5, 6, 8])), two = k.d >= 6, count = two ? 2 * d : d; let m = ri(1, count - 1); if (m === d) m++;
      return Q('What fraction is the arrow pointing to?', m / d, `Each whole is split into ${d} equal steps; the arrow is ${m} steps from 0: ${m}/${d}.`, { svg: numberLine(count, two ? [0, d, 2 * d] : [0, d], (i) => String(i / d), m), display: `${m}/${d}` });
    }],
    ['compeqden', 'Compare fractions with equal denominators', (k) => {
      const d = k.ri(5, 9, 15); let a = ri(1, d - 1), b = ri(1, d - 1); if (a === b) b = a === 1 ? 2 : a - 1;
      return chance(0.5) ? MC(`Which sign goes in the gap?\n${a}/${d}  ◻  ${b}/${d}`, SIGN(a, b), ['<', '>', '='], `Same size parts, so compare the tops: ${a} ${SIGN(a, b)} ${b}.`) : MC('Which fraction is bigger?', `${Math.max(a, b)}/${d}`, [`${Math.min(a, b)}/${d}`], `Same denominator: more parts is bigger, ${Math.max(a, b)}/${d}.`);
    }],
    ['compeqnum', 'Compare fractions with equal numerators', (k) => {
      const n = k.ri(1, 3, 6); let a = ri(n + 1, n + 9), b = ri(n + 1, n + 9); if (a === b) b = a + 1;
      return chance(0.5) ? MC(`Which sign goes in the gap?\n${n}/${a}  ◻  ${n}/${b}`, a < b ? '>' : '<', ['<', '>', '='], `Same number of parts, but ${a < b ? `${a}ths are bigger than ${b}ths` : `${b}ths are bigger than ${a}ths`}: ${n}/${a} ${a < b ? '>' : '<'} ${n}/${b}.`) : MC('Which fraction is bigger?', `${n}/${Math.min(a, b)}`, [`${n}/${Math.max(a, b)}`], `Same top number: the smaller bottom means bigger parts, so ${n}/${Math.min(a, b)}.`);
    }],
    ['bench', 'Compare fractions with benchmarks such as one-half', (k) => {
      const d = k.ri(4, 10, 20), n = ri(1, d - 1), c = 2 * n === d ? 'equal to 1/2' : 2 * n > d ? 'more than 1/2' : 'less than 1/2';
      return MC(`Is ${n}/${d} more than, less than or equal to 1/2?`, c, ['more than 1/2', 'less than 1/2', 'equal to 1/2'], `Half of ${d} is ${d / 2}, and ${n} is ${2 * n === d ? 'the same' : 2 * n > d ? 'more' : 'less'}, so ${n}/${d} is ${c}.`);
    }],
    ['equiv', 'Recognize equivalent fractions', (k) => {
      const d = k.ri(2, 5, 9), n = ri(1, d - 1), m = k.ri(2, 3, 6);
      if (chance(0.5)) return Q(`${n}/${d} = ?/${d * m}`, n * m, `The bottom was multiplied by ${m}, so multiply the top too: ${n} × ${m} = ${n * m}.`);
      return MC(`Which fraction is equal to ${n}/${d}?`, `${n * m}/${d * m}`, [`${n + m}/${d + m}`, `${n * m}/${d + m}`, `${n + 1}/${d * m}`, `${n}/${d * m}`], `Multiply top and bottom by ${m}: ${n * m}/${d * m}.`);
    }],
    ['wholes', 'Build whole numbers from fractional parts', (k) => {
      const d = k.ri(2, 4, 10), w = k.ri(1, 2, 6);
      switch (pick([0, 1, 2])) {
        case 0: return Q(`How many 1/${d}s make ${w} whole${w > 1 ? 's' : ''}?`, d * w, `Each whole has ${d}, so ${w} × ${d} = ${d * w}.`);
        case 1: return Q(`${d * w}/${d} = ? wholes`, w, `${d}/${d} is one whole, so ${d * w}/${d} = ${d * w} ÷ ${d} = ${w}.`);
        default: return Q(`${Array(d).fill(`1/${d}`).join(' + ')} = ?`, 1, `${d} pieces of 1/${d} make ${d}/${d}, which is 1 whole.`);
      }
    }],
    ['improper', 'Recognize improper fractions', (k) => {
      const d = ri(3, 9), imp = `${d + ri(1, d)}/${d}`, props = shuffle([1, 2, d - 1].filter((x) => x > 0 && x < d)).slice(0, 3).map((x) => `${x}/${d + ri(0, 2)}`);
      if (chance(0.5)) return MC('Which fraction is improper (more than one whole)?', imp, props, `An improper fraction has a top bigger than its bottom, like ${imp}.`);
      const n = d + ri(1, 2 * d); return Q(`${n}/${d} is bigger than 1. How many whole ones fit inside it?`, Math.floor(n / d), `${n} ÷ ${d} = ${Math.floor(n / d)} wholes${n % d ? ` and ${n % d}/${d} left` : ''}.`);
    }],
    ['mixed', 'Connect improper fractions to mixed numbers', (k) => {
      const d = k.ri(2, 5, 10), w = k.ri(1, 3, 9), r = ri(1, d - 1), n = w * d + r;
      if (chance(0.5)) return MC(`Write ${n}/${d} as a mixed number.`, `${w} ${r}/${d}`, [`${w + 1} ${r}/${d}`, `${r} ${w}/${d}`, `${w} ${Math.max(1, d - r)}/${d}`, `${w - 1 || w + 2} ${r}/${d}`], `${n} ÷ ${d} = ${w} R ${r}, so ${w} ${r}/${d}.`);
      return Q(`${w} ${r}/${d} = ?/${d}`, n, `${w} wholes = ${w * d}/${d}, plus ${r}/${d}: ${n}/${d}.`);
    }],
    ['angles', 'Identify angle types', (k) => {
      const type = pick(['acute', 'right', 'obtuse', 'straight']), deg = { acute: ri(2, 8) * 10, right: 90, obtuse: ri(10, 17) * 10, straight: 180 }[type];
      const why = { acute: 'less than a right angle (90°)', right: 'exactly 90°, a square corner', obtuse: 'between 90° and 180°', straight: 'exactly 180°, a straight line' };
      if (k.d >= 6 && chance(0.5)) return MC(`An angle measures ${deg}°. What type of angle is it?`, type, ['acute', 'right', 'obtuse', 'straight'], `${deg}° is ${why[type]}, so it is ${type}.`);
      return MC('What type of angle is this?', type, ['acute', 'right', 'obtuse', 'straight'], `It is ${why[type]}: ${type}.`, { svg: angleSvg(deg) });
    }],
    ['lines', 'Recognize parallel and perpendicular lines', (k) => {
      const kind = pick(['parallel', 'perpendicular', 'neither']);
      if (k.d >= 6 && chance(0.4)) { const [q, a] = pick([['the two rails of a train track', 'parallel'], ['the edges where a wall meets the floor and a corner of the wall', 'perpendicular'], ['the lines of a plus sign (+)', 'perpendicular'], ['the opposite sides of a rectangle', 'parallel']]); return MC(`What are ${q}?`, a, ['parallel', 'perpendicular', 'neither'], `${cap(q)} are ${a}.`); }
      return MC('Are these lines parallel, perpendicular or neither?', kind, ['parallel', 'perpendicular', 'neither'], { parallel: 'They never meet and stay the same distance apart: parallel.', perpendicular: 'They cross at a right angle: perpendicular.', neither: 'They cross, but not at a right angle: neither.' }[kind], { svg: linesSvg(kind) });
    }],
    ['classify4', 'Classify triangles and quadrilaterals', (k) => {
      const [q, a, opts] = pick([
        ['A triangle with all three sides equal is…', 'equilateral', ['isosceles', 'scalene', 'right']],
        ['A triangle with exactly two equal sides is…', 'isosceles', ['equilateral', 'scalene', 'right']],
        ['A triangle with no equal sides is…', 'scalene', ['equilateral', 'isosceles', 'right']],
        ['A triangle with a 90° angle is a…', 'right triangle', ['equilateral triangle', 'scalene triangle', 'obtuse triangle']],
        ['A quadrilateral with 4 equal sides and 4 right angles is a…', 'square', ['rectangle', 'rhombus', 'trapezoid']],
        ['A quadrilateral with 4 right angles but sides of two lengths is a…', 'rectangle', ['square', 'rhombus', 'trapezoid']],
        ['A quadrilateral with 4 equal sides but no right angles is a…', 'rhombus', ['square', 'rectangle', 'trapezoid']],
        ['A quadrilateral with exactly one pair of parallel sides is a…', 'trapezoid', ['square', 'rectangle', 'parallelogram']],
        ['A quadrilateral with two pairs of parallel sides is a…', 'parallelogram', ['trapezoid', 'kite', 'triangle']],
      ]);
      return MC(q, a, opts, `${q.replace('…', '')} ${a}.`);
    }],
    ['rectap', 'Calculate rectangle area and perimeter', (k) => {
      const w = k.ri(3, 10, 30), h = k.ri(2, 8, 20);
      switch (pick(k.d <= 4 ? [0, 1] : [0, 1, 2, 3])) {
        case 0: return Q(`A rectangle is ${w} m by ${h} m. What is its area in square metres?`, w * h, `Area = ${w} × ${h} = ${w * h} m².`, { svg: rectSvg(w, h, `${w} m`, `${h} m`) });
        case 1: return Q(`A rectangle is ${w} m by ${h} m. What is its perimeter in metres?`, 2 * (w + h), `Perimeter = 2 × (${w} + ${h}) = ${2 * (w + h)} m.`, { svg: rectSvg(w, h, `${w} m`, `${h} m`) });
        case 2: return Q(`A rectangle has an area of ${w * h} m² and is ${w} m long. What is its perimeter in metres?`, 2 * (w + h), `Width = ${w * h} ÷ ${w} = ${h} m, so perimeter = 2 × (${w} + ${h}) = ${2 * (w + h)} m.`);
        default: return Q(`A rectangle has a perimeter of ${2 * (w + h)} m and is ${w} m long. What is its area in m²?`, w * h, `Width = ${w + h} − ${w} = ${h} m, so area = ${w} × ${h} = ${w * h} m².`);
      }
    }],
    ['charts4', 'Read and construct charts', (k) => {
      if (chance(0.35)) { const step = k.band(2, 5, 10, 25), v = step * k.ri(2, 6, 20); return Q(`On a bar chart where each grid line is worth ${step}, how many grid lines tall is a bar for ${v}?`, v / step, `${v} ÷ ${step} = ${v / step} grid lines.`); }
      return chartQuestion(k, chartData(k, 5));
    }],
    ['multistep4', 'Solve multistep word problems', (k) => {
      const a = who();
      switch (pick([0, 1, 2])) {
        case 0: { const t = ri(...k.band([2, 4], [3, 6], [3, 8])), p = ri(...k.band([2, 6], [3, 12], [3, 20])) * (k.d <= 3 ? 1 : 5), s = k.d <= 3 ? ri(1, 5) : 5 * ri(2, 10), have = t * p + s + (k.d <= 3 ? ri(1, 10) : 5 * ri(1, 20)); return Q(`${a} has $${have}. ${a} buys ${t} games at $${p} each and a snack for $${s}. How much money is left?`, have - t * p - s, `${t} × $${p} = $${t * p}, + $${s} = $${t * p + s}, and $${have} − $${t * p + s} = $${have - t * p - s}.`, { display: `$${have - t * p - s}` }); }
        case 1: { const rows = ri(...k.band([2, 5], [3, 8], [4, 12])), per = ri(...k.band([3, 8], [5, 12], [6, 15])), broken = ri(1, k.band(5, 10, 15)); return Q(`A shop has ${rows} shelves with ${per} eggs on each. ${broken} eggs break, and the rest go into boxes of 6. How many full boxes?`, Math.floor((rows * per - broken) / 6), `${rows} × ${per} = ${rows * per}, − ${broken} = ${rows * per - broken}, ÷ 6 = ${Math.floor((rows * per - broken) / 6)} full boxes${(rows * per - broken) % 6 ? ` (${(rows * per - broken) % 6} left over)` : ''}.`); }
        default: { const w = ri(...k.band([1, 1], [1, 3], [2, 6])), day = ri(...k.band([2, 9], [5, 20], [15, 60])); return Q(`${a} reads ${day} pages every day for ${w} week${w > 1 ? 's' : ''}. How many pages is that?`, day * 7 * w, `${w} week${w > 1 ? 's' : ''} = ${7 * w} days, and ${7 * w} × ${day} = ${N(day * 7 * w)} pages.`); }
      }
    }],
    ['whichop', 'Explain which operations a problem requires', (k) => {
      const x = ri(4, 12), y = ri(3, 9), it = pick(ITEMS), a = who();
      const [q, right] = pick([
        [`${a} has ${x * y} ${it} and puts them into ${y} equal piles. How many in each pile?`, `${x * y} ÷ ${y}`],
        [`${a} has ${y} boxes with ${x} ${it} in each. How many ${it}?`, `${y} × ${x}`],
        [`${a} has ${x} ${it} and gets ${y} more. How many now?`, `${x} + ${y}`],
        [`${a} has ${x + y} ${it} and loses ${y}. How many are left?`, `${x + y} − ${y}`],
      ]);
      const [p, r] = right.split(/ [÷×+−] /).map(Number);
      return MC(`Which calculation solves this?\n${q}`, right, [`${p} + ${r}`, `${p} − ${r}`, `${p} × ${r}`, `${p} ÷ ${r}`].filter((s) => s !== right), `The problem asks for ${right}.`);
    }],
  ];

  // ---------- Grade 5 ----------
  const g5 = [
    ['muldiv5', 'Strengthen written multiplication and division', (k) => {
      if (chance(0.5)) { const a = ri(k.up(100, 400), k.up(500, 9999)), b = k.ri(11, 30, 99); return Q(`${N(a)} × ${b}`, a * b, `Split ${b} into ${b - (b % 10)} + ${b % 10}: ${N(a * (b - (b % 10)))} + ${N(a * (b % 10))} = ${N(a * b)}.`); }
      const dv = ri(3, 9), q = ri(k.up(100, 400), k.up(800, 9999)); return Q(`${N(dv * q)} ÷ ${dv}`, q, `${N(dv * q)} ÷ ${dv} = ${N(q)}. Check: ${dv} × ${N(q)} = ${N(dv * q)}.`);
    }],
    ['bigdiv', 'Divide using larger divisors', (k) => { const dv = k.ri(11, 25, 99), q = ri(k.up(5, 20), k.up(25, 250)); return Q(`${N(dv * q)} ÷ ${dv}`, q, `How many ${dv}s fit? ${dv} × ${q} = ${N(dv * q)}, so ${q}.`); }],
    ['est5', 'Estimate and check calculation results', (k) => {
      const a = ri(2, 9) * 100 + ri(-12, 12), b = ri(2, 9) * 10 + ri(-2, 2), ra = Math.round(a / 100) * 100, rb = Math.round(b / 10) * 10, e = ra * rb;
      return MC(`Which is the best estimate for ${N(a)} × ${b}?`, N(e), [N(e * 10), N(e / 10), N(e + ra * 10)], `${N(a)} ≈ ${N(ra)} and ${b} ≈ ${rb}, so about ${N(ra)} × ${rb} = ${N(e)}.`);
    }],
    ['divrules', 'Apply divisibility rules', (k) => {
      const dv = pick(k.band([2, 5, 10], [3, 4, 5, 10], [3, 6, 9, 4])), rule = { 2: 'it ends in an even digit', 3: 'its digits add up to a multiple of 3', 4: 'its last two digits make a multiple of 4', 5: 'it ends in 0 or 5', 6: 'it is even and its digits add up to a multiple of 3', 9: 'its digits add up to a multiple of 9', 10: 'it ends in 0' }[dv];
      const yes = dv * ri(k.up(12, 100), k.up(100, 1200)), noN = () => { let x; do x = k.ri(100, 1200, 9999); while (x % dv === 0); return x; };
      if (chance(0.5)) return MC(`Which number is divisible by ${dv}?`, N(yes), [N(noN()), N(noN()), N(noN())], `A number is divisible by ${dv} if ${rule}. ${N(yes)} is.`);
      const test = chance(0.5) ? yes : noN(), ok = test % dv === 0; return MC(`Is ${N(test)} divisible by ${dv}?`, ok ? 'yes' : 'no', ['yes', 'no'], `Divisible by ${dv} means ${rule}. For ${N(test)} the answer is ${ok ? 'yes' : 'no'}.`);
    }],
    ['prime', 'Distinguish prime and composite numbers', (k) => {
      const max = k.up(30, 100), primes = [...Array(max).keys()].filter(isPrime), comps = [...Array(max).keys()].filter((x) => x > 3 && !isPrime(x) && x % 2 === 1);
      if (chance(0.5)) { const p = pick(primes.filter((x) => x > 5)); return MC('Which number is prime?', p, shuffle(comps).slice(0, 3), `${p} has only two factors: 1 and ${p}. The others can be split, e.g. ${comps[0]} = ${factorsOf(comps[0])[1]} × ${comps[0] / factorsOf(comps[0])[1]}.`); }
      const n = chance(0.5) ? pick(primes.filter((x) => x > 10)) : pick(comps.filter((x) => x > 10)), pr = isPrime(n);
      return MC(`Is ${n} prime or composite?`, pr ? 'prime' : 'composite', ['prime', 'composite'], pr ? `${n} can only be divided by 1 and itself: prime.` : `${n} = ${factorsOf(n)[1]} × ${n / factorsOf(n)[1]}, so it is composite.`);
    }],
    ['gcflcm', 'Find common factors and multiples', (k) => {
      const g = k.ri(2, 4, 12), a = g * ri(2, 6), b = g * ri(2, 7);
      if (a === b || chance(0.5)) { const x = k.ri(2, 6, 12), y = k.ri(2, 8, 15); return x === y ? Q(`What is the lowest common multiple of ${x} and ${y + 1}?`, lcm(x, y + 1), `The first number in both times tables is ${lcm(x, y + 1)}.`) : Q(`What is the lowest common multiple of ${x} and ${y}?`, lcm(x, y), `List multiples of each; the first one they share is ${lcm(x, y)}.`); }
      return Q(`What is the greatest common factor of ${a} and ${b}?`, gcd(a, b), `The biggest number that divides both ${a} and ${b} is ${gcd(a, b)}.`);
    }],
    ['genequiv', 'Generate equivalent fractions', (k) => {
      const d = ri(2, 9), n = ri(1, d - 1), m = k.ri(2, 4, 9);
      return pick([
        () => Q(`${n}/${d} = ?/${d * m}`, n * m, `${d} × ${m} = ${d * m}, so ${n} × ${m} = ${n * m}.`),
        () => Q(`${n}/${d} = ${n * m}/?`, d * m, `${n} × ${m} = ${n * m}, so ${d} × ${m} = ${d * m}.`),
        () => Q(`?/${d} = ${n * m}/${d * m}`, n, `Divide top and bottom of ${n * m}/${d * m} by ${m}: ${n}/${d}.`),
      ])();
    }],
    ['simplify', 'Simplify fractions', (k) => {
      const d = ri(3, 12), n = ri(1, d - 1), g0 = gcd(n, d), sn = n / g0, sd = d / g0, m = k.ri(2, 4, 8), N0 = sn * m, D0 = sd * m;
      return MC(`Simplify ${N0}/${D0}.`, frac(N0, D0), [`${N0 / (m > 2 && m % 2 === 0 ? 2 : 1)}/${D0 / (m > 2 && m % 2 === 0 ? 2 : 1)}`, `${sn + 1}/${sd + 1}`, `${sd}/${sn}`, `${sn}/${sd + 1}`].filter((s) => s !== `${N0}/${D0}`), `Divide top and bottom by ${m}: ${frac(N0, D0)}.`);
    }],
    ['commonden', 'Find common denominators', (k) => {
      const a = k.ri(2, 6, 12), b = k.ri(2, 8, 12), x = a === b ? a + 1 : a;
      return Q(`What is the lowest common denominator of 1/${x} and 1/${b}?`, lcm(x, b), `The lowest common multiple of ${x} and ${b} is ${lcm(x, b)}.`);
    }],
    ['compdiff', 'Compare and order fractions with different denominators', (k) => {
      let a, b, c, d;
      do { b = k.ri(3, 8, 12); d = k.ri(3, 8, 12); a = ri(1, b - 1); c = ri(1, d - 1); } while (b === d || a * d === b * c);
      const L = lcm(b, d), A = (a * L) / b, Cc = (c * L) / d;
      return MC('Which fraction is bigger?', A > Cc ? `${a}/${b}` : `${c}/${d}`, [A > Cc ? `${c}/${d}` : `${a}/${b}`], `Use the common denominator ${L}: ${a}/${b} = ${A}/${L} and ${c}/${d} = ${Cc}/${L}.`);
    }],
    ['addsame', 'Add and subtract fractions with the same denominator', (k) => {
      const d = k.ri(4, 9, 15), a = ri(1, d - 1), b = ri(1, d - 1);
      if (chance(0.5) && a !== b) { const [x, y] = [Math.max(a, b), Math.min(a, b)]; return Q(`${x}/${d} − ${y}/${d}`, (x - y) / d, `Same denominator, subtract the tops: ${x - y}/${d}${gcd(x - y, d) > 1 ? ' = ' + frac(x - y, d) : ''}.`, { display: frac(x - y, d) }); }
      return Q(`${a}/${d} + ${b}/${d}`, (a + b) / d, `Same denominator, add the tops: ${a + b}/${d}${frac(a + b, d) !== `${a + b}/${d}` ? ' = ' + frac(a + b, d) : ''}.`, { display: frac(a + b, d) });
    }],
    ['adddiff', 'Add and subtract fractions with different denominators', (k) => {
      let b, d; do { b = k.ri(2, 5, 10); d = k.ri(2, 6, 12); } while (b === d);
      const a = ri(1, b - 1), c = ri(1, d - 1), L = lcm(b, d), A = (a * L) / b, Cc = (c * L) / d;
      if (chance(0.5) && A !== Cc) { const [p, q, P, Qn] = A > Cc ? [`${a}/${b}`, `${c}/${d}`, A, Cc] : [`${c}/${d}`, `${a}/${b}`, Cc, A]; return Q(`${p} − ${q}`, (P - Qn) / L, `Common denominator ${L}: ${P}/${L} − ${Qn}/${L} = ${P - Qn}/${L}${gcd(P - Qn, L) > 1 ? ' = ' + frac(P - Qn, L) : ''}.`, { display: frac(P - Qn, L) }); }
      return Q(`${a}/${b} + ${c}/${d}`, (A + Cc) / L, `Common denominator ${L}: ${A}/${L} + ${Cc}/${L} = ${A + Cc}/${L}${gcd(A + Cc, L) > 1 ? ' = ' + frac(A + Cc, L) : ''}.`, { display: frac(A + Cc, L) });
    }],
    ['addmixed', 'Add and subtract mixed numbers', (k) => {
      const d = pick(k.d <= 5 ? [2, 3, 4, 5, 6, 8] : [3, 4, 6]), d2 = k.d <= 5 ? d : pick([2, 3, 4, 6].filter((x) => x !== d)), L = lcm(d, d2);
      const w1 = ri(1, 6), w2 = ri(1, 4), n1 = ri(1, d - 1), n2 = ri(1, d2 - 1), v1 = w1 + n1 / d, v2 = w2 + n2 / d2;
      const sub = chance(0.5) && v1 > v2, tot = sub ? v1 - v2 : v1 + v2, num = Math.round(tot * L);
      return Q(`${w1} ${n1}/${d} ${sub ? '−' : '+'} ${w2} ${n2}/${d2}`, num / L, `${sub ? 'Subtract' : 'Add'} the wholes and the fractions (common denominator ${L}): ${mixed(num, L)}.`, { display: mixed(num, L) });
    }],
    ['regroup', 'Regroup when subtracting mixed numbers', (k) => {
      const d = k.ri(3, 6, 12), n1 = ri(1, d - 2), n2 = ri(n1 + 1, d - 1), w1 = ri(3, 9), w2 = ri(1, w1 - 1), num = (w1 * d + n1) - (w2 * d + n2);
      return Q(`${w1} ${n1}/${d} − ${w2} ${n2}/${d}`, num / d, `${n1}/${d} is smaller than ${n2}/${d}, so swap a whole: ${w1} ${n1}/${d} = ${w1 - 1} ${n1 + d}/${d}. Then ${w1 - 1} ${n1 + d}/${d} − ${w2} ${n2}/${d} = ${mixed(num, d)}.`, { display: mixed(num, d) });
    }],
    ['unitqty', 'Find a unit fraction of a quantity', (k) => { const d = k.ri(2, 5, 12), q = k.ri(2, 10, 50); return Q(`1/${d} of ${d * q}`, q, `Divide by ${d}: ${d * q} ÷ ${d} = ${q}.`); }],
    ['fracqty', 'Find a non-unit fraction of a quantity', (k) => { const d = k.ri(3, 6, 12), n = ri(2, d - 1), q = k.ri(2, 10, 40); return Q(`${n}/${d} of ${d * q}`, n * q, `1/${d} of ${d * q} is ${q}, so ${n}/${d} is ${n} × ${q} = ${n * q}.`); }],
    ['fracword', 'Solve word problems involving fractions of quantities', (k) => {
      const d = k.ri(3, 6, 10), n = ri(1, d - 1), q = k.ri(3, 10, 30), tot = d * q, a = who(), it = pick(ITEMS);
      return chance(0.5) ? Q(`${a} has ${tot} ${it} and gives away ${n}/${d} of them. How many does ${a} give away?`, n * q, `1/${d} of ${tot} is ${q}, so ${n}/${d} is ${n * q}.`) : Q(`${a} has ${tot} ${it}. ${n}/${d} of them are gold. How many are NOT gold?`, tot - n * q, `Gold: ${n}/${d} of ${tot} = ${n * q}. Not gold: ${tot} − ${n * q} = ${tot - n * q}.`);
    }],
    ['decplace', 'Understand decimal tenths, hundredths and thousandths', (k) => {
      const places = k.up(1, 3), s = `${ri(0, 20)}.${[...Array(places)].map(() => ri(1, 9)).join('')}`, p = ri(1, places), dg = +s.split('.')[1][p - 1], nm = ['', 'tenths', 'hundredths', 'thousandths'][p];
      switch (pick([0, 1, 2])) {
        case 0: return Q(`In ${s}, which digit is in the ${nm} place?`, dg, `After the point: tenths, hundredths, thousandths. The ${nm} digit is ${dg}.`);
        case 1: return Q(`What is the value of the digit ${dg} in ${s}?`, dg / 10 ** p, `It is in the ${nm} place: ${dg}/${10 ** p} = ${N(dg / 10 ** p)}.`);
        default: { const t = ri(1, 9), h = ri(1, 9); return places >= 3 ? Q(`Write as a decimal: ${t} tenths, ${h} hundredths and ${dg} thousandths.`, t / 10 + h / 100 + dg / 1000, `0.${t}${h}${dg}.`) : Q(`Write as a decimal: ${t} tenths and ${h} hundredths.`, t / 10 + h / 100, `0.${t}${h}.`); }
      }
    }],
    ['decfrac', 'Connect decimals to fractions', (k) => {
      const den = k.band(10, 100, 1000), n = ri(1, den - 1);
      switch (pick([0, 1, 2])) {
        case 0: return Q(`${N(n / den)} = ?/${den}`, n, `${N(n / den)} means ${n} ${den === 10 ? 'tenths' : den === 100 ? 'hundredths' : 'thousandths'}: ${n}/${den}.`);
        case 1: return Q(`Write ${n}/${den} as a decimal.`, n / den, `${n} ${den === 10 ? 'tenths' : den === 100 ? 'hundredths' : 'thousandths'} = ${N(n / den)}.`);
        default: { const [f, dv] = pick([['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/5', 0.2], ['2/5', 0.4], ['1/10', 0.1], ['3/5', 0.6], ['1/20', 0.05]]); return MC(`Which fraction is equal to ${dv}?`, f, ['1/2', '1/4', '3/4', '1/5', '2/5', '1/3', '3/10'].filter((x) => x !== f), `${dv} = ${Math.round(dv * 100)}/100 = ${f}.`); }
      }
    }],
    ['equivdec', 'Recognize equivalent decimals, such as 0.5 and 0.50', (k) => {
      const w = ri(0, 9), t = ri(1, 9), base = `${w}.${t}`;
      return MC(`Which is equal to ${base}?`, `${base}0`, [`${w}.0${t}`, `${w}.00${t}`, String(w * 10 + t), `${w + 1}.${t}`], `Adding a zero at the end of a decimal doesn't change it: ${base} = ${base}0.`);
    }],
    ['compdec', 'Compare and order decimals', (k) => {
      // look-alikes with different lengths: 0.4, 0.45, 0.405, 0.054 ...
      const [a, b, c] = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), cands = shuffle([`0.${a}`, `0.${a}${b}`, `0.${a}0${b}`, `0.0${a}${b}`, `0.${b}${a}`, `0.${c}`, `0.${a}${c}${b}`]);
      const set = []; for (const s of cands) if (!set.some((x) => +x === +s) && set.length < 4) set.push(s);
      const big = chance(0.5), ans = set.reduce((m, s) => ((big ? +s > +m : +s < +m) ? s : m));
      return MC(`Which decimal is the ${big ? 'largest' : 'smallest'}?`, ans, set.filter((s) => s !== ans), `Compare tenths, then hundredths, then thousandths: ${ans} is the ${big ? 'largest' : 'smallest'}.`);
    }],
    ['rounddec', 'Round decimals', (k) => {
      const places = k.up(2, 3), v = ri(10, 9999) / 10 ** places, to = places === 3 && chance(0.5) ? 2 : 1, r = Math.round(v * 10 ** to + 1e-9) / 10 ** to;
      if (k.d <= 3 && chance(0.5)) return Q(`Round ${N(v)} to the nearest whole number.`, Math.round(v), `Look at the tenths digit: 5 or more rounds up. ${N(v)} → ${Math.round(v)}.`);
      return Q(`Round ${v.toFixed(places)} to the nearest ${to === 1 ? 'tenth' : 'hundredth'}.`, r, `Look at the next digit: 5 or more rounds up. ${v.toFixed(places)} → ${r.toFixed(to)}.`, { display: r.toFixed(to) });
    }],
    ['adddec', 'Add and subtract decimals', (k) => {
      const p1 = k.up(1, 2), p2 = k.up(1, 3), a = k.ri(10, 99, 9999) / 10 ** p1, b = k.ri(1, 99, 999) / 10 ** p2;
      if (chance(0.5) && a > b) return Q(`${N(a)} − ${N(b)}`, r6(a - b), `Line up the decimal points (add zeros if needed): ${N(a)} − ${N(b)} = ${N(a - b)}.`);
      return Q(`${N(a)} + ${N(b)}`, r6(a + b), `Line up the decimal points: ${N(a)} + ${N(b)} = ${N(a + b)}.`);
    }],
    ['decmoney', 'Calculate with decimals in money and measurement problems', (k) => {
      const a = who();
      if (chance(0.5)) { const p = 5 * k.ri(20, 100, 900), n = k.ri(2, 4, 8), pay = Math.ceil((p * n + 1) / 1000) * 1000; return Q(`${a} buys ${n} books at ${money(p)} each and pays with ${money(pay)}. How much change?`, (pay - p * n) / 100, `${n} × ${money(p)} = ${money(p * n)}, and ${money(pay)} − ${money(p * n)} = ${money(pay - p * n)}.`, { display: money(pay - p * n) }); }
      const l1 = ri(25, 95) / 10, l2 = ri(12, 24) / 10;
      return chance(0.5) ? Q(`${a} joins a ${l1} m ribbon and a ${l2} m ribbon. How long is it now, in metres?`, r6(l1 + l2), `${l1} + ${l2} = ${N(l1 + l2)} m.`)
        : Q(`${a} has a ${l1} m ribbon and cuts off ${l2} m. How much is left, in metres?`, r6(l1 - l2), `${l1} − ${l2} = ${N(l1 - l2)} m.`);
    }],
    ['classify5', 'Classify triangles and quadrilaterals by their properties', (k) => {
      if (chance(0.5)) { const a = ri(30, 90), b = ri(20, 150 - a); return Q(`A triangle has angles of ${a}° and ${b}°. What is the third angle?`, 180 - a - b, `The angles of a triangle add to 180°: 180 − ${a} − ${b} = ${180 - a - b}°.`); }
      const [q, a, o] = pick([
        ['Which shape is always a parallelogram?', 'rectangle', ['trapezoid', 'kite', 'triangle']],
        ['A triangle with one angle bigger than 90° is…', 'obtuse', ['acute', 'right', 'equilateral']],
        ['A triangle with all angles less than 90° is…', 'acute', ['obtuse', 'right', 'scalene']],
        ['The angles inside any quadrilateral add up to…', '360°', ['180°', '90°', '270°']],
        ['Every square is also a…', 'rhombus', ['trapezoid', 'kite', 'triangle']],
        ['An equilateral triangle has angles of…', '60° each', ['90° each', '45° each', '30°, 60° and 90°']],
      ]);
      return MC(q, a, o, `${q.replace('…', '')} ${a}.`);
    }],
    ['heights', 'Identify heights in geometric shapes', (k) => {
      const b = ri(6, 16), h = ri(3, b - 1), s = h + ri(1, 4), kind = pick(['tri', 'para']);
      return MC(`For the base of ${b} cm, which length is the height?`, `${h} cm`, [`${s} cm`, `${b} cm`], `The height is the straight-up distance from the base, at a right angle to it: ${h} cm.`, { svg: heightSvg(kind, `${b} cm`, `${h} cm`, `${s} cm`) });
    }],
    ['triarea', 'Calculate triangle area', (k) => {
      const b = 2 * k.ri(2, 6, 15), h = k.ri(3, 8, 20), s = h + ri(1, 4);
      return Q('What is the area of the triangle in cm²?', (b * h) / 2, `Area = base × height ÷ 2 = ${b} × ${h} ÷ 2 = ${(b * h) / 2} cm².`, { svg: heightSvg('tri', `${b} cm`, `${h} cm`, `${s} cm`) });
    }],
    ['paraarea', 'Calculate parallelogram area', (k) => {
      const b = k.ri(4, 10, 25), h = k.ri(3, 8, 20), s = h + ri(1, 4);
      return Q('What is the area of the parallelogram in cm²?', b * h, `Area = base × height = ${b} × ${h} = ${b * h} cm². The slanted side isn't used.`, { svg: heightSvg('para', `${b} cm`, `${h} cm`, `${s} cm`) });
    }],
    ['convert5', 'Convert measurement units', (k) => {
      const [big, small, f] = pick([['km', 'm', 1000], ['m', 'cm', 100], ['cm', 'mm', 10], ['kg', 'g', 1000], ['L', 'mL', 1000], ['hours', 'minutes', 60], ['minutes', 'seconds', 60]]);
      const val = f === 60 || k.d <= 4 ? ri(2, 9) : ri(5, 95) / 10;
      if (chance(0.5)) return Q(`${N(val)} ${big} = ? ${small}`, r6(val * f), `1 ${big} = ${N(f)} ${small}, so ${N(val)} × ${N(f)} = ${N(val * f)}.`);
      return Q(`${N(val * f)} ${small} = ? ${big}`, val, `1 ${big} = ${N(f)} ${small}, so ${N(val * f)} ÷ ${N(f)} = ${N(val)}.`);
    }],
    ['lpa', 'Distinguish length, perimeter and area', (k) => {
      const [q, a, o] = pick([
        ['Fencing to go all the way around a garden measures its…', 'perimeter', ['area', 'length', 'volume']],
        ['Carpet to cover a floor measures its…', 'area', ['perimeter', 'length', 'height']],
        ['Which unit is used for area?', 'cm²', ['cm', 'm', 'km']],
        ['A ribbon for the edge of a picture frame measures its…', 'perimeter', ['area', 'volume', 'weight']],
        ['Paint to cover a wall depends on the wall\'s…', 'area', ['perimeter', 'length', 'weight']],
      ]);
      if (chance(0.4)) { const w = ri(3, 12), h = ri(2, 9), wantA = chance(0.5); return Q(`A rectangle is ${w} cm by ${h} cm. What is its ${wantA ? 'area in cm²' : 'perimeter in cm'}?`, wantA ? w * h : 2 * (w + h), wantA ? `Area = ${w} × ${h} = ${w * h} cm².` : `Perimeter = 2 × (${w} + ${h}) = ${2 * (w + h)} cm.`); }
      return MC(q, a, o, `${q.replace('…', '').replace('?', ':')} ${a}.`);
    }],
    ['combopa', 'Solve combined perimeter and area problems', (k) => {
      const w = k.ri(4, 10, 20), h = k.ri(3, 8, 15);
      if (chance(0.5)) return Q(`A rectangle has a perimeter of ${2 * (w + h)} cm and a length of ${w} cm. What is its area in cm²?`, w * h, `Width = ${w + h} − ${w} = ${h} cm, area = ${w} × ${h} = ${w * h} cm².`);
      const cw = ri(1, w - 2), ch = ri(1, h - 2), cells = new Set();
      for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (!(x >= w - cw && y < ch)) cells.add(x + ',' + y);
      return Q(`An L-shape is a ${w} × ${h} rectangle with a ${cw} × ${ch} corner cut off (each square is 1 cm²). What is its area?`, w * h - cw * ch, `${w} × ${h} = ${w * h}, minus the corner ${cw} × ${ch} = ${cw * ch}: ${w * h - cw * ch} cm².`, { svg: w <= 14 && h <= 10 ? grid(w, h, cells) : undefined });
    }],
    ['data5', 'Read and compare data displays', (k) => {
      const ch = chartData(k, 4), a = ch.vals.reduce((s, v) => s + v, 0);
      if (chance(0.4)) return Q(`${ch.title}: what fraction of the total is ${ch.cats[0]}? (total ${a})`, ch.vals[0] / a, `${ch.vals[0]} out of ${a}: ${frac(ch.vals[0], a)}.`, { svg: barChart(ch.cats, ch.vals, ch.step), display: frac(ch.vals[0], a) });
      return chartQuestion({ ...k, d: Math.max(k.d, 7) }, ch);
    }],
    ['avg5', 'Calculate and interpret averages', (k) => {
      const n = k.ri(3, 4, 6), mean = k.ri(4, 15, 80), vals = Array.from({ length: n - 1 }, () => mean + ri(-mean + 1, mean)), last = mean * n - vals.reduce((a, b) => a + b, 0);
      const all = [...vals, last]; if (last <= 0) return Q(`What is the average (mean) of ${mean - 1}, ${mean} and ${mean + 1}?`, mean, `(${mean - 1} + ${mean} + ${mean + 1}) ÷ 3 = ${mean}.`);
      if (k.d >= 7 && chance(0.5)) return Q(`The mean of ${n} numbers is ${mean}. ${n - 1} of them are ${vals.join(', ')}. What is the last one?`, last, `The total must be ${n} × ${mean} = ${n * mean}. ${n * mean} − ${vals.reduce((a, b) => a + b, 0)} = ${last}.`);
      return Q(`What is the mean of ${shuffle(all).join(', ')}?`, mean, `Add them: ${all.reduce((a, b) => a + b, 0)}, then divide by ${n}: ${mean}.`);
    }],
  ];

  // ---------- Grade 6 ----------
  const fr = (k, maxD = 12) => { const d = k.ri(2, 6, maxD), n = ri(1, d - 1); return [n, d]; };
  const g6 = [
    ['wxf', 'Multiply a whole number by a fraction', (k) => { const [n, d] = fr(k), w = chance(0.6) ? d * k.ri(1, 4, 12) : ri(2, 9); return Q(`${w} × ${n}/${d}`, (w * n) / d, `${w} × ${n} = ${w * n}, over ${d}: ${w * n}/${d}${frac(w * n, d) !== `${w * n}/${d}` ? ' = ' + frac(w * n, d) : ''}.`, { display: frac(w * n, d) }); }],
    ['fxf', 'Multiply a fraction by a fraction', (k) => { const [a, b] = fr(k, 10), [c, d] = fr(k, 10); return Q(`${a}/${b} × ${c}/${d}`, (a * c) / (b * d), `Tops × tops, bottoms × bottoms: ${a * c}/${b * d}${frac(a * c, b * d) !== `${a * c}/${b * d}` ? ' = ' + frac(a * c, b * d) : ''}.`, { display: frac(a * c, b * d) }); }],
    ['mxm', 'Multiply mixed numbers', (k) => {
      const d1 = pick([2, 3, 4]), d2 = pick([2, 3, 4, 5]), w1 = k.ri(1, 2, 4), w2 = k.ri(1, 2, 3), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1);
      const A = w1 * d1 + n1, B = w2 * d2 + n2; return Q(`${w1} ${n1}/${d1} × ${w2} ${n2}/${d2}`, (A * B) / (d1 * d2), `Make improper fractions: ${A}/${d1} × ${B}/${d2} = ${A * B}/${d1 * d2} = ${mixed(A * B, d1 * d2)}.`, { display: mixed(A * B, d1 * d2) });
    }],
    ['fdivw', 'Divide a fraction by a whole number', (k) => { const [n, d] = fr(k), w = k.ri(2, 4, 9); return Q(`${n}/${d} ÷ ${w}`, n / (d * w), `Dividing by ${w} is the same as × 1/${w}: ${n}/${d * w}${frac(n, d * w) !== `${n}/${d * w}` ? ' = ' + frac(n, d * w) : ''}.`, { display: frac(n, d * w) }); }],
    ['wdivf', 'Divide a whole number by a fraction', (k) => {
      const [n, d] = fr(k, 8), w = n * k.ri(1, 3, 8);
      return Q(`${w} ÷ ${n}/${d}`, (w * d) / n, `Flip and multiply: ${w} × ${d}/${n} = ${w * d}/${n}${frac(w * d, n) !== `${w * d}/${n}` ? ' = ' + frac(w * d, n) : ''}.`, { display: frac(w * d, n) });
    }],
    ['fdivf', 'Divide a fraction by a fraction', (k) => { const [a, b] = fr(k, 10), [c, d] = fr(k, 10); return Q(`${a}/${b} ÷ ${c}/${d}`, (a * d) / (b * c), `Flip the second and multiply: ${a}/${b} × ${d}/${c} = ${a * d}/${b * c}${frac(a * d, b * c) !== `${a * d}/${b * c}` ? ' = ' + frac(a * d, b * c) : ''}.`, { display: frac(a * d, b * c) }); }],
    ['mdivm', 'Divide mixed numbers', (k) => {
      const d1 = pick([2, 3, 4]), d2 = pick([2, 3, 4]), w1 = k.ri(2, 3, 6), w2 = ri(1, 2), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1), A = w1 * d1 + n1, B = w2 * d2 + n2;
      return Q(`${w1} ${n1}/${d1} ÷ ${w2} ${n2}/${d2}`, (A * d2) / (d1 * B), `Improper fractions: ${A}/${d1} ÷ ${B}/${d2} = ${A}/${d1} × ${d2}/${B} = ${A * d2}/${d1 * B} = ${mixed(A * d2, d1 * B)}.`, { display: mixed(A * d2, d1 * B) });
    }],
    ['fofq', 'Find a fraction of a quantity', (k) => { const [n, d] = fr(k, 12), q = d * k.ri(2, 10, 50); return Q(`${n}/${d} of ${q}`, (n * q) / d, `${q} ÷ ${d} = ${q / d}, × ${n} = ${(n * q) / d}.`); }],
    ['whole', 'Find the whole when a fractional part is known', (k) => { const [n, d] = fr(k, 10), unit = k.ri(2, 8, 30); return Q(`${n}/${d} of a number is ${n * unit}. What is the number?`, d * unit, `1/${d} is ${n * unit} ÷ ${n} = ${unit}, so the whole is ${d} × ${unit} = ${d * unit}.`); }],
    ['fmulti', 'Solve multistep fraction problems', (k) => {
      const a = who(), d1 = pick([2, 3, 4, 5]), d2 = pick([2, 3, 4]), tot = d1 * d2 * k.ri(2, 4, 12), spent = tot / d1, rest = tot - spent, spent2 = rest / d2;
      return Q(`${a} has $${tot}. ${a} spends 1/${d1} on a game, then 1/${d2} of what is left on snacks. How much is left?`, rest - spent2, `1/${d1} of $${tot} = $${spent}, leaving $${rest}. 1/${d2} of $${rest} = $${spent2}, leaving $${rest - spent2}.`, { display: `$${rest - spent2}` });
    }],
    ['dxw', 'Multiply a decimal by a whole number', (k) => { const p = k.up(1, 2), a = k.ri(11, 99, 999) / 10 ** p, w = k.ri(2, 6, 25); return Q(`${N(a)} × ${w}`, r6(a * w), `Multiply without the point: ${Math.round(a * 10 ** p)} × ${w} = ${Math.round(a * 10 ** p) * w}, then put back ${p} decimal place${p > 1 ? 's' : ''}: ${N(a * w)}.`); }],
    ['dxd', 'Multiply a decimal by a decimal', (k) => { const a = k.ri(2, 9, 99) / 10, b = k.ri(2, 9, 99) / 10; return Q(`${N(a)} × ${N(b)}`, r6(a * b), `${Math.round(a * 10)} × ${Math.round(b * 10)} = ${Math.round(a * 10) * Math.round(b * 10)}, with 2 decimal places in total: ${N(a * b)}.`); }],
    ['ddivw', 'Divide a decimal by a whole number', (k) => { const w = k.ri(2, 6, 12), q = k.ri(11, 99, 999) / 10 ** k.up(1, 2); return Q(`${N(r6(q * w))} ÷ ${w}`, q, `Divide as normal and keep the point in place: ${N(q * w)} ÷ ${w} = ${N(q)}.`); }],
    ['divdec', 'Divide by a decimal', (k) => { const dv = pick(k.band([0.5, 0.2, 0.1], [0.5, 0.25, 0.4, 0.3], [0.6, 0.8, 1.2, 0.15])), q = k.ri(2, 12, 60), n = r6(dv * q); const sc = 10 ** (String(dv).split('.')[1] || '').length; return Q(`${N(n)} ÷ ${dv}`, q, `Multiply both by ${sc} so the divisor is whole: ${N(n * sc)} ÷ ${N(dv * sc)} = ${q}.`); }],
    ['estdec', 'Estimate and check decimal calculations', (k) => {
      const a = ri(2, 12) + ri(1, 9) / 10, b = ri(2, 9) + ri(1, 9) / 10, e = Math.round(a) * Math.round(b);
      return MC(`Which is the best estimate for ${a} × ${b}?`, String(e), [String(e * 10), String(Math.max(1, Math.round(e / 10))), String(Math.round(a) + Math.round(b))], `Round to whole numbers: ${Math.round(a)} × ${Math.round(b)} = ${e}.`);
    }],
    ['fdconv', 'Convert between fractions and decimals', (k) => {
      const [f, v] = pick(k.band([['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/5', 0.2], ['3/10', 0.3]], [['2/5', 0.4], ['3/5', 0.6], ['7/20', 0.35], ['9/25', 0.36], ['3/50', 0.06]], [['1/8', 0.125], ['3/8', 0.375], ['5/8', 0.625], ['7/8', 0.875], ['11/40', 0.275]]));
      return chance(0.5) ? Q(`Write ${f} as a decimal.`, v, `${f} = ${f.split('/')[0]} ÷ ${f.split('/')[1]} = ${N(v)}.`) : Q(`Write ${v} as a fraction in simplest form.`, v, `${v} = ${Math.round(v * 1000)}/1000 = ${f}.`, { display: f });
    }],
    ['pct100', 'Understand percentages as parts out of 100', (k) => {
      const p = ri(1, 99), cells = new Set(); for (let i = 0; i < p; i++) cells.add(`${i % 10},${Math.floor(i / 10)}`);
      return chance(0.6) ? Q('What percentage of the grid is shaded?', p, `${p} out of 100 squares = ${p}%.`, { svg: grid(10, 10, cells), display: `${p}%` })
        : Q(`${p}% of a grid of 100 squares is shaded. What percentage is NOT shaded?`, 100 - p, `The whole grid is 100%, so 100 − ${p} = ${100 - p}%.`, { display: `${100 - p}%` });
    }],
    ['fdp', 'Convert between fractions, decimals and percentages', (k) => {
      const [f, v] = pick([['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/5', 0.2], ['2/5', 0.4], ['1/10', 0.1], ['7/10', 0.7], ['3/20', 0.15], ['9/20', 0.45], ['1/8', 0.125]]), p = r6(v * 100);
      return pick([
        () => Q(`${f} = ?%`, p, `${f} = ${N(v)} = ${N(p)}%.`, { display: `${N(p)}%` }),
        () => Q(`${N(v)} = ?%`, p, `Multiply by 100: ${N(v)} × 100 = ${N(p)}%.`, { display: `${N(p)}%` }),
        () => Q(`Write ${N(p)}% as a decimal.`, v, `Divide by 100: ${N(p)} ÷ 100 = ${N(v)}.`),
      ])();
    }],
    ['pctfam', 'Calculate familiar percentages, such as 10%, 25% and 50%', (k) => {
      const p = pick(k.band([50, 10], [10, 25, 50], [20, 75, 5, 1])), q = (p === 25 || p === 75 ? 4 : p === 5 || p === 1 ? 100 : p === 20 ? 5 : 10) * k.ri(2, 10, 40);
      const how = { 50: 'half', 10: 'divide by 10', 25: 'a quarter: divide by 4', 75: 'three quarters', 20: 'a fifth: divide by 5', 5: 'half of 10%', 1: 'divide by 100' }[p];
      return Q(`${p}% of ${N(q)}`, (p * q) / 100, `${p}% is ${how}: ${N((p * q) / 100)}.`);
    }],
    ['pctany', 'Calculate any percentage of a quantity', (k) => { const p = ri(2, 19) * 5 + (k.d >= 7 ? ri(0, 4) : 0), q = 20 * k.ri(2, 10, 50); return Q(`${p}% of ${N(q)}`, r6((p * q) / 100), `1% of ${N(q)} is ${N(q / 100)}, so ${p}% is ${p} × ${N(q / 100)} = ${N((p * q) / 100)}.`); }],
    ['discount', 'Calculate discounts and percentage increases', (k) => {
      const p = pick([10, 20, 25, 30, 40, 50, 15, 5]), price = 20 * k.ri(1, 10, 50), cut = (p * price) / 100;
      return chance(0.6) ? Q(`A jacket costs $${price}. It is ${p}% off. What is the sale price?`, price - cut, `${p}% of $${price} = $${N(cut)}, so $${price} − $${N(cut)} = $${N(price - cut)}.`, { display: `$${N(price - cut)}` })
        : Q(`A ticket costs $${price} and the price goes up by ${p}%. What is the new price?`, price + cut, `${p}% of $${price} = $${N(cut)}, so $${price} + $${N(cut)} = $${N(price + cut)}.`, { display: `$${N(price + cut)}` });
    }],
    ['whatpct', 'Find what percentage one quantity is of another', (k) => { const p = pick([10, 20, 25, 40, 50, 75, 5, 60, 15, 80]), tot = 20 * k.ri(1, 5, 20), part = (p * tot) / 100; return Q(`${N(part)} out of ${N(tot)} is what percentage?`, p, `${N(part)} ÷ ${N(tot)} = ${N(p / 100)}, × 100 = ${p}%.`, { display: `${p}%` }); }],
    ['pctwhole', 'Find the original whole when a percentage amount is known', (k) => { const p = pick([10, 20, 25, 50, 40, 30, 75]), whole = (100 / gcd(100, p)) * k.ri(1, 5, 25), part = (p * whole) / 100; return Q(`${p}% of a number is ${N(part)}. What is the number?`, whole, `1% is ${N(part)} ÷ ${p} = ${N(part / p)}, so 100% is ${N(whole)}.`); }],
    ['ratio', 'Understand and write ratios', (k) => {
      // r : b in simplest form (different, no common factor), shown as m times as many counters
      let r, b; do { r = k.ri(1, 4, 9); b = k.ri(1, 5, 9); } while (r === b || gcd(r, b) > 1);
      const m = ri(2, k.up(2, 4)), Y = r * m, B = b * m, pic = Y + B <= 18 ? dots([Y, B]) : undefined;
      switch (pick([0, 1, 2])) {
        case 0: return Q(`There are ${Y} yellow and ${B} blue counters. Write yellow : blue in simplest form. ${r} : ?`, b, `${Y} : ${B}, divide both by ${m}: ${r} : ${b}.`, { svg: pic });
        case 1: return Q(`There are ${Y} yellow and ${B} blue counters. Write blue : all counters in simplest form. ${b} : ?`, r + b, `There are ${Y + B} in all, so ${B} : ${Y + B}. Divide both by ${m}: ${b} : ${r + b}.`, { svg: pic });
        default: return Q(`For every ${r} yellow counters there are ${b} blue ones. There are ${Y} yellow. How many are blue?`, B, `${Y} is ${m} × ${r}, so the blue is ${m} × ${b} = ${B}.`);
      }
    }],
    ['eqratio', 'Find equivalent ratios', (k) => { const a = ri(1, 9), b = pick([2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== a)), m = k.ri(2, 5, 12); return chance(0.5) ? Q(`${a} : ${b} = ${a * m} : ?`, b * m, `${a} × ${m} = ${a * m}, so ${b} × ${m} = ${b * m}.`) : Q(`${a} : ${b} = ? : ${b * m}`, a * m, `${b} × ${m} = ${b * m}, so ${a} × ${m} = ${a * m}.`); }],
    ['divratio', 'Divide a quantity in a given ratio', (k) => {
      const a = ri(1, 5), b = ri(a + 1, 8), u = k.ri(2, 10, 40), tot = (a + b) * u, big = chance(0.5);
      return Q(`Share $${tot} in the ratio ${a} : ${b}. How much is the ${big ? 'bigger' : 'smaller'} share?`, (big ? b : a) * u, `${a} + ${b} = ${a + b} parts, each part is $${tot} ÷ ${a + b} = $${u}, so ${big ? b : a} × $${u} = $${(big ? b : a) * u}.`, { display: `$${(big ? b : a) * u}` });
    }],
    ['proport', 'Solve proportional problems', (k) => {
      const n1 = ri(2, 6), unit = 5 * k.ri(3, 20, 80), n2 = ri(n1 + 1, n1 + 8), a = pick(['notebooks', 'tickets', 'pens', 'potions']);
      return Q(`${n1} ${a} cost ${money(n1 * unit)}. How much do ${n2} cost?`, (n2 * unit) / 100, `One costs ${money(n1 * unit)} ÷ ${n1} = ${money(unit)}, so ${n2} cost ${n2} × ${money(unit)} = ${money(n2 * unit)}.`, { display: money(n2 * unit) });
    }],
    ['recipe', 'Scale recipes and quantities up or down', (k) => {
      const base = pick([2, 4, 6]), want = pick([1, 3, 5, 8, 9, 12].filter((x) => x !== base)), per = pick([50, 100, 150, 200, 250, 300]) / base, ing = pick(['flour', 'sugar', 'butter', 'milk']);
      const amt = per * base, ans = per * want, unit = ing === 'milk' ? 'mL' : 'g';
      if (!Number.isInteger(ans * 2)) return Q(`A recipe for ${base} needs ${amt} ${unit} of ${ing}. How much for ${base * 2}?`, amt * 2, `Double it: ${amt * 2} ${unit}.`);
      return Q(`A recipe for ${base} people needs ${amt} ${unit} of ${ing}. How much for ${want} ${want === 1 ? 'person' : 'people'}?`, ans, `For 1 person: ${amt} ÷ ${base} = ${N(per)} ${unit}. For ${want}: ${want} × ${N(per)} = ${N(ans)} ${unit}.`);
    }],
    ['scale', 'Interpret map and drawing scales', (k) => {
      if (chance(0.5)) { const s = pick([2, 5, 10, 20, 50]), cm = k.ri(2, 9, 30) / (k.d >= 6 ? 2 : 1); return Q(`On a map, 1 cm stands for ${s} km. Two towns are ${N(cm)} cm apart on the map. How many km apart are they?`, r6(cm * s), `${N(cm)} × ${s} = ${N(cm * s)} km.`); }
      const s = pick([10, 20, 50, 100]), cm = ri(2, 20); return Q(`A drawing has a scale of 1 : ${s}. A wall is ${cm} cm long on the drawing. How long is the real wall in metres?`, (cm * s) / 100, `${cm} × ${s} = ${N(cm * s)} cm = ${N((cm * s) / 100)} m.`);
    }],
    ['circparts', 'Identify the centre, radius and diameter of a circle', (k) => {
      const r = k.ri(2, 10, 50);
      switch (pick([0, 1, 2])) {
        case 0: return Q('The radius is shown. What is the diameter?', 2 * r, `The diameter is twice the radius: 2 × ${r} = ${2 * r} cm.`, { svg: circleSvg(`r = ${r} cm`, 'r') });
        case 1: return Q('The diameter is shown. What is the radius?', r, `The radius is half the diameter: ${2 * r} ÷ 2 = ${r} cm.`, { svg: circleSvg(`d = ${2 * r} cm`, 'd') });
        default: return MC('A line from the centre of a circle to its edge is called the…', 'radius', ['diameter', 'circumference', 'centre'], 'From the centre to the edge is the radius.');
      }
    }],
    ['pi', 'Understand pi', (k) => {
      if (chance(0.5)) { const d = ri(2, 20); return Q(`A circle has a diameter of ${d} cm and a circumference of ${N(3.14 * d)} cm. What is circumference ÷ diameter?`, 3.14, `${N(3.14 * d)} ÷ ${d} = 3.14. It's the same for every circle: that number is π.`); }
      const [q, a, o] = pick([['π is about…', '3.14', ['2.14', '3.41', '31.4']], ['π is the circumference divided by the…', 'diameter', ['radius', 'area', 'centre']], ['Which fraction is often used for π?', '22/7', ['7/22', '3/14', '1/3']]]);
      return MC(q, a, o, `${q.replace('…', '')} ${a}.`);
    }],
    ['circum', 'Calculate circle circumference', (k) => {
      const r = k.ri(1, 10, 30), useD = chance(0.5), c = r6(3.14 * 2 * r);
      return Q(`Using π ≈ 3.14, what is the circumference of this circle in cm?`, c, `C = π × d = 3.14 × ${2 * r} = ${N(c)} cm.`, { svg: circleSvg(useD ? `d = ${2 * r} cm` : `r = ${r} cm`, useD ? 'd' : 'r'), tol: c * 0.004 });
    }],
    ['circarea', 'Calculate circle area', (k) => {
      const r = k.ri(1, 8, 20), a = r6(3.14 * r * r), useD = k.d >= 6 && chance(0.5);
      return Q(`Using π ≈ 3.14, what is the area of this circle in cm²?`, a, `${useD ? `Radius = ${2 * r} ÷ 2 = ${r} cm. ` : ''}A = π × r² = 3.14 × ${r} × ${r} = ${N(a)} cm².`, { svg: circleSvg(useD ? `d = ${2 * r} cm` : `r = ${r} cm`, useD ? 'd' : 'r'), tol: a * 0.004 });
    }],
    ['solids', 'Recognize three-dimensional solids and their nets', (k) => {
      if (chance(0.5)) { const [s, f, e, v] = pick([['cube', 6, 12, 8], ['cuboid', 6, 12, 8], ['triangular prism', 5, 9, 6], ['square-based pyramid', 5, 8, 5], ['triangular pyramid', 4, 6, 4]]), [w, x] = pick([['faces', f], ['edges', e], ['vertices', v]]); return Q(`How many ${w} does a ${s} have?`, x, `A ${s} has ${f} faces, ${e} edges and ${v} vertices.`); }
      const [q, a, o] = pick([
        ['A net of 6 equal squares folds into a…', 'cube', ['cylinder', 'pyramid', 'prism']],
        ['A net with 2 circles and a rectangle folds into a…', 'cylinder', ['cone', 'cube', 'sphere']],
        ['A net with 1 square and 4 triangles folds into a…', 'square-based pyramid', ['cube', 'triangular prism', 'cone']],
        ['A net with 2 triangles and 3 rectangles folds into a…', 'triangular prism', ['pyramid', 'cube', 'cylinder']],
        ['A solid with one curved surface, one circle face and a point is a…', 'cone', ['cylinder', 'sphere', 'pyramid']],
      ]);
      return MC(q, a, o, `${q.replace('…', '')} ${a}.`);
    }],
    ['volume', 'Calculate cube and cuboid volume', (k) => {
      const l = k.ri(2, 6, 15), w = k.ri(2, 5, 10), h = k.ri(2, 5, 12);
      if (k.d >= 7 && chance(0.5)) return Q(`A box has a volume of ${l * w * h} cm³. It is ${l} cm long and ${w} cm wide. How tall is it?`, h, `${l} × ${w} = ${l * w}, and ${l * w * h} ÷ ${l * w} = ${h} cm.`);
      if (chance(0.25)) { const s = k.ri(2, 5, 12); return Q(`What is the volume of a cube with ${s} cm sides, in cm³?`, s ** 3, `${s} × ${s} × ${s} = ${s ** 3} cm³.`); }
      return Q('What is the volume of the box in cm³?', l * w * h, `Volume = length × width × height = ${l} × ${w} × ${h} = ${l * w * h} cm³.`, { svg: cuboidSvg(`${l} cm`, `${w} cm`, `${h} cm`) });
    }],
    ['volsa', 'Distinguish volume from surface area', (k) => {
      if (chance(0.5)) { const l = ri(2, 10), w = ri(2, 8), h = ri(2, 8), sa = 2 * (l * w + l * h + w * h); return Q(`A box is ${l} cm × ${w} cm × ${h} cm. What is its surface area in cm²?`, sa, `Add the areas of all 6 faces: 2 × (${l * w} + ${l * h} + ${w * h}) = ${sa} cm².`, { svg: cuboidSvg(`${l} cm`, `${w} cm`, `${h} cm`) }); }
      const [q, a, o] = pick([['How much water fits in a fish tank is its…', 'volume', ['surface area', 'perimeter', 'height']], ['Wrapping paper to cover a box measures its…', 'surface area', ['volume', 'perimeter', 'length']], ['Which unit is used for volume?', 'cm³', ['cm²', 'cm', 'kg']], ['Paint to cover every side of a cube measures its…', 'surface area', ['volume', 'height', 'perimeter']]]);
      return MC(q, a, o, `${q.replace('…', '').replace('?', ':')} ${a}.`);
    }],
    ['pie', 'Interpret pie charts and other data displays', (k) => {
      const sets = [[50, 25, 25], [40, 30, 20, 10], [50, 30, 20], [25, 25, 40, 10], [60, 25, 15]], pcts = pick(sets), labels = shuffle(['Soccer', 'Swim', 'Art', 'Chess', 'Music']).slice(0, pcts.length);
      const parts = pcts.map((p, i) => ({ label: labels[i], pct: p })), i = ri(0, parts.length - 1), tot = 20 * k.ri(2, 5, 30);
      if (k.d >= 7 && chance(0.4)) return Q(`In a pie chart, how many degrees is the slice for ${parts[i].label} (${parts[i].pct}%)?`, (parts[i].pct * 360) / 100, `${parts[i].pct}% of 360° = ${(parts[i].pct * 360) / 100}°.`, { svg: pieSvg(parts) });
      return Q(`${tot} kids chose a club. How many chose ${parts[i].label}?`, (parts[i].pct * tot) / 100, `${parts[i].pct}% of ${tot} = ${(parts[i].pct * tot) / 100}.`, { svg: pieSvg(parts) });
    }],
    ['avg6', 'Solve problems involving averages', (k) => {
      const n = ri(4, 6), vals = Array.from({ length: n }, () => k.ri(2, 20, 90)), s = [...vals].sort((a, b) => a - b);
      switch (pick([0, 1, 2])) {
        case 0: { const mean = k.ri(5, 20, 80), m = ri(3, 6); return Q(`The mean of ${m} test scores is ${mean}. What is the total of the scores?`, mean * m, `Total = mean × how many = ${mean} × ${m} = ${mean * m}.`); }
        case 1: return Q(`What is the range of ${vals.join(', ')}?`, s[n - 1] - s[0], `Largest − smallest = ${s[n - 1]} − ${s[0]} = ${s[n - 1] - s[0]}.`);
        default: { if (n % 2 === 0) s.splice(ri(0, n - 1), 1); const med = s[(s.length - 1) / 2]; return Q(`What is the median of ${shuffle(s).join(', ')}?`, med, `In order: ${[...s].sort((a, b) => a - b).join(', ')}. The middle one is ${med}.`); }
      }
    }],
    ['prob', 'Explore simple probability', (k) => {
      const r = k.ri(1, 5, 9), b = k.ri(1, 5, 9), g = k.d >= 5 ? ri(0, 5) : 0, t = r + b + g;
      if (k.d <= 3 && chance(0.5)) { const [q, a] = pick([['Rolling a 7 on a normal die (1–6) is…', 'impossible'], ['The sun rising tomorrow is…', 'certain'], ['Flipping a coin and getting heads is…', 'even chance'], ['Picking a red ball from a bag of 9 red and 1 blue is…', 'likely']]); return MC(q, a, ['impossible', 'unlikely', 'even chance', 'likely', 'certain'].filter((x) => x !== a).slice(0, 3), `${q.replace('…', '')} ${a}.`); }
      return Q(`A bag has ${r} yellow, ${b} blue${g ? ` and ${g} green` : ''} counters. What is the probability of picking yellow?`, r / t, `${r} yellow out of ${t} counters: ${frac(r, t)}.`, { svg: t <= 18 ? dots(g ? [r, b, g] : [r, b]) : undefined, display: frac(r, t) });
    }],
    ['multi6', 'Solve multistep problems combining fractions, decimals, percentages, ratios and measurement', (k) => {
      const a = who();
      switch (pick([0, 1, 2])) {
        case 0: { const price = 20 * ri(2, 10), off = pick([10, 20, 25]), n = ri(2, 4); const each = price * (1 - off / 100); return Q(`Games cost $${price}, with ${off}% off. ${a} buys ${n}. How much is that?`, each * n, `${off}% off $${price} = $${N(each)} each, × ${n} = $${N(each * n)}.`, { display: `$${N(each * n)}` }); }
        case 1: { const tot = 60 * ri(1, 5), r1 = ri(1, 3), r2 = ri(1, 3), part = (tot * r1) / (r1 + r2), half = part / 2; return Q(`${tot} eggs are split between two nests in the ratio ${r1} : ${r2}. Half of the first nest hatch. How many hatch?`, half, `First nest: ${tot} × ${r1}/${r1 + r2} = ${N(part)}. Half of that = ${N(half)}.`); }
        default: { const l = ri(3, 9) + 0.5, w = ri(2, 6), price = ri(2, 9); const c = Math.round(l * w * price * 100); return Q(`A garden is ${l} m by ${w} m. Grass costs $${price} per m². How much to cover it?`, c / 100, `Area = ${l} × ${w} = ${N(l * w)} m², × $${price} = ${money(c)}.`, { display: money(c) }); }
      }
    }],
  ];

  // ---------- Skills for every grade (scale with difficulty) ----------
  const REASONS = [
    [1, () => { const a = ri(3, 9), b = ri(3, 9); return [`${a} × ${b} gives the same answer as ${b} × ${a}.`, true, 'Multiplying works in any order.']; }],
    [1, () => { const a = ri(10, 20), b = ri(2, 9); return [`${a} − ${b} gives the same answer as ${b} − ${a}.`, false, `Subtraction order matters: ${a} − ${b} = ${a - b}, but ${b} − ${a} is below zero.`]; }],
    [1, () => ['An odd number plus an odd number is always even.', true, 'Two odd numbers each have one left over; together those make a pair.']],
    [2, () => ['Every number that ends in 5 can be divided by 5.', true, 'Multiples of 5 end in 0 or 5.']],
    [3, () => ['A square is a kind of rectangle.', true, 'It has 4 right angles, so it is a rectangle (with equal sides).']],
    [3, () => ['Every rectangle is a square.', false, 'A rectangle can have two different side lengths.']],
    [4, () => ['Doubling a number and doubling again is the same as multiplying by 4.', true, '× 2 then × 2 is × 4.']],
    [5, () => { const n = ri(3, 8), m = n + ri(1, 5); return [`1/${n} is bigger than 1/${m}.`, true, `Fewer equal parts make bigger pieces.`]; }],
    [6, () => ['0.45 is bigger than 0.5 because 45 is bigger than 5.', false, '0.5 = 0.50, and 50 hundredths is more than 45 hundredths.']],
    [6, () => ['Multiplying two numbers always gives an answer bigger than both.', false, 'Not with 1, 0 or fractions: 6 × 1/2 = 3.']],
    [7, () => { const a = 2 * ri(3, 12), b = ri(3, 12); return [`${a} × ${b} = ${a / 2} × ${2 * b}`, true, 'Halving one number and doubling the other keeps the product the same.']; }],
    [8, () => ['Dividing by 1/2 is the same as multiplying by 2.', true, 'There are two halves in every whole.']],
    [8, () => ['A 50% increase followed by a 50% decrease gets you back to the start.', false, '100 → 150 → 75. The decrease is 50% of a bigger number.']],
  ];
  const skills = [
    ['smental', 'Mental arithmetic', (k) => pick(k.d <= 3 ? [
      () => { const a = ri(11, 49); return Q(`${a} + 9`, a + 9, `Add 10, then take 1 away: ${a + 9}.`); },
      () => { const a = ri(2, 9); return Q(`${a} + ${a}`, 2 * a, `Double ${a} = ${2 * a}.`); },
    ] : k.d <= 6 ? [
      () => { const a = ri(21, 199); return Q(`${a} + 99`, a + 99, `Add 100, then take 1 away: ${a + 99}.`); },
      () => { const a = ri(12, 48); return Q(`${a} × 5`, a * 5, `× 10 then halve: ${a * 10} ÷ 2 = ${a * 5}.`); },
      () => { const a = ri(101, 899); return Q(`1,000 − ${a}`, 1000 - a, `Count up from ${a} to 1,000: ${1000 - a}.`); },
    ] : [
      () => { const a = ri(4, 40); return Q(`25 × ${4 * a}`, 100 * a, `25 × 4 = 100, so 25 × ${4 * a} = 100 × ${a} = ${N(100 * a)}.`); },
      () => { const a = ri(12, 29); return Q(`${a} × 11`, a * 11, `${a} × 10 + ${a} = ${a * 11}.`); },
      () => { const a = ri(3, 9), b = ri(11, 19); return Q(`${a * 10} × ${b * 10}`, a * b * 100, `${a} × ${b} = ${a * b}, then add two zeros: ${N(a * b * 100)}.`); },
    ])()],
    ['sest', 'Estimation', (k) => {
      const big = k.d >= 6, a = big ? ri(100, 999) : ri(11, 99), b = big ? ri(100, 999) : ri(11, 99), to = big ? 100 : 10, ra = Math.round(a / to) * to, rb = Math.round(b / to) * to;
      if (chance(0.5)) return MC(`Which is the best estimate for ${a} + ${b}?`, N(ra + rb), [N((ra + rb) * 10), N(Math.abs(ra - rb) || to), N(ra + rb + 2 * to)], `${a} ≈ ${ra}, ${b} ≈ ${rb}, so about ${N(ra + rb)}.`);
      const x = ri(11, big ? 99 : 30), y = ri(3, 9), rx = Math.round(x / 10) * 10; return MC(`Which is the best estimate for ${x} × ${y}?`, N(rx * y), [N(rx * y * 10), N(rx + y), N(Math.max(1, rx * y - 40))], `${x} ≈ ${rx}, and ${rx} × ${y} = ${rx * y}.`);
    }],
    ['spattern', 'Number patterns and sequences', (k) => {
      if (k.d <= 4 || chance(0.5)) { const s = ri(1, 20), st = k.ri(2, 5, 25) * (k.d >= 6 && chance(0.4) ? -1 : 1), st0 = st < 0 ? s + 6 * -st : s, seq = [0, 1, 2, 3].map((i) => st0 + i * st); return Q(`What comes next? ${seq.join(', ')}, …`, st0 + 4 * st, `The rule is ${st > 0 ? 'add' : 'subtract'} ${Math.abs(st)}: ${seq[3]} ${st > 0 ? '+' : '−'} ${Math.abs(st)} = ${st0 + 4 * st}.`); }
      if (chance(0.5)) { const s = ri(1, 5), m = pick([2, 3]), seq = [0, 1, 2, 3].map((i) => s * m ** i); return Q(`What comes next? ${seq.join(', ')}, …`, s * m ** 4, `Each number is × ${m}: ${seq[3]} × ${m} = ${s * m ** 4}.`); }
      const s = ri(1, 5), seq = [0, 1, 2, 3, 4].map((i) => s + (i * (i + 1)) / 2); return Q(`What comes next? ${seq.join(', ')}, …`, s + 15, `The jumps grow by 1 each time (+1, +2, +3, +4), so next is + 5: ${seq[4]} + 5 = ${s + 15}.`);
    }],
    ['smissing', 'Missing-number problems', (k) => {
      const a = k.ri(2, 9, 15), b = k.ri(2, 9, 15), c = k.ri(1, 10, 50);
      return pick(k.d <= 4 ? [() => Q(`? + ${c} = ${a * b + c}`, a * b, `${a * b + c} − ${c} = ${a * b}.`), () => Q(`${a} × ? = ${a * b}`, b, `${a * b} ÷ ${a} = ${b}.`)]
        : [() => Q(`${a} × ? + ${c} = ${a * b + c}`, b, `Take away ${c}: ${a * b}. Divide by ${a}: ${b}.`), () => Q(`(? − ${c}) ÷ ${a} = ${b}`, a * b + c, `Undo: ${b} × ${a} = ${a * b}, + ${c} = ${a * b + c}.`), () => Q(`${a * b} ÷ ? = ${b}`, a, `${b} × ? = ${a * b}, so ${a}.`)])();
    }],
    ['stranslate', 'Translating word problems into calculations', (k) => {
      const q = chance(0.5) ? oneStep(k) : twoStep(k);
      return q;
    }],
    ['sreason', 'Explaining mathematical reasoning', (k) => {
      const fit = REASONS.filter(([m]) => m <= k.d && m >= k.d - 4), [s, truth, why] = pick(fit.length ? fit : REASONS.filter(([m]) => m <= k.d))[1]();
      return TF(`True or false?\n${s}`, truth, `${truth ? 'True' : 'False'}: ${why}`);
    }],
    ['ssense', 'Checking whether answers make sense', (k) => {
      const a = ri(k.up(12, 120), k.up(60, 900)), b = ri(k.up(3, 11), k.up(9, 60)), right = a * b, claim = pick([right, right * 10, Math.round(right / 10)]);
      const verdict = claim === right ? 'yes, it makes sense' : claim > right ? 'no, it is far too big' : 'no, it is far too small';
      const ra = Math.round(a / 10 ** Math.floor(Math.log10(a))) * 10 ** Math.floor(Math.log10(a)), rb = Math.round(b / 10 ** Math.floor(Math.log10(b))) * 10 ** Math.floor(Math.log10(b));
      return MC(`${who()} says ${N(a)} × ${b} = ${N(claim)}. Does that make sense?`, verdict, ['yes, it makes sense', 'no, it is far too big', 'no, it is far too small'], `Estimate: ${N(ra)} × ${N(rb)} ≈ ${N(ra * rb)}, so ${verdict}.`);
    }],
  ];

  const GRADES = [
    { id: 'g3', name: '3rd grade math', desc: 'Whole numbers and basic operations', emoji: '🌱', list: g3 },
    { id: 'g4', name: '4th grade math', desc: 'Larger calculations and fraction concepts', emoji: '🧭', list: g4 },
    { id: 'g5', name: '5th grade math', desc: 'Fraction calculations and decimals', emoji: '⚔️', list: g5 },
    { id: 'g6', name: '6th grade math', desc: 'Fractions, decimals, percentages and ratios', emoji: '🧠', list: g6 },
    { id: 'all', name: 'Skills for every grade', desc: 'Mental math, estimation, patterns and reasoning', emoji: '✨', list: skills, flex: true },
  ].map((G) => ({ ...G, topics: G.list.map(([id, name, fn]) => ({ id: `${G.id}.${id}`, name, fn, grade: G.id, flex: !!G.flex })) }));
  const TOPICS = {};
  let rank = 0;
  for (const G of GRADES) for (const t of G.topics) { t.rank = rank++; TOPICS[t.id] = t; }

  // Pick a topic for this difficulty: the player's topics are lined up easiest to hardest, and the
  // difficulty (deeper zone, rarer egg) slides the pick along that line.
  let lastTopic = null;
  function pickTopic(ids, d) {
    const list = ids.map((id) => TOPICS[id]).filter(Boolean).sort((a, b) => a.rank - b.rank);
    if (!list.length) return null;
    const fixed = list.filter((t) => !t.flex), target = ((d - 1) / 9) * Math.max(0, fixed.length - 1), spread = Math.max(1.2, fixed.length * 0.2);
    const w = list.map((t) => (t.flex ? 0.6 : Math.exp(-(((fixed.indexOf(t) - target) / spread) ** 2)) + 0.02) * (t.id === lastTopic && list.length > 1 ? 0.2 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= w[i]) <= 0) return list[i];
    return list[list.length - 1];
  }

  // Difficulty helpers handed to every generator:
  //  up(a, b): a value sliding from a (difficulty 1) to b (difficulty 10), slowly at first so the
  //            first biomes keep small numbers and the growth speeds up in the deep ones
  //  ri(lo, a, b): a random whole number up to up(a, b), whose lowest value also rises with difficulty
  //  band(x1, x2, ...): picks from a list of increasingly hard options
  function ctx(d) {
    const t = (d - 1) / 9, curve = t ** 1.7, up = (a, b) => Math.round(a + (b - a) * curve);
    return { d, t, up, ri: (lo, a, b) => { const hi = up(a, b); return ri(Math.min(hi, Math.round(lo + (hi - lo) * 0.3 * curve)), hi); }, band: (...xs) => xs[Math.min(xs.length - 1, Math.floor(t * xs.length))] };
  }

  function gen(ids, d) {
    d = Math.max(1, Math.min(10, Math.round(d)));
    const topic = pickTopic(ids, d) || TOPICS['g3.addnc'];
    lastTopic = topic.id;
    const t = (d - 1) / 9;
    const k = ctx(d);
    let q;
    for (let i = 0; i < 5 && !q; i++) { try { q = topic.fn(k); } catch (e) { q = null; } }
    if (!q) q = Q('7 × 8', 56, '7 × 8 = 56.');
    q.difficulty = d; q.topic = topic.name; q.grade = GRADES.find((G) => G.id === topic.grade).name;
    return q;
  }

  // Parse typed input: integers, decimals, fractions ("3/4"), mixed numbers ("1 1/2"), unicode minus,
  // and ignores $, %, commas and a trailing unit ("12 cm").
  function parse(str) {
    const s = String(str).trim().replace(/[−–]/g, '-').replace(/^x\s*=\s*/i, '').replace(/[,$%¢]/g, '').replace(/\s*[a-zA-Z²³°]+$/, '').trim();
    if (!s) return NaN;
    let m = s.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/);
    if (m) { const v = +m[2] + +m[3] / +m[4]; return +m[4] === 0 ? NaN : m[1] ? -v : v; }
    m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
    if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
    return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
  }

  function check(q, input) {
    if (q.choices) return String(input) === String(q.answer);
    const v = typeof input === 'number' ? input : parse(input);
    if (!isFinite(v)) return false;
    // exact for whole numbers and short decimals; a little slack for repeating fractions typed as decimals
    const tol = q.tol ?? (Math.abs(q.answer * 1e4 - Math.round(q.answer * 1e4)) < 1e-6 ? 1e-6 : 0.005);
    return Math.abs(v - q.answer) <= tol;
  }

  // The hint is the worked explanation with every appearance of the answer hidden, so it shows
  // the method without giving the answer away.
  function hint(q) {
    const forms = [...new Set([q.display, String(q.answer), typeof q.answer === 'number' ? N(q.answer) : ''])].filter(Boolean).sort((a, b) => b.length - a.length);
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // not inside a longer number or word: no digit/letter/point/comma/slash/$ before, no digit/letter/slash after
    const re = new RegExp(`(^|[^\\w.,/$])(?:${forms.map(esc).join('|')})(?![\\w/]|[.,]\\d)`, 'g');
    return q.explain.replace(re, '$1❓');
  }

  return { gen, check, parse, hint, ctx, GRADES, TOPICS };
})();

if (typeof module !== 'undefined') module.exports = MathGen;
