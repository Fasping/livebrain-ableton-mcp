import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FeedbackStore } from "../feedback/feedback-store.js";
import { getCuratedStyleContext } from "../style/curated-scenes.js";

test("feedback persists statistical preferences without training claims", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-feedback-"));
  const store = new FeedbackStore(directory);
  const generation = await store.record({
    profileId: "afterhours_2019", profileVersion: "0.2", seed: 9,
    parameters: { bars: 16 }, generatedFeatures: { noteCount: 32 },
  });
  await store.addFeedback(generation.generationId, { groove: 9, bass: 4 }, ["great-groove", "bass-too-obvious"]);
  const preferences = await store.preferences();
  assert.equal(preferences.feedbackCount, 1);
  assert.equal(preferences.meanRatings.groove, 9);
  assert.match(preferences.claim, /no neural-network/i);
});

test("directional feedback tags personalize future profiles conservatively", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-feedback-tags-"));
  const store = new FeedbackStore(directory);
  const base = getCuratedStyleContext("timeless_del_garda")!.profile;
  const generation = await store.record({
    profileId: base.id, profileVersion: base.version, seed: 4, parameters: {}, generatedFeatures: {}, styleProfile: base,
  });
  await store.addFeedback(generation.generationId, { bass: 4, melody: 3 }, ["bass-too-obvious", "less-melody", "more-space"]);
  const personalized = await store.personalize(base);
  assert.equal(personalized.applied, true);
  assert.equal(personalized.tagEvidence, 3);
  assert.ok(personalized.profile.bass.rests > base.bass.rests);
  assert.ok(personalized.profile.sequence.density < base.sequence.density);
  assert.ok(personalized.profile.mix.space > base.mix.space);
});

test("pairwise A/B feedback moves selected style dimensions toward the winner", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-feedback-ab-"));
  const store = new FeedbackStore(directory);
  const winnerProfile = getCuratedStyleContext("pressure_traxx")!.profile;
  const loserProfile = getCuratedStyleContext("perlon")!.profile;
  const winner = await store.record({ profileId: winnerProfile.id, profileVersion: winnerProfile.version, seed: 1, parameters: {}, generatedFeatures: {}, styleProfile: winnerProfile });
  const loser = await store.record({ profileId: loserProfile.id, profileVersion: loserProfile.version, seed: 2, parameters: {}, generatedFeatures: {}, styleProfile: loserProfile });
  await store.compare(winner.generationId, loser.generationId, ["bass"], "Prefer the firmer bass behavior");
  const personalized = await store.personalize(getCuratedStyleContext("afterhours_2019")!.profile);
  assert.equal(personalized.comparisonEvidence, 1);
  assert.ok(personalized.profile.bass.density > getCuratedStyleContext("afterhours_2019")!.profile.bass.density);
  assert.equal((await store.preferences()).comparisonCount, 1);
});
