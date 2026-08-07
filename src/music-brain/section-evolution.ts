import type { MidiNote } from "../ableton/types.js";
import type { DimensionLock } from "../locks/lock-store.js";
import { isPreserved } from "../locks/lock-store.js";
import { seededRandom } from "./groove-engine.js";

export interface SectionEvolutionOptions { seed: number; amount: number; sourceBars?: number; targetBars?: number }

export function evolveSection(notes: MidiNote[], options: SectionEvolutionOptions, lock?: DimensionLock): MidiNote[] {
  const sourceBars = options.sourceBars ?? 16;
  const targetBars = options.targetBars ?? 64;
  if (targetBars < sourceBars || targetBars % sourceBars !== 0) throw new Error("targetBars must be a multiple of sourceBars");
  const sourceBeats = sourceBars * 4;
  const repetitions = targetBars / sourceBars;
  const random = seededRandom(options.seed);
  const amount = Math.max(0, Math.min(1, options.amount));
  const preserveNotes = lock ? isPreserved(lock, "bass.notes") || isPreserved(lock, "drums.notes") : false;
  const preserveTiming = lock ? isPreserved(lock, "groove") || isPreserved(lock, "bass.timing") || isPreserved(lock, "drums.timing") : false;
  const output: MidiNote[] = [];
  for (let cycle = 0; cycle < repetitions; cycle += 1) {
    for (const note of notes.filter((item) => item.start < sourceBeats)) {
      if (cycle > 0 && !preserveNotes) {
        const subtractionPhase = cycle === 2;
        const removeChance = amount * (subtractionPhase ? .16 : .05);
        if (random() < removeChance) continue;
      }
      const velocityDelta = cycle === 0 || amount === 0 ? 0 : Math.round((random() - .5) * 18 * amount);
      const timingDelta = cycle === 0 || preserveTiming || amount === 0 ? 0 : (random() - .5) * .06 * amount;
      let pitch = note.pitch;
      if (cycle === repetitions - 1 && !preserveNotes && random() < amount * .025) pitch = Math.max(0, Math.min(127, pitch + (random() < .5 ? 1 : -1)));
      output.push({ ...note, pitch, start: note.start + cycle * sourceBeats + timingDelta, velocity: Math.max(1, Math.min(127, note.velocity + velocityDelta)) });
    }
  }
  return output.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}
