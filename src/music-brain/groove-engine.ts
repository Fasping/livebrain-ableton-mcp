import { clamp01, type StyleProfile } from "./style-profile.js";

export type InstrumentRole = "kick" | "snare" | "closedHat" | "openHat" | "percussionA" | "percussionB" | "ghost";

export interface StepEvent {
  step: number;
  role: InstrumentRole;
  active: boolean;
  velocity: number;
  timingOffset: number;
  probability: number;
  accent: number;
}

export interface Groove {
  stepsPerBar: number;
  bars: number;
  seed: number;
  events: StepEvent[];
}

export function seededRandom(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateGroove(profile: StyleProfile, seed = 1, bars = 1, role: InstrumentRole = "percussionA"): Groove {
  const random = seededRandom(seed);
  const totalSteps = bars * 16;
  const events = Array.from({ length: totalSteps }, (_, step): StepEvent => {
    const downbeat = step % 16 === 0;
    const offbeat = step % 4 === 2;
    const expected = step % 4 === 0;
    const syncopatedBoost = !expected ? profile.rhythm.syncopation * 0.18 : 0;
    const silenceGate = profile.rhythm.silence * (expected ? 0.18 : 0.4);
    const probability = clamp01(profile.rhythm.density + syncopatedBoost - silenceGate + (downbeat ? 0.12 : 0));
    const active = random() < probability;
    const accent = clamp01((downbeat ? 0.9 : offbeat ? 0.62 : 0.35) + (random() - 0.5) * 0.15);
    const human = (random() - 0.5) * profile.rhythm.microtiming * 0.12;
    const swing = step % 2 ? profile.rhythm.swing * 0.12 : 0;
    return {
      step, role, active,
      velocity: Math.round(52 + accent * 65),
      timingOffset: human + swing,
      probability,
      accent,
    };
  });
  return { stepsPerBar: 16, bars, seed, events };
}

export function mutateGroove(groove: Groove, amount: number, seed: number): Groove {
  const random = seededRandom(seed);
  const strength = clamp01(amount);
  return {
    ...groove,
    seed,
    events: groove.events.map((event) => {
      if (random() > strength * 0.34) return { ...event };
      const removeRatherThanAdd = event.active ? random() < 0.72 : false;
      return {
        ...event,
        active: removeRatherThanAdd ? false : true,
        velocity: Math.max(1, Math.min(127, Math.round(event.velocity + (random() - 0.5) * 28 * strength))),
        timingOffset: event.timingOffset + (random() - 0.5) * 0.08 * strength,
      };
    }),
  };
}

export function extractGrooveFeatures(groove: Groove) {
  const active = groove.events.filter((event) => event.active);
  const syncopated = active.filter((event) => event.step % 4 !== 0);
  return {
    density: active.length / Math.max(1, groove.events.length),
    syncopation: syncopated.length / Math.max(1, active.length),
    meanVelocity: active.reduce((sum, event) => sum + event.velocity, 0) / Math.max(1, active.length),
    silenceRatio: 1 - active.length / Math.max(1, groove.events.length),
  };
}
