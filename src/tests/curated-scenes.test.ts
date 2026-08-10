import assert from "node:assert/strict";
import test from "node:test";
import { getCuratedStyleContext, listCuratedStyleContexts, resolveCuratedStyleContext } from "../style/curated-scenes.js";

test("underground contexts expose provenance and resolve natural-language aliases", () => {
  const contexts = listCuratedStyleContexts();
  assert.deepEqual(contexts.map((context) => context.id), [
    "afterhours_2019", "timeless_del_garda", "partout_city_series",
    "wicked_bass_noizar", "phonotheque_montevideo", "cdv_hoppetosse",
  ]);
  assert.ok(contexts.every((context) => context.confidence === "curation-only"));
  assert.ok(contexts.every((context) => context.needsAudioAnalysis));
  assert.ok(contexts.every((context) => context.sourceUrls.length > 0));
  assert.equal(resolveCuratedStyleContext("haz algo rollo Francesco Del Garda")?.id, "timeless_del_garda");
  assert.equal(resolveCuratedStyleContext("raw como WickedBass de Noisar")?.id, "wicked_bass_noizar");
  assert.equal(resolveCuratedStyleContext("after de Z@p en Phonotheque")?.id, "phonotheque_montevideo");
  assert.equal(resolveCuratedStyleContext("para Hoppetosse")?.id, "cdv_hoppetosse");
});

test("returned contexts are defensive copies", () => {
  const context = getCuratedStyleContext("partout_city_series");
  assert.ok(context);
  context.profile.rhythm.density = 0;
  assert.notEqual(getCuratedStyleContext("partout_city_series")?.profile.rhythm.density, 0);
});
