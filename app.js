'use strict';

/* ---------- Storage (progress, drafts, preferences) ---------- */

const STORE_KEY = 'cartas.v1';
const store = (() => {
  let data = { seen: {}, done: {}, cards: {}, drafts: {}, scale: 1 };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) data = Object.assign(data, JSON.parse(raw));
  } catch (_) { /* private mode or blocked storage: keep in memory only */ }
  return {
    data,
    save() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (_) { /* ignore */ }
    },
  };
})();

/* ---------- Helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const popover = $('#popover');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!m) return String(y);
  return d ? `${d} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}

// Turns a paragraph of plain text (with blank lines) into <p> elements.
const paragraphs = (text) => String(text ?? '').split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join('');

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

/* ---------- Speech (Spanish text-to-speech, built into the device) ---------- */

const speech = {
  voice: null,
  slow: false,
  supported: 'speechSynthesis' in window,
  pickVoice() {
    if (!this.supported) return;
    const voices = speechSynthesis.getVoices();
    this.voice = voices.find((v) => /^es[-_]ES/i.test(v.lang))
      || voices.find((v) => /^es/i.test(v.lang))
      || null;
  },
  say(text, { onstart, onend } = {}) {
    if (!this.supported) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.voice ? this.voice.lang : 'es-ES';
    if (this.voice) u.voice = this.voice;
    u.rate = this.slow ? 0.7 : 0.95;
    if (onstart) u.onstart = onstart;
    if (onend) { u.onend = onend; u.onerror = onend; }
    speechSynthesis.speak(u);
  },
  stop() { if (this.supported) speechSynthesis.cancel(); },
};
if (speech.supported) {
  speech.pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => speech.pickVoice());
}

/* ---------- Popover (vocabulary definitions) ---------- */

function showPopover(target, html) {
  popover.innerHTML = html;
  popover.hidden = false;
  const r = target.getBoundingClientRect();
  const pw = popover.offsetWidth;
  const ph = popover.offsetHeight;
  let left = Math.min(Math.max(16, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 16);
  let top = r.bottom + 8;
  if (top + ph > window.innerHeight - 8) top = r.top - ph - 8;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}
function hidePopover() { popover.hidden = true; }
document.addEventListener('click', (e) => {
  if (!popover.hidden && !popover.contains(e.target) && !e.target.closest('.v')) hidePopover();
});
window.addEventListener('scroll', hidePopover, { passive: true });

/* ---------- Data ---------- */

let config = { learnerName: 'Maman', authorName: '' };
let index = [];
const lessonCache = new Map();

async function loadLesson(id) {
  if (!lessonCache.has(id)) lessonCache.set(id, await getJSON(`lessons/${encodeURIComponent(id)}.json`));
  return lessonCache.get(id);
}

/* ---------- Views ---------- */

function setActiveNav(name) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
}

// Each lesson sits in a landscape; the background blends from one to the next as the path goes down.
const LANDSCAPES = {
  countryside: { color: '#e4eeb9', decor: ['🌻', '🐄', '🌳', '🚜'] },
  city: { color: '#f4dcc6', decor: ['🏛️', '⛪', '🚋', '🌳'] },
  sea: { color: '#bfe3f2', decor: ['🌊', '⛵', '🐚', '🏖️'] },
  mountain: { color: '#d3e6c8', decor: ['⛰️', '🌲', '🏔️', '🦅'] },
  desert: { color: '#f6e3b2', decor: ['🌵', '🐪', '☀️', '🏜️'] },
  forest: { color: '#c2dfb0', decor: ['🌲', '🍄', '🦌', '🌳'] },
  island: { color: '#b8e8e0', decor: ['🌴', '🐠', '🏝️', '⛵'] },
  snow: { color: '#e6eef6', decor: ['❄️', '🌲', '⛷️', '🏔️'] },
  jungle: { color: '#b9dfa5', decor: ['🦥', '🐒', '🦜', '🐸'] },
};
const LANDSCAPE_CYCLE = ['countryside', 'city', 'sea', 'mountain', 'desert', 'forest', 'island'];
const SKY = { color: '#dceefc', decor: ['☁️', '✈️', '☁️', '🌤️'] };

