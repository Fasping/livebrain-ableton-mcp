import type { MidiNote } from "../ableton/types.js";
import type { DimensionLock } from "../locks/lock-store.js";
import { isPreserved } from "../locks/lock-store.js";
import { seededRandom } from "./groove-engine.js";

export interface BassLessObviousOptions {
  amount: number;
  seed: number;
  fewerNotes?: number;
  moreRests?: number;
  longerCycle?: number;
  delayedResolution?: number;
  slightChromaticism?: number;
  phraseOffset?: number;
  pitchMutation?: number;
  preserveRhythm?: boolean;
}

export function makeBassLessObvious(notes: MidiNote[], options: BassLessObviousOptions, lock?: DimensionLock): MidiNote[] {
  if (options.amount <= 0) return structuredClone(notes);
  const random = seededRandom(options.seed);
  const amount = clamp(options.amount);
  const preserveNotes = lock ? isPreserved(lock, "bass.notes") : false;
  const preservePitch = lock ? isPreserved(lock, "bass.pitch") : false;
  const preserveTiming = options.preserveRhythm || (lock ? isPreserved(lock, "bass.timing") || isPreserved(lock, "groove") : false);
  const maxTime = Math.max(0, ...notes.map((note) => note.start + note.duration));
  const phrase = maxTime >= 64 ? 64 : maxTime >= 32 ? 32 : 16;
  let strangeEventUsed = false;
  return notes.flatMap((note, index) => {
    const phraseIndex = Math.floor(note.start / phrase);
    const cycleSelective = (phraseIndex + index) % Math.max(2, Math.round(5 - clamp(options.longerCycle ?? 0) * 3)) === 0;
    const removal = amount * ((options.fewerNotes ?? .35) * .22 + (options.moreRests ?? .35) * .18) * (cycleSelective ? 1.4 : .55);
    if (!preserveNotes && !isPreserved(lock ?? emptyLock(), "bass.density") && random() < removal) return [];
    let pitch = note.pitch;
    if (!preservePitch) {
      const nearPhraseEnd = note.start % phrase > phrase - 2;
      if (nearPhraseEnd && random() < amount * (options.delayedResolution ?? .3) * .35) pitch += random() < .5 ? 1 : -1;
      else if (random() < amount * (options.pitchMutation ?? .2) * .12) pitch += random() < .5 ? 3 : -2;
      if (!strangeEventUsed && random() < amount * (options.slightChromaticism ?? .25) * .08) { pitch += random() < .5 ? 1 : -1; strangeEventUsed = true; }
    }
    let start = note.start;
    if (!preserveTiming && random() < amount * (options.phraseOffset ?? .2) * .18) start = Math.max(0, start + (random() < .5 ? .25 : -.25));
    return [{ ...note, pitch: Math.max(0, Math.min(127, pitch)), start }];
  });
}

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
function emptyLock(): DimensionLock { return { scope: {}, preserve: [], mutate: [], updatedAt: "" }; }
