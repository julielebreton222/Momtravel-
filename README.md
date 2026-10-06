# Cartas de viaje ✉️

Travel stories become Spanish lessons for Maman. The interface is in French, and the lessons are written at an intermediate (B1) level.

Each lesson has five steps:

1. **📖 Histoire**: the story in Spanish, read aloud by the device's Spanish voice (with a slow mode).
   Tap a sentence to see its French translation, or tap a highlighted word to see what it means.
2. **🔤 Mots**: the key vocabulary, with notes on false friends and irregular forms.
3. **✏️ Grammaire**: one grammar point, explained in French with examples from the story.
4. **🎯 Exercices**: comprehension, true/false, fill-in-the-blank and translation exercises, with a score.
5. **💌 À toi**: a personal question she answers in Spanish and sends back to you through the share sheet.

**Mes mots** collects the vocabulary from every story she has opened into flashcards for review.
Her progress and drafts are saved on her device.

## Adding a story

1. Write the story (in French, English or Spanish) in `stories/inbox/` using `stories/_template.md`, and add photos if you have them.
2. Open a Claude Code session on this repo and say: *"Convert the new stories in stories/inbox into lessons."*
   The instructions Claude follows are in `CLAUDE.md`.
3. Merge to `main`. GitHub Pages republishes, and the new story shows up with a **Nouveau** badge.

## Setup (once)

1. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**.
2. Push to `main`. The site will be at `https://<user>.github.io/<repo>/`.
3. On Maman's phone, open that link and choose **Add to Home Screen**. It then works like an app, even offline.

Edit `config.json` to change the names shown in the app.

## Local development

```sh
node scripts/build.mjs        # validate lessons + regenerate lessons/index.json
python3 -m http.server 8000   # then open http://localhost:8000
```
