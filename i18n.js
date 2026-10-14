'use strict';

// Interface language: French (for Maman) or English (for friends). Spanish content never changes;
// only the help language does: translations, explanations, buttons.
const I18N = (() => {
  const STRINGS = {
    fr: {
      'nav.home': 'Le voyage', 'nav.words': 'Mes mots', 'nav.quiz': 'Quiz', 'nav.write': 'Écrire à {name}', 'nav.writeNoName': 'Écrire',
      'top.size': 'Taille du texte', 'top.help': 'Aide', 'top.lang': 'Langue',
      'common.loading': 'Chargement…', 'common.close': 'Fermer', 'common.listen': 'Écouter', 'common.back': '← La carte',
      'common.copy': 'Copier', 'common.copied': 'Copié ! Tu peux le coller dans un message.', 'common.selectCopy': 'Sélectionne le texte et copie-le.',
      'common.writeFirst': "Écris d'abord quelque chose.", 'common.loadError': 'Impossible de charger les histoires. Vérifie la connexion internet.',
      'home.tagline': 'Le voyage{from}, une histoire à la fois.', 'home.from': ' de {name}', 'home.storyN': 'Histoire {n} : {title}',
      'home.stars': '{n} étoiles', 'home.progress': '{done} histoires terminées sur {total}', 'home.start': 'Départ', 'home.trip': 'Le voyage',
      'home.next': 'Prochaine étape', 'home.soon': 'Bientôt…',
      'sheet.done': 'Terminée : {score} / {total}', 'sheet.reread': 'Relire la leçon', 'sheet.start': 'Commencer la leçon',
      'help.eyebrow': 'Aide', 'help.title': "Besoin d'un coup de main ?", 'help.voice': 'Réécouter le message{from}', 'help.tour': 'Refaire la visite guidée',
      'step.story': 'Histoire', 'step.vocab': 'Mots', 'step.grammar': 'Grammaire', 'step.exercises': 'Exercices', 'step.reply': 'À toi',
      'lesson.notFound': 'Histoire introuvable.',
      'story.play': "Écouter l'histoire", 'story.stop': 'Arrêter', 'story.speed': 'Vitesse : {s}', 'story.slow': 'lente', 'story.normal': 'normale',
      'story.all': 'Tout traduire', 'story.hide': 'Masquer la traduction',
      'story.hint': 'Touche une phrase pour voir la traduction. Les <span class="v">mots soulignés</span> sont expliqués.',
      'next.vocab': 'Les mots', 'next.grammar': 'La grammaire', 'next.exercises': 'Les exercices',
      'vocab.title': "Les mots de l'histoire", 'vocab.hint': 'Ces mots rejoignent ton quiz et « Mes mots » pour les réviser plus tard.',
      'grammar.none': 'Pas de grammaire pour cette histoire.', 'grammar.inStory': "Dans l'histoire",
      'ex.title': 'Exercices', 'ex.choice': 'Compréhension', 'ex.truefalse': 'Vrai ou faux ?', 'ex.fill': 'Complète la phrase', 'ex.translate': 'Traduis en espagnol',
      'ex.correct': '✓ ¡Correcto!', 'ex.wrong': '✗ Pas tout à fait.', 'ex.retry': '↺ Recommencer', 'ex.toReply': "À toi d'écrire →",
      'ex.sayIt': 'Dis-le à voix haute ou écris-le sur un papier, puis regarde la réponse.', 'ex.reveal': 'Voir la réponse',
      'ex.gotIt': "J'avais bon", 'ex.notQuite': 'Pas tout à fait',
      'reply.title': "À toi d'écrire", 'reply.hint': "Écris ta réponse en espagnol{to}. Pas grave s'il y a des fautes !", 'reply.to': ' et envoie-la à {name}',
      'reply.send': 'Envoyer', 'reply.sendTo': 'Envoyer à {name}', 'reply.sent': '¡Enviado!',
      'write.title': 'Écrire à {name}', 'write.titleNoName': 'Écrire',
      'write.lede': "Raconte-moi ce que tu veux : ta journée, une question, un souvenir, une chanson… En espagnol ou en français, comme tu préfères. Les fautes, ce n'est pas grave !",
      'write.label': 'Ta lettre', 'write.copy': 'Copier le texte', 'write.copied': 'Copié ! Colle-le dans un message pour moi.',
      'write.thanks': '¡Enviado! Merci pour ta lettre.', 'write.sentList': 'Mes lettres envoyées',
      'words.title': 'Mes mots', 'words.empty': 'Ouvre une histoire : ses mots apparaîtront ici pour les réviser.',
      'words.known': 'mots bien connus', 'words.again': '↺ Encore une fois', 'words.card': 'Carte {n} / {total}', 'words.knownN': '{n} bien connus',
      'words.tap': 'Touche pour voir la traduction', 'words.review': 'À revoir', 'words.knew': '✓ Je savais',
      'quiz.title': 'Quiz', 'quiz.empty': 'Ouvre une histoire : ses mots apparaîtront ici dans ton quiz.',
      'quiz.lede': 'Environ 3 minutes. Les mots reviennent juste avant que tu les oublies, et les plus difficiles reviennent plus souvent.',
      'quiz.due': 'à revoir', 'quiz.new': 'nouveaux', 'quiz.mastered': 'bien ancrés',
      'quiz.streak': '{n} jour(s) de suite', 'quiz.start': 'Commencer',
      'quiz.howTitle': 'Pourquoi ça marche',
      'quiz.how': "Chercher un mot dans sa mémoire le fixe beaucoup mieux que le relire. Chaque mot revient après 1, 3, 7, 16 puis 35 jours, juste avant l'oubli. Les questions deviennent plus difficiles quand tu progresses : reconnaître, puis placer le mot dans une phrase de l'histoire, puis l'écrire de mémoire. Un mot raté revient quelques questions plus tard. Les mots de toutes les histoires sont mélangés. Et pas de chrono : se tromper fait partie de l'apprentissage.",
      'quiz.whatMeans': 'Que veut dire ce mot ?', 'quiz.listenPick': 'Écoute, puis choisis le mot', 'quiz.howSay': 'Comment dit-on en espagnol…',
      'quiz.fillStory': "Complète la phrase de l'histoire", 'quiz.type': 'Écris le mot en espagnol', 'quiz.typeLabel': 'Ta réponse en espagnol',
      'quiz.check': 'Vérifier', 'quiz.dontKnow': 'Je ne sais pas encore',
      'quiz.right': '¡Correcto!', 'quiz.accent': '¡Casi! Juste un accent à revoir.', 'quiz.wrong': 'Pas encore. Ce mot va revenir.',
      'quiz.continue': 'Continuer', 'quiz.finish': 'Terminer', 'quiz.again': 'Encore un quiz',
      'quiz.end.great': '¡Excelente!', 'quiz.end.good': '¡Muy bien!', 'quiz.end.keep': '¡Sigue así!',
      'quiz.end.first': 'du premier coup', 'quiz.end.missed': '{n} mot(s) à retravailler : ils reviendront demain.',
      'quiz.end.tomorrow': 'Demain : {n} mot(s) t\'attendent.', 'quiz.end.later': 'Rien de prévu demain : reviens dans quelques jours.',
    },
    en: {
      'nav.home': 'Journey', 'nav.words': 'My words', 'nav.quiz': 'Quiz', 'nav.write': 'Write to {name}', 'nav.writeNoName': 'Write',
      'top.size': 'Text size', 'top.help': 'Help', 'top.lang': 'Language',
      'common.loading': 'Loading…', 'common.close': 'Close', 'common.listen': 'Listen', 'common.back': '← The map',
      'common.copy': 'Copy', 'common.copied': 'Copied! You can paste it into a message.', 'common.selectCopy': 'Select the text and copy it.',
      'common.writeFirst': 'Write something first.', 'common.loadError': "Couldn't load the stories. Check the internet connection.",
      'home.tagline': '{from}journey, one story at a time.', 'home.from': "{name}'s ", 'home.storyN': 'Story {n}: {title}',
      'home.stars': '{n} stars', 'home.progress': '{done} of {total} stories finished', 'home.start': 'Start', 'home.trip': 'The journey',
      'home.next': 'Next stop', 'home.soon': 'Coming soon…',
      'sheet.done': 'Finished: {score} / {total}', 'sheet.reread': 'Read again', 'sheet.start': 'Start the lesson',
      'help.eyebrow': 'Help', 'help.title': 'Need a hand?', 'help.voice': 'Play the message{from} again', 'help.tour': 'Take the tour again',
      'step.story': 'Story', 'step.vocab': 'Words', 'step.grammar': 'Grammar', 'step.exercises': 'Exercises', 'step.reply': 'Your turn',
      'lesson.notFound': 'Story not found.',
      'story.play': 'Listen to the story', 'story.stop': 'Stop', 'story.speed': 'Speed: {s}', 'story.slow': 'slow', 'story.normal': 'normal',
      'story.all': 'Translate everything', 'story.hide': 'Hide translation',
      'story.hint': 'Tap a sentence to see its translation. <span class="v">Underlined words</span> are explained.',
      'next.vocab': 'The words', 'next.grammar': 'The grammar', 'next.exercises': 'The exercises',
      'vocab.title': 'Words from the story', 'vocab.hint': 'These words join your quiz and “My words” so you can review them later.',
      'grammar.none': 'No grammar for this story.', 'grammar.inStory': 'In the story',
      'ex.title': 'Exercises', 'ex.choice': 'Comprehension', 'ex.truefalse': 'True or false?', 'ex.fill': 'Fill the gap', 'ex.translate': 'Translate into Spanish',
      'ex.correct': '✓ ¡Correcto!', 'ex.wrong': '✗ Not quite.', 'ex.retry': '↺ Start again', 'ex.toReply': 'Your turn to write →',
      'ex.sayIt': 'Say it out loud or write it on paper, then check the answer.', 'ex.reveal': 'Show the answer',
      'ex.gotIt': 'I got it right', 'ex.notQuite': 'Not quite',
      'reply.title': 'Your turn to write', 'reply.hint': "Write your answer in Spanish{to}. Mistakes don't matter!", 'reply.to': ' and send it to {name}',
      'reply.send': 'Send', 'reply.sendTo': 'Send to {name}', 'reply.sent': '¡Enviado!',
      'write.title': 'Write to {name}', 'write.titleNoName': 'Write',
      'write.lede': 'Tell me anything: your day, a question, a memory, a song… In Spanish or English, as you like. Mistakes don’t matter!',
      'write.label': 'Your letter', 'write.copy': 'Copy the text', 'write.copied': 'Copied! Paste it into a message to me.',
      'write.thanks': '¡Enviado! Thank you for your letter.', 'write.sentList': 'Letters I sent',
      'words.title': 'My words', 'words.empty': 'Open a story: its words will appear here for review.',
      'words.known': 'words known well', 'words.again': '↺ Once more', 'words.card': 'Card {n} / {total}', 'words.knownN': '{n} known well',
      'words.tap': 'Tap to see the translation', 'words.review': 'Review again', 'words.knew': '✓ I knew it',
      'quiz.title': 'Quiz', 'quiz.empty': 'Open a story: its words will appear here in your quiz.',
      'quiz.lede': 'About 3 minutes. Words come back just before you would forget them, and the hard ones come back more often.',
      'quiz.due': 'to review', 'quiz.new': 'new', 'quiz.mastered': 'well learned',
      'quiz.streak': '{n} day(s) in a row', 'quiz.start': 'Start',
      'quiz.howTitle': 'Why it works',
      'quiz.how': "Pulling a word out of memory fixes it far better than rereading it. Each word comes back after 1, 3, 7, 16 and then 35 days, just before you'd forget it. Questions get harder as you improve: recognise it, then place it in a sentence from the story, then write it from memory. A missed word returns a few questions later. Words from all the stories are mixed together. And there's no timer: mistakes are part of learning.",
      'quiz.whatMeans': 'What does this word mean?', 'quiz.listenPick': 'Listen, then pick the word', 'quiz.howSay': 'How do you say in Spanish…',
      'quiz.fillStory': 'Complete the sentence from the story', 'quiz.type': 'Type the word in Spanish', 'quiz.typeLabel': 'Your answer in Spanish',
      'quiz.check': 'Check', 'quiz.dontKnow': "I don't know yet",
      'quiz.right': '¡Correcto!', 'quiz.accent': '¡Casi! Just an accent to fix.', 'quiz.wrong': "Not yet. This word will come back.",
      'quiz.continue': 'Continue', 'quiz.finish': 'Finish', 'quiz.again': 'Another quiz',
      'quiz.end.great': '¡Excelente!', 'quiz.end.good': '¡Muy bien!', 'quiz.end.keep': '¡Sigue así!',
      'quiz.end.first': 'right first time', 'quiz.end.missed': '{n} word(s) to work on: they will come back tomorrow.',
      'quiz.end.tomorrow': 'Tomorrow: {n} word(s) are waiting for you.', 'quiz.end.later': 'Nothing due tomorrow: come back in a few days.',
    },
  };

  const MONTHS = {
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  };

  let lang = 'fr';
  const setLang = (l) => { lang = l === 'en' ? 'en' : 'fr'; document.documentElement.lang = lang; };

  // t('key', { name: 'Julie' }) → translated string with {placeholders} filled in.
  const t = (key, vars = {}) => (STRINGS[lang][key] ?? STRINGS.fr[key] ?? key)
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

  // Lesson content is written with French fields; the English versions sit next to them.
  // 'fr' → 'en', 'titleFr' → 'titleEn', 'summaryFr' → 'summaryEn', anything else → field + 'En'.
  const enKey = (field) => (field === 'fr' ? 'en' : field.endsWith('Fr') ? `${field.slice(0, -2)}En` : `${field}En`);
  const tx = (obj, field) => {
    if (!obj) return '';
    if (lang === 'en') {
      const v = obj[enKey(field)];
      if (v != null && v !== '') return v;
    }
    return obj[field] ?? '';
  };

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const month = MONTHS[lang][m - 1];
    if (!m) return String(y);
    if (lang === 'en') return d ? `${d} ${month} ${y}` : `${month} ${y}`;
    return d ? `${d} ${month} ${y}` : `${month} ${y}`;
  }

  return { t, tx, setLang, formatDate, get lang() { return lang; } };
})();
const { t, tx } = I18N;
