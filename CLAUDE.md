# Cartas de viaje — notes for Claude

A static web app (no build step, no backend) where Julie's travel stories become
Spanish lessons for their mother. The learner's language is **French**, and her Spanish level
is **intermediate (B1)**. All UI text, translations and explanations are in French.

## Files

- `index.html`, `app.js`, `styles.css`, `sw.js`: the app (vanilla JS, hash routing)
- `config.json`: names shown in the app (`learnerName`, `authorName`)
- `lessons/<id>.json`: one lesson per story. `lessons/index.json` is **generated**, so never edit it by hand
- `lessons/media/<id>/`: photos for a lesson
- `stories/inbox/`: raw stories waiting to be converted. `stories/done/` holds the converted ones
- `scripts/build.mjs`: validates all lessons and regenerates `lessons/index.json`

## Converting a story into a lesson

When asked to "convert the new stories" (or similar), do this for each story in `stories/inbox/`:

1. **Read the story.** It may be written in French, English or Spanish, in any style. Photos sit
   next to it (same base name, or a folder with the story's name).
2. **Pick an id**: `YYYY-MM-place-short-topic` in lowercase ASCII with dashes, e.g. `2026-10-lisboa-tranvia`.
3. **Write the Spanish story** (`story`), retelling it faithfully in natural Peninsular Spanish
   unless the story is set in Latin America (then use that region's usual vocabulary and say so in a vocab note):
   - B1 level: mostly high-frequency vocabulary, varied past tenses (indefinido / imperfecto /
     pretérito perfecto), some dialogue. Keep sentences under about 25 words.
   - Keep the author's voice, personal details, names and feelings. Don't invent events.
     You may lightly simplify or reorder for clarity.
   - Aim for about 200–400 words, in 3–6 paragraphs. Split long stories into several lessons ("parte 1", "parte 2").
   - Every sentence gets a natural French translation (`fr`), not a word-for-word one.
   - The narrator's gender: keep it as the author wrote it. If unknown, prefer phrasings with no
     gender agreement (in both the Spanish and the French).
   - Add photos as `{ "image": "lessons/media/<id>/x.jpg", "caption": "…" }` blocks between paragraphs.
4. **Vocabulary**: 8–14 useful words or expressions from the story that a B1 learner likely
   doesn't know. Use the dictionary form with its article in `es` and the exact form used in the text in `match`
   (if different). `note` (French) is for false friends, irregular forms, regional usage or a fun fact.
5. **Grammar**: one point the story illustrates well. Rotate topics across lessons (check
   existing lessons' `grammar.title` first). Ideas: imperfecto vs indefinido, ser/estar, por/para,
   pretérito perfecto, subjuntivo after *quiero que / ojalá / cuando*, imperativo, gustar-type verbs,
   pronouns (*se lo*), periphrases (*acabar de, volver a, llevar + gerundio*). Explain it in French in 2–4 short paragraphs
   (separate with `\n\n`), with 3–5 examples taken from the story.
6. **Exercises**: 7–10 exercises, mixing:
   - `choice`: a comprehension question in Spanish, 3 options, `answer` = index (0-based)
   - `truefalse`: a statement about the story, `answer`: true/false
   - `fill`: a sentence with exactly one `___`, 3 `options`, `answer` = the right option, optional `hint`
     (French, or the infinitive). Use them for vocab and for the grammar point
   - `translate`: a French sentence to translate (`fr`) with the model answer (`es`)
   - Add a short French `explanation` when it helps (quote the story or name the rule).
7. **Reply prompt** (`reply.prompt` in Spanish, `reply.promptFr` in French): a warm, personal question
   for the mother that invites her to write back using the grammar point.
8. `title` (Spanish), `titleFr`, `place` (in French, e.g. "Lisbonne, Portugal"), `date`,
   `landscape` (the scenery on the home map: countryside, city, sea, mountain, desert, forest, island or snow), `summaryFr`
   (one sentence), optional `cover` (an image path), and `note` (a short message from the author to their
   mother, in French. Use the author's own words if they wrote one, otherwise leave it out).
9. **Photos**: copy them to `lessons/media/<id>/` and resize to max 1600px wide, JPEG quality ~80
   (e.g. `convert in.jpg -resize '1600x1600>' -quality 80 out.jpg`). Strip GPS metadata (`-strip`).
10. Run `node scripts/build.mjs`. Fix every error, and fix the warnings about vocab not found.
11. Move the story (and its photos) from `stories/inbox/` to `stories/done/`.
12. Commit with the lesson title in the message.

Use `lessons/exemple-sevilla.json` as the reference for the format. Once the first real lesson
exists, delete the example lesson (ask first).

## Home map

The home page is a journey map: lessons are numbered stops along a winding path, oldest first,
so every new story extends the trip. A lesson's `landscape` picks the scenery around its stop.

## Checking changes

- `node scripts/build.mjs` must pass.
- Run the app locally with `python3 -m http.server` and open http://localhost:8000.
- After changing `app.js`/`styles.css`, bump `CACHE` in `sw.js` so installed copies update.
