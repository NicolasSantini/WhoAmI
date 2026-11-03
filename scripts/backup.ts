// npm run backup: copies the originals in private/ to Proton Drive.
import { NO_TARGET, backupPrivate, backupTarget } from './lib/backup.ts';

const target = backupTarget();
if (!target) {
  console.error(`\nErrore: ${NO_TARGET}`);
  process.exit(1);
}
const { copied, current } = backupPrivate(target);
console.log(`Backup in ${target}: ${copied} file copiati, ${current} già aggiornati.`);
