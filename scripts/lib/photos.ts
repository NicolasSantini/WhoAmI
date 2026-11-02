import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const MAX_SIZE = 1600;
const THUMB_WIDTH = 480;
const MEDAL_SIZE = 800;
const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);

export interface Photo {
  id: string;
  avif: string;
  webp: string;
  thumb: string;
  width: number;
  height: number;
}

// sharp drops every metadata block unless asked to keep it: EXIF, GPS, XMP and IPTC do not survive.
const pipeline = (source: string, size: number) =>
  sharp(source).rotate().resize({
    width: size,
    height: size,
    fit: 'inside',
    withoutEnlargement: true,
  });

export async function processPhotos(sourceDir: string, outputDir: string, slug: string) {
  if (!existsSync(sourceDir)) return [];
  mkdirSync(outputDir, { recursive: true });
  const photos: Photo[] = [];

  for (const name of readdirSync(sourceDir).sort()) {
    const source = join(sourceDir, name);
    if (!SUPPORTED.has(extname(name).toLowerCase())) {
      console.warn(`  salto ${name}: formato non supportato, convertila in JPG`);
      continue;
    }
    // The name comes from the content: file names can hide dates and times.
    const hash = createHash('sha256').update(readFileSync(source)).digest('hex').slice(0, 8);
    const id = `foto-${hash}`;
    const avif = join(outputDir, `${id}.avif`);
    const webp = join(outputDir, `${id}.webp`);
    const thumb = join(outputDir, `${id}-thumb.webp`);

    if (!existsSync(avif)) await pipeline(source, MAX_SIZE).avif({ quality: 50 }).toFile(avif);
    if (!existsSync(webp)) await pipeline(source, MAX_SIZE).webp({ quality: 76 }).toFile(webp);
    if (!existsSync(thumb)) await pipeline(source, THUMB_WIDTH).webp({ quality: 72 }).toFile(thumb);

    const { width, height } = await sharp(webp).metadata();
    photos.push({
      id,
      avif: `/races/${slug}/${id}.avif`,
      webp: `/races/${slug}/${id}.webp`,
      thumb: `/races/${slug}/${id}-thumb.webp`,
      width,
      height,
    });
  }

  const current = new Set(photos.map(({ id }) => id));
  for (const name of readdirSync(outputDir)) {
    const match = name.match(/^(foto-[0-9a-f]{8})/);
    if (match && !current.has(match[1])) rmSync(join(outputDir, name));
  }
  return photos;
}

async function processMedalSide(source: string, outputDir: string, name: string) {
  mkdirSync(outputDir, { recursive: true });
  await pipeline(source, MEDAL_SIZE)
    .webp({ quality: 85, alphaQuality: 100 })
    .toFile(join(outputDir, name));
}

export async function processMedal(sourceDir: string, outputDir: string, slug: string) {
  const find = (base: string) =>
    ['.png', '.webp', '.jpg', '.jpeg']
      .map((extension) => join(sourceDir, `${base}${extension}`))
      .find(existsSync);
  const front = find('medal');
  const back = find('medal-back');
  if (!front) return undefined;
  await processMedalSide(front, outputDir, 'medal.webp');
  if (back) await processMedalSide(back, outputDir, 'medal-back.webp');
  return {
    front: `/races/${slug}/medal.webp`,
    ...(back ? { back: `/races/${slug}/medal-back.webp` } : {}),
  };
}
