import { cumulativeDistances, smoothedElevation, type TrackPoint } from './track.ts';

type Point = [number, number];

const TRACK_WIDTH = 400;
const TRACK_HEIGHT = 300;
const TRACK_PADDING = 16;
const TRACK_MAX_POINTS = 300;
const PROFILE_WIDTH = 600;
const PROFILE_HEIGHT = 140;
const PROFILE_STEPS = 150;

const round = (value: number) => Math.round(value * 10) / 10;
const pathFrom = (points: Point[]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join(' ');

// Geographic coordinates stop here: the SVG holds only normalised shape points.
function project(points: TrackPoint[]): Point[] {
  const midLat = points.reduce((sum, { lat }) => sum + lat, 0) / points.length;
  const stretch = Math.cos((midLat * Math.PI) / 180);
  const raw = points.map(({ lat, lon }): Point => [lon * stretch, -lat]);
  const xs = raw.map(([x]) => x);
  const ys = raw.map(([, y]) => y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(
    (TRACK_WIDTH - TRACK_PADDING * 2) / (maxX - minX || 1),
    (TRACK_HEIGHT - TRACK_PADDING * 2) / (maxY - minY || 1),
  );
  const offsetX = (TRACK_WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (TRACK_HEIGHT - (maxY - minY) * scale) / 2;
  return raw.map(([x, y]) => [(x - minX) * scale + offsetX, (y - minY) * scale + offsetY]);
}

function distanceToSegment([x, y]: Point, [ax, ay]: Point, [bx, by]: Point) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared))
    : 0;
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

// Douglas-Peucker, iterative so that long tracks cannot overflow the stack.
function simplify(points: Point[], tolerance: number) {
  const keep = new Set([0, points.length - 1]);
  const stack: Point[] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop() as Point;
    let furthest = -1;
    let maxDistance = tolerance;
    for (let i = start + 1; i < end; i++) {
      const distance = distanceToSegment(points[i], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        furthest = i;
      }
    }
    if (furthest !== -1) {
      keep.add(furthest);
      stack.push([start, furthest], [furthest, end]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((index) => points[index]);
}

export function trackSvg(points: TrackPoint[]) {
  const projected = project(points);
  let tolerance = 0.6;
  let simplified = simplify(projected, tolerance);
  while (simplified.length > TRACK_MAX_POINTS) {
    tolerance *= 1.5;
    simplified = simplify(projected, tolerance);
  }
  const [startX, startY] = simplified[0];
  const [endX, endY] = simplified[simplified.length - 1];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}" role="img" aria-label="Tracciato della gara">` +
    `<path d="${pathFrom(simplified)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${round(startX)}" cy="${round(startY)}" r="6" fill="currentColor"/>` +
    `<circle cx="${round(endX)}" cy="${round(endY)}" r="6" fill="none" stroke="currentColor" stroke-width="3"/>` +
    `</svg>\n`
  );
}

export function profileSvg(points: TrackPoint[]) {
  const elevation = smoothedElevation(points);
  if (!elevation) return undefined;
  const distances = cumulativeDistances(points);
  const total = distances[distances.length - 1];
  const samples: number[] = [];
  for (let step = 0, index = 0; step <= PROFILE_STEPS; step++) {
    const target = (total * step) / PROFILE_STEPS;
    while (index < distances.length - 1 && distances[index] < target) index++;
    samples.push(elevation[index]);
  }
  const min = Math.min(...samples);
  const range = Math.max(Math.max(...samples) - min, 20);
  const line = samples.map((value, step): Point => [
    (step / PROFILE_STEPS) * PROFILE_WIDTH,
    PROFILE_HEIGHT - 8 - ((value - min) / range) * (PROFILE_HEIGHT - 16),
  ]);
  const area: Point[] = [[0, PROFILE_HEIGHT], ...line, [PROFILE_WIDTH, PROFILE_HEIGHT]];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}" preserveAspectRatio="none" role="img" aria-label="Profilo altimetrico della gara">` +
    `<path d="${pathFrom(area)} Z" fill="currentColor" fill-opacity="0.25"/>` +
    `<path d="${pathFrom(line)}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>` +
    `</svg>\n`
  );
}
