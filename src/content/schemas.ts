import { z } from 'astro/zod';

const text = z.string().trim().min(1, 'non può essere vuoto');
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'usa il formato AAAA-MM');
const duration = z
  .string()
  .regex(/^(\d{1,3}:)?[0-5]?\d:[0-5]\d$/, 'usa il formato H:MM:SS o MM:SS');
const pace = z.string().regex(/^\d{1,2}:[0-5]\d\/km$/, 'usa il formato M:SS/km');
const km = z.number().nonnegative();
const meters = z.number().int().nonnegative();
const webPath = z.string().regex(/^\/races\//, 'deve iniziare con /races/');

export const experienceSchema = z.object({
  role: text,
  company: text,
  engagement: text.optional(),
  start: yearMonth,
  end: yearMonth.optional(),
  summary: text,
  highlights: z.array(z.object({ value: text, label: text })).default([]),
  pipeline: z.array(z.object({ stage: text, detail: text })).default([]),
  sections: z.array(z.object({ title: text.optional(), points: z.array(text).min(1) })).min(1),
});

export const educationSchema = z.object({
  title: text,
  institution: text,
  start: yearMonth,
  end: yearMonth,
  grade: text.optional(),
  note: text.optional(),
});

export const certificationSchema = z.object({
  name: text,
  issuer: text,
  status: z.enum(['ottenuta', 'in-preparazione']),
  date: yearMonth.optional(),
  target: text.optional(),
  url: z.url().optional(),
});

export const skillGroupSchema = z.object({
  id: text,
  group: text,
  order: z.number().int(),
  items: z.array(text).min(1),
});

export const volunteeringSchema = z.object({
  role: text,
  organisation: text,
  start: yearMonth,
  end: yearMonth.optional(),
  note: text,
});

export const projectSchema = z.object({
  name: text,
  order: z.number().int(),
  description: text,
});

export const journeySchema = z.object({
  id: text,
  order: z.number().int(),
  when: text,
  title: text,
  text: text,
});

// Optional hand-kept yearly totals: no tracks, no dates, only kilometres.
export const trainingYearSchema = z.object({
  id: text,
  year: z.number().int().min(2000),
  swimKm: km.default(0),
  bikeKm: km.default(0),
  runKm: km.default(0),
  elevationM: meters.default(0),
});

export const raceSchema = z
  .object({
    title: text,
    status: z.enum(['upcoming', 'done']),
    kind: z.enum(['corsa', 'ocr', 'ultra', 'triathlon', 'bici', 'nuoto']),
    date: z.coerce.date({ error: 'usa il formato AAAA-MM-GG' }).optional(),
    dateLabel: text.optional(),
    dateConfirmed: z.boolean().default(true),
    location: text.optional(),
    draft: z.boolean().default(false),
    roadmap: z.boolean().default(false),
    finalGoal: z.boolean().default(false),
    goal: text.optional(),
    distanceKm: km.optional(),
    elevationGainM: meters.optional(),
    legs: z.object({ swimKm: km, bikeKm: km, runKm: km }).optional(),
    time: duration.optional(),
    pace: pace.optional(),
    links: z.object({ strava: z.url().optional(), results: z.url().optional() }).default({}),
    photoAlts: z.record(z.string(), text).default({}),
    // Rewritten by build-race on every run: never edit by hand.
    auto: z
      .object({
        distanceKm: km.optional(),
        movingTime: duration.optional(),
        pace: pace.optional(),
        elevationGainM: meters.optional(),
        photos: z
          .array(
            z.object({
              id: text,
              avif: webPath,
              webp: webPath,
              thumb: webPath,
              width: z.number().int().positive(),
              height: z.number().int().positive(),
            }),
          )
          .default([]),
        medal: z.object({ front: webPath, back: webPath.optional() }).optional(),
      })
      .optional(),
    // Written by build-race only after explicit confirmation.
    results: z
      .object({
        officialTime: duration.optional(),
        overallRank: z.number().int().positive().optional(),
        overallOf: z.number().int().positive().optional(),
        categoryRank: z.number().int().positive().optional(),
        categoryOf: z.number().int().positive().optional(),
        category: text.optional(),
      })
      .optional(),
  })
  .refine((race) => race.date || race.dateLabel, {
    message: 'serve "date" oppure "dateLabel" (per esempio "Luglio 2027")',
    path: ['date'],
  })
  .refine((race) => race.status === 'upcoming' || race.date, {
    message: 'una gara fatta deve avere "date"',
    path: ['date'],
  });

export type Race = z.infer<typeof raceSchema>;
