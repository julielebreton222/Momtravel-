#!/usr/bin/env node
// Validates every lesson in lessons/*.json and regenerates lessons/index.json.
// Usage: node scripts/build.mjs        (exits with code 1 if a lesson is invalid)

import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = join(root, 'lessons');

const errors = [];
const warnings = [];
const exists = (p) => access(join(root, p)).then(() => true, () => false);

async function check(file, l) {
  const err = (m) => errors.push(`${file}: ${m}`);
  const warn = (m) => warnings.push(`${file}: ${m}`);
  const str = (v) => typeof v === 'string' && v.trim() !== '';

  if (l.id !== file.replace(/\.json$/, '')) err(`"id" must equal the file name ("${file.replace(/\.json$/, '')}")`);
  if (!/^[a-z0-9-]+$/.test(l.id || '')) err('"id" may only contain a-z, 0-9 and "-"');
  for (const k of ['title', 'titleFr', 'place']) if (!str(l[k])) err(`missing "${k}"`);
  if (l.date && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(l.date)) err('"date" must look like 2026-09-15 (or 2026-09)');
  for (const k of ['cover']) if (l[k] && !(await exists(l[k]))) err(`${k} file not found: ${l[k]}`);

  if (!Array.isArray(l.story) || !l.story.length) err('"story" must be a non-empty array');
  const storyText = [];
  for (const [i, block] of (l.story || []).entries()) {
    if (block.image) {
      if (!(await exists(block.image))) err(`story[${i}] image not found: ${block.image}`);
      continue;
    }
    if (!Array.isArray(block.sentences) || !block.sentences.length) { err(`story[${i}] needs "sentences" or "image"`); continue; }
    for (const [j, s] of block.sentences.entries()) {
      if (!str(s.es) || !str(s.fr)) err(`story[${i}].sentences[${j}] needs "es" and "fr"`);
      else storyText.push(s.es);
    }
  }
  const text = storyText.join(' ').toLowerCase();

  for (const [i, v] of (l.vocabulary || []).entries()) {
    if (!str(v.es) || !str(v.fr)) { err(`vocabulary[${i}] needs "es" and "fr"`); continue; }
    const forms = v.match ? [].concat(v.match) : [v.es.replace(/^(el|la|los|las|un|una)\s+/i, '')];
    for (const f of forms) {
      const re = new RegExp(`(?<![\\p{L}])${f.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u');
      if (!re.test(text)) warn(`vocabulary "${v.es}": "${f}" not found in the story (it won't be highlighted; add "match")`);
    }
  }

  if (l.grammar && (!str(l.grammar.title) || !str(l.grammar.explanation))) err('grammar needs "title" and "explanation"');

  for (const [i, ex] of (l.exercises || []).entries()) {
    const at = `exercises[${i}] (${ex.type})`;
    switch (ex.type) {
      case 'choice':
        if (!str(ex.question) || !Array.isArray(ex.options) || ex.options.length < 2) err(`${at}: needs "question" and 2+ "options"`);
        else if (!Number.isInteger(ex.answer) || ex.answer < 0 || ex.answer >= ex.options.length) err(`${at}: "answer" must be the index of the right option`);
        break;
      case 'truefalse':
        if (!str(ex.statement) || typeof ex.answer !== 'boolean') err(`${at}: needs "statement" and boolean "answer"`);
        break;
      case 'fill':
        if (!str(ex.sentence) || ex.sentence.split('___').length !== 2) err(`${at}: "sentence" must contain exactly one ___`);
        if (!Array.isArray(ex.options) || !ex.options.includes(ex.answer)) err(`${at}: "answer" must be one of "options"`);
        break;
      case 'translate':
        if (!str(ex.fr) || !str(ex.es)) err(`${at}: needs "fr" and "es"`);
        break;
      default:
        err(`${at}: unknown type (use choice, truefalse, fill or translate)`);
    }
  }
  if (!(l.exercises || []).length) warn('no exercises');
  if (l.reply && !str(l.reply.prompt)) err('reply needs "prompt"');
}

const files = (await readdir(lessonsDir)).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
const index = [];
for (const file of files) {
  let lesson;
  try {
    lesson = JSON.parse(await readFile(join(lessonsDir, file), 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  await check(file, lesson);
  const { id, title, titleFr, place, date, cover, summaryFr } = lesson;
  index.push({ id, title, titleFr, place, date, cover, summaryFr });
}

// Newest first.
index.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} error(s). lessons/index.json was not updated.`);
  process.exit(1);
}
await writeFile(join(lessonsDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`OK: ${index.length} lesson(s) → lessons/index.json`);