function stars(done) {
  if (!done) return 0;
  const r = done.score / done.total;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}

function renderHome() {
  setActiveNav('home');
  document.title = 'Cartas de viaje';
  const name = config.learnerName ? `, ${esc(config.learnerName)}` : '';
  const from = config.authorName ? ` de ${esc(config.authorName)}` : '';
  // Oldest first: the journey starts at the top and every new story extends it downward.
  const lessons = index.slice()
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || a.id.localeCompare(b.id));
  const doneCount = lessons.filter((l) => store.data.done[l.id]).length;
  const currentIdx = lessons.findIndex((l) => !store.data.done[l.id]);

  const ROW = 180;
  const TOP = 70;
  // Stops: start, each lesson, then the "next story" node.
  const stops = [{ kind: 'start' }, ...lessons.map((l, i) => ({ kind: 'lesson', l, i })), { kind: 'next' }];
  const pts = stops.map((s, i) => ({ x: i === 0 ? 50 : 50 + 27 * Math.sin(i * 1.15), y: TOP + i * ROW }));
  const height = pts[pts.length - 1].y + 110;
  const scene = (s, i) => {
    if (s.kind === 'next') return SKY;
    const l = s.kind === 'start' ? lessons[0] : s.l;
    const key = l?.landscape || LANDSCAPE_CYCLE[Math.max(0, i - 1) % LANDSCAPE_CYCLE.length];
    return LANDSCAPES[key] || LANDSCAPES.countryside;
  };

  const gradient = `linear-gradient(to bottom, ${stops.map((s, i) => `${scene(s, i).color} ${pts[i].y}px`).join(', ')})`;
  const path = pts.slice(1).reduce((d, p, i) => {
    const a = pts[i];
    return `${d} C ${a.x} ${a.y + ROW / 2}, ${p.x} ${p.y - ROW / 2}, ${p.x} ${p.y}`;
  }, `M ${pts[0].x} ${pts[0].y}`);

  const decor = stops.map((s, i) => {
    if (s.kind === 'start') return '';
    const d = scene(s, i).decor;
    const p = pts[i];
    // Put scenery on the side of the screen away from the path.
    const side = p.x > 50 ? [8, 24] : [76, 92];
    return `<span class="deco" style="left:${side[0]}%;top:${p.y - 34}px">${d[i % d.length]}</span>
      <span class="deco small" style="left:${side[1]}%;top:${p.y + 26}px">${d[(i + 1) % d.length]}</span>`;
  }).join('');

  const nodes = stops.map((s, i) => {
    const { x, y } = pts[i];
    const pos = `style="left:${x}%;top:${y}px"`;
    if (s.kind === 'start') {
      return `<div class="node start" ${pos}><span class="disc" aria-hidden="true">🏠</span><span class="label"><b>Départ</b></span></div>`;
    }
    if (s.kind === 'next') {
      return `<div class="node next" ${pos}><span class="disc" aria-hidden="true">✈️</span>
        <span class="label"><b>Prochaine étape…</b><small>Bientôt une nouvelle histoire !</small></span></div>`;
    }
    const { l } = s;
    const done = store.data.done[l.id];
    const isCurrent = s.i === currentIdx;
    const n = stars(done);
    const cls = ['node', 'lesson', done ? 'done' : '', isCurrent ? 'current' : ''].join(' ');
    const city = String(l.place || '').split(',')[0];
    return `<a class="${cls}" ${pos} href="#/lecon/${encodeURIComponent(l.id)}" aria-label="Histoire ${s.i + 1} : ${esc(l.title)}">
      ${isCurrent ? `<span class="bubble">${store.data.seen[l.id] ? '¡Sigue!' : '¡Nuevo!'}</span>` : ''}
      ${done ? `<span class="stars" aria-label="${n} étoiles">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>` : ''}
      <span class="disc">${done ? '✓' : s.i + 1}</span>
      <span class="label"><b>${esc(city)}</b><small>${esc(l.title)}</small></span>
    </a>`;
  }).join('');

  app.innerHTML = `<div class="welcome map-head">
      <h1>¡Hola${name}!</h1>
      <p>Le voyage${from}, une histoire à la fois.</p>
      ${lessons.length ? `<div class="progress" role="img" aria-label="${doneCount} histoires terminées sur ${lessons.length}">
        <div class="bar"><span style="width:${(100 * doneCount) / lessons.length}%"></span></div>
        <span>🏅 ${doneCount} / ${lessons.length}</span></div>` : ''}
    </div>
    <div class="map" style="height:${height}px">
      <div class="map-bg" style="background:${gradient}">${decor}</div>
      <svg class="route" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">
        <path d="${path}" />
      </svg>
      ${nodes}
    </div>`;

  const cur = app.querySelector('.node.current');
  if (cur && currentIdx > 1) cur.scrollIntoView({ block: 'center' });
}

