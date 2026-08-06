import type { StyleProfile } from "./style-profile.js";

export interface StepEvent {
  step: number;
  active: boolean;
  velocity: number;
  timingOffset: number;
  probability: number;
}

function randomGenerator(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateGroove(profile: StyleProfile, seed = 1, steps = 16): StepEvent[] {
  const random = randomGenerator(seed);
  const range = profile.velocity.max - profile.velocity.min;

  return Array.from({ length: steps }, (_, step) => {
    const anchor = step % 4 === 0;
    const probability = Math.min(1, profile.density + (anchor ? 0.28 : 0));
    return {
      step,
      active: random() < probability,
      velocity: Math.min(127, Math.round(profile.velocity.min + random() * range + (anchor ? 8 : 0))),
      timingOffset: (step % 2 ? profile.swing : 0) + (random() - 0.5) * 0.02,
      probability,
    };
  });
}
