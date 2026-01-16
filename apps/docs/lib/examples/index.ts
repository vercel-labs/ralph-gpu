export type { Example } from './types';

import { gradient } from './gradient';
import { wave } from './wave';
import { colorCycle } from './color-cycle';
import { raymarching } from './raymarching';
import { noise } from './noise';
import { metaballs } from './metaballs';
import { fractal } from './fractal';
import { alienPlanet } from './alien-planet';
import { fluid } from './fluid';
import { triangleParticles } from './triangle-particles';

export const examples = [
  gradient,
  wave,
  colorCycle,
  raymarching,
  noise,
  metaballs,
  fractal,
  alienPlanet,
  fluid,
  triangleParticles,
];

export function getExampleBySlug(slug: string) {
  return examples.find((e) => e.slug === slug);
}

export function getAllExamples() {
  return examples;
}

// Re-export individual examples for direct imports
export {
  gradient,
  wave,
  colorCycle,
  raymarching,
  noise,
  metaballs,
  fractal,
  alienPlanet,
  fluid,
  triangleParticles,
};