const STEPS = [
  { id: 'story', label: '📖 Histoire' },
  { id: 'vocab', label: '🔤 Mots' },
  { id: 'grammar', label: '✏️ Grammaire' },
  { id: 'exercises', label: '🎯 Exercices' },
  { id: 'reply', label: '💌 À toi' },
];

let current = null; // { lesson, step, answers }

async function renderLesson(id, step) {
  setActiveNav('');
  speech.stop();
  let lesson;
  try {
    lesson = await loadLesson(id);
  } catch (err) {
    app.innerHTML = `<a class="back" href="#/">← La carte</a><p class="empty">Histoire introuvable.</p>`;
    return;
  }
  if (!current || current.lesson.id !== lesson.id) current = { lesson, step: 'story', answers: {} };
  if (step && STEPS.some((s) => s.id === step)) current.step = step;
  if (!store.data.seen[lesson.id]) { store.data.seen[lesson.id] = Date.now(); store.save(); }
  document.title = `${lesson.title} · Cartas de viaje`;

  const author = config.authorName ? `<span class="from">— ${esc(config.authorName)}</span>` : '';
  app.innerHTML = `
    <a class="back" href="#/">← La carte</a>
    <div class="lesson-hero">
      ${lesson.cover ? `<img src="${esc(lesson.cover)}" alt="">` : ''}
      <h1>${esc(lesson.title)}</h1>
      <p class="subtitle">${esc(lesson.titleFr || '')}${lesson.place ? ` · 📍 ${esc(lesson.place)}` : ''}${lesson.date ? ` · ${esc(formatDate(lesson.date))}` : ''}</p>
      ${lesson.note ? `<div class="note">${esc(lesson.note)}${author}</div>` : ''}
    </div>
    <div class="steps" role="tablist">
      ${STEPS.map((s) => `<button type="button" role="tab" data-step="${s.id}" aria-selected="${s.id === current.step}">${s.label}</button>`).join('')}
    </div>
    <section id="step"></section>`;

  app.querySelector('.steps').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b) location.hash = `#/lecon/${encodeURIComponent(lesson.id)}/${b.dataset.step}`;
  });
  renderStep();
}

function goToStep(step) {
  location.hash = `#/lecon/${encodeURIComponent(current.lesson.id)}/${step}`;
}

function nextStepButton(step, label) {
  return `<div class="next-step"><button type="button" class="btn primary" data-goto="${step}">${label} →</button></div>`;
}

function renderStep() {
  speech.stop();
  hidePopover();
  // Fresh element each time so listeners from the previous step don't pile up.
  const old = $('#step');
  const host = old.cloneNode(false);
  old.replaceWith(host);
  app.querySelectorAll('.steps [data-step]').forEach((b) => b.setAttribute('aria-selected', b.dataset.step === current.step));
  const { lesson } = current;
  const views = { story: viewStory, vocab: viewVocab, grammar: viewGrammar, exercises: viewExercises, reply: viewReply };
  views[current.step](host, lesson);
  host.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => {
    goToStep(b.dataset.goto);
    window.scrollTo({ top: app.querySelector('.steps').offsetTop - 60, behavior: 'smooth' });
  }));
}

