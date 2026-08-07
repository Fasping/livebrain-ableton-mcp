import assert from "node:assert/strict";
import test from "node:test";
import { generateBass } from "../music-brain/bass-generator.js";
import { generateDrumGroove } from "../music-brain/drum-generator.js";
import { afterhours2019 } from "../music-brain/style-profile.js";
import type { ReferenceTrack } from "../reference/models.js";
import { buildReferenceProfile, explainProfile } from "../reference/profile-builder.js";
import { createEffectiveStyleProfile } from "../style/effective-profile.js";

test("effective overrides alter generation but never mutate stored profile", () => {
  const source = structuredClone(afterhours2019);
  const spacious = createEffectiveStyleProfile(source, { bpm: 131, traits: { space: .95, weirdness: .8, electro: .2 } });
  assert.deepEqual(source, afterhours2019);
  assert.equal(spacious.tempo.preferred, 131);
  assert.ok(spacious.rhythm.density < source.rhythm.density);
  assert.ok(spacious.bass.rests > source.bass.rests);
});

test("space and density cause measurable note-count differences", () => {
  const sparse = createEffectiveStyleProfile(afterhours2019, { traits: { space: 1 } });
  const dense = structuredClone(afterhours2019);
  dense.rhythm.density = .8; dense.rhythm.silence = .1; dense.drums.hatDensity = .8;
  const sparseNotes = generateDrumGroove(sparse, { bars: 32, seed: 700 });
  const denseNotes = generateDrumGroove(dense, { bars: 32, seed: 700 });
  assert.ok(denseNotes.length > sparseNotes.length * 1.3);
});

test("syncopation changes actual off-grid placement", () => {
  const low = structuredClone(afterhours2019); low.rhythm.syncopation = 0; low.rhythm.density = .45;
  const high = structuredClone(low); high.rhythm.syncopation = 1;
  const ratio = (notes: ReturnType<typeof generateDrumGroove>) => notes.filter((note) => note.pitch !== 36 && Math.round(note.start * 4) % 4 !== 0).length / Math.max(1, notes.length);
  assert.ok(ratio(generateDrumGroove(high, { bars: 64, seed: 81 })) > ratio(generateDrumGroove(low, { bars: 64, seed: 81 })));
});

test("bass generation is deterministic and seed-sensitive", () => {
  const first = generateBass(afterhours2019, { bars: 16, seed: 9 });
  assert.deepEqual(first, generateBass(afterhours2019, { bars: 16, seed: 9 }));
  assert.notDeepEqual(first, generateBass(afterhours2019, { bars: 16, seed: 10 }));
  assert.ok(first.every((note) => note.pitch >= afterhours2019.bass.register[0] && note.pitch <= afterhours2019.bass.register[1]));
});

test("rating and influence are independent per DNA dimension", () => {
  const profile = buildReferenceProfile("dna", [
    prior("a", { groove: 10, bass: 10 }, { groove: 1, bass: 0 }),
    prior("b", { groove: 2, bass: 3 }, { groove: 0, bass: 1 }),
  ]);
  assert.equal(profile.human.groove?.weightedMean, 10);
  assert.equal(profile.human.bass?.weightedMean, 3);
  assert.equal(profile.contributions.groove?.[0]?.referenceId, "a");
  assert.equal(profile.contributions.bass?.[0]?.referenceId, "b");
  const explanation = explainProfile(profile) as Record<string, Array<{ percentage: number }>>;
  assert.equal(explanation.grooveDNA?.reduce((sum, item) => sum + item.percentage, 0), 100);
  assert.equal(explanation.bassDNA?.reduce((sum, item) => sum + item.percentage, 0), 100);
});

function prior(id: string, ratings: ReferenceTrack["human"]["ratings"], influence: ReferenceTrack["influence"]): ReferenceTrack {
  return {
    id, version: 2, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    metadata: { title: id, groups: ["dna"], tags: [], sourceFileName: "" }, human: { ratings, notes: [] }, influence,
  };
}
