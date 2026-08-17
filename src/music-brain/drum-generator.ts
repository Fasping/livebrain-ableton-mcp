import type { MidiNote } from "../ableton/types.js";
import { generateGroove, seededRandom, type InstrumentRole } from "./groove-engine.js";
import type { StyleProfile } from "./style-profile.js";

export interface DrumGenerationOptions {
  bars: number;
  seed: number;
  roles?: InstrumentRole[];
  preserveKick?: boolean;
  pattern?: "four-on-floor" | "broken" | "backbeat" | "half-time";
}

const pitches: Record<InstrumentRole, number> = {
  kick: 36, snare: 38, closedHat: 42, openHat: 46,
  percussionA: 39, percussionB: 56, ghost: 37,
};

export function generateDrumGroove(profile: StyleProfile, options: DrumGenerationOptions): MidiNote[] {
  const pattern = options.pattern ?? "four-on-floor";
  const roles = options.roles ?? (pattern === "four-on-floor"
    ? ["kick", "closedHat", "openHat", "percussionA", "percussionB", "ghost"]
    : ["kick", "snare", "closedHat", "openHat", "percussionA", "percussionB", "ghost"]);
  const random = seededRandom(options.seed + 991);
  const notes: MidiNote[] = [];

  for (const [roleIndex, role] of roles.entries()) {
    const groove = generateGroove(profile, options.seed + roleIndex * 101, options.bars, role);
    for (const event of groove.events) {
      let active = event.active;
      if (role === "kick") active = kickActive(pattern, event.step, random);
      if (role === "snare") active = snareActive(pattern, event.step, random);
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

function kickActive(pattern: NonNullable<DrumGenerationOptions["pattern"]>, step: number, random: () => number) {
  const position = step % 16;
  if (pattern === "four-on-floor") return step % 4 === 0 && (position === 0 || random() > .12);
  if (pattern === "backbeat") return [0, 7, 10].includes(position) || (position === 14 && random() < .28);
  if (pattern === "half-time") return [0, 6, 11].includes(position) || (position === 14 && random() < .18);
  return [0, 3, 10].includes(position) || (position === 13 && random() < .45);
}

function snareActive(pattern: NonNullable<DrumGenerationOptions["pattern"]>, step: number, random: () => number) {
  const position = step % 16;
  if (pattern === "four-on-floor") return false;
  if (pattern === "half-time") return position === 8 || (position === 15 && random() < .18);
  if (pattern === "broken") return position === 4 || position === 12 || (position === 15 && random() < .3);
  return position === 4 || position === 12;
}
