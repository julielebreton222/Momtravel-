'use strict';

// The quiz is built on what learning research says works best for vocabulary:
// - Retrieval practice: recalling a word strengthens memory far more than rereading it.
// - Spaced repetition: each word comes back just before it would be forgotten (1, 3, 7, 16, 35 days).
// - Successive relearning: a missed word returns a few questions later, until it is recalled once.
// - Desirable difficulty: recognise → place in a real sentence from the story → produce from memory.
// - Interleaving: words from different stories are mixed rather than studied in blocks.
// - Short, low-pressure sessions (about 3 minutes, no timer) and immediate, kind feedback.
const Quiz = (() => {
  const DAY = 24 * 60 * 60 * 1000;
  const INTERVALS = [0, 1, 3, 7, 16, 35]; // days before the next review, by box
  const SESSION = 10;
  const MAX_NEW = 6;

  const state = () => { if (!store.data.srs) store.data.srs = {}; return store.data.srs; };
  const keyOf = (lesson, v) => `${lesson.id}::${v.es}`;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  // Comparing a typed answer: ignore case, punctuation and leading articles; accents count, but gently.
  const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const clean = (s) => String(s).toLowerCase().replace(/[¡!¿?.,;:«»"()]/g, ' ')
    .replace(/^\s*(el|la|los|las|un|una)\s+/, '').replace(/\s+/g, ' ').trim();
  const variants = (item) => {
    const forms = [...item.v.es.split(','), ...[].concat(item.v.match || [])];
    return [...new Set(forms.map(clean).filter(Boolean))];
  };
  function check(answer, item) {
    const a = clean(answer);
    if (!a) return 'wrong';
    const vs = variants(item);
    if (vs.includes(a)) return 'right';
    if (vs.some((v) => plain(v) === plain(a))) return 'accent';
    return 'wrong';
  }

  // A sentence from the story that contains the word, with the word blanked out.
  function contextFor(lesson, v) {
    const forms = [].concat(v.match || v.es.replace(/^(el|la|los|las|un|una)\s+/i, '')).sort((a, b) => b.length - a.length);
    for (const block of lesson.story || []) {
      for (const s of block.sentences || []) {
        for (const f of forms) {
          const re = new RegExp(`(^|[^\\p{L}])(${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'iu');
          const m = s.es.match(re);
          if (m && s.es.length < 160) {
            const start = m.index + m[1].length;
            return { before: s.es.slice(0, start), form: m[2], after: s.es.slice(start + m[2].length), sentence: s };
          }
        }
      }
    }
    return null;
  }

  async function pool() {
    const opened = index.filter((l) => store.data.seen[l.id]);
    const lessons = (await Promise.all(opened.map((l) => loadLesson(l.id).catch(() => null)))).filter(Boolean);
    const items = [];
    for (const lesson of lessons) {
      for (const v of lesson.vocabulary || []) items.push({ key: keyOf(lesson, v), v, lesson, ctx: contextFor(lesson, v) });
    }
    return items;
  }

  function buildSession(items) {
    const now = Date.now();
    const s = state();
    const due = items.filter((it) => s[it.key] && s[it.key].due <= now).sort((a, b) => s[a.key].due - s[b.key].due);
    const fresh = shuffle(items.filter((it) => !s[it.key])).slice(0, MAX_NEW);
    let picked = [...due.slice(0, SESSION - Math.min(fresh.length, 2)), ...fresh].slice(0, SESSION);
    if (picked.length < 6) {
      // Nothing much due: practise ahead with the least-known words.
      const extra = items.filter((it) => !picked.includes(it))
        .sort((a, b) => (s[a.key]?.box ?? 0) - (s[b.key]?.box ?? 0) || (s[a.key]?.due ?? 0) - (s[b.key]?.due ?? 0));
      picked = [...picked, ...extra].slice(0, Math.min(SESSION, Math.max(6, picked.length)));
    }
    // Interleave: avoid two words from the same story in a row when possible.
    const out = [];
    let rest = shuffle(picked);
    while (rest.length) {
      const i = rest.findIndex((it) => !out.length || it.lesson.id !== out[out.length - 1].lesson.id);
      out.push(...rest.splice(i < 0 ? 0 : i, 1));
    }
    return out;
  }

  // Question type grows harder as the word becomes familiar.
  function kindFor(item) {
    const box = state()[item.key]?.box ?? 0;
    if (box <= 0) return 'recognise';
    if (box === 1) return speech.supported ? 'listen' : 'recall';
    if (box === 2) return item.ctx ? 'context' : 'recall';
    return 'produce';
  }

  function options(item, all, field) {
    const right = field === 'es' ? item.v.es : tx(item.v, 'fr');
    const others = shuffle(all.filter((o) => o.key !== item.key)).map((o) => (field === 'es' ? o.v.es : tx(o.v, 'fr')))
      .filter((x, i, arr) => x !== right && arr.indexOf(x) === i).slice(0, 3);
    return shuffle([right, ...others]);
  }

  function markDay() {
    const today = new Date().toISOString().slice(0, 10);
    const days = store.data.quizDays || [];
    if (days[days.length - 1] !== today) days.push(today);
    store.data.quizDays = days.slice(-60);
  }
  function streak() {
    const days = new Set(store.data.quizDays || []);
    let n = 0;
    const d = new Date();
    if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function record(item, firstTryRight) {
    const s = state();
    const prev = s[item.key] || { box: 0, due: 0, reps: 0, lapses: 0 };
    const box = firstTryRight ? Math.min(prev.box + 1, INTERVALS.length - 1) : Math.max(0, prev.box - 2);
    const days = firstTryRight ? INTERVALS[box] : 1;
    s[item.key] = { box, due: Date.now() + Math.max(days, 0.5) * DAY, reps: prev.reps + 1, lapses: prev.lapses + (firstTryRight ? 0 : 1) };
    store.save();
  }

  /* ---------- Screens ---------- */

  async function render() {
    setActiveNav('quiz');
    speech.stop();
    document.title = `${t('quiz.title')} · Cartas de viaje`;
    app.innerHTML = `<p class="loading">${t('common.loading')}</p>`;
    const items = await pool();
    if (!items.length) {
      app.innerHTML = `<div class="page"><h1>${t('quiz.title')}</h1><p class="empty">${t('quiz.empty')}</p></div>`;
      return;
    }
    const s = state();
    const now = Date.now();
    const due = items.filter((it) => s[it.key] && s[it.key].due <= now).length;
    const fresh = items.filter((it) => !s[it.key]).length;
    const mastered = items.filter((it) => (s[it.key]?.box ?? 0) >= 4).length;
    const st = streak();
    app.innerHTML = `<div class="page quiz-home">
      <h1>${t('quiz.title')}</h1>
      <p class="lede">${t('quiz.lede')}</p>
      <div class="quiz-stats">
        <div><strong>${due}</strong><span>${t('quiz.due')}</span></div>
        <div><strong>${fresh}</strong><span>${t('quiz.new')}</span></div>
        <div><strong>${mastered}</strong><span>${t('quiz.mastered')}</span></div>
      </div>
      ${st ? `<p class="streak">${t('quiz.streak', { n: st })}</p>` : ''}
      <button type="button" class="btn primary big" id="quiz-start">${t('quiz.start')}</button>
      <details class="how">
        <summary>${t('quiz.howTitle')}</summary>
        <p>${t('quiz.how')}</p>
      </details>
    </div>`;
    $('#quiz-start').addEventListener('click', () => run(items));
  }

  function run(all) {
    const queue = buildSession(all).map((item) => ({ item, kind: kindFor(item), missed: false }));
    const total = queue.length;
    let doneCount = 0;
    let firstTry = 0;
    const missedKeys = new Set();

    const next = () => {
      if (!queue.length) { finish(); return; }
      window.scrollTo(0, 0);
      ask(queue[0]);
    };

    function ask(q) {
      const { item } = q;
      const meaning = tx(item.v, 'fr');
      const progress = `<div class="quiz-bar"><span style="width:${(100 * doneCount) / total}%"></span></div>`;
      const sayBtn = speech.supported ? `<button type="button" class="speak big-speak" id="q-say" aria-label="${t('common.listen')}">${SPEAK}</button>` : '';
      let prompt = '';
      let answers = '';
      if (q.kind === 'recognise') {
        prompt = `<p class="q-label">${t('quiz.whatMeans')}</p><p class="q-word">${esc(item.v.es)} ${sayBtn}</p>`;
        answers = options(item, all, 'fr').map((o) => `<button type="button" class="option" data-a="${esc(o)}">${esc(o)}</button>`).join('');
      } else if (q.kind === 'listen') {
        prompt = `<p class="q-label">${t('quiz.listenPick')}</p><p class="q-word">${sayBtn}</p>`;
        answers = options(item, all, 'es').map((o) => `<button type="button" class="option" data-a="${esc(o)}">${esc(o)}</button>`).join('');
      } else if (q.kind === 'recall') {
        prompt = `<p class="q-label">${t('quiz.howSay')}</p><p class="q-word native">${esc(meaning)}</p>`;
        answers = options(item, all, 'es').map((o) => `<button type="button" class="option" data-a="${esc(o)}">${esc(o)}</button>`).join('');
      } else if (q.kind === 'context') {
        const c = item.ctx;
        prompt = `<p class="q-label">${t('quiz.fillStory')}</p>
          <p class="q-sentence">${esc(c.before)}<span class="blank">&nbsp;</span>${esc(c.after)}</p>
          <p class="hint">${esc(meaning)}</p>`;
        const forms = shuffle([c.form, ...shuffle(all.filter((o) => o.key !== item.key && o.ctx)).map((o) => o.ctx.form)
          .filter((x, i, arr) => x.toLowerCase() !== c.form.toLowerCase() && arr.indexOf(x) === i).slice(0, 3)]);
        answers = forms.map((o) => `<button type="button" class="option" data-a="${esc(o)}">${esc(o)}</button>`).join('');
      } else {
        prompt = `<p class="q-label">${t('quiz.type')}</p><p class="q-word native">${esc(meaning)}</p>
          ${item.ctx ? `<p class="q-sentence small">${esc(item.ctx.before)}<span class="blank">&nbsp;</span>${esc(item.ctx.after)}</p>` : ''}`;
        answers = `<form id="q-form" class="q-type" autocomplete="off">
            <input id="q-input" type="text" lang="es" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${t('quiz.typeLabel')}">
            <button type="submit" class="btn primary">${t('quiz.check')}</button>
          </form>
          <button type="button" class="link-btn" id="q-idk">${t('quiz.dontKnow')}</button>`;
      }
      app.innerHTML = `<div class="page quiz">
        ${progress}
        <div class="q-card">${prompt}</div>
        <div class="options q-options">${answers}</div>
        <div id="q-feedback" role="status"></div>
      </div>`;
      const say = () => { speech.stop(); speech.say(item.v.es.split(',')[0]); };
      $('#q-say')?.addEventListener('click', say);
      if (q.kind === 'listen') setTimeout(say, 250);

      const settle = (result, chosen) => {
        const ok = result !== 'wrong';
        app.querySelectorAll('.q-options .option').forEach((b) => {
          b.disabled = true;
          const a = b.dataset.a;
          const right = q.kind === 'recognise' ? a === meaning : q.kind === 'context' ? a === item.ctx.form : a === item.v.es;
          if (right) b.classList.add('correct');
          else if (a === chosen) b.classList.add('wrong');
        });
        const input = $('#q-input');
        if (input) input.disabled = true;
        $('#q-idk')?.remove();
        if (!q.missed) {
          record(item, ok);
          if (ok) firstTry++;
        }
        if (ok) {
          queue.shift();
          doneCount++;
        } else {
          // Successive relearning: it comes back a few questions later, as an easier question.
          q.missed = true;
          missedKeys.add(item.key);
          queue.shift();
          queue.splice(Math.min(3, queue.length), 0, { item, kind: 'recall', missed: true });
        }
        const ctx = item.ctx ? `<p class="fb-ctx">«&nbsp;${esc(item.ctx.sentence.es)}&nbsp;»<br><span>${esc(tx(item.ctx.sentence, 'fr'))}</span></p>` : '';
        const head = result === 'right' ? t('quiz.right') : result === 'accent' ? t('quiz.accent') : t('quiz.wrong');
        $('#q-feedback').innerHTML = `<div class="fb ${ok ? 'ok' : 'ko'}">
            <p class="fb-head">${head}</p>
            <p class="fb-word"><strong>${esc(item.v.es)}</strong> — ${esc(meaning)}</p>
            ${ctx}
            <button type="button" class="btn primary" id="q-next">${queue.length ? t('quiz.continue') : t('quiz.finish')}</button>
          </div>`;
        if (!ok || result === 'accent') say();
        $('#q-next').addEventListener('click', next);
        $('#q-next').focus({ preventScroll: true });
        $('#q-feedback .fb').scrollIntoView({ block: 'end', behavior: 'smooth' });
      };

      app.querySelectorAll('.q-options .option').forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.a;
        const right = q.kind === 'recognise' ? a === meaning : q.kind === 'context' ? a === item.ctx.form : a === item.v.es;
        settle(right ? 'right' : 'wrong', a);
      }));
      $('#q-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = $('#q-input').value;
        if (!val.trim()) { $('#q-input').focus(); return; }
        settle(check(val, item), val);
      });
      $('#q-idk')?.addEventListener('click', () => settle('wrong', ''));
      $('#q-input')?.focus();
    }

    function finish() {
      markDay();
      store.save();
      const s = state();
      const now = Date.now();
      const tomorrow = Object.values(s).filter((x) => x.due <= now + DAY).length;
      const pct = total ? firstTry / total : 0;
      const msg = pct >= 0.9 ? t('quiz.end.great') : pct >= 0.6 ? t('quiz.end.good') : t('quiz.end.keep');
      app.innerHTML = `<div class="page quiz-end">
        <h1>${msg}</h1>
        <div class="score"><strong>${firstTry} / ${total}</strong>${t('quiz.end.first')}</div>
        ${missedKeys.size ? `<p class="hint">${t('quiz.end.missed', { n: missedKeys.size })}</p>` : ''}
        <p class="streak">${t('quiz.streak', { n: streak() })}</p>
        <p class="hint">${tomorrow ? t('quiz.end.tomorrow', { n: tomorrow }) : t('quiz.end.later')}</p>
        <div class="toolbar center">
          <button type="button" class="btn primary" id="q-again">${t('quiz.again')}</button>
          <a class="btn" href="#/">${t('nav.home')}</a>
        </div>
      </div>`;
      $('#q-again').addEventListener('click', () => run(all));
    }

    next();
  }

  return { render };
})();
