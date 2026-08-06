import assert from "node:assert/strict";
import test from "node:test";
import { generateDrumGroove } from "../music-brain/drum-generator.js";
import { extractGrooveFeatures, generateGroove } from "../music-brain/groove-engine.js";
import { afterhours2019 } from "../music-brain/style-profile.js";

test("groove generation is deterministic", () => {
  assert.deepEqual(generateGroove(afterhours2019, 42, 4), generateGroove(afterhours2019, 42, 4));
});

test("generated groove respects ranges", () => {
  const groove = generateGroove(afterhours2019, 7, 8);
  assert.equal(groove.events.length, 128);
  for (const event of groove.events) {
    assert.ok(event.velocity >= 1 && event.velocity <= 127);
    assert.ok(event.probability >= 0 && event.probability <= 1);
  }
  const features = extractGrooveFeatures(groove);
  assert.ok(features.density > 0 && features.density < 0.8);
  assert.ok(features.silenceRatio > 0.2);
});

test("drum generator preserves restrained four-on-the-floor kick", () => {
  const notes = generateDrumGroove(afterhours2019, { bars: 4, seed: 22 });
  const kicks = notes.filter((note) => note.pitch === 36);
  assert.ok(kicks.length >= 12 && kicks.length <= 16);
  assert.ok(notes.every((note) => note.start >= 0 && note.velocity >= 1 && note.velocity <= 127));
});
