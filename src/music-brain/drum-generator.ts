import type { MidiNote } from "../ableton/types.js";
import { generateGroove, seededRandom, type InstrumentRole } from "./groove-engine.js";
import type { StyleProfile } from "./style-profile.js";

export interface DrumGenerationOptions {
  bars: number;
  seed: number;
  roles?: InstrumentRole[];
  preserveKick?: boolean;
}

const pitches: Record<InstrumentRole, number> = {
  kick: 36, snare: 38, closedHat: 42, openHat: 46,
  percussionA: 39, percussionB: 56, ghost: 37,
};

export function generateDrumGroove(profile: StyleProfile, options: DrumGenerationOptions): MidiNote[] {
  const roles = options.roles ?? ["kick", "closedHat", "openHat", "percussionA", "percussionB", "ghost"];
  const random = seededRandom(options.seed + 991);
  const notes: MidiNote[] = [];

  for (const [roleIndex, role] of roles.entries()) {
    const groove = generateGroove(profile, options.seed + roleIndex * 101, options.bars, role);
    for (const event of groove.events) {
      let active = event.active;
      if (role === "kick") active = event.step % 4 === 0 && (event.step % 16 === 0 || random() > 0.12);
      if (role === "openHat") active = event.step % 8 === 6 && random() < profile.drums.hatDensity;
      if (role === "ghost") active = event.active && random() < profile.drums.ghostDensity;
      if (!active) continue;
      notes.push({
        pitch: pitches[role],
        start: Math.max(0, event.step * 0.25 + event.timingOffset),
        duration: role === "openHat" ? 0.32 : role === "kick" ? 0.12 : 0.08,
        velocity: role === "ghost" ? Math.min(70, event.velocity) : event.velocity,
        probability: role === "kick" ? 1 : Math.max(0.55, event.probability),
      });
    }
  }
  return notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}
