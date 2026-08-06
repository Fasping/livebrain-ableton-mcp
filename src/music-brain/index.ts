import type { MidiNote } from "../ableton/types.js";
import { seededRandom } from "./groove-engine.js";
import { defaultStyleProfile, type StyleProfile } from "./style-profile.js";

export class MusicBrain {
  generateBassline(
    input: { bars?: number; seed?: number; rootMidi?: number },
    style: StyleProfile = defaultStyleProfile,
  ): MidiNote[] {
    const root = input.rootMidi ?? style.bass.register[0];
    const random = seededRandom(input.seed ?? 1);
    const steps = Math.max(1, input.bars ?? 4) * 16;
    const motif = [0, 0, 3, 1, 0, 6, 0];
    const notes: MidiNote[] = [];
    for (let step = 0; step < steps; step += 1) {
      const syncopated = step % 4 !== 0;
      const chance = style.bass.density + (syncopated ? style.rhythm.syncopation * 0.12 : -style.bass.rests * 0.18);
      if (random() > chance) continue;
      const interval = motif[step % motif.length] ?? 0;
      notes.push({
        pitch: Math.min(style.bass.register[1], root + interval),
        start: Math.max(0, step * 0.25 + (random() - 0.5) * style.rhythm.microtiming * 0.08),
        duration: random() < 0.7 ? 0.16 : 0.28,
        velocity: Math.round(72 + random() * 34),
      });
    }
    return notes;
  }
}

export * from "./groove-engine.js";
export * from "./style-profile.js";
export * from "./drum-generator.js";
export * from "./mutation-engine.js";
