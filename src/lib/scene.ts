// Deterministic pixel art: the same seed draws the same picture at every build.
export const SCENE_WIDTH = 480;
export const SCENE_HEIGHT = 270;

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const snap = (value: number, step: number) => Math.round(value / step) * step;

export function ridge(seed: number, base: number, height: number, step: number, peaks: number) {
  const next = random(seed);
  const phases = Array.from({ length: 3 }, () => next() * Math.PI * 2);
  let path = `M0 ${SCENE_HEIGHT}`;
  for (let x = 0; x <= SCENE_WIDTH; x += step) {
    const t = (x / SCENE_WIDTH) * Math.PI * 2 * peaks;
    const wave =
      Math.sin(t + phases[0]) * 0.5 +
      Math.sin(t * 2.3 + phases[1]) * 0.3 +
      Math.sin(t * 5.1 + phases[2]) * 0.2;
    const y = snap(base - ((wave + 1) / 2) * height, step);
    path += `V${y}H${x + step}`;
  }
  return `${path}V${SCENE_HEIGHT}Z`;
}

export function stars(seed: number, count: number, maxY: number) {
  const next = random(seed);
  return Array.from({ length: count }, () => ({
    x: Math.floor(next() * SCENE_WIDTH),
    y: Math.floor(next() * maxY),
    size: next() > 0.8 ? 2 : 1,
    twinkle: next() > 0.6,
  }));
}

export function towers(seed: number, base: number) {
  const next = random(seed);
  const result: { x: number; y: number; width: number; height: number; leds: Led[] }[] = [];
  for (let x = 6; x < SCENE_WIDTH;) {
    const width = 22 + Math.floor(next() * 4) * 6;
    const height = snap(50 + next() * 86, 6);
    const y = base - height;
    const leds: Led[] = [];
    for (let row = y + 8; row < base - 6; row += 8) {
      for (let column = x + 4; column < x + width - 4; column += 6) {
        const chance = next();
        if (chance > 0.42) leds.push({ x: column, y: row, tone: chance > 0.86 ? 2 : 1 });
      }
    }
    result.push({ x, y, width, height, leds });
    x += width + 6 + Math.floor(next() * 3) * 6;
  }
  return result;
}

interface Led {
  x: number;
  y: number;
  tone: 1 | 2;
}

// A puffy cloud drawn as stacked rows, widest at the bottom.
export function cloud(width: number) {
  const unit = Math.round(width / 8);
  return [
    { x: unit * 2, y: 0, width: unit * 3 },
    { x: unit, y: unit, width: unit * 6 },
    { x: 0, y: unit * 2, width: unit * 8 },
  ].map((row) => ({ ...row, height: unit }));
}
