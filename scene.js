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
  const layer = (depth, body) => `<g data-depth="${depth}">${body}</g>`;

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
        + fireflies(y + 110, 300, 14);
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
      + sparkles(y + 40, 380, 24, '#ffffff', 'snowflake twinkle'),
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
  const CYCLE = ['island', 'jungle', 'sea', 'mountain', 'countryside', 'city', 'desert', 'forest', 'snow'];

  function build(lessons) {
    seed = 7;
    const H = TOP + lessons.length * SEG + END;
    const stops = lessons.map((l, i) => ({
      x: (i % 2 ? 115 : 285) + (rnd() - 0.5) * 16,
      y: TOP + i * SEG + SEG * 0.55,
    }));
    const start = { x: 200, y: TOP - 50 };
    const next = { x: lessons.length % 2 ? 115 : 285, y: H - END + 210 };

    let art = `<defs>
      <filter id="cut" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#14201a" flood-opacity=".28"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .1  0 0 0 0 .08  0 0 0 .55 0"/></filter>
      <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcc0"/><stop offset="1" stop-color="#cfe6e4"/></linearGradient>
      <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3b28a"/><stop offset=".55" stop-color="#ee9478"/><stop offset="1" stop-color="#d9746a"/></linearGradient>
      <linearGradient id="nightsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a63"/><stop offset="1" stop-color="#141d33"/></linearGradient>
      <radialGradient id="ff"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffe27a" stop-opacity=".8"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
      <mask id="crescent"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="318" cy="${H - END + 108}" r="24" fill="#000"/></mask>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#dawn)"/>`;

    // Dawn: sun and clouds behind the greeting.
    art += layer(0.04, `<circle cx="305" cy="215" r="44" fill="#fbe3a6" ${CUT}/>`);
    art += layer(0.08, cloud(60, 220, 1.05) + cloud(345, 300, 0.75) + cloud(110, 300, 0.6));

    lessons.forEach((l, i) => {
      const kind = PAINT[l.landscape] ? l.landscape : CYCLE[i % CYCLE.length];
      art += PAINT[kind](TOP + i * SEG);
    });

    // Night: stars and a paper moon, waiting for the next story.
    const ny = H - END;
    art += layer(0.05, cloudBank(ny + 20, H + 40, 'url(#nightsky)'));
    art += sparkles(ny + 60, END - 60, 40, '#fbf6ea');
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
    art += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".3" style="mix-blend-mode:multiply"/>`;

    return { W, H, art, stops, start, next };
  }

  // Each paper layer slides a little at its own speed as the page scrolls.
  function parallax(svg, scene) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
    const layers = [...svg.querySelectorAll('[data-depth]')].map((g) => {
      const bb = g.getBBox();
      return { g, depth: Number(g.dataset.depth), mid: bb.y + Math.min(bb.height, 300) / 2 };
    });
    let ticking = false;
    const update = () => {
      ticking = false;
      if (!scene.isConnected) return;
      const r = scene.getBoundingClientRect();
      const centre = (window.innerHeight / 2 - r.top) * (W / r.width);
      for (const l of layers) {
        const off = (centre - l.mid) * l.depth * -0.35;
        l.g.setAttribute('transform', `translate(0 ${f(Math.max(-24, Math.min(24, off)))})`);
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }

  return { build, parallax };
})();
