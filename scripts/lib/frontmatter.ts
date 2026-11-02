import { readFileSync, writeFileSync } from 'node:fs';
import { Document, parseDocument } from 'yaml';

const STRINGIFY = {
  lineWidth: 0,
  defaultStringType: 'QUOTE_SINGLE',
  defaultKeyType: 'PLAIN',
} as const;

// A parsed document keeps comments, order and quoting of whatever was written by hand.
export function readRace(path: string) {
  const raw = readFileSync(path, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n?---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${path}: frontmatter non trovato`);
  const doc = parseDocument(match[1]);
  if (doc.errors.length) throw new Error(`${path}: ${doc.errors[0].message}`);
  return { doc, body: match[2] };
}

export function newRace(fields: Record<string, unknown>) {
  return { doc: new Document(fields), body: '' };
}

export function writeRace(path: string, doc: Document, body: string) {
  const text = `---\n${doc.toString(STRINGIFY)}---\n${body ? `\n${body.replace(/^\n+/, '')}` : ''}`;
  writeFileSync(path, text);
}
