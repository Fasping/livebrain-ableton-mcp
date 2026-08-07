import type { MidiNote } from "../ableton/types.js";
import { seededRandom } from "./groove-engine.js";
import type { StyleProfile } from "./style-profile.js";

export interface BassGenerationOptions {
  bars: number;
  seed: number;
  rootMidi?: number;
  motifLength?: number;
  cycleBars?: number;
}

export function generateBass(profile: StyleProfile, options: BassGenerationOptions): MidiNote[] {
  const random = seededRandom(options.seed);
  const steps = options.bars * 16;
  const root = options.rootMidi ?? Math.max(profile.bass.register[0], 30);
  const motifLength = options.motifLength ?? (profile.rhythm.repetition > .7 ? 7 : 11);
  const cycleSteps = (options.cycleBars ?? (profile.bass.rests > .6 ? 4 : 2)) * 16;
  const intervals = [0, 0, 3, -1, 0, 6, 1, 0, -2, 5, 0];
  const motif = Array.from({ length: motifLength }, (_, index) => ({
    active: random() < profile.bass.density * (index % 2 ? 1.25 : .8) * (1 - profile.bass.rests * .35),
    interval: random() < profile.bass.chromaticism * .32 ? intervals[Math.floor(random() * intervals.length)]! : (index % 3 === 0 ? 0 : intervals[index % intervals.length]!),
    velocity: Math.round(72 + random() * 34),
  }));
  const notes: MidiNote[] = [];
  for (let step = 0; step < steps; step += 1) {
    const position = step % cycleSteps;
    const event = motif[position % motif.length]!;
    if (!event.active || random() < profile.bass.rests * .14) continue;
    const mutationCycle = Math.floor(step / cycleSteps);
    const mutate = mutationCycle > 0 && random() < profile.rhythm.mutationRate * .12;
    const interval = event.interval + (mutate ? (random() < .5 ? 1 : -1) : 0);
    const pitch = Math.max(profile.bass.register[0], Math.min(profile.bass.register[1], root + interval));
    const syncOffset = step % 4 === 0 && profile.rhythm.syncopation > .65 && random() < .3 ? .25 : 0;
    notes.push({
      pitch, start: Math.max(0, step * .25 + syncOffset + (random() - .5) * profile.rhythm.microtiming * .08),
      duration: random() < .8 ? .14 : .28, velocity: Math.max(1, Math.min(127, event.velocity + Math.round((random() - .5) * 10))),
    });
  }
  return notes;
}
