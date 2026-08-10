import assert from "node:assert/strict";
import test from "node:test";
import { getCuratedStyleContext, listCuratedStyleContexts, resolveCuratedStyleContext } from "../style/curated-scenes.js";
import { resolveCuratedStyleMix } from "../style/style-resolver.js";

test("underground contexts expose provenance and resolve natural-language aliases", () => {
  const contexts = listCuratedStyleContexts();
  assert.ok(contexts.length >= 16);
  for (const id of [
    "afterhours_2019", "timeless_del_garda", "partout_city_series", "wicked_bass_noizar",
    "phonotheque_montevideo", "cdv_hoppetosse", "my_own_jupiter", "yoyaku_ecosystem",
    "slow_life_berlin", "melliflow", "pressure_traxx", "perlon", "seekers_barcelona",
    "cartulis_london", "limousine_dream", "half_baked_london",
  ]) assert.ok(contexts.some((context) => context.id === id), `missing ${id}`);
  assert.ok(contexts.every((context) => context.confidence === "curation-only"));
  assert.ok(contexts.every((context) => context.needsAudioAnalysis));
  assert.ok(contexts.every((context) => context.sourceUrls.length > 0));
  assert.equal(resolveCuratedStyleContext("haz algo rollo Francesco Del Garda")?.id, "timeless_del_garda");
  assert.equal(resolveCuratedStyleContext("raw como WickedBass de Noisar")?.id, "wicked_bass_noizar");
  assert.equal(resolveCuratedStyleContext("after de Z@p en Phonotheque")?.id, "phonotheque_montevideo");
  assert.equal(resolveCuratedStyleContext("para Hoppetosse")?.id, "cdv_hoppetosse");
  assert.equal(resolveCuratedStyleContext("de alguna manera minimal"), undefined);
});

test("multiple named contexts resolve to an explainable normalized blend", () => {
  const resolution = resolveCuratedStyleMix("entre Timeless de Francesco Del Garda, Z@p en Phonotheque y un toque de Perlon");
  assert.ok(resolution);
  assert.deepEqual(resolution.components.map((component) => component.id).sort(), ["perlon", "phonotheque_montevideo", "timeless_del_garda"]);
  assert.ok(Math.abs(resolution.components.reduce((sum, component) => sum + component.weight, 0) - 1) < 1e-9);
  assert.match(resolution.profile.id, /^mix_/);
  assert.equal(resolution.explanation.length, 3);
  const directed = resolveCuratedStyleMix("más Timeless, Phonotheque y un toque de Perlon");
  assert.ok(directed);
  const weights = Object.fromEntries(directed.components.map((component) => [component.id, component.weight]));
  assert.ok(weights.timeless_del_garda! > weights.phonotheque_montevideo!);
  assert.ok(weights.perlon! < weights.phonotheque_montevideo!);
});

test("returned contexts are defensive copies", () => {
  const context = getCuratedStyleContext("partout_city_series");
  assert.ok(context);
  context.profile.rhythm.density = 0;
  assert.notEqual(getCuratedStyleContext("partout_city_series")?.profile.rhythm.density, 0);
});