/* --- Story --- */

function vocabMatcher(lesson) {
  const entries = [];
  for (const v of lesson.vocabulary || []) {
    const forms = v.match ? [].concat(v.match) : [v.es.replace(/^(el|la|los|las|un|una)\s+/i, '')];
    for (const f of forms) entries.push({ form: f, v });
  }
  entries.sort((a, b) => b.form.length - a.form.length);
  if (!entries.length) return null;
  const re = new RegExp(`(?<![\\p{L}])(${entries.map((e) => escRe(e.form)).join('|')})(?![\\p{L}])`, 'giu');
  const lookup = (text) => entries.find((e) => e.form.toLowerCase() === text.toLowerCase())?.v;
  return { re, lookup };
}

function highlight(text, matcher, vocab) {
  if (!matcher) return esc(text);
  let out = '';
  let last = 0;
  for (const m of text.matchAll(matcher.re)) {
    const v = matcher.lookup(m[0]);
    out += esc(text.slice(last, m.index));
    out += `<span class="v" data-v="${vocab.indexOf(v)}" role="button" tabindex="0">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

function viewStory(host, lesson) {
  const matcher = vocabMatcher(lesson);
  const vocab = lesson.vocabulary || [];
  const sentences = [];
  const body = lesson.story.map((block, bi) => {
    if (block.image) {
      return `<figure><img src="${esc(block.image)}" alt="${esc(block.caption || '')}" loading="lazy">
        ${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ''}</figure>`;
    }
    const spans = block.sentences.map((s) => {
      const i = sentences.push(s) - 1;
      return `<span class="s" data-s="${i}">${highlight(s.es, matcher, vocab)}</span>`;
    }).join(' ');
    return `<div class="para-wrap"><p class="para">${spans}</p><div class="tr" data-tr="${bi}"></div></div>`;
  }).join('');

  host.innerHTML = `
    <div class="toolbar">
      ${speech.supported ? `<button type="button" class="btn primary" id="play">🔊 Écouter l'histoire</button>
      <button type="button" class="btn" id="slow" aria-pressed="${speech.slow}">🐢 ${speech.slow ? 'Lent' : 'Normal'}</button>` : ''}
      <button type="button" class="btn" id="all-tr">🇫🇷 Tout traduire</button>
    </div>
    <p class="hint">Touche une phrase pour voir la traduction. Les <span class="v">mots en couleur</span> sont expliqués.</p>
    <div class="story">${body}</div>
    ${nextStepButton('vocab', 'Les mots')}`;

  const trLine = (i) => `<div class="tr-line">${speech.supported ? `<button type="button" class="speak" data-say="${i}" aria-label="Écouter">🔊</button>` : ''}<span>${esc(sentences[i].fr)}</span></div>`;

  const story = host.querySelector('.story');
  story.addEventListener('click', (e) => {
    const v = e.target.closest('.v');
    if (v) {
      e.stopPropagation();
      const item = vocab[Number(v.dataset.v)];
      showPopover(v, `<strong>${esc(item.es)}</strong> — ${esc(item.fr)}${item.note ? `<div class="ex">${esc(item.note)}</div>` : ''}`);
      return;
    }
    const say = e.target.closest('[data-say]');
    if (say) { speech.stop(); speech.say(sentences[Number(say.dataset.say)].es); return; }
    const s = e.target.closest('.s');
    if (!s) return;
    const wrap = s.closest('.para-wrap');
    const tr = wrap.querySelector('.tr');
    const wasActive = s.classList.contains('active');
    story.querySelectorAll('.s.active').forEach((x) => x.classList.remove('active'));
    story.querySelectorAll('.tr').forEach((x) => { x.innerHTML = ''; });
    if (!wasActive) {
      s.classList.add('active');
      tr.innerHTML = trLine(Number(s.dataset.s));
    }
  });
  story.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.v')) { e.preventDefault(); e.target.click(); }
  });

  let showingAll = false;
  host.querySelector('#all-tr').addEventListener('click', (e) => {
    showingAll = !showingAll;
    e.currentTarget.textContent = showingAll ? '🇫🇷 Masquer la traduction' : '🇫🇷 Tout traduire';
    story.querySelectorAll('.s.active').forEach((x) => x.classList.remove('active'));
    story.querySelectorAll('.para-wrap').forEach((wrap) => {
      const tr = wrap.querySelector('.tr');
      tr.innerHTML = showingAll
        ? [...wrap.querySelectorAll('.s')].map((s) => trLine(Number(s.dataset.s))).join('')
        : '';
    });
  });

  if (!speech.supported) return;
  const play = host.querySelector('#play');
  let playing = false;
  const stopPlaying = () => {
    playing = false;
    speech.stop();
    play.textContent = "🔊 Écouter l'histoire";
    story.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
  };
  const playFrom = (i) => {
    if (!playing || i >= sentences.length) { stopPlaying(); return; }
    const el = story.querySelector(`[data-s="${i}"]`);
    speech.say(sentences[i].es, {
      onstart: () => {
        story.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
        el.classList.add('speaking');
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
      onend: () => playFrom(i + 1),
    });
  };
  play.addEventListener('click', () => {
    if (playing) { stopPlaying(); return; }
    speech.stop();
    playing = true;
    play.textContent = '⏹ Arrêter';
    playFrom(0);
  });
  host.querySelector('#slow').addEventListener('click', (e) => {
    speech.slow = !speech.slow;
    e.currentTarget.setAttribute('aria-pressed', speech.slow);
    e.currentTarget.textContent = `🐢 ${speech.slow ? 'Lent' : 'Normal'}`;
  });
}

/* --- Vocabulary --- */

function viewVocab(host, lesson) {
  const items = (lesson.vocabulary || []).map((v, i) => `<li>
      <div class="row">
        <span>${speech.supported ? `<button type="button" class="speak" data-i="${i}" aria-label="Écouter">🔊</button>` : ''}<span class="es">${esc(v.es)}</span></span>
        <span class="fr">${esc(v.fr)}</span>
      </div>
      ${v.note ? `<div class="ex">${esc(v.note)}</div>` : ''}
    </li>`).join('');
  host.innerHTML = `<h2>Les mots de l'histoire</h2>
    <p class="hint">Ces mots sont ajoutés à « Mes mots » pour les réviser plus tard.</p>
    <ul class="vocab-list">${items}</ul>
    ${nextStepButton('grammar', 'La grammaire')}`;
  host.querySelector('.vocab-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) { speech.stop(); speech.say(lesson.vocabulary[Number(b.dataset.i)].es); }
  });
}

/* --- Grammar --- */

function viewGrammar(host, lesson) {
  const g = lesson.grammar;
  if (!g) { host.innerHTML = `<p class="empty">Pas de grammaire pour cette histoire.</p>${nextStepButton('exercises', 'Les exercices')}`; return; }
  const examples = (g.examples || []).map((ex) => `<li><div class="es">${esc(ex.es)}</div><div class="fr">${esc(ex.fr)}</div></li>`).join('');
  host.innerHTML = `<div class="grammar">
      <h2>${esc(g.title)}</h2>
      <div class="expl">${paragraphs(g.explanation)}</div>
      ${examples ? `<h3>Dans l'histoire</h3><ul class="examples">${examples}</ul>` : ''}
    </div>
    ${nextStepButton('exercises', 'Les exercices')}`;
}

/* --- Exercises --- */

const KIND_LABEL = {
  choice: 'Compréhension', truefalse: 'Vrai ou faux ?', fill: 'Complète la phrase', translate: 'Traduis en espagnol',
};

function viewExercises(host, lesson) {
  const exercises = lesson.exercises || [];
  const answers = current.answers;

  const render = () => {
    host.innerHTML = `<h2>Exercices</h2>
      ${exercises.map((ex, i) => renderExercise(ex, i, answers[i])).join('')}
      <div id="score"></div>`;
    updateScore();
  };

  const updateScore = () => {
    const final = Object.values(answers).filter((a) => !a.pending);
    const box = host.querySelector('#score');
    if (final.length < exercises.length) { box.innerHTML = ''; return; }
    const score = final.filter((a) => a.correct).length;
    const prev = store.data.done[lesson.id];
    if (!prev || prev.score <= score) {
      store.data.done[lesson.id] = { score, total: exercises.length, at: Date.now() };
      store.save();
    }
    const msg = score === exercises.length ? '¡Perfecto! 🎉' : score >= exercises.length * 0.7 ? '¡Muy bien! 👏' : '¡Bien! Sigue así 💪';
    box.innerHTML = `<div class="score"><strong>${score} / ${exercises.length}</strong>${msg}
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button type="button" class="btn" id="retry">↺ Recommencer</button>
        <button type="button" class="btn primary" data-goto="reply">💌 À toi d'écrire →</button>
      </div></div>`;
    box.querySelector('#retry').addEventListener('click', () => {
      for (const k of Object.keys(answers)) delete answers[k];
      render();
    });
    box.querySelector('[data-goto]').addEventListener('click', () => goToStep('reply'));
  };

  host.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ex]');
    if (!b || b.disabled) return;
    const i = Number(b.dataset.ex);
    const ex = exercises[i];
    if (answers[i] && !answers[i].pending) return;
    if (ex.type === 'translate') {
      // First tap reveals the answer (pending); then she grades herself.
      answers[i] = b.dataset.act === 'reveal' ? { pending: true } : { correct: b.dataset.act === 'yes' };
    } else {
      const choice = b.dataset.val;
      const correct = ex.type === 'truefalse' ? String(ex.answer) === choice
        : ex.type === 'choice' ? Number(choice) === ex.answer
          : choice === ex.answer;
      answers[i] = { choice, correct };
    }
    b.closest('.exercise').outerHTML = renderExercise(ex, i, answers[i]);
    updateScore();
  });

  render();
}

function feedback(ex, a) {
  if (!a || a.pending) return '';
  return `<div class="feedback ${a.correct ? 'ok' : 'ko'}">${a.correct ? '✓ ¡Correcto!' : '✗ Pas tout à fait.'}
    ${ex.explanation ? `<span class="why">${esc(ex.explanation)}</span>` : ''}</div>`;
}

function renderExercise(ex, i, a) {
  const head = `<div class="kind">${KIND_LABEL[ex.type] || ''}</div>`;
  const locked = a && !a.pending ? 'disabled' : '';
  let body = '';
  if (ex.type === 'choice') {
    body = `<p class="q"><span class="num">${i + 1}.</span>${esc(ex.question)}</p>
      <div class="options">${ex.options.map((o, oi) => {
        const cls = a ? (oi === ex.answer ? 'correct' : String(oi) === a.choice ? 'wrong' : '') : '';
        return `<button type="button" class="option ${cls}" data-ex="${i}" data-val="${oi}" ${locked}>${esc(o)}</button>`;
      }).join('')}</div>`;
  } else if (ex.type === 'truefalse') {
    body = `<p class="q"><span class="num">${i + 1}.</span>${esc(ex.statement)}</p>
      <div class="options inline">${[['true', 'Verdadero'], ['false', 'Falso']].map(([val, label]) => {
        const cls = a ? (val === String(ex.answer) ? 'correct' : val === a.choice ? 'wrong' : '') : '';
        return `<button type="button" class="option ${cls}" data-ex="${i}" data-val="${val}" ${locked}>${label}</button>`;
      }).join('')}</div>`;
  } else if (ex.type === 'fill') {
    const [before, after] = ex.sentence.split('___');
    const filled = a ? `<span class="blank">${esc(ex.answer)}</span>` : '<span class="blank">&nbsp;</span>';
    body = `<p class="q"><span class="num">${i + 1}.</span>${esc(before)}${filled}${esc(after ?? '')}</p>
      ${ex.hint ? `<p class="hint">${esc(ex.hint)}</p>` : ''}
      <div class="options inline">${ex.options.map((o) => {
        const cls = a ? (o === ex.answer ? 'correct' : o === a.choice ? 'wrong' : '') : '';
        return `<button type="button" class="option ${cls}" data-ex="${i}" data-val="${esc(o)}" ${locked}>${esc(o)}</button>`;
      }).join('')}</div>`;
  } else if (ex.type === 'translate') {
    body = `<p class="q"><span class="num">${i + 1}.</span>« ${esc(ex.fr)} »</p>
      <p class="hint">Dis-le à voix haute ou écris-le sur un papier, puis regarde la réponse.</p>
      ${a ? `<div class="reveal">${esc(ex.es)}</div>` : ''}
      <div class="options inline" style="margin-top:10px">
        ${!a ? `<button type="button" class="option" data-ex="${i}" data-act="reveal">👀 Voir la réponse</button>`
          : a.pending ? `<button type="button" class="option" data-ex="${i}" data-act="yes">👍 J'avais bon</button>
                 <button type="button" class="option" data-ex="${i}" data-act="no">🤏 Pas tout à fait</button>` : ''}
      </div>`;
  }
  return `<div class="exercise">${head}${body}${feedback(ex, a)}</div>`;
}

/* --- Reply --- */

function viewReply(host, lesson) {
  const r = lesson.reply || {};
  const draft = store.data.drafts[lesson.id] || '';
  const to = config.authorName || '';
  host.innerHTML = `<h2>💌 À toi d'écrire</h2>
    <div class="grammar">
      <p style="font-family:var(--serif);font-size:1.15rem;margin:0 0 6px">${esc(r.prompt || '¿Qué te ha parecido esta historia?')}</p>
      ${r.promptFr ? `<p class="hint" style="margin:0">${esc(r.promptFr)}</p>` : ''}
    </div>
    <p class="hint" style="margin-top:14px">Écris ta réponse en espagnol${to ? ` et envoie-la à ${esc(to)}` : ''}. Pas grave s'il y a des fautes !</p>
    <textarea id="draft" placeholder="Escribe aquí…" lang="es" spellcheck="true">${esc(draft)}</textarea>
    <div class="toolbar" style="margin-top:10px">
      <button type="button" class="btn primary" id="send">📤 Envoyer${to ? ` à ${esc(to)}` : ''}</button>
      <button type="button" class="btn" id="copy">📋 Copier</button>
    </div>
    <p class="hint" id="sent-msg" role="status"></p>`;
  const ta = host.querySelector('#draft');
  const msg = host.querySelector('#sent-msg');
  ta.addEventListener('input', () => { store.data.drafts[lesson.id] = ta.value; store.save(); });
  const text = () => `${lesson.title}\n\n${ta.value.trim()}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text()); msg.textContent = 'Copié ! Tu peux le coller dans un message.'; } catch (_) { ta.select(); msg.textContent = 'Sélectionne le texte et copie-le.'; }
  };
  host.querySelector('#copy').addEventListener('click', copy);
  host.querySelector('#send').addEventListener('click', async () => {
    if (!ta.value.trim()) { msg.textContent = "Écris d'abord quelque chose 🙂"; ta.focus(); return; }
    if (navigator.share) {
      try { await navigator.share({ text: text() }); msg.textContent = '¡Enviado! 💌'; } catch (_) { /* cancelled */ }
    } else {
      await copy();
    }
  });
}

