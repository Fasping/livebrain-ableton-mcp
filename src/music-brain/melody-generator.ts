import type { MidiNote } from "../ableton/types.js";
import { seededRandom } from "./groove-engine.js";
import { scaleIntervals, type MusicalMode } from "./harmony-generator.js";

export function generateMelody(input: { bars: number; seed: number; rootMidi: number; mode: MusicalMode; density: number; weirdness: number }): MidiNote[] {
  const random = seededRandom(input.seed + 701);
  const scale = scaleIntervals(input.mode);
  const motifLength = input.weirdness > .7 ? 7 : 8;
  const contour = Array.from({ length: motifLength }, (_, index) => {
    const base = [0, 2, 4, 3, 1, 5, 2, 0][index % 8]!;
    return Math.max(0, Math.min(6, base + (random() < input.weirdness * .25 ? (random() < .5 ? -1 : 1) : 0)));
  });
  const notes: MidiNote[] = [];
  const totalSteps = input.bars * 8;
  for (let step = 0; step < totalSteps; step += 1) {
    const phrase = Math.floor(step / 32);
    const position = step % motifLength;
    const downbeat = step % 8 === 0;
    if (!downbeat && random() > input.density) continue;
    if (step % 32 > 23 && phrase % 2 === 0) continue;
    let degree = contour[position]!;
    if (phrase > 0 && random() < .12 + input.weirdness * .12) degree = (degree + (random() < .5 ? 1 : 6)) % 7;
    const octave = random() < .12 ? 12 : 0;
    notes.push({
      pitch: Math.min(108, input.rootMidi + scale[degree]! + octave),
      start: step * .5 + (random() - .5) * .025,
      duration: downbeat ? .42 : random() < .3 ? .18 : .32,
      velocity: Math.round(64 + random() * 27 + (downbeat ? 8 : 0)),
    });
  }
  return notes;
}
