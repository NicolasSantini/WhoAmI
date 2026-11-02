import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import FitParser from 'fit-file-parser';

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: Date;
}

export interface TrackStats {
  date?: string;
  distanceKm: number;
  movingTime?: string;
  pace?: string;
  elevationGainM?: number;
}

const EARTH_RADIUS_M = 6_371_000;
const MOVING_SPEED_MS = 0.3;
const SMOOTHING_WINDOW = 5;
const ELEVATION_THRESHOLD_M = 3;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function haversine(a: TrackPoint, b: TrackPoint) {
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function parseGpx(path: string): TrackPoint[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    processEntities: false,
    isArray: (name) => ['trk', 'trkseg', 'trkpt'].includes(name),
  });
  const gpx = parser.parse(readFileSync(path, 'utf8')).gpx;
  const points = (gpx?.trk ?? [])
    .flatMap((track: { trkseg?: unknown[] }) => track.trkseg ?? [])
    .flatMap((segment: { trkpt?: unknown[] }) => segment.trkpt ?? []) as {
    lat: string;
    lon: string;
    ele?: number;
    time?: string;
  }[];
  return points.map(({ lat, lon, ele, time }) => ({
    lat: Number(lat),
    lon: Number(lon),
    ele: ele === undefined ? undefined : Number(ele),
    time: time ? new Date(time) : undefined,
  }));
}

export async function parseFit(path: string): Promise<TrackPoint[]> {
  const { records = [] } = await new FitParser({ force: true }).parseAsync(readFileSync(path));
  return records.flatMap((record) => {
    const { position_lat: lat, position_long: lon, timestamp } = record;
    if (typeof lat !== 'number' || typeof lon !== 'number') return [];
    const ele = record.enhanced_altitude ?? record.altitude;
    return [
      {
        lat,
        lon,
        ele: typeof ele === 'number' ? ele : undefined,
        time: timestamp ? new Date(timestamp) : undefined,
      },
    ];
  });
}

export function cumulativeDistances(points: TrackPoint[]) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + haversine(points[i - 1], points[i]));
  }
  return distances;
}

export function smoothedElevation(points: TrackPoint[]) {
  const values = points.map(({ ele }) => ele);
  if (values.some((value) => value === undefined)) return undefined;
  const known = values as number[];
  const half = Math.floor(SMOOTHING_WINDOW / 2);
  return known.map((_, index) => {
    const window = known.slice(Math.max(0, index - half), index + half + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

// Small oscillations are GPS noise: climbing counts only past the threshold.
function elevationGain(values: number[]) {
  let gain = 0;
  let anchor = values[0];
  for (const value of values) {
    if (value - anchor >= ELEVATION_THRESHOLD_M) {
      gain += value - anchor;
      anchor = value;
    } else if (anchor - value >= ELEVATION_THRESHOLD_M) {
      anchor = value;
    }
  }
  return Math.round(gain);
}

function movingSeconds(points: TrackPoint[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const { time: start } = points[i - 1];
    const { time: end } = points[i];
    if (!start || !end) return undefined;
    const seconds = (end.getTime() - start.getTime()) / 1000;
    if (seconds > 0 && haversine(points[i - 1], points[i]) / seconds >= MOVING_SPEED_MS) {
      total += seconds;
    }
  }
  return total;
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const rest = rounded % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number) {
  const rounded = Math.round(secondsPerKm);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}/km`;
}

export function trackStats(points: TrackPoint[]): TrackStats {
  const distance = cumulativeDistances(points).at(-1) ?? 0;
  const seconds = movingSeconds(points);
  const elevation = smoothedElevation(points);
  const distanceKm = Math.round(distance / 10) / 100;
  return {
    date: points[0].time?.toISOString().slice(0, 10),
    distanceKm,
    movingTime: seconds ? formatDuration(seconds) : undefined,
    pace: seconds && distanceKm ? formatPace(seconds / distanceKm) : undefined,
    elevationGainM: elevation && elevationGain(elevation),
  };
}
