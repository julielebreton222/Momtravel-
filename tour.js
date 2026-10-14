'use strict';

// First visit: Julie's voice message, then a short guided tour of the app.
// Both can be replayed from the "?" button.
const Welcome = (() => {
  let config = {};
  let onDone = () => {};

  const el = (html) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  };

  const TEXT = {
    fr: {
      eyebrow: (n) => `Pour toi, ${n ? n.toLowerCase() : ''}`, title: (f) => `Un message de ${f || 'moi'}`,
      listen: 'Écouter le message', pause: 'Mettre en pause', tap: 'Touche le bouton pour écouter',
      soundFail: "Le son n'a pas pu démarrer. Vérifie que le téléphone n'est pas en silencieux.",
      replay: 'Tu peux le réécouter quand tu veux avec le bouton « ? » en haut.',
      discover: "Découvrir l'app →", close: 'Fermer', skip: 'Passer', next: 'Suivant', go: "C'est parti !",
      steps: [
        'Voici ton voyage. Chaque étape sur le chemin est une histoire que je t\'envoie, depuis là où je suis.',
        'Touche une étape pour l\'ouvrir. Celle qui flotte et qui brille, c\'est la prochaine à faire.',
        'Chaque timbre vert, c\'est une histoire terminée. Tu peux refaire les leçons autant que tu veux.',
        'Ici, tous les mots des histoires, en petites cartes à retourner pour les réviser.',
        'Le quiz : quelques minutes par jour pour que les mots restent dans ta tête. Il revient sur ceux qui sont difficiles.',
        'Et ici, tu peux m\'écrire ce que tu veux, quand tu veux. En espagnol ou en français !',
        'Ici, tu changes la langue des explications : français ou anglais. Les histoires restent en espagnol.',
        'Ce bouton agrandit le texte, si tu veux lire plus confortablement.',
        'Et ici, tu peux réécouter mon message ou refaire cette visite. ¡Buen viaje, mamá!',
      ],
    },
    en: {
      eyebrow: () => 'For you', title: (f) => `A message from ${f || 'me'}`,
      listen: 'Play the message', pause: 'Pause', tap: 'Tap the button to listen',
      soundFail: "The sound couldn't start. Check that the phone isn't on silent.",
      replay: 'You can play it again any time with the “?” button at the top.',
      discover: 'Explore the app →', close: 'Close', skip: 'Skip', next: 'Next', go: "Let's go!",
      steps: [
        'This is the journey. Each stop on the path is a story from wherever I am.',
        'Tap a stop to open it. The one that floats and glows is the next one to do.',
        'Each green stamp is a finished story. You can redo the lessons as often as you like.',
        'Here are all the words from the stories, as little cards to flip and review.',
        'The quiz: a few minutes a day so the words stick. It comes back to the hard ones.',
        'And here you can write to me about anything, any time. In Spanish or English!',
        'Switch the help language here: French or English. The stories stay in Spanish.',
        'This button makes the text bigger, for more comfortable reading.',
        'And here you can play my message again or redo this tour. ¡Buen viaje!',
      ],
    },
  };
  const T = () => TEXT[I18N.lang] || TEXT.fr;

  /* ---------- Voice message ---------- */

  function intro({ thenTour = true } = {}) {
    const from = config.authorName || '';
    const overlay = el(`<div class="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div class="intro-card">
        <svg class="envelope" viewBox="0 0 120 84" aria-hidden="true">
          <rect x="4" y="10" width="112" height="70" rx="4" fill="#fbf6ea"/>
          <path d="M4 14 L60 52 L116 14" fill="none" stroke="#d8cbb0" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="98" cy="22" r="11" fill="#e9785a"/><path d="M98 27.5 C 92.5 24, 92 18.5, 95.5 17.5 C 97 17.1, 98 18.2, 98 19.2 C 98 18.2, 99 17.1, 100.5 17.5 C 104 18.5, 103.5 24, 98 27.5 Z" fill="#fbf6ea"/>
        </svg>
        <p class="intro-eyebrow">${T().eyebrow(config.learnerName)}</p>
        <h1 id="intro-title">${T().title(from)}</h1>
        <button type="button" class="play" id="intro-play" aria-label="${T().listen}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-play" d="M8 5.5v13l11-6.5z"/><g class="i-pause"><rect x="7" y="5" width="3.6" height="14" rx="1"/><rect x="13.4" y="5" width="3.6" height="14" rx="1"/></g></svg>
        </button>
        <div class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="track"><span id="intro-progress"></span></div>
        <p class="intro-hint" id="intro-hint">${T().tap}</p>
        <div class="intro-actions">
          <button type="button" class="btn primary" id="intro-next">${thenTour ? T().discover : T().close}</button>
        </div>
      </div>
    </div>`);
    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');

    const audio = new Audio('media/intro-julie.mp3');
    audio.preload = 'auto';
    const play = overlay.querySelector('#intro-play');
    const hint = overlay.querySelector('#intro-hint');
    const bar = overlay.querySelector('#intro-progress');
    const setPlaying = (on) => {
      overlay.classList.toggle('playing', on);
      play.setAttribute('aria-label', on ? T().pause : T().listen);
    };
    play.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => { hint.textContent = ''; }).catch(() => { hint.textContent = T().soundFail; });
      } else {
        audio.pause();
      }
    });
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) bar.style.width = `${(100 * audio.currentTime) / audio.duration}%`;
    });
    audio.addEventListener('ended', () => {
      setPlaying(false);
      bar.style.width = '100%';
      hint.textContent = T().replay;
      overlay.querySelector('#intro-next').focus();
    });
    overlay.querySelector('#intro-next').addEventListener('click', () => {
      audio.pause();
      overlay.remove();
      document.body.classList.remove('no-scroll');
      if (thenTour) tour();
      else onDone();
    });
    play.focus();
  }

  /* ---------- Guided tour ---------- */

  const TARGETS = [
    { target: '.scene', place: 'inside' },
    { target: '.stop.current, .stop.lesson' },
    { target: '.stamps' },
    { target: '[data-nav="words"]' },
    { target: '[data-nav="quiz"]' },
    { target: '[data-nav="write"]' },
    { target: '#lang-switch' },
    { target: '#font-btn' },
    { target: '#help-btn' },
  ];
  const STEPS = () => TARGETS.map((s, i) => ({ ...s, text: T().steps[i] }));

  function tour() {
    if (location.hash && location.hash !== '#/') location.hash = '#/';
    const steps = STEPS();
    let i = 0;
    const spot = el('<div class="tour-spot" aria-hidden="true"></div>');
    const card = el(`<div class="tour-card" role="dialog" aria-live="polite">
      <p class="tour-text"></p>
      <div class="tour-row">
        <span class="tour-count"></span>
        <button type="button" class="tour-skip">${T().skip}</button>
        <button type="button" class="btn primary tour-next">${T().next}</button>
      </div></div>`);
    document.body.append(spot, card);

    const finish = () => {
      spot.remove();
      card.remove();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place);
      onDone();
    };
    function place() {
      const s = steps[i];
      const target = document.querySelector(s.target);
      if (!target) return;
      let r = target.getBoundingClientRect();
      if (s.place === 'inside') {
        // The map is taller than the screen: highlight the part that is visible.
        r = { left: r.left, right: r.right, width: r.width, top: Math.max(r.top, 60), bottom: Math.min(r.bottom, window.innerHeight * 0.55) };
        r.height = r.bottom - r.top;
      }
      const pad = 8;
      Object.assign(spot.style, {
        left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
      });
      const ch = card.offsetHeight;
      const below = r.bottom + pad + 14;
      const top = below + ch < window.innerHeight - 8 ? below : Math.max(8, r.top - pad - 14 - ch);
      card.style.top = `${top}px`;
    }
    function show() {
      const s = steps[i];
      const target = document.querySelector(s.target);
      if (!target) { next(); return; }
      card.querySelector('.tour-text').textContent = s.text;
      card.querySelector('.tour-count').textContent = `${i + 1} / ${steps.length}`;
      card.querySelector('.tour-next').textContent = i === steps.length - 1 ? T().go : T().next;
      if (s.place !== 'inside' && !target.closest('.topbar, .tabbar')) target.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (s.place === 'inside') window.scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(place);
    }
    function next() {
      i += 1;
      if (i >= steps.length) finish();
      else show();
    }
    card.querySelector('.tour-next').addEventListener('click', next);
    card.querySelector('.tour-skip').addEventListener('click', finish);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    // Let the home map render first.
    setTimeout(show, 120);
    card.querySelector('.tour-next').focus();
  }

  function init(cfg, done) {
    config = cfg;
    onDone = done;
  }

  return { init, intro, tour };
})();
