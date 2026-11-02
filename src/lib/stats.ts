import type { z } from 'astro/zod';
import type { Race, trainingYearSchema } from '../content/schemas.ts';

export type Discipline = 'swim' | 'bike' | 'run';
type TrainingYear = z.infer<typeof trainingYearSchema>;

const XP_PER_KM: Record<Discipline, number> = { swim: 40, bike: 3, run: 10 };
const XP_PER_LEVEL = 100;

// Hand-written values win over the ones computed from the track.
export const raceDistance = (race: Race) => race.distanceKm ?? race.auto?.distanceKm;
export const raceElevation = (race: Race) => race.elevationGainM ?? race.auto?.elevationGainM;
export const racePace = (race: Race) => race.pace ?? race.auto?.pace;
export const raceTime = (race: Race) =>
  race.results?.officialTime ?? race.time ?? race.auto?.movingTime;

export function raceLegs(race: Race): Record<Discipline, number> {
  if (race.legs) {
    return { swim: race.legs.swimKm, bike: race.legs.bikeKm, run: race.legs.runKm };
  }
  const km = raceDistance(race) ?? 0;
  if (race.kind === 'nuoto') return { swim: km, bike: 0, run: 0 };
  if (race.kind === 'bici') return { swim: 0, bike: km, run: 0 };
  return { swim: 0, bike: 0, run: km };
}

export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(xp / XP_PER_LEVEL)) + 1;
  const floor = XP_PER_LEVEL * (level - 1) ** 2;
  const ceiling = XP_PER_LEVEL * level ** 2;
  return { level, xp, current: xp - floor, needed: ceiling - floor };
}

export function characterSheet(races: Race[], training: TrainingYear[]) {
  const done = races.filter((race) => race.status === 'done');
  const km: Record<Discipline, number> = { swim: 0, bike: 0, run: 0 };
  let elevation = 0;

  for (const race of done) {
    const legs = raceLegs(race);
    km.swim += legs.swim;
    km.bike += legs.bike;
    km.run += legs.run;
    elevation += raceElevation(race) ?? 0;
  }
  for (const year of training) {
    km.swim += year.swimKm;
    km.bike += year.bikeKm;
    km.run += year.runKm;
    elevation += year.elevationM;
  }

  const xp = (discipline: Discipline) => Math.round(km[discipline] * XP_PER_KM[discipline]);
  return {
    totals: {
      km: km.swim + km.bike + km.run,
      elevation,
      races: done.length,
      medals: done.filter((race) => race.auto?.medal).length,
    },
    overall: levelFor(xp('swim') + xp('bike') + xp('run')),
    disciplines: {
      swim: levelFor(xp('swim')),
      bike: levelFor(xp('bike')),
      run: levelFor(xp('run')),
    },
  };
}
