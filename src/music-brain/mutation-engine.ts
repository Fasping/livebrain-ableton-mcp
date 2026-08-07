import type { MidiNote } from "../ableton/types.js";
import { seededRandom } from "./groove-engine.js";
import { clamp01 } from "./style-profile.js";

export interface MutationOptions {
  amount: number;
  seed: number;
  preservePitches?: number[];
  timing?: boolean;
  velocity?: boolean;
  density?: boolean;
}

export function mutateNotes(notes: MidiNote[], options: MutationOptions): MidiNote[] {
  const random = seededRandom(options.seed);
  const amount = clamp01(options.amount);
  const preserved = new Set(options.preservePitches ?? []);
  return notes.flatMap((note) => {
    if (preserved.has(note.pitch)) return [{ ...note }];
    if (options.density !== false && random() < amount * 0.22) return [];
    const timing = options.timing === false ? 0 : (random() - 0.5) * amount * 0.12;
    const velocity = options.velocity === false ? note.velocity : Math.round(note.velocity + (random() - 0.5) * amount * 30);
    return [{ ...note, start: Math.max(0, note.start + timing), velocity: Math.max(1, Math.min(127, velocity)) }];
  });
}

export function makeLessObvious(notes: MidiNote[], amount: number, seed: number, preservePitches: number[] = [36]): MidiNote[] {
  const random = seededRandom(seed);
  const strength = clamp01(amount);
  const preserved = new Set(preservePitches);
  const phraseLength = 32;
  return notes.flatMap((note, index) => {
    if (preserved.has(note.pitch)) return [{ ...note }];
    if (random() < strength * 0.18) return [];
    const phrase = Math.floor(note.start / phraseLength);
    const delayedCycle = phrase % 2 === 1 && index % Math.max(3, Math.round(8 - strength * 4)) === 0;
    const start = note.start + (delayedCycle ? 0.25 : 0) + (random() < strength * 0.15 ? 0.0625 : 0);
    return [{ ...note, start, velocity: Math.max(1, note.velocity - (random() < 0.35 ? Math.round(12 * strength) : 0)) }];
  });
}
