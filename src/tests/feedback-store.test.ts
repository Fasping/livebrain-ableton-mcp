import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FeedbackStore } from "../feedback/feedback-store.js";

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
