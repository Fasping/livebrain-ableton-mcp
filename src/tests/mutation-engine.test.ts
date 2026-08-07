import assert from "node:assert/strict";
import test from "node:test";
import type { MidiNote } from "../ableton/types.js";
import { makeLessObvious, mutateNotes } from "../music-brain/mutation-engine.js";

const source: MidiNote[] = Array.from({ length: 32 }, (_, step) => ({
  pitch: step % 4 === 0 ? 36 : 42,
  start: step * 0.25,
  duration: 0.1,
  velocity: 90,
}));

test("zero mutation preserves notes", () => {
  assert.deepEqual(mutateNotes(source, { amount: 0, seed: 1 }), source);
});

test("mutation is deterministic and preserves kick", () => {
  const options = { amount: 0.8, seed: 99, preservePitches: [36] };
  const first = mutateNotes(source, options);
  assert.deepEqual(first, mutateNotes(source, options));
  assert.deepEqual(first.filter((note) => note.pitch === 36), source.filter((note) => note.pitch === 36));
});

test("less obvious preserves identity instead of replacing everything", () => {
  const result = makeLessObvious(source, 0.45, 123, [36]);
  assert.ok(result.length > source.length * 0.5);
  assert.deepEqual(result.filter((note) => note.pitch === 36), source.filter((note) => note.pitch === 36));
});
