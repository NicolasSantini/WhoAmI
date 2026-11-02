import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  certificationSchema,
  educationSchema,
  experienceSchema,
  journeySchema,
  projectSchema,
  raceSchema,
  skillGroupSchema,
  trainingYearSchema,
  volunteeringSchema,
} from './content/schemas.ts';

const yamlFolder = (folder: string) => glob({ pattern: '*.yaml', base: `./src/content/${folder}` });

export const collections = {
  experience: defineCollection({ loader: yamlFolder('experience'), schema: experienceSchema }),
  education: defineCollection({ loader: yamlFolder('education'), schema: educationSchema }),
  certifications: defineCollection({
    loader: yamlFolder('certifications'),
    schema: certificationSchema,
  }),
  skills: defineCollection({
    loader: file('./src/content/skills/skills.yaml'),
    schema: skillGroupSchema,
  }),
  volunteering: defineCollection({
    loader: yamlFolder('volunteering'),
    schema: volunteeringSchema,
  }),
  projects: defineCollection({ loader: yamlFolder('projects'), schema: projectSchema }),
  journey: defineCollection({
    loader: file('./src/content/journey/journey.yaml'),
    schema: journeySchema,
  }),
  training: defineCollection({
    loader: file('./src/content/training/aggregates.yaml'),
    schema: trainingYearSchema,
  }),
  races: defineCollection({
    loader: glob({
      pattern: '*/index.md',
      base: './src/content/races',
      generateId: ({ entry }) => entry.split('/')[0],
    }),
    schema: raceSchema,
  }),
};
