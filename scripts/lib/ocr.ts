import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

export interface Results {
  officialTime?: string;
  overallRank?: number;
  overallOf?: number;
  categoryRank?: number;
  categoryOf?: number;
  category?: string;
}

const OVERALL = 'posizione\\s+assoluta|pos\\.?\\s*ass\\w*|assoluta|classifica\\s+generale|overall';
const CATEGORY =
  'posizione\\s+(?:di\\s+)?categoria|pos\\.?\\s*cat\\w*|categoria|category|age\\s*group|\\bcat\\b\\.?';
const TIME = '(\\d{1,2}:\\d{2}:\\d{2})';
const CATEGORY_LABEL = /\b(?:[MF]\s?\d{2}\s?[-–]\s?\d{2}|S[MF]\s?\d{2}|[MF]\s?\d{2}\+?)\b/i;
// Valid Tesseract parameter, missing from the library types: it silences a harmless load warning.
const INIT_CONFIG: object = { user_words_suffix: '' };

export async function readResultsText(path: string, cacheDir: string) {
  if (/\.(txt|md|csv)$/i.test(path)) return readFileSync(path, 'utf8');
  mkdirSync(cacheDir, { recursive: true });
  const image = await sharp(path).resize({ width: 2000 }).grayscale().png().toBuffer();
  const worker = await createWorker(['ita', 'eng'], 1, { cachePath: cacheDir }, INIT_CONFIG);
  const { data } = await worker.recognize(image);
  await worker.terminate();
  return data.text;
}

function rank(text: string, labels: string) {
  const match = text.match(
    new RegExp(`(?:${labels})\\D{0,15}?(\\d{1,6})(?:\\s*(?:/|su|of|di)\\s*(\\d{1,6}))?`, 'i'),
  );
  if (!match) return {};
  return { position: Number(match[1]), of: match[2] ? Number(match[2]) : undefined };
}

export function parseResults(text: string): Results {
  const category = text.match(CATEGORY_LABEL)?.[0].replace(/\s/g, '').toUpperCase();
  // Without the label, "M20-24" cannot be misread as rank 20.
  const clean = text.replace(new RegExp(CATEGORY_LABEL, 'gi'), ' ');
  const labelled = clean.match(
    new RegExp(
      `(?:tempo\\s+(?:ufficiale|netto|reale?)|real\\s*time|net\\s*time|chip\\s*time|official\\s*time|finish\\s*time|tempo)\\D{0,15}${TIME}`,
      'i',
    ),
  );
  const overall = rank(clean, OVERALL);
  const inCategory = rank(clean, CATEGORY);
  return {
    officialTime: labelled?.[1] ?? clean.match(new RegExp(TIME))?.[1],
    overallRank: overall.position,
    overallOf: overall.of,
    categoryRank: inCategory.position,
    categoryOf: inCategory.of,
    category,
  };
}
