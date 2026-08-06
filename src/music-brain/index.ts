import { generateGroove } from "./groove-engine.js";
import { defaultStyleProfile, type StyleProfile } from "./style-profile.js";

export interface MidiNote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

export class MusicBrain {
  generateBassline(
    input: { bars?: number; seed?: number; rootMidi?: number },
    style: StyleProfile = defaultStyleProfile,
  ): MidiNote[] {
    const root = input.rootMidi ?? style.register.minMidi;
    return generateGroove(style, input.seed ?? 1, Math.max(1, input.bars ?? 4) * 16)
      .filter((event) => event.active)
      .map((event) => ({
        pitch: root + (style.pitchClasses[event.step % style.pitchClasses.length] ?? 0),
        start: event.step * 0.25 + event.timingOffset,
        duration: event.step % 4 === 3 ? 0.12 : 0.22,
        velocity: event.velocity,
      }));
  }
}

export * from "./groove-engine.js";
export * from "./style-profile.js";
