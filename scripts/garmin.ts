// npm run garmin -- login | fetch <race>: runs scripts/garmin/garmin.py in a local .venv,
// created on first use with the pinned requirements.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const VENV = '.venv';
const windows = process.platform === 'win32';
const python = join(VENV, windows ? 'Scripts/python.exe' : 'bin/python');

const run = (command: string, args: string[]) => {
  const { status, error } = spawnSync(command, args, { stdio: 'inherit' });
  if (error || status !== 0) process.exit(status ?? 1);
};

if (!existsSync(python)) {
  console.log('Primo uso: preparo Python in .venv con garminconnect.');
  run(windows ? 'py' : 'python3', [...(windows ? ['-3'] : []), '-m', 'venv', VENV]);
  run(python, ['-m', 'pip', 'install', '-q', '-r', 'scripts/garmin/requirements.txt']);
}
run(python, ['scripts/garmin/garmin.py', ...process.argv.slice(2)]);
