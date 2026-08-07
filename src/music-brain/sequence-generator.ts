import type { MidiNote } from "../ableton/types.js";
import { seededRandom } from "./groove-engine.js";
import type { StyleProfile } from "./style-profile.js";

export type SequenceKind = "shortSequence" | "alienStab" | "bleep" | "chordFragment" | "oneShot";

export interface SequenceGenerationOptions {
  bars: number;
  seed: number;
  kind?: SequenceKind;
  rootMidi?: number;
}

export function generateSequence(profile: StyleProfile, options: SequenceGenerationOptions): MidiNote[] {
  const random = seededRandom(options.seed);
  const kind = options.kind ?? "shortSequence";
  const root = options.rootMidi ?? 60;
  const totalSteps = options.bars * 16;
  const cycle = Math.max(3, Math.round(profile.sequence.cycleSteps));
  const alienIntervals = [0, 1, 3, 6, 10, 11, -1, 7];
  const motif = Array.from({ length: cycle }, (_, index) => ({
    active: random() < profile.sequence.density * (index === 0 ? 1.25 : 1),
    interval: random() < profile.sequence.chromaticism ? alienIntervals[Math.floor(random() * alienIntervals.length)]! : [0, 3, 7][index % 3]!,
    velocity: Math.round(62 + random() * 42),
  }));
  const notes: MidiNote[] = [];
  for (let step = 0; step < totalSteps; step += 1) {
    const event = motif[step % cycle]!;
    const rare = step > cycle && random() < profile.sequence.rareEventProbability / 16;
    if (!event.active && !rare) continue;
    const interval = rare ? alienIntervals[Math.floor(random() * alienIntervals.length)]! : event.interval;
    const pitch = clampMidi(root + interval, profile.sequence.register);
    const start = Math.max(0, step * .25 + (random() - .5) * profile.rhythm.microtiming * .06);
    const duration = kind === "alienStab" ? .08 : kind === "bleep" ? .04 : kind === "oneShot" ? .45 : .14;
    notes.push({ pitch, start, duration, velocity: event.velocity });
    const chord = kind === "chordFragment" || random() < profile.sequence.chordProbability / 8;
    if (chord) notes.push({ pitch: clampMidi(pitch + (random() < .5 ? 6 : 10), profile.sequence.register), start, duration, velocity: Math.max(1, event.velocity - 14) });
  }
  return notes;
}

function clampMidi(value: number, register: [number, number]) { return Math.max(register[0], Math.min(register[1], value)); }
