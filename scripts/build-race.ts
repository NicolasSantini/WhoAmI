// Turns a folder of race originals into published values, SVGs and images.
// Originals move to private/, index.md keeps everything written by hand.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join } from 'node:path';
import type { Document } from 'yaml';
import { raceSchema } from '../src/content/schemas.ts';
import { newRace, readRace, writeRace } from './lib/frontmatter.ts';
import { parseResults, readResultsText, type Results } from './lib/ocr.ts';
import { processMedal, processPhotos } from './lib/photos.ts';
import { ask, closePrompt } from './lib/prompt.ts';
import { profileSvg, trackSvg } from './lib/svg.ts';
import { parseFit, parseGpx, trackStats, type TrackPoint } from './lib/track.ts';

const PUBLISHED = new Set(['index.md', 'track.svg', 'profile.svg']);
const RESULT_FILE = /\.(png|jpe?g|webp|txt|md|csv)$/i;
const TIME_FORMAT = /^(\d{1,3}:)?[0-5]?\d:[0-5]\d$/;

const fail = (message: string): never => {
  console.error(`\nErrore: ${message}`);
  process.exit(1);
};

function resolveSlug(argument?: string) {
  if (!argument) return fail('indica la cartella, per esempio: npm run build-race 2026-monza');
  const slug = basename(argument.replace(/[\\/]+$/, ''));
  if (!/^\d{4}-[a-z0-9-]+$/.test(slug)) return fail(`"${slug}" deve essere AAAA-nome, minuscolo`);
  if (!existsSync(join('src/content/races', slug))) {
    return fail(`cartella non trovata: src/content/races/${slug}`);
  }
  return slug;
}

function moveOriginals(folder: string, privateDir: string) {
  mkdirSync(join(privateDir, 'photos'), { recursive: true });
  for (const name of readdirSync(folder)) {
    if (PUBLISHED.has(name)) continue;
    const source = join(folder, name);
    if (name === 'photos' && statSync(source).isDirectory()) {
      for (const photo of readdirSync(source)) {
        renameSync(join(source, photo), join(privateDir, 'photos', photo));
      }
      rmSync(source, { recursive: true });
    } else {
      renameSync(source, join(privateDir, name));
    }
  }
}

const originals = (privateDir: string) =>
  readdirSync(privateDir).filter((name) => statSync(join(privateDir, name)).isFile());

async function readTrack(privateDir: string) {
  const files = originals(privateDir).filter((name) => /\.(gpx|fit)$/i.test(name));
  if (originals(privateDir).some((name) => /\.tcx$/i.test(name))) {
    fail('il TCX non è supportato: esporta GPX o FIT');
  }
  if (files.length > 1) fail(`tieni un solo tracciato in ${privateDir}: ${files.join(', ')}`);
  if (!files.length) return undefined;
  const path = join(privateDir, files[0]);
  const points: TrackPoint[] =
    extname(path).toLowerCase() === '.gpx' ? parseGpx(path) : await parseFit(path);
  if (points.length < 2) fail(`${files[0]} non contiene un tracciato con posizioni`);
  return points;
}

const resultFile = (privateDir: string) => {
  const files = originals(privateDir).filter(
    (name) => RESULT_FILE.test(name) && !name.startsWith('medal'),
  );
  return files.find((name) => name.startsWith('results')) ?? files[0];
};

async function confirmResults(found: Results, excerpt: string) {
  const fields: [keyof Results, string][] = [
    ['officialTime', 'Tempo ufficiale'],
    ['overallRank', 'Posizione assoluta'],
    ['overallOf', 'Partecipanti totali'],
    ['categoryRank', 'Posizione di categoria'],
    ['categoryOf', 'Partecipanti di categoria'],
    ['category', 'Categoria'],
  ];
  const results: Results = { ...found };
  console.log(`\nTesto letto (controlla, l'OCR può sbagliare):\n${excerpt}\n`);

  while (true) {
    fields.forEach(([key, label], index) => {
      console.log(`  ${index + 1}. ${label}: ${results[key] ?? '(non trovato)'}`);
    });
    const answer = await ask(
      '\nInvio = salva, n = non salvare, "numero valore" = correggi (es. 1 1:53:03, oppure 2 - per svuotare):',
    );
    if (!answer) return results;
    if (answer.toLowerCase() === 'n') return undefined;

    const [, indexText, value] = answer.match(/^(\d)\s+(.+)$/) ?? [];
    const field = fields[Number(indexText) - 1];
    if (!field) {
      console.log('Non ho capito: scrivi per esempio 3 56');
      continue;
    }
    const [key] = field;
    if (value === '-') {
      delete results[key];
    } else if (key === 'officialTime') {
      if (TIME_FORMAT.test(value)) results.officialTime = value;
      else console.log('Il tempo deve essere H:MM:SS o MM:SS');
    } else if (key === 'category') {
      results.category = value;
    } else if (/^\d+$/.test(value)) {
      results[key] = Number(value);
    } else {
      console.log('Serve un numero');
    }
  }
}

