'use strict';

// Paints the home map as a cut-paper diorama: a dawn sky at the top, one landscape band per
// lesson (in journey order), and a starry night waiting at the end for the next story.
// Everything is drawn in a 400-unit-wide SVG that scales to the screen width.
const PaperScene = (() => {
  const W = 400;
  const TOP = 330; // dawn sky with the greeting
  const SEG = 460; // height of one lesson's landscape
  const END = 420; // night sky with the "next stop"

  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const f = (n) => n.toFixed(1);
  const CUT = 'filter="url(#cut)"';

  // A band with a wavy top edge, filled down to `bottom`.
  const wave = (y, amp, freq, phase, bottom, fill) => {
    let d = `M -20 ${bottom} L -20 ${f(y)}`;
    for (let x = -20; x <= W + 20; x += 8) {
      d += ` L ${x} ${f(y + amp * Math.sin(x * freq + phase) + amp * 0.4 * Math.sin(x * freq * 2.3 + phase * 1.7))}`;
    }
    return `<path d="${d} L ${W + 20} ${bottom} Z" fill="${fill}" ${CUT}/>`;
  };
  // A band whose top edge is a row of cloud bumps (used where the sky changes).
  const cloudBank = (y, bottom, fill) => {
    let x = -30;
    let d = `M -30 ${bottom} L -30 ${y}`;
    while (x < W + 30) {
      const w = 34 + rnd() * 40;
      const yy = y + (rnd() - 0.5) * 14;
      d += ` L ${f(x)} ${f(yy)} A ${f(w / 2)} ${f(w / 2.2)} 0 0 1 ${f(x + w)} ${f(yy)}`;
      x += w;
    }
    return `<path d="${d} L ${W + 30} ${bottom} Z" fill="${fill}" ${CUT}/>`;
  };
  const cloud = (cx, cy, s, fill = '#fdfbf4') => `<g ${CUT} fill="${fill}">
    <ellipse cx="${cx}" cy="${cy}" rx="${34 * s}" ry="${12 * s}"/>
    <circle cx="${cx - 12 * s}" cy="${cy - 8 * s}" r="${13 * s}"/>
    <circle cx="${cx + 8 * s}" cy="${cy - 12 * s}" r="${16 * s}"/></g>`;
  const leaf = (x, y, len, ang, fill) => {
    const w = len * 0.32;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})">
      <path d="M0 0 Q ${f(len / 2)} ${f(-w)} ${f(len)} 0 Q ${f(len / 2)} ${f(w)} 0 0 Z" fill="${fill}"/>
      <path d="M2 0 L ${f(len - 4)} 0" stroke="rgba(255,255,255,.18)" stroke-width="1.2"/></g>`;
  };
  const palm = (x, base, h, lean) => {
    const tx = x + lean;
    const ty = base - h;
    let g = `<path d="M ${x} ${base} Q ${f(x + lean * 0.2)} ${f(base - h * 0.55)} ${tx} ${ty}" stroke="#8a6a45" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 7; i++) {
      const a = -170 + i * 30 + (rnd() - 0.5) * 12;
      g += leaf(tx, ty, 34 + rnd() * 14, a + (Math.abs(a + 90) > 50 ? 18 : 0), i % 2 ? '#3f8a55' : '#2f7447');
    }
    g += `<circle cx="${tx - 4}" cy="${ty + 5}" r="4.5" fill="#6b4a2c"/><circle cx="${tx + 4}" cy="${ty + 6}" r="4.5" fill="#5c3f25"/><circle cx="${tx}" cy="${ty + 10}" r="4.5" fill="#6b4a2c"/>`;
    return `<g ${CUT}>${g}</g>`;
  };
  const pine = (x, base, h, fill) => {
    let g = `<rect x="${x - 3}" y="${base - 10}" width="6" height="12" fill="#6b4a2c"/>`;
    for (let i = 0; i < 3; i++) {
      const w = h * (0.55 - i * 0.12);
      const y = base - 8 - i * h * 0.26;
      g += `<path d="M ${f(x - w / 2)} ${f(y)} L ${x} ${f(y - h * 0.42)} L ${f(x + w / 2)} ${f(y)} Z" fill="${fill}"/>`;
    }
    return `<g ${CUT}>${g}</g>`;
  };
  const roundTree = (x, base, s) => `<g ${CUT}><rect x="${x - 2.5}" y="${base - 18 * s}" width="5" height="${18 * s}" fill="#6b4a2c"/>
    <circle cx="${x}" cy="${base - 26 * s}" r="${15 * s}" fill="#4d8a4a"/><circle cx="${x + 8 * s}" cy="${base - 20 * s}" r="${10 * s}" fill="#3f7a40"/></g>`;
  const cactus = (x, base, h) => `<g ${CUT} fill="#4f8a5b">
    <rect x="${x - 7}" y="${base - h}" width="14" height="${h}" rx="7"/>
    <path d="M ${x - 7} ${base - h * 0.45} h -12 a 5 5 0 0 1 -5 -5 v -${f(h * 0.25)}" stroke="#4f8a5b" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M ${x + 7} ${base - h * 0.6} h 10 a 5 5 0 0 0 5 -5 v -${f(h * 0.18)}" stroke="#4f8a5b" stroke-width="9" fill="none" stroke-linecap="round"/></g>`;
  // Moving details (fireflies, stars) are collected separately and drawn live over the image.
  let live = '';
  const fireflies = (y, h, n) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<circle class="firefly twinkle" style="animation-delay:${f(rnd() * 4)}s, ${f(rnd() * 3)}s" cx="${f(30 + rnd() * 340)}" cy="${f(y + rnd() * h)}" r="${f(5 + rnd() * 4)}" fill="url(#ff)"/>`;
    }
    return s;
  };
  const sparkles = (y, h, n, fill, cls = 'twinkle') => {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<circle class="${cls}" style="animation-delay:${f(rnd() * 3)}s" cx="${f(rnd() * W)}" cy="${f(y + rnd() * h)}" r="${f(0.8 + rnd() * 1.6)}" fill="${fill}"/>`;
    }
    return s;
  };
  const layer = (_depth, body) => body;

  // One painter per landscape. Each draws its band from y down past y + SEG, so the next
  // band's top edge always covers its bottom.
  const B = (y) => y + SEG + 160;
  const PAINT = {
    island: (y) => layer(0.05, wave(y + 20, 5, 0.04, 0, B(y), '#7cc4c4'))
      + layer(0.09, wave(y + 65, 6, 0.05, 2, B(y), '#4fa9b0'))
      + layer(0.13, wave(y + 125, 7, 0.045, 4, B(y), '#2f8b98'))
      + layer(0.16, wave(y + 265, 14, 0.018, 1, B(y), '#f1d39b') + palm(70, y + 275, 120, 18) + palm(118, y + 285, 90, -12) + palm(372, y + 300, 110, -20))
      + layer(0.2, wave(y + 350, 12, 0.022, 3, B(y), '#e6bf7c')),
    sea: (y) => layer(0.05, cloudBank(y, B(y), 'url(#dusk)'))
      + layer(0.07, `<circle cx="200" cy="${y + 200}" r="78" fill="#ffd27a" ${CUT}/>`)
      + layer(0.1, wave(y + 190, 5, 0.05, 1, B(y), '#5e7fa0'))
      + layer(0.13, wave(y + 250, 6, 0.045, 3, B(y), '#476a8f'))
      + layer(0.17, wave(y + 330, 7, 0.04, 5, B(y), '#36567a')),
    jungle: (y) => {
      let leaves = '';
      for (let i = 0; i < 18; i++) {
        const side = i % 2;
        leaves += leaf(side ? 330 + rnd() * 80 : -10 + rnd() * 70, y + 110 + rnd() * 300, 44 + rnd() * 30,
          side ? 180 + (rnd() - 0.5) * 70 : (rnd() - 0.5) * 70, ['#3f8a55', '#2f7447', '#4d9a5f'][i % 3]);
      }
      return layer(0.06, wave(y, 16, 0.02, 0, B(y), '#2c5a43'))
        + layer(0.1, wave(y + 80, 18, 0.024, 2, B(y), '#356b4c'))
        + layer(0.14, `<g ${CUT}>${leaves}</g>`)
        + layer(0.18, wave(y + 390, 14, 0.03, 5, B(y), '#2a5440'))
        + ((live += fireflies(y + 110, 300, 14)), '');
    },
    forest: (y) => {
      let trees = '';
      for (let i = 0; i < 9; i++) {
        const x = i < 5 ? 10 + rnd() * 90 : 300 + rnd() * 90;
        trees += pine(x, y + 170 + rnd() * 220, 60 + rnd() * 40, ['#2f6b4a', '#3d7a52', '#25563c'][i % 3]);
      }
      return layer(0.06, wave(y, 18, 0.018, 1, B(y), '#9cc59a'))
        + layer(0.1, wave(y + 90, 16, 0.022, 3, B(y), '#6fa877'))
        + layer(0.14, trees)
        + layer(0.18, wave(y + 380, 12, 0.03, 2, B(y), '#4f8a5b'));
    },
    mountain: (y) => {
      const peak = (x, h, w, fill) => `<g ${CUT}><path d="M ${x - w} ${y + 330} L ${x} ${y + 330 - h} L ${x + w} ${y + 330} Z" fill="${fill}"/>
        <path d="M ${f(x - w * 0.22)} ${f(y + 330 - h * 0.78)} L ${x} ${y + 330 - h} L ${f(x + w * 0.22)} ${f(y + 330 - h * 0.78)} L ${f(x + w * 0.08)} ${f(y + 330 - h * 0.72)} L ${x} ${f(y + 330 - h * 0.8)} L ${f(x - w * 0.1)} ${f(y + 330 - h * 0.72)} Z" fill="#fbf6ea"/></g>`;
      return layer(0.04, cloudBank(y, B(y), '#cfe2ef'))
        + layer(0.08, peak(90, 250, 150, '#7a8fa8') + peak(330, 220, 140, '#6c809a'))
        + layer(0.12, peak(220, 280, 160, '#5a6d87'))
        + layer(0.16, wave(y + 320, 14, 0.02, 2, B(y), '#8fbf7f'))
        + layer(0.2, wave(y + 390, 10, 0.03, 4, B(y), '#76a96b'));
    },
    snow: (y) => layer(0.04, cloudBank(y, B(y), '#dfe8f0'))
      + layer(0.08, wave(y + 160, 20, 0.016, 1, B(y), '#f4f7fa'))
      + layer(0.12, pine(60, y + 260, 90, '#2f5a48') + pine(110, y + 280, 70, '#3d6b55') + pine(350, y + 300, 95, '#2f5a48'))
      + layer(0.16, wave(y + 300, 14, 0.022, 3, B(y), '#ffffff'))
      + ((live += sparkles(y + 40, 380, 24, '#ffffff', 'snowflake twinkle')), ''),
    desert: (y) => layer(0.05, wave(y, 10, 0.012, 1, B(y), '#f4c58d'))
      + layer(0.09, `<circle cx="300" cy="${y + 120}" r="40" fill="#fff0c4" ${CUT}/>`)
      + layer(0.12, wave(y + 170, 22, 0.014, 2, B(y), '#e9a96b') + cactus(70, y + 210, 70))
      + layer(0.16, wave(y + 280, 18, 0.018, 4, B(y), '#de9257') + cactus(340, y + 320, 60))
      + layer(0.2, wave(y + 380, 12, 0.025, 1, B(y), '#cf7f47')),
    city: (y) => {
      let blds = '';
      const colors = ['#d98b6a', '#e7b14a', '#7fa3b8', '#c9705a', '#f0d3a4'];
      for (let x = -10; x < W; x += 34 + rnd() * 18) {
        const h = 80 + rnd() * 130;
        const w = 30 + rnd() * 16;
        const top = y + 330 - h;
        let win = '';
        for (let wy = top + 12; wy < y + 316; wy += 18) {
          for (let wx = x + 7; wx < x + w - 8; wx += 12) win += `<rect x="${f(wx)}" y="${f(wy)}" width="5" height="8" fill="rgba(251,246,234,.65)"/>`;
        }
        blds += `<g ${CUT}><rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h + 40)}" fill="${colors[Math.floor(rnd() * colors.length)]}"/>${win}</g>`;
      }
      return layer(0.04, cloudBank(y, B(y), '#f6d6c2'))
        + layer(0.1, blds)
        + layer(0.16, wave(y + 340, 6, 0.03, 1, B(y), '#b9a58a'))
        + layer(0.2, wave(y + 395, 8, 0.03, 3, B(y), '#9f8a70'));
    },
    countryside: (y) => layer(0.05, wave(y, 20, 0.014, 0, B(y), '#cfe3a8'))
      + layer(0.09, wave(y + 110, 24, 0.016, 2, B(y), '#a9cf84') + roundTree(80, y + 140, 1.2) + roundTree(330, y + 150, 1))
      + layer(0.13, wave(y + 230, 20, 0.02, 4, B(y), '#e9cf7a') + roundTree(350, y + 260, 1.3))
      + layer(0.17, wave(y + 350, 14, 0.025, 1, B(y), '#8fbf6c')),
  };

  /* ---------- Story-specific scenery (Michoacán) ---------- */

  // A string of papel picado: cut-paper flags hanging from a sagging cord.
  const papelPicado = (y, x0 = -10, x1 = W + 10, sag = 26) => {
    const colors = ['#e85a8a', '#f39a3c', '#8e5bb5', '#3fa36b', '#f2c94c', '#3d8fd1'];
    let g = `<path d="M ${x0} ${y} Q ${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}" stroke="#5b4636" stroke-width="1.2" fill="none"/>`;
    let i = 0;
    for (let x = x0 + 12; x < x1 - 10; x += 26, i++) {
      const t = (x - x0) / (x1 - x0);
      const yy = y + 4 * sag * t * (1 - t);
      const c = colors[i % colors.length];
      g += `<path d="M ${f(x - 10)} ${f(yy)} h 20 v 22 l -3.3 4 -3.3 -4 -3.4 4 -3.3 -4 -3.4 4 -3.3 -4 Z" fill="${c}"/>
        <path d="M ${f(x - 4)} ${f(yy + 8)} l 4 -4 4 4 -4 4 Z M ${f(x - 6)} ${f(yy + 17)} h 3 v 3 h -3 Z M ${f(x + 3)} ${f(yy + 17)} h 3 v 3 h -3 Z" fill="rgba(255,255,255,.55)"/>`;
    }
    return `<g ${CUT}>${g}</g>`;
  };
  const marigold = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#f5a01f"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.55)}" fill="#e2731a"/>`;
  const marigoldField = (y, h, n, x0 = 0, x1 = W) => {
    let g = '';
    for (let i = 0; i < n; i++) g += marigold(x0 + rnd() * (x1 - x0), y + rnd() * h, 3.5 + rnd() * 4);
    return `<g ${CUT}>${g}</g>`;
  };
  // A candle (static wax) whose flame is drawn live so it can flicker.
  const candle = (x, base, h) => {
    live += `<path class="flame" style="animation-delay:${f(rnd())}s" d="M ${x} ${base - h - 15} C ${x + 5} ${base - h - 8}, ${x + 4.5} ${base - h - 2}, ${x} ${base - h - 1} C ${x - 4.5} ${base - h - 2}, ${x - 5} ${base - h - 8}, ${x} ${base - h - 15} Z" fill="#ffb93b"/>
      <circle class="twinkle" cx="${x}" cy="${base - h - 8}" r="11" fill="url(#ff)" opacity=".7"/>`;
    return `<g ${CUT}><rect x="${x - 5}" y="${base - h}" width="10" height="${h}" rx="2" fill="#f5e6c4"/><rect x="${x - 0.6}" y="${base - h - 3}" width="1.2" height="3" fill="#3b2f2a"/></g>`;
  };
  const calavera = (x, y, s = 1) => `<g ${CUT} transform="translate(${x} ${y}) scale(${s})">
    <path d="M -13 2 C -13 -14, 13 -14, 13 2 C 13 8, 8 9, 8 13 L -8 13 C -8 9, -13 8, -13 2 Z" fill="#fbf6ea"/>
    <circle cx="-5" cy="0" r="4" fill="#e85a8a"/><circle cx="5" cy="0" r="4" fill="#3d8fd1"/>
    <path d="M -1 5 L 1 5 L 0 8 Z" fill="#3b2f2a"/><path d="M -5 11 v -2 M -1.7 11 v -2 M 1.7 11 v -2 M 5 11 v -2" stroke="#3b2f2a" stroke-width="1"/></g>`;
  // Monarch butterfly drawn at the origin; `flying` ones flap and drift in the live layer.
  const monarchShape = (s = 1) => `<g transform="scale(${s})">
    <path d="M 0 0 C -6 -10, -16 -11, -15 -3 C -14 2, -6 3, 0 1 Z" fill="#ec8a26" stroke="#2a1a10" stroke-width="1.3"/>
    <path d="M 0 0 C 6 -10, 16 -11, 15 -3 C 14 2, 6 3, 0 1 Z" fill="#ec8a26" stroke="#2a1a10" stroke-width="1.3"/>
    <path d="M 0 1 C -4 4, -11 7, -8 11 C -5 13, -1 7, 0 2 Z" fill="#d9731c" stroke="#2a1a10" stroke-width="1.3"/>
    <path d="M 0 1 C 4 4, 11 7, 8 11 C 5 13, 1 7, 0 2 Z" fill="#d9731c" stroke="#2a1a10" stroke-width="1.3"/>
    <path d="M 0 -4 L 0 8" stroke="#2a1a10" stroke-width="1.8" stroke-linecap="round"/></g>`;
  const flyingMonarch = (x, y, s, rot = 0) => {
    live += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><g class="drift" style="animation-delay:${f(rnd() * 5)}s"><g class="flutter" style="animation-delay:${f(rnd())}s">${monarchShape(s)}</g></g></g>`;
  };
  // Monarchs resting in clusters on a fir tree.
  const clusterTree = (x, base, h) => {
    let g = pine(x, base, h, '#24503b');
    let c = '';
    for (let i = 0; i < 9; i++) {
      const yy = base - 14 - rnd() * h * 0.7;
      const spread = (base - yy) * 0.35;
      c += `<g transform="translate(${f(x + (rnd() - 0.5) * spread)} ${f(yy)}) rotate(${f((rnd() - 0.5) * 50)})">${monarchShape(0.45)}</g>`;
    }
    return g + `<g>${c}</g>`;
  };
  const moth = (x, y, s = 1) => `<g ${CUT} transform="translate(${x} ${y}) scale(${s})">
    <path d="M 0 0 C -10 -12, -26 -8, -24 4 C -22 10, -8 8, 0 3 Z M 0 0 C 10 -12, 26 -8, 24 4 C 22 10, 8 8, 0 3 Z" fill="#3b2c2a"/>
    <path d="M -15 -2 q 2 3 -1 4 M 15 -2 q -2 3 1 4" stroke="#8fb36a" stroke-width="1.6" fill="none"/>
    <path d="M 0 -3 L 0 9" stroke="#1d1514" stroke-width="2.4" stroke-linecap="round"/></g>`;
  const house = (x, base, w, h, wall, roof) => `<g ${CUT}>
    <rect x="${x}" y="${base - h}" width="${w}" height="${h + 30}" fill="${wall}"/>
    <path d="M ${x - 5} ${base - h + 2} L ${x + w * 0.12} ${base - h - 12} L ${x + w * 0.88} ${base - h - 12} L ${x + w + 5} ${base - h + 2} Z" fill="${roof}"/>
    <path d="M ${x + w * 0.38} ${base} v -18 a ${w * 0.12} ${w * 0.12} 0 0 1 ${w * 0.24} 0 v 18 Z" fill="#5b3a2a"/>
    <rect x="${x + w * 0.1}" y="${base - h + 12}" width="${w * 0.2}" height="12" fill="#6b4a3a"/></g>`;
  const balloon = (x, y) => `<g ${CUT}><path d="M ${x} ${y + 15} q 4 14 -2 30" stroke="#3b2f2a" stroke-width="1" fill="none"/>
    <ellipse cx="${x}" cy="${y}" rx="10" ry="13" fill="#1f1a1d"/><ellipse cx="${x - 3}" cy="${y - 5}" rx="2.5" ry="4" fill="rgba(255,255,255,.35)"/></g>`;
  const side = (sx) => (sx > 200 ? { a: 60, b: 120 } : { a: 280, b: 340 }); // free side, away from the stop

  Object.assign(PAINT, {
    // Día de Muertos: papel picado, a dusky sky, hills of cempasúchil, candles and a sugar skull.
    ofrenda: (y, sx) => {
      const o = side(sx);
      return cloudBank(y, B(y), 'url(#violet)')
        + papelPicado(y + 30)
        + wave(y + 150, 14, 0.02, 1, B(y), '#5d3f6a')
        + wave(y + 225, 12, 0.025, 3, B(y), '#3f6b3a') + marigoldField(y + 235, 120, 70)
        + candle(o.a - 14, y + 300, 26) + candle(o.a, y + 302, 36) + candle(o.a + 14, y + 300, 22)
        + calavera(o.b, y + 290, 1.1)
        + wave(y + 360, 10, 0.03, 2, B(y), '#356030') + marigoldField(y + 368, 60, 40);
    },
    // Monarchs: misty mountains, oyamel firs heavy with butterflies, more in the air, one dark moth.
    monarchs: (y, sx) => {
      const o = side(sx);
      for (let i = 0; i < 6; i++) flyingMonarch(30 + rnd() * 340, y + 60 + rnd() * 300, 0.7 + rnd() * 0.4, (rnd() - 0.5) * 40);
      return cloudBank(y, B(y), '#d7e8e4')
        + wave(y + 70, 22, 0.015, 2, B(y), '#8aa79a')
        + wave(y + 150, 18, 0.02, 4, B(y), '#5f8a73')
        + clusterTree(o.a - 20, y + 320, 150) + clusterTree(o.a + 30, y + 340, 120) + clusterTree(sx > 200 ? 360 : 40, y + 300, 110)
        + wave(y + 340, 12, 0.025, 1, B(y), '#3d6b52')
        + moth(o.b, y + 400, 0.9);
    },
    // Part I: a village courtyard at sunset — adobe houses, papel picado, black Halloween balloons, marigolds.
    village: (y, sx) => {
      const o = side(sx);
      return cloudBank(y, B(y), 'url(#dusk)')
        + wave(y + 120, 16, 0.016, 2, B(y), '#8e6f8f')
        + house(-10, y + 290, 90, 80, '#e2b77a', '#a8432e') + house(90, y + 300, 70, 60, '#d98f5c', '#93392a')
        + house(250, y + 295, 80, 75, '#e8c48e', '#a8432e') + house(335, y + 285, 80, 90, '#d9a066', '#93392a')
        + papelPicado(y + 200, 40, 360, 18)
        + balloon(o.a, y + 150) + balloon(o.a + 22, y + 140)
        + wave(y + 300, 6, 0.03, 1, B(y), '#c9b08f')
        + `<g opacity=".5">${Array.from({ length: 40 }, () => `<ellipse cx="${f(rnd() * W)}" cy="${f(y + 312 + rnd() * 120)}" rx="7" ry="3.5" fill="#a88f6e"/>`).join('')}</g>`
        + candle(o.b, y + 330, 30) + marigoldField(y + 320, 20, 14, o.b - 40, o.b + 40);
    },
    // Part II: dusk turning to night over the mountains, the village lights below, a candle and its moth,
    // and the monarchs coming home.
    souls: (y, sx) => {
      const o = side(sx);
      for (let i = 0; i < 7; i++) flyingMonarch(40 + i * 48 + rnd() * 20, y + 60 + i * 26 + rnd() * 20, 0.75, 25);
      return cloudBank(y, B(y), 'url(#souls)')
        + sparkles(y + 20, 140, 18, '#fbf6ea')
        + wave(y + 170, 30, 0.012, 1, B(y), '#3b3f66')
        + wave(y + 240, 20, 0.018, 3, B(y), '#2b3456')
        + `<g>${Array.from({ length: 16 }, () => `<circle cx="${f(rnd() * W)}" cy="${f(y + 280 + rnd() * 40)}" r="2" fill="#ffd27a"/>`).join('')}</g>`
        + wave(y + 340, 12, 0.025, 2, B(y), '#22294a')
        + candle(o.a, y + 400, 40) + moth(o.a + 18, y + 410, 0.55)
        + marigoldField(y + 395, 20, 10, o.a - 40, o.a + 40);
    },
  });

  /* ---------- Story-specific scenery (Costa Rica) ---------- */

  const sproutingCoconut = (x, y) => `<g ${CUT}>
    <ellipse cx="${x}" cy="${y}" rx="10" ry="8.5" fill="#6b4a2c"/><ellipse cx="${x - 3}" cy="${y - 3}" rx="3" ry="2" fill="#8a6a45"/>
    <path d="M ${x + 2} ${y - 7} C ${x + 2} ${y - 18}, ${x - 8} ${y - 24}, ${x - 14} ${y - 22} C ${x - 6} ${y - 16}, ${x} ${y - 12}, ${x + 2} ${y - 7} Z" fill="#4d9a5f"/>
    <path d="M ${x + 2} ${y - 7} C ${x + 4} ${y - 18}, ${x + 14} ${y - 22}, ${x + 18} ${y - 18} C ${x + 10} ${y - 14}, ${x + 5} ${y - 11}, ${x + 2} ${y - 7} Z" fill="#3f8a55"/></g>`;
  const branch = (x0, y, x1) => `<path d="M ${x0} ${y} Q ${(x0 + x1) / 2} ${y + 8} ${x1} ${y - 4}" stroke="#6b4a2c" stroke-width="6" stroke-linecap="round" fill="none" ${CUT}/>`;
  const sloth = (x, y) => `<g ${CUT}>
    <path d="M ${x - 12} ${y + 2} L ${x - 8} ${y + 18} M ${x + 12} ${y + 2} L ${x + 8} ${y + 18}" stroke="#7a6048" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="${y + 24}" rx="16" ry="12" fill="#8a7056"/>
    <circle cx="${x + 13}" cy="${y + 30}" r="9" fill="#a88c6e"/>
    <path d="M ${x + 8} ${y + 29} q 5 -3 10 0" stroke="#3b2c22" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="${x + 13}" cy="${y + 33}" r="1.5" fill="#3b2c22"/></g>`;
  const toucan = (x, y) => `<g ${CUT}>
    <ellipse cx="${x}" cy="${y}" rx="11" ry="16" fill="#1f1d24"/><ellipse cx="${x + 4}" cy="${y - 6}" rx="6" ry="7" fill="#f6e7a8"/>
    <path d="M ${x + 6} ${y - 12} C ${x + 22} ${y - 18}, ${x + 34} ${y - 12}, ${x + 36} ${y - 6} C ${x + 26} ${y - 6}, ${x + 14} ${y - 4}, ${x + 6} ${y - 6} Z" fill="#f39a3c"/>
    <path d="M ${x + 34} ${y - 9} l 2 3" stroke="#c0392b" stroke-width="2"/>
    <circle cx="${x + 5}" cy="${y - 11}" r="2" fill="#3fa36b"/><path d="M ${x - 6} ${y + 14} l -6 10" stroke="#1f1d24" stroke-width="5" stroke-linecap="round"/></g>`;
  const frog = (x, y) => `<g ${CUT}>
    <path d="M ${x - 8} ${y + 2} l -6 5 M ${x + 8} ${y + 2} l 6 5 M ${x - 6} ${y - 3} l -6 -3 M ${x + 6} ${y - 3} l 6 -3" stroke="#2f5fb3" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="${y}" rx="9" ry="7" fill="#d9362b"/><circle cx="${x - 4}" cy="${y - 5}" r="2" fill="#1f1d24"/><circle cx="${x + 4}" cy="${y - 5}" r="2" fill="#1f1d24"/></g>`;
  // Julie on a rock by the sea (curly hair), singing; the notes rise live.
  const singer = (x, base) => {
    for (let i = 0; i < 4; i++) {
      live += `<text class="note-rise" style="animation-delay:${i * 1.1}s" x="${x + 10 + i * 6}" y="${base - 46 - i * 3}" font-family="Georgia, serif" font-size="${16 + (i % 2) * 6}" fill="#fbf6ea">${['♪', '♫', '♪', '♬'][i]}</text>`;
    }
    let curls = '';
    for (let a = -170; a <= 10; a += 30) curls += `<circle cx="${f(x + 10 * Math.cos(a * Math.PI / 180))}" cy="${f(base - 40 + 10 * Math.sin(a * Math.PI / 180))}" r="5"/>`;
    return `<g ${CUT}><path d="M ${x - 30} ${base} C ${x - 26} ${base - 18}, ${x + 22} ${base - 22}, ${x + 30} ${base} Z" fill="#6f6a6a"/></g>
      <g ${CUT} fill="#3a2a35"><path d="M ${x - 12} ${base - 14} C ${x - 12} ${base - 30}, ${x + 12} ${base - 30}, ${x + 12} ${base - 14} Z"/>${curls}<circle cx="${x}" cy="${base - 38}" r="8"/></g>`;
  };
  const tent = (x, base, w, h) => {
    for (let i = 0; i < 3; i++) {
      live += `<path class="steam" style="animation-delay:${f(i * 0.9 + rnd())}s" d="M ${x + w / 2 - 6 + i * 6} ${base - h - 4} c -6 -8, 6 -14, 0 -22 c -6 -8, 6 -14, 0 -22" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>`;
    }
    return `<g ${CUT}><path d="M ${x} ${base} L ${x + w / 2} ${base - h} L ${x + w} ${base} Z" fill="#efe3c8"/>
      <path d="M ${x + w / 2 - 9} ${base} L ${x + w / 2} ${base - h * 0.5} L ${x + w / 2 + 9} ${base} Z" fill="#c9a77a"/></g>`;
  };
  const iceBath = (x, base) => `<g ${CUT}><rect x="${x}" y="${base - 26}" width="46" height="26" rx="3" fill="#e9f3f8"/>
    <rect x="${x + 3}" y="${base - 23}" width="40" height="7" fill="#7fc3e0"/>
    <rect x="${x + 7}" y="${base - 27}" width="7" height="7" fill="#ffffff" transform="rotate(12 ${x + 10} ${base - 23})"/>
    <rect x="${x + 25}" y="${base - 26}" width="6" height="6" fill="#ffffff" transform="rotate(-10 ${x + 28} ${base - 23})"/></g>`;
  const bike = (x, y) => `<g ${CUT} stroke="#2b3a63" stroke-width="2.4" fill="none">
    <circle cx="${x - 14}" cy="${y}" r="10"/><circle cx="${x + 16}" cy="${y}" r="10"/>
    <path d="M ${x - 14} ${y} L ${x - 2} ${y - 16} L ${x + 12} ${y - 16} L ${x + 16} ${y} M ${x - 2} ${y - 16} L ${x + 2} ${y} L ${x - 14} ${y} M ${x + 12} ${y - 16} L ${x + 10} ${y - 22} M ${x - 4} ${y - 20} h 6"/></g>`;

  Object.assign(PAINT, {
    // The coconut adventure: the beach with palms, and sprouting coconuts in the sand.
    cocos: (y, sx) => {
      const o = side(sx);
      return PAINT.island(y)
        + sproutingCoconut(o.a - 10, y + 330) + sproutingCoconut(o.a + 26, y + 342) + sproutingCoconut(o.b + 20, y + 395);
    },
    // Puerto Viejo: the jungle with a sloth, a toucan and little poison frogs.
    caribe: (y, sx) => {
      const o = side(sx);
      return PAINT.jungle(y)
        + branch(o.a - 70, y + 150, o.a + 40) + sloth(o.a - 10, y + 150)
        + branch(o.b - 20, y + 270, o.b + 70) + toucan(o.b + 10, y + 250)
        + frog(o.a, y + 410) + frog(o.a + 40, y + 420);
    },
    // The beach and the song: sunset sea, and Julie singing on a rock.
    singing: (y, sx) => PAINT.sea(y) + singer(side(sx).a + 10, y + 335),
    // Fire and ice: jungle hills, steaming herb saunas, ice baths, and the bike.
    fireice: (y, sx) => {
      const o = side(sx);
      return wave(y, 16, 0.02, 0, B(y), '#2c5a43')
        + wave(y + 90, 20, 0.022, 2, B(y), '#3d7a52')
        + wave(y + 230, 10, 0.03, 1, B(y), '#4f8a5b')
        + tent(o.a - 40, y + 300, 58, 60) + tent(o.a + 22, y + 310, 50, 52)
        + iceBath(o.b - 30, y + 360) + iceBath(o.b + 22, y + 368)
        + bike(o.a, y + 400)
        + `<g ${CUT}>${[0, 1, 2, 3, 4].map((i) => leaf(o.b - 50 + i * 9, y + 300, 16, -60 - i * 15, i % 2 ? '#6fae5f' : '#4d9a5f')).join('')}</g>`
        + ((live += fireflies(y + 120, 260, 8)), '');
    },
  });

  const CYCLE = ['island', 'jungle', 'sea', 'mountain', 'countryside', 'city', 'desert', 'forest', 'snow'];

  function build(lessons) {
    seed = 7;
    live = '';
    const H = TOP + lessons.length * SEG + END;
    const stops = lessons.map((l, i) => ({
      x: (i % 2 ? 115 : 285) + (rnd() - 0.5) * 16,
      y: TOP + i * SEG + SEG * 0.55,
    }));
    const start = { x: 200, y: TOP - 50 };
    const next = { x: lessons.length % 2 ? 115 : 285, y: H - END + 210 };

    let art = `<defs>
      <filter id="cut" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#14201a" flood-opacity=".28"/></filter>
      <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcc0"/><stop offset="1" stop-color="#cfe6e4"/></linearGradient>
      <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3b28a"/><stop offset=".55" stop-color="#ee9478"/><stop offset="1" stop-color="#d9746a"/></linearGradient>
      <linearGradient id="violet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0a77f"/><stop offset=".6" stop-color="#b9708a"/><stop offset="1" stop-color="#6e4a7a"/></linearGradient>
      <linearGradient id="souls" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5a86"/><stop offset=".5" stop-color="#3f3f6b"/><stop offset="1" stop-color="#232b4d"/></linearGradient>
            <linearGradient id="nightsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a63"/><stop offset="1" stop-color="#141d33"/></linearGradient>
      <mask id="crescent"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="318" cy="${H - END + 108}" r="24" fill="#000"/></mask>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#dawn)"/>`;

    // Dawn: sun and clouds behind the greeting.
    art += layer(0.04, `<circle cx="305" cy="215" r="44" fill="#fbe3a6" ${CUT}/>`);
    art += layer(0.08, cloud(60, 220, 1.05) + cloud(345, 300, 0.75) + cloud(110, 300, 0.6));

    lessons.forEach((l, i) => {
      const kind = PAINT[l.landscape] ? l.landscape : CYCLE[i % CYCLE.length];
      art += PAINT[kind](TOP + i * SEG, stops[i].x);
    });

    // Night: stars and a paper moon, waiting for the next story.
    const ny = H - END;
    art += layer(0.05, cloudBank(ny + 20, H + 40, 'url(#nightsky)'));
    live += sparkles(ny + 60, END - 60, 40, '#fbf6ea');
    art += layer(0.08, `<circle cx="300" cy="${ny + 120}" r="28" fill="#f6e7bd" mask="url(#crescent)" ${CUT}/>`);
    art += layer(0.1, cloud(70, H - 50, 0.9, '#33446f') + cloud(335, H - 30, 0.7, '#2b3a63'));

    // The route: a stitched thread from stop to stop.
    const pts = [start, ...stops, next];
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const my = (b.y - a.y) / 2;
      d += ` C ${f(a.x)} ${f(a.y + my)}, ${f(b.x)} ${f(b.y - my)}, ${f(b.x)} ${f(b.y)}`;
    }
    art += `<path d="${d}" fill="none" stroke="rgba(20,32,26,.22)" stroke-width="5" stroke-linecap="round" stroke-dasharray="7 9" transform="translate(0 2)"/>`;
    art += `<path d="${d}" fill="none" stroke="#fbf6ea" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="7 9"/>`;
    const liveDefs = '<defs><radialGradient id="ff"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffe27a" stop-opacity=".8"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient></defs>';
    return { W, H, art, live: liveDefs + live, stops, start, next };
  }

  // The static scene becomes one cached image: phones scroll a bitmap far more smoothly than
  // a tall SVG full of shadow filters.
  const cache = new Map();
  function imageUrl(scene) {
    const key = `${scene.H}:${scene.art.length}`;
    if (!cache.has(key)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${scene.H}" width="${W}" height="${scene.H}">${scene.art}</svg>`;
      cache.set(key, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
    }
    return cache.get(key);
  }

  return { build, imageUrl };
})();
