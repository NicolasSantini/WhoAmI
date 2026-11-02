import { getCollection, type CollectionEntry } from 'astro:content';
import { formatDate } from './format.ts';
import type { Race } from '../content/schemas.ts';

export type RaceEntry = CollectionEntry<'races'>;

const svgFiles = import.meta.glob<string>('/src/content/races/*/{track,profile}.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const raceSvg = (id: string, name: 'track' | 'profile') =>
  svgFiles[`/src/content/races/${id}/${name}.svg`];

const time = ({ data }: RaceEntry) => data.date?.getTime() ?? Number.MAX_SAFE_INTEGER;

export async function getRaces() {
  const races = await getCollection('races', ({ data }) => import.meta.env.DEV || !data.draft);
  return races.sort((a, b) => time(a) - time(b));
}

export function raceDateLabel(race: Race) {
  const label = race.dateLabel ?? (race.date ? formatDate(race.date) : '');
  return race.dateConfirmed ? label : `${label} (da confermare)`;
}
