import type { MidiNote } from "../ableton/types.js";
import { seededRandom } from "./groove-engine.js";

export type MusicalMode = "Major" | "Minor" | "Dorian" | "Phrygian" | "Lydian" | "Mixolydian";

const scales: Record<MusicalMode, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11], Minor: [0, 2, 3, 5, 7, 8, 10], Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10], Lydian: [0, 2, 4, 6, 7, 9, 11], Mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export function scaleIntervals(mode: MusicalMode) { return scales[mode]; }

export function generateHarmony(input: { bars: number; seed: number; rootMidi: number; mode: MusicalMode; sparse?: boolean }): MidiNote[] {
  const random = seededRandom(input.seed + 301);
  const scale = scales[input.mode];
  const progression = input.sparse ? [0, 3] : input.mode === "Major" ? [0, 4, 5, 3] : [0, 5, 2, 6];
  const chordBars = input.sparse ? 4 : 2;
  const notes: MidiNote[] = [];
  for (let bar = 0; bar < input.bars; bar += chordBars) {
    const degree = progression[Math.floor(bar / chordBars) % progression.length]!;
    const root = input.rootMidi + scale[degree % 7]! + (degree >= 7 ? 12 : 0);
    const chord = [root, input.rootMidi + scale[(degree + 2) % 7]! + (degree + 2 >= 7 ? 12 : 0), input.rootMidi + scale[(degree + 4) % 7]! + (degree + 4 >= 7 ? 12 : 0), input.rootMidi + scale[(degree + 6) % 7]! + (degree + 6 >= 7 ? 12 : 0)];
    const start = bar * 4 + (input.sparse && random() > .55 ? .5 : 0);
    const duration = input.sparse ? .22 + random() * .35 : chordBars * 4 - .12;
    chord.forEach((pitch, index) => notes.push({ pitch: Math.min(96, pitch + (index > 1 ? 12 : 0)), start, duration, velocity: Math.round(58 + random() * 20 - index * 3) }));
  }
  return notes;
}