/* --- Word review (flashcards across all lessons) --- */

async function renderWords() {
  setActiveNav('words');
  speech.stop();
  document.title = 'Mes mots · Cartas de viaje';
  app.innerHTML = '<p class="loading">Chargement…</p>';
  const opened = index.filter((l) => store.data.seen[l.id]);
  const lessons = await Promise.all(opened.map((l) => loadLesson(l.id).catch(() => null)));
  const cards = [];
  for (const lesson of lessons.filter(Boolean)) {
    for (const v of lesson.vocabulary || []) cards.push({ key: `${lesson.id}::${v.es}`, v, lesson });
  }
  if (!cards.length) {
    app.innerHTML = `<h1>Mes mots</h1><p class="empty">Ouvre une histoire : ses mots apparaîtront ici pour les réviser.</p>`;
    return;
  }
  // Simple Leitner boxes: 0 = new/à revoir, higher = known better. Lowest boxes come first.
  const box = (c) => store.data.cards[c.key] ?? 0;
  let deck = [];
  const shuffleDeck = () => {
    deck = cards.slice().sort((a, b) => box(a) - box(b) || Math.random() - 0.5);
  };
  shuffleDeck();
  let pos = 0;
  let flipped = false;

  const draw = () => {
    const known = cards.filter((c) => box(c) >= 2).length;
    if (pos >= deck.length) {
      app.innerHTML = `<h1>Mes mots</h1>
        <div class="score"><strong>${known} / ${cards.length}</strong>mots bien connus</div>
        <div class="flash-actions" style="margin-top:16px"><button type="button" class="btn primary" id="again">↺ Encore une fois</button></div>`;
      $('#again').addEventListener('click', () => { shuffleDeck(); pos = 0; flipped = false; draw(); });
      return;
    }
    const c = deck[pos];
    app.innerHTML = `<h1>Mes mots</h1>
      <div class="stats"><span>Carte ${pos + 1} / ${deck.length}</span><span>·</span><span>${known} bien connus</span></div>
      <div class="flash"><button type="button" class="flash-card" id="card">
        <div class="front">${esc(c.v.es)}</div>
        ${flipped ? `<div class="back-side"><div class="fr">${esc(c.v.fr)}</div>${c.v.note ? `<div class="ex">${esc(c.v.note)}</div>` : ''}</div>
          <div class="from-lesson">📍 ${esc(c.lesson.title)}</div>`
          : '<div class="hint" style="margin-top:14px">Touche pour voir la traduction</div>'}
      </button></div>
      <div class="flash-actions">
        ${speech.supported ? '<button type="button" class="btn" id="say">🔊 Écouter</button>' : ''}
        ${flipped ? `<button type="button" class="btn" id="again-card">🔁 À revoir</button>
          <button type="button" class="btn primary" id="knew">✓ Je savais</button>` : ''}
      </div>`;
    $('#card').addEventListener('click', () => { flipped = !flipped; draw(); });
    $('#say')?.addEventListener('click', () => { speech.stop(); speech.say(c.v.es); });
    const grade = (ok) => {
      store.data.cards[c.key] = ok ? Math.min(box(c) + 1, 5) : 0;
      store.save();
      pos += 1; flipped = false; draw();
    };
    $('#knew')?.addEventListener('click', () => grade(true));
    $('#again-card')?.addEventListener('click', () => grade(false));
  };
  draw();
}