function withoutEmpty<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

async function askResults(privateDir: string, doc: Document) {
  if (doc.has('results') && !process.argv.includes('--results')) {
    console.log('Risultati già confermati: non li rileggo (usa --results per rifarlo).');
    return;
  }
  const file = resultFile(privateDir);
  if (!file) {
    console.log('Nessun file di risultati: salto questo passaggio.');
    return;
  }
  console.log(`Leggo i risultati da ${file}...`);
  const text = await readResultsText(join(privateDir, file), join('private', '.tesseract'));
  const excerpt = text.split('\n').filter(Boolean).slice(0, 12).join('\n');
  const confirmed = await confirmResults(parseResults(text), excerpt);
  if (confirmed) doc.set('results', withoutEmpty(confirmed));
  else console.log('Risultati non salvati.');
}

async function openRace(indexPath: string, slug: string, date?: string) {
  if (existsSync(indexPath)) return readRace(indexPath);
  const words = slug.replace(/^\d{4}-/, '').replace(/-/g, ' ');
  const title = await ask(`Nome della gara [${words}]:`, words);
  const kind = await ask('Tipo (corsa, ocr, ultra, triathlon, bici, nuoto) [corsa]:', 'corsa');
  const raceDate = date ?? (await ask('Data (AAAA-MM-GG):'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) fail('la data deve essere nel formato AAAA-MM-GG');
  return newRace({ title, status: 'done', kind, date: raceDate });
}

const slug = resolveSlug(process.argv.slice(2).find((argument) => !argument.startsWith('--')));
const folder = join('src/content/races', slug);
const privateDir = join('private/races', slug);
const publicDir = join('public/races', slug);
const indexPath = join(folder, 'index.md');

console.log(`\nGara: ${slug}`);
moveOriginals(folder, privateDir);
console.log(`Originali spostati in ${privateDir}`);

const points = await readTrack(privateDir);
const stats = points && trackStats(points);
if (points) {
  writeFileSync(join(folder, 'track.svg'), trackSvg(points));
  const profile = profileSvg(points);
  if (profile) writeFileSync(join(folder, 'profile.svg'), profile);
  console.log(`Tracciato: ${points.length} punti, ${stats?.distanceKm} km`);
}

const photos = await processPhotos(join(privateDir, 'photos'), publicDir, slug);
const medal = await processMedal(privateDir, publicDir, slug);
console.log(`Foto: ${photos.length}. Medaglia: ${medal ? 'sì' : 'no'}.`);

const { doc, body } = await openRace(indexPath, slug, stats?.date);

if (doc.get('status') === 'upcoming') {
  const answer = await ask('La gara risulta futura: la segno come fatta? [S/n]');
  if (answer.toLowerCase() !== 'n') doc.set('status', 'done');
}
if (!doc.has('date') && stats?.date) doc.set('date', stats.date);

const previous = (doc.toJS().auto ?? {}) as Record<string, unknown>;
doc.set(
  'auto',
  withoutEmpty({
    ...previous,
    distanceKm: stats?.distanceKm ?? previous.distanceKm,
    movingTime: stats?.movingTime ?? previous.movingTime,
    pace: stats?.pace ?? previous.pace,
    elevationGainM: stats?.elevationGainM ?? previous.elevationGainM,
    photos,
    medal: medal ?? previous.medal,
  }),
);

const alts = (doc.toJS().photoAlts ?? {}) as Record<string, string>;
const title = String(doc.get('title'));
const completeAlts = Object.fromEntries(
  photos.map(({ id }) => [id, alts[id] ?? `Foto dalla gara ${title}`]),
);
if (photos.length) doc.set('photoAlts', completeAlts);

await askResults(privateDir, doc);

if (!doc.getIn(['links', 'strava'])) {
  const strava = await ask('Link Strava (invio per saltare):');
  if (URL.canParse(strava)) doc.setIn(['links', 'strava'], strava);
  else if (strava) console.log('Link non valido: lo salto, puoi aggiungerlo a mano.');
}
closePrompt();

writeRace(indexPath, doc, body);

const check = raceSchema.safeParse(doc.toJS());
if (!check.success) {
  for (const issue of check.error.issues) {
    console.error(`  ERRORE ${issue.path.join('.')}: ${issue.message}`);
  }
  fail(`${indexPath} va corretto a mano`);
}
console.log(`\nFatto: ${indexPath}`);
console.log('Ora lancia npm run check, poi npm run dev per vedere la gara.');
