// Blocky, Roblox-style mythical creature builder (Three.js).
// Models.build(spec) -> THREE.Group with userData.tick(time, moving) and userData.height.
// Models.portrait(spec) -> PNG data URL for UI.

const Models = (() => {
  const T = THREE;
  const geos = new Map(), mats = new Map();

  const boxG = (w, h, d) => {
    const k = `b${w},${h},${d}`;
    if (!geos.has(k)) geos.set(k, new T.BoxGeometry(w, h, d));
    return geos.get(k);
  };
  const coneG = (r, h, seg = 4) => {
    const k = `c${r},${h},${seg}`;
    if (!geos.has(k)) geos.set(k, new T.ConeGeometry(r, h, seg));
    return geos.get(k);
  };
  const mat = (color, glowAmt = 0) => {
    const k = `m${color},${glowAmt}`;
    if (!mats.has(k)) mats.set(k, new T.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, flatShading: true, emissive: glowAmt ? color : 0x000000, emissiveIntensity: glowAmt }));
    return mats.get(k);
  };
  const glow = (color) => {
    const k = `g${color}`;
    if (!mats.has(k)) mats.set(k, new T.MeshBasicMaterial({ color }));
    return mats.get(k);
  };
  const DARK = 0x1a1a1f, BONE = 0xe9e0c9, TOOTH = 0xf4f1e6;

  function add(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  const B = (p, w, h, d, m, x, y, z, rx, ry, rz) => add(p, boxG(w, h, d), m, x, y, z, rx, ry, rz);
  const C = (p, r, h, m, x, y, z, rx, ry, rz, seg) => add(p, coneG(r, h, seg), m, x, y, z, rx, ry, rz);
  const pivot = (p, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); return g; };

  // Angry glowing eyes + brows on a head whose front face is at z = fz.
  function face(head, s, fz, y = 0.15, spread = 0.35, size = 1) {
    const e = glow(s.eye || 0xff2a2a);
    [-1, 1].forEach((side) => {
      B(head, 0.28 * size, 0.18 * size, 0.06, e, side * spread, y, fz + 0.01);
      B(head, 0.45 * size, 0.12, 0.12, mat(DARK), side * spread, y + 0.22 * size, fz, 0, 0, side * 0.45);
    });
  }
  function fangs(head, x0, y, z, n = 2, len = 0.35) {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : x0 * (i / (n - 1) * 2 - 1);
      C(head, 0.09, len, mat(TOOTH), x, y, z, Math.PI, 0, 0);
    }
  }
  function horns(head, type, color, top = 0.7, w = 0.6) {
    const m = mat(color ?? BONE);
    if (type === 'unicorn') { C(head, 0.16, 1.4, glow(color ?? 0xfff3a0), 0, top + 0.5, 0.35, 0.35, 0, 0, 6); return; }
    [-1, 1].forEach((sd) => {
      if (type === 'bull') {
        B(head, 0.9, 0.25, 0.25, m, sd * (w + 0.35), top - 0.1, 0);
        C(head, 0.14, 0.7, m, sd * (w + 0.75), top + 0.25, 0, 0, 0, -sd * 0.2);
      } else if (type === 'ram') {
        B(head, 0.3, 0.6, 0.3, m, sd * w, top + 0.1, -0.1, -0.4);
        B(head, 0.3, 0.3, 0.6, m, sd * (w + 0.15), top + 0.35, -0.45);
        B(head, 0.3, 0.6, 0.3, m, sd * (w + 0.3), top, -0.75, 0.4);
      } else if (type === 'antler') {
        B(head, 0.15, 1.2, 0.15, m, sd * w * 0.8, top + 0.5, -0.1, 0, 0, -sd * 0.3);
        B(head, 0.6, 0.12, 0.12, m, sd * (w * 0.8 + 0.4), top + 0.8, -0.1, 0, 0, sd * 0.4);
        B(head, 0.12, 0.5, 0.12, m, sd * (w * 0.8 + 0.1), top + 1.1, 0.1, 0.3);
      } else { // demon
        C(head, 0.16, 1.0, m, sd * w * 0.75, top + 0.35, -0.1, -0.35, 0, -sd * 0.35);
      }
    });
  }
  function spikesAlong(p, color, n, y, z0, z1, h = 0.6) {
    for (let i = 0; i < n; i++) C(p, 0.18, h * (1 - i / (n * 1.6)), mat(color), 0, y, z0 + (z1 - z0) * (i / Math.max(1, n - 1)), -0.3);
  }
  function wings(root, s, x, y, z, span = 3.2) {
    const wm = mat(s.wings, s.wingGlow ? 0.6 : 0), bm = mat(s.body2 ?? s.body);
    const ps = [-1, 1].map((sd) => {
      const p = pivot(root, sd * x, y, z);
      B(p, span, 0.12, 2.0, wm, sd * span / 2, 0, -0.4);
      B(p, span * 0.6, 0.12, 1.2, wm, sd * span * 0.95, 0, -0.7);
      B(p, span * 1.15, 0.26, 0.26, bm, sd * span * 0.6, 0.08, 0.55);
      C(p, 0.12, 0.5, mat(BONE), sd * span * 1.2, 0.08, 0.6, 0, 0, -sd * Math.PI / 2);
      return p;
    });
    return (t, mv) => ps.forEach((p, i) => (p.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(t * (mv ? 9 : 3)) * (mv ? 0.55 : 0.2))));
  }
  function weapon(arm, type, color) {
    const m = mat(color ?? 0x8a8f99), h = mat(0x5a3a22);
    const g = pivot(arm, 0, -1.9, 0.2); g.rotation.x = Math.PI / 2;
    if (type === 'axe') { B(g, 0.2, 3.2, 0.2, h, 0, 0.6, 0); B(g, 0.15, 1.1, 1.1, m, 0, 1.9, 0.5); B(g, 0.15, 0.8, 0.7, m, 0, 1.9, -0.35); }
    else if (type === 'club') { B(g, 0.35, 2.6, 0.35, h, 0, 0.5, 0); B(g, 0.8, 1.4, 0.8, m, 0, 2.1, 0); C(g, 0.12, 0.4, mat(0xcfd6dd), 0.45, 2.2, 0, 0, 0, -Math.PI / 2); C(g, 0.12, 0.4, mat(0xcfd6dd), -0.45, 2.0, 0, 0, 0, Math.PI / 2); }
    else if (type === 'trident') { B(g, 0.15, 3.6, 0.15, m, 0, 0.8, 0); [-0.35, 0, 0.35].forEach((x) => C(g, 0.1, 0.7, m, x, 2.9, 0)); B(g, 0.85, 0.15, 0.15, m, 0, 2.55, 0); }
    else if (type === 'staff') { B(g, 0.18, 3.6, 0.18, h, 0, 0.8, 0); add(g, new T.OctahedronGeometry(0.4), glow(color ?? 0x66ccff), 0, 2.9, 0); }
  }

  // ---------- body plans ----------
  function biped(s, root) {
    const W = s.bulky ? 1.3 : 1, c = mat(s.body), sk = mat(s.skin ?? s.body);
    const legs = [], arms = [];
    let floatTail = null;
    if (!s.float) {
      [-1, 1].forEach((sd) => {
        const p = pivot(root, sd * 0.55 * W, 2, 0);
        B(p, 0.9 * W, 2, 0.9 * W, mat(s.legs ?? s.body), 0, -1, 0);
        B(p, 1.0 * W, 0.35, 1.2 * W, mat(s.feet ?? DARK), 0, -1.85, 0.1);
        legs.push(p);
      });
    } else {
      floatTail = pivot(root, 0, 2, 0);
      for (let i = 0; i < 4; i++) B(floatTail, (1.8 - i * 0.4) * W, 0.6, (1.1 - i * 0.2) * W, mat(s.body, s.glowBody ? 0.4 : 0), Math.sin(i) * 0.15, -i * 0.55, -i * 0.2);
    }
    B(root, 2.2 * W, 2, 1.2 * W, c, 0, 3, 0);
    if (s.armor) { B(root, 2.35 * W, 0.8, 1.35 * W, mat(s.armor), 0, 3.6, 0); B(root, 0.9, 0.9, 0.3, mat(s.armor), 0, 3, 0.65 * W); }
    if (s.belt) B(root, 2.3 * W, 0.3, 1.3 * W, mat(s.belt), 0, 2.15, 0);
    if (s.cracks) for (let i = 0; i < 3; i++) B(root, 0.12, 0.9, 0.05, glow(s.cracks), -0.6 + i * 0.6, 3 + (i % 2) * 0.3, 0.61 * W, 0, 0, i - 1);
    [-1, 1].forEach((sd) => {
      const p = pivot(root, sd * (1.1 * W + 0.45), 3.9, 0);
      B(p, 0.85, 2, 0.85, sk, 0, -1, 0);
      if (s.armor) B(p, 1.0, 0.6, 1.0, mat(s.armor), 0, -0.1, 0);
      if (s.claws) [-0.25, 0.25].forEach((x) => C(p, 0.08, 0.4, mat(BONE), x, -2.15, 0.25, Math.PI));
      arms.push(p);
    });
    if (s.weapon) weapon(arms[1], s.weapon, s.weaponColor);
    const head = pivot(root, 0, 4.75, 0);
    const hs = s.bulky ? 1.5 : 1.4;
    B(head, hs, hs, hs, sk, 0, 0, 0);
    let fz = hs / 2;
    if (s.snout) { B(head, 0.9, 0.7, 0.8, sk, 0, -0.25, hs / 2 + 0.35); B(head, 0.4, 0.15, 0.06, mat(DARK), 0, -0.05, hs / 2 + 0.76); fangs(head, 0.25, -0.65, hs / 2 + 0.6, 2, 0.3); }
    if (s.beard) { B(head, hs * 0.9, 0.8, 0.4, mat(s.beard), 0, -0.85, hs / 2 - 0.05); B(head, 0.6, 0.6, 0.35, mat(s.beard), 0, -1.4, hs / 2 - 0.05); }
    if (s.tusks) [-1, 1].forEach((sd) => C(head, 0.1, 0.5, mat(BONE), sd * 0.4, -0.35, fz + 0.1, 0, 0, 0));
    if (s.ears) [-1, 1].forEach((sd) => C(head, 0.25, 0.9, sk, sd * 0.55, hs / 2 + 0.35, -0.1, 0, 0, -sd * 0.25));
    if (s.pointyEars) [-1, 1].forEach((sd) => C(head, 0.18, 0.8, sk, sd * (hs / 2 + 0.3), 0.1, 0, 0, 0, sd * 1.3));
    if (s.horns) horns(head, s.horns, s.hornColor, hs / 2, hs * 0.4);
    if (s.leaves) for (let i = 0; i < 5; i++) B(head, 0.9, 0.9, 0.9, mat(s.leaves), Math.cos(i * 1.3) * 0.6, hs / 2 + 0.3 + (i % 2) * 0.4, Math.sin(i * 1.3) * 0.5, i, i * 2, 0);
    if (s.hood) B(head, hs + 0.3, hs + 0.2, hs * 0.8, mat(s.hood), 0, 0.15, -0.25);
    if (s.crown) for (let i = -1; i <= 1; i++) C(head, 0.15, 0.5, glow(s.crown), i * 0.45, hs / 2 + 0.25, 0);
    face(head, s, fz, 0.15, 0.35, 1);
    if (!s.snout && !s.beard) B(head, 0.7, 0.12, 0.06, mat(DARK), 0, -0.35, fz + 0.01);
    return (t, mv) => {
      const sw = mv ? Math.sin(t * 10) * 0.7 : Math.sin(t * 2) * 0.06;
      if (legs.length) { legs[0].rotation.x = sw; legs[1].rotation.x = -sw; }
      if (floatTail) { floatTail.rotation.z = Math.sin(t * 3) * 0.1; root.position.y = 0.6 + Math.sin(t * 2) * 0.25; }
      arms[0].rotation.x = -sw * 0.8;
      arms[1].rotation.x = (s.weapon ? -0.4 : 0) + sw * 0.6;
      head.rotation.y = Math.sin(t * 0.7) * 0.15;
    };
  }

  function quad(s, root) {
    const L = s.long ?? 1, c = mat(s.body), b = mat(s.belly ?? s.body), legs = [];
    const lowY = s.low ? -0.6 : 0;
    B(root, 2, 1.5, 3.2 * L, c, 0, 2.3 + lowY, 0);
    B(root, 1.8, 0.3, 2.8 * L, b, 0, 1.5 + lowY, 0);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
      const p = pivot(root, sx * 0.75, 1.7 + lowY, sz * 1.15 * L);
      B(p, 0.65, 1.7 + lowY, 0.65, c, 0, -(1.7 + lowY) / 2, 0);
      B(p, 0.75, 0.3, 0.85, mat(s.paws ?? DARK), 0, -(1.7 + lowY) + 0.1, 0.1);
      if (s.claws) C(p, 0.07, 0.3, mat(BONE), 0, -(1.7 + lowY) + 0.1, 0.55, Math.PI / 2);
      legs.push(p);
    });
    const ln = s.longNeck ? 1 : 0;
    B(root, 1.0, 1.4 + ln * 1.2, 1.0, c, 0, 3.0 + lowY + ln * 0.5, 1.55 * L + ln * 0.2, 0.5);
    const head = pivot(root, 0, 3.6 + lowY + ln * 1.1, 2.1 * L + ln * 0.6);
    B(head, 1.3, 1.1, 1.3, c, 0, 0, 0);
    let fz = 0.65;
    if (s.beak) {
      B(head, 1.35, 1.15, 1.35, mat(s.headColor ?? 0xf2efe6), 0, 0, 0);
      C(head, 0.35, 0.9, mat(s.beakColor ?? 0xf0b030), 0, -0.1, 1.05, Math.PI / 2);
    } else {
      B(head, 0.9, 0.6, 0.95, c, 0, -0.2, 1.0);
      B(head, 0.85, 0.2, 0.85, b, 0, -0.6, 0.9);
      fangs(head, 0.3, -0.55, 1.35, 2, 0.3);
      B(head, 0.5, 0.15, 0.06, mat(DARK), 0, 0.02, 1.48);
    }
    if (s.mane) { B(head, 1.9, 1.7, 0.7, mat(s.mane), 0, 0.1, -0.5); B(root, 1.4, 1.2, 1.3, mat(s.mane), 0, 3.0 + lowY, 1.3 * L); }
    if (s.tusks) [-1, 1].forEach((sd) => C(head, 0.12, 0.7, mat(BONE), sd * 0.45, -0.1, 1.35, -0.5));
    if (s.ears) [-1, 1].forEach((sd) => C(head, 0.25, 0.7, c, sd * 0.45, 0.8, -0.2, -0.2));
    if (s.horns) horns(head, s.horns, s.hornColor, 0.55, 0.55);
    face(head, s, fz, 0.2, 0.38);
    if (s.spikes) spikesAlong(root, s.spikes, 5, 3.15 + lowY, 1.2 * L, -1.4 * L);
    if (s.glowLines) [-1, 1].forEach((sd) => B(root, 0.05, 0.15, 2.8 * L, glow(s.glowLines), sd * 1.01, 2.5 + lowY, 0));
    // tail
    const tail = [];
    let tp = pivot(root, 0, 2.6 + lowY, -1.6 * L);
    const tl = s.tail === 'scorpion' ? 5 : s.tail === 'long' ? 5 : 3;
    for (let k = 0; k < tl; k++) {
      const w = Math.max(0.25, 0.6 - k * 0.08);
      B(tp, w, w, 1.1, k % 2 && s.tail === 'scorpion' ? b : c, 0, 0, -0.55);
      if (s.spikes && s.tail === 'long') C(tp, 0.14, 0.45, mat(s.spikes), 0, w / 2 + 0.15, -0.55, -0.3);
      const np = pivot(tp, 0, 0, -1.1);
      np.rotation.x = s.tail === 'scorpion' ? 0.55 : -0.15;
      tail.push(tp); tp = np;
    }
    if (s.tail === 'scorpion') C(tp, 0.2, 0.8, glow(s.sting ?? 0x9cff3c), 0, 0, -0.3, -Math.PI / 2);
    else if (s.tail === 'long') C(tp, 0.3, 0.6, mat(s.spikes ?? s.body), 0, 0, -0.2, -Math.PI / 2);
    const wingTick = s.wings ? wings(root, s, 0.9, 3.0 + lowY, 0.4, s.wingSpan ?? 3.2) : null;
    return (t, mv) => {
      const sw = mv ? Math.sin(t * 10) * 0.6 : 0;
      legs[0].rotation.x = sw; legs[3].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw;
      tail.forEach((p, i) => (p.rotation.y = Math.sin(t * 3 - i * 0.6) * 0.18));
      head.rotation.x = Math.sin(t * 1.5) * 0.06;
      if (wingTick) wingTick(t, mv);
    };
  }

  function serpent(s, root) {
    const c = mat(s.body), c2 = mat(s.body2 ?? s.body), b = mat(s.belly ?? s.body), n = s.segs ?? 7;
    const trunk = [];
    for (let i = 0; i < n; i++) {
      const w = 1.4 - (i / n) * 1.0;
      const seg = pivot(root, 0, 0, -0.5 - i * 1.05);
      B(seg, w, w * 0.8, 1.15, i % 2 ? c : c2, 0, w * 0.4, 0);
      B(seg, w * 0.8, 0.12, 1.0, b, 0, 0.06, 0);
      if (s.spikes) C(seg, 0.15, 0.4, mat(s.spikes), 0, w * 0.8 + 0.1, 0, -0.3);
      if (s.glowLines) B(seg, w + 0.02, 0.1, 0.5, glow(s.glowLines), 0, w * 0.5, 0);
      trunk.push(seg);
    }
    const heads = s.heads ?? 1, necks = [];
    for (let h = 0; h < heads; h++) {
      const off = h - (heads - 1) / 2;
      let p = pivot(root, off * 1.2, 0.5, 0.4);
      p.rotation.z = -off * 0.4;
      const chain = [p];
      for (let k = 0; k < 4; k++) {
        const w = 1.15 - k * 0.07;
        B(p, w, 1.25, w, k % 2 ? c : c2, 0, 0.6, 0);
        B(p, w * 0.7, 1.1, 0.1, b, 0, 0.6, w / 2);
        if (s.spikes) C(p, 0.14, 0.4, mat(s.spikes), 0, 0.6, -w / 2 - 0.1, -Math.PI / 2);
        const np = pivot(p, 0, 1.2, 0); np.rotation.x = 0.17; chain.push(np); p = np;
      }
      if (s.hood) B(p, 2.6, 2.0, 0.2, mat(s.hood), 0, -0.4, -0.55);
      const hd = pivot(p, 0, 0.45, 0); hd.rotation.x = -0.55;
      B(hd, 1.35, 1.0, 1.7, c, 0, 0, 0.3);
      B(hd, 1.15, 0.3, 1.4, b, 0, -0.6, 0.35);
      fangs(hd, 0.4, -0.35, 1.05, 2, 0.45);
      face(hd, s, 1.15, 0.22, 0.42);
      if (s.horns) horns(hd, s.horns, s.hornColor, 0.5, 0.5);
      if (s.crest) for (let i = 0; i < 3; i++) C(hd, 0.18, 0.8 - i * 0.15, glow(s.crest), 0, 0.7, 0.2 - i * 0.4, -0.5);
      necks.push(chain);
    }
    const wingTick = s.wings ? wings(root, s, 0.6, 1.4, -1.2, s.wingSpan ?? 2.8) : null;
    return (t, mv) => {
      const sp = mv ? 9 : 2.5;
      trunk.forEach((seg, i) => (seg.position.x = Math.sin(t * sp - i * 0.8) * 0.4 * (0.3 + i / n)));
      necks.forEach((ch, h) => {
        ch[0].rotation.z = -(h - (heads - 1) / 2) * 0.4 + Math.sin(t * 1.6 + h * 2) * 0.12;
        ch[2].rotation.x = 0.17 + Math.sin(t * 2 + h) * 0.08;
      });
      if (wingTick) wingTick(t, mv);
    };
  }

  function bird(s, root) {
    const c = mat(s.body, s.wingGlow ? 0.35 : 0), body = pivot(root, 0, 0, 0);
    B(body, 1.5, 1.4, 2.2, c, 0, 2.8, 0);
    B(body, 1.2, 0.3, 1.8, mat(s.belly ?? s.body), 0, 2.05, 0.1);
    const head = pivot(body, 0, 3.9, 1.2);
    B(head, 1.05, 1.05, 1.05, c, 0, 0, 0);
    C(head, 0.3, 0.8, mat(s.beakColor ?? 0xf0b030), 0, -0.1, 0.9, Math.PI / 2);
    face(head, s, 0.53, 0.15, 0.3, 0.9);
    if (s.crest) for (let i = 0; i < 3; i++) C(head, 0.12, 0.7, glow(s.crest), 0, 0.7, -0.1 - i * 0.3, -0.6 - i * 0.2);
    for (let i = -1; i <= 1; i++) B(body, 0.5, 0.12, 1.8, mat(s.wings, s.wingGlow ? 0.8 : 0), i * 0.45, 2.9, -1.8, 0.3, i * 0.25);
    [-1, 1].forEach((sd) => { B(body, 0.18, 1.2, 0.18, mat(0xd9a030), sd * 0.4, 1.6, 0); C(body, 0.07, 0.35, mat(DARK), sd * 0.4, 1.0, 0.25, Math.PI / 2); });
    const wingTick = wings(body, Object.assign({ body2: s.body }, s), 0.7, 3.2, 0.1, s.wingSpan ?? 2.6);
    return (t, mv) => { body.position.y = 0.6 + Math.sin(t * 3) * 0.3; wingTick(t, true); head.rotation.y = Math.sin(t) * 0.2; void mv; };
  }

  function kraken(s, root) {
    const c = mat(s.body), b = mat(s.belly ?? s.body);
    B(root, 2.6, 2.6, 2.6, c, 0, 4.1, 0);
    B(root, 2.0, 1.3, 2.0, c, 0, 5.9, -0.2);
    B(root, 1.2, 0.9, 1.2, c, 0, 6.9, -0.4);
    const head = pivot(root, 0, 4.1, 0);
    [-1, 1].forEach((sd) => {
      B(head, 0.7, 0.55, 0.1, glow(s.eye ?? 0x33ffcc), sd * 0.65, 0.2, 1.31);
      B(head, 0.15, 0.45, 0.12, mat(DARK), sd * 0.65, 0.2, 1.34);
      B(head, 0.9, 0.15, 0.15, mat(DARK), sd * 0.6, 0.65, 1.3, 0, 0, sd * 0.35);
    });
    const tent = [], n = s.tentacles ?? 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const base = pivot(root, Math.cos(a) * 1.0, 2.9, Math.sin(a) * 1.0);
      base.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
      let p = base; const chain = [];
      for (let k = 0; k < 5; k++) {
        const w = 0.6 - k * 0.09;
        B(p, w, w, 1.0, k % 2 ? b : c, 0, 0, 0.5);
        if (k > 0) B(p, w * 0.5, 0.06, 0.25, glow(s.suckers ?? 0xff88cc), 0, -w / 2, 0.5);
        const np = pivot(p, 0, 0, 1.0); np.rotation.x = k === 0 ? 0.6 : -0.15;
        chain.push(p); p = np;
      }
      tent.push(chain);
    }
    return (t) => {
      tent.forEach((ch, i) => ch.forEach((p, k) => { if (k) p.rotation.x = -0.15 + Math.sin(t * 2.5 + i + k * 0.7) * 0.25; }));
      root.position.y = Math.sin(t * 1.5) * 0.15;
    };
  }

  function wisp(s, root) {
    const core = add(root, new T.OctahedronGeometry(1.1), mat(s.body, 0.7), 0, 3, 0);
    const shell = add(root, new T.OctahedronGeometry(1.5), new T.MeshBasicMaterial({ color: s.body, transparent: true, opacity: 0.25, wireframe: true }), 0, 3, 0);
    const eyes = pivot(root, 0, 3, 0);
    [-1, 1].forEach((sd) => B(eyes, 0.25, 0.3, 0.05, glow(s.eye ?? 0xffffff), sd * 0.35, 0.15, 0.85));
    const orb = pivot(root, 0, 3, 0);
    for (let i = 0; i < 4; i++) B(orb, 0.4, 0.4, 0.4, glow(s.orbs ?? s.body), Math.cos(i * 1.57) * 2.1, Math.sin(i * 2) * 0.4, Math.sin(i * 1.57) * 2.1, i, i);
    return (t) => { core.rotation.y = t; shell.rotation.y = -t * 0.6; orb.rotation.y = t * 1.5; root.position.y = Math.sin(t * 2.5) * 0.35; };
  }

  const PLANS = { biped, quad, serpent, bird, kraken, wisp };
  const dragon = (s) => Object.assign({ long: 1.2, longNeck: true, tail: 'long', claws: true, wingSpan: 4 }, s, { type: 'quad' });

  function build(spec) {
    const s = spec.type === 'dragon' ? dragon(spec) : spec;
    const group = new T.Group(), root = pivot(group);
    const tick = PLANS[s.type](s, root);
    group.scale.setScalar(s.scale ?? 1);
    const box = new T.Box3().setFromObject(group);
    group.userData.tick = tick;
    group.userData.height = box.max.y;
    return group;
  }

  // ---------- portraits ----------
  let pr = null;
  const cache = new Map();
  function portrait(spec, key) {
    if (key && cache.has(key)) return cache.get(key);
    if (!pr) {
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(192, 192); renderer.setPixelRatio(1);
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight(0xffffff, 0x445566, 0.9));
      const d = new T.DirectionalLight(0xffffff, 0.8); d.position.set(4, 8, 10); scene.add(d);
      pr = { renderer, scene, camera: new T.PerspectiveCamera(32, 1, 0.1, 200) };
    }
    const m = build(Object.assign({}, spec, { scale: 1 }));
    m.userData.tick(0.6, false);
    m.rotation.y = 0.55;
    pr.scene.add(m);
    const box = new T.Box3().setFromObject(m), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 1.9;
    pr.camera.position.set(ctr.x + dist * 0.25, ctr.y + dist * 0.2, ctr.z + dist);
    pr.camera.lookAt(ctr);
    pr.renderer.render(pr.scene, pr.camera);
    const url = pr.renderer.domElement.toDataURL();
    pr.scene.remove(m);
    if (key) cache.set(key, url);
    return url;
  }

  return { build, portrait, mat, glow, boxG };
})();
