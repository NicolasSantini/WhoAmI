// Creates the skeleton of a future race.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { raceSchema } from '../src/content/schemas.ts';
import { newRace, writeRace } from './lib/frontmatter.ts';
import { ask, closePrompt } from './lib/prompt.ts';

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const title = await ask('Nome della gara:');
const when = await ask('Data (AAAA-MM-GG, oppure testo come "Luglio 2027"):');
const location = await ask('Luogo (invio per saltare):');
const kind = await ask('Tipo (corsa, ocr, ultra, triathlon, bici, nuoto) [corsa]:', 'corsa');
const distance = await ask('Distanza in km (invio per saltare):');
const goal = await ask('Obiettivo (invio per saltare):');
closePrompt();

const isDate = /^\d{4}-\d{2}-\d{2}$/.test(when);
const fields = {
  title,
  status: 'upcoming',
  kind,
  ...(isDate ? { date: when } : { dateLabel: when }),
  ...(location ? { location } : {}),
  ...(goal ? { goal } : {}),
  ...(distance ? { distanceKm: Number(distance.replace(',', '.')) } : {}),
};

const check = raceSchema.safeParse(fields);
if (!check.success) {
  for (const issue of check.error.issues) {
    console.error(`Errore su ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const year = when.match(/\d{4}/)?.[0] ?? new Date().getFullYear();
const folder = join('src/content/races', `${year}-${slugify(title)}`);
if (existsSync(folder)) {
  console.error(`Esiste già: ${folder}`);
  process.exit(1);
}
mkdirSync(folder, { recursive: true });
const { doc, body } = newRace(fields);
writeRace(join(folder, 'index.md'), doc, body);
console.log(`\nCreata: ${folder}/index.md`);
