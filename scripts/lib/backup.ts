// Copies private/ into the Proton Drive sync folder, which uploads it end-to-end encrypted.
// Only new or changed files are copied, and nothing is ever deleted from the backup.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';

const SOURCE = 'private';
const SKIP = new Set(['.tesseract']);
const FOLDER = 'WhoAmI-private';
const PROTON = join(homedir(), 'Proton Drive');

// WHOAMI_BACKUP_DIR wins; otherwise the "My files" folder the Proton Drive app syncs.
export function backupTarget() {
  const custom = process.env.WHOAMI_BACKUP_DIR;
  if (custom) return custom;
  if (!existsSync(PROTON)) return undefined;
  const candidates = [PROTON, ...readdirSync(PROTON).map((name) => join(PROTON, name))];
  const root = candidates
    .map((dir) => join(dir, 'My files'))
    .find((dir) => existsSync(dir) && statSync(dir).isDirectory());
  return root && join(root, FOLDER);
}

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

export function backupPrivate(target: string) {
  let copied = 0;
  let current = 0;
  // Created even when empty: it proves the folder is writable and shows up in Proton Drive.
  mkdirSync(target, { recursive: true });
  if (!existsSync(SOURCE)) return { copied, current };
  for (const file of files(SOURCE)) {
    const destination = join(target, relative(SOURCE, file));
    const source = statSync(file);
    if (existsSync(destination)) {
      const copy = statSync(destination);
      if (copy.size === source.size && copy.mtimeMs >= source.mtimeMs) {
        current++;
        continue;
      }
    }
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(file, destination);
    utimesSync(destination, source.atime, source.mtime);
    copied++;
  }
  return { copied, current };
}

export const NO_TARGET =
  "cartella di Proton Drive non trovata: installa l'app Proton Drive e accedi, oppure imposta WHOAMI_BACKUP_DIR";
