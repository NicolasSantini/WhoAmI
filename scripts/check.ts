// Validates content with clear messages and guards what must never be published.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import type { z } from 'astro/zod';
import * as schemas from '../src/content/schemas.ts';
import { site } from '../src/data/site.ts';

const root = process.cwd();
const errors: string[] = [];
const warnings: string[] = [];
const rel = (path: string) => relative(root, path).split(sep).join('/');
const doneRaces: string[] = [];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function report(path: string, schema: z.ZodType, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    errors.push(`${rel(path)} → ${issue.path.join('.') || '(file)'}: ${issue.message}`);
  }
  return undefined;
}

function readYaml(path: string): unknown {
  try {
    return parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${rel(path)} → YAML non valido: ${(error as Error).message.split('\n')[0]}`);
    return undefined;
  }
}

function checkYamlFolder(folder: string, schema: z.ZodType) {
  for (const path of walk(join(root, 'src/content', folder))) {
    if (extname(path) !== '.yaml') continue;
    const data = readYaml(path);
    if (data !== undefined) report(path, schema, data);
  }
}

function checkYamlList(path: string, schema: z.ZodType) {
  const full = join(root, path);
  if (!existsSync(full)) return errors.push(`${path} → file mancante`);
  const data = readYaml(full);
  if (data === undefined) return;
  if (!Array.isArray(data)) return errors.push(`${path} → deve essere una lista`);
  data.forEach((item) => report(full, schema, item));
}

function frontmatter(path: string): unknown {
  const match = readFileSync(path, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    errors.push(`${rel(path)} → frontmatter mancante`);
    return undefined;
  }
  try {
    return parse(match[1]);
  } catch (error) {
    errors.push(`${rel(path)} → YAML non valido: ${(error as Error).message.split('\n')[0]}`);
    return undefined;
  }
}

function checkRaces() {
  const dir = join(root, 'src/content/races');
  if (!existsSync(dir)) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const name of readdirSync(dir)) {
    const folder = join(dir, name);
    if (!statSync(folder).isDirectory()) continue;
    if (!/^\d{4}-[a-z0-9-]+$/.test(name)) {
      errors.push(`${rel(folder)} → il nome della cartella deve essere AAAA-nome, minuscolo`);
    }
    const index = join(folder, 'index.md');
    if (!existsSync(index)) {
      warnings.push(`${rel(folder)} → manca index.md: lancia npm run build-race ${name}`);
      continue;
    }
    const raw = frontmatter(index);
    if (raw === undefined) continue;
    const race = report(index, schemas.raceSchema, raw) as schemas.Race | undefined;
    if (!race || race.draft) continue;
    if (race.status === 'done') doneRaces.push(name);
    if (race.status === 'upcoming' && race.date && race.date < today) {
      warnings.push(`${rel(index)} → gara "prossima" con data passata: è ora di aggiornarla`);
    }
  }
}

// "Il mio percorso" is written by hand: a done race does not reach it on its own.
function checkJourney() {
  const path = 'src/content/journey/journey.yaml';
  const full = join(root, path);
  if (!existsSync(full)) return;
  const stages = readYaml(full);
  if (!Array.isArray(stages)) return;
  const told = new Set(stages.map((stage) => stage?.race).filter(Boolean));
  for (const name of doneRaces) {
    if (!told.has(name)) {
      warnings.push(`${path} → la gara fatta ${name} non ha una tappa nel percorso (campo race)`);
    }
  }
  for (const name of told) {
    if (!existsSync(join(root, 'src/content/races', name))) {
      warnings.push(`${path} → race: ${name} non corrisponde a nessuna cartella di gara`);
    }
  }
}

function checkTrackedFiles() {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
  for (const path of tracked) {
    if (path.startsWith('scripts/fixtures/')) continue;
    if (path.startsWith('private/')) errors.push(`${path} → private/ non deve finire in git`);
    if (/\.(gpx|fit|tcx)$/i.test(path)) errors.push(`${path} → tracciato originale in git`);
    if (/^src\/content\/races\/.+\.(jpe?g|png|heic|webp|avif)$/i.test(path)) {
      errors.push(`${path} → immagine originale in git: lancia npm run build-race`);
    }
  }
}

async function checkImageMetadata() {
  for (const path of walk(join(root, 'public/races'))) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(path)) continue;
    const { exif, xmp, iptc } = await sharp(path).metadata();
    if (exif || xmp || iptc) errors.push(`${rel(path)} → contiene metadati (EXIF/XMP/IPTC)`);
  }
}

function collectTodos() {
  const files = [...walk(join(root, 'src/content')), ...walk(join(root, 'src/data'))];
  for (const path of files) {
    if (!/\.(ya?ml|md|ts)$/.test(path)) continue;
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (/\bTODO\b/.test(line)) {
          warnings.push(`${rel(path)}:${index + 1} → ${line.trim().slice(0, 90)}`);
        }
      });
  }
  if (!site.vatNumber)
    warnings.push('src/data/site.ts → P.IVA non compilata: non appare nel footer');
}

checkYamlFolder('experience', schemas.experienceSchema);
checkYamlFolder('education', schemas.educationSchema);
checkYamlFolder('certifications', schemas.certificationSchema);
checkYamlFolder('volunteering', schemas.volunteeringSchema);
checkYamlFolder('projects', schemas.projectSchema);
checkYamlList('src/content/skills/skills.yaml', schemas.skillGroupSchema);
checkYamlList('src/content/journey/journey.yaml', schemas.journeySchema);
checkYamlList('src/content/training/aggregates.yaml', schemas.trainingYearSchema);
checkRaces();
checkJourney();
checkTrackedFiles();
await checkImageMetadata();
collectTodos();

for (const warning of warnings) console.warn(`  avviso  ${warning}`);
for (const error of errors) console.error(`  ERRORE  ${error}`);
console.log(`\ncheck: ${errors.length} errori, ${warnings.length} avvisi`);
process.exit(errors.length ? 1 : 0);