/* ---------- Text size ---------- */

const SCALES = [1, 1.15, 1.3];
function applyScale() { document.documentElement.style.setProperty('--scale', store.data.scale || 1); }
$('#font-btn').addEventListener('click', () => {
  const i = SCALES.indexOf(store.data.scale);
  store.data.scale = SCALES[(i + 1) % SCALES.length];
  store.save();
  applyScale();
});
applyScale();

/* ---------- Router ---------- */

async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (parts[0] === 'lecon' && parts[1]) {
    const sameLesson = current && current.lesson.id === parts[1] && $('#step');
    if (sameLesson) {
      current.step = STEPS.some((s) => s.id === parts[2]) ? parts[2] : 'story';
      renderStep();
    } else {
      await renderLesson(parts[1], parts[2]);
      window.scrollTo(0, 0);
    }
    return;
  }
  current = null;
  window.scrollTo(0, 0);
  if (parts[0] === 'mots') await renderWords();
  else renderHome();
}

(async function start() {
  try { config = Object.assign(config, await getJSON('config.json')); } catch (_) { /* defaults */ }
  try {
    index = await getJSON('lessons/index.json');
  } catch (err) {
    app.innerHTML = '<p class="empty">Impossible de charger les histoires. Vérifie la connexion internet.</p>';
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}());
