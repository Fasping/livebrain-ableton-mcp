import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { StylePackRegistry } from "../packs/registry.js";
import type { StylePack } from "../packs/types.js";
import { planProduction } from "../production/production-planner.js";

test("bundled packs route natural-language prompts without a global underground fallback", () => {
  const registry = new StylePackRegistry();
  assert.deepEqual(registry.list().map((pack) => pack.id).sort(), ["ambient", "electronic", "general", "hip-hop", "pop", "rnb-soul", "rock", "underground-breaks", "underground-electronic"]);
  assert.equal(registry.resolve("indie rock con guitarras").pack.id, "rock");
  assert.equal(registry.resolve("dark trap beat with an 808").pack.id, "hip-hop");
  assert.equal(registry.resolve("paisaje sonoro cinematico").pack.id, "ambient");
  assert.equal(registry.resolve("cabaret Binh afterhours").pack.id, "underground-electronic");
  assert.equal(registry.resolve("Nicolas Lutz spacey electro").pack.id, "underground-electronic");
  assert.equal(registry.resolve("UK garage 2-step oscuro").pack.id, "underground-breaks");
  assert.equal(registry.resolve("pop pegadizo con gran estribillo").pack.id, "pop");
  assert.equal(registry.resolve("neo-soul slow jam").pack.id, "rnb-soul");
  assert.equal(registry.resolve("una canción sencilla y emotiva").pack.id, "general");
});

test("pop, R&B and underground breaks use distinct arrangements and drum patterns", () => {
  const pop = planProduction("pop pegadizo con un gran estribillo", { seed: 5 });
  const rnb = planProduction("neo-soul cálido y laid-back", { seed: 5 });
  const breaks = planProduction("UK garage 2-step con tensión electro", { seed: 5 });
  const lutz = planProduction("Nicolas Lutz y My Own Jupiter, cósmico y raro", { seed: 5 });
  assert.equal(pop.brief.pack.id, "pop");
  assert.ok(pop.brief.sections.some((section) => section.name === "Pre-Chorus"));
  assert.equal(rnb.brief.pack.id, "rnb-soul");
  assert.ok(rnb.tracks.some((track) => track.role === "guitar-guide"));
  assert.equal(breaks.brief.pack.id, "underground-breaks");
  assert.ok(breaks.tracks.some((track) => track.role === "acid-sequence"));
  const popDrums = pop.tracks.find((track) => track.role === "drums")!.notes;
  const rnbDrums = rnb.tracks.find((track) => track.role === "drums")!.notes;
  const brokenDrums = breaks.tracks.find((track) => track.role === "breaks")!.notes;
  assert.notDeepEqual(popDrums.filter((note) => note.pitch === 36), rnbDrums.filter((note) => note.pitch === 36));
  assert.notDeepEqual(popDrums.filter((note) => note.pitch === 36), brokenDrums.filter((note) => note.pitch === 36));
  assert.equal(lutz.brief.pack.id, "underground-electronic");
  assert.equal(lutz.brief.style.id, "my_own_jupiter");
});

test("pack selection changes track roles, structure and default profile", () => {
  const rock = planProduction("indie rock crudo con guitarra", { bars: 112, seed: 4 });
  const rap = planProduction("rap oscuro boom bap", { bars: 96, seed: 4 });
  assert.equal(rock.brief.pack.id, "rock");
  assert.equal(rock.styleProfile.id, "rock_band_core");
  assert.deepEqual(rock.tracks.map((track) => track.role), ["drums", "electric-bass", "rhythm-guitar", "lead-guitar", "keys", "vocal-guide"]);
  assert.ok(rock.tracks.every((track) => track.notes.length > 0 && track.clips.length > 0));
  assert.ok(rock.brief.sections.some((section) => section.name === "Chorus"));
  assert.equal(rap.brief.pack.id, "hip-hop");
  assert.ok(rap.tracks.some((track) => track.role === "808"));
  assert.ok(rap.tracks.every((track) => track.notes.length > 0 && track.clips.length > 0));
  assert.ok(rap.brief.sections.some((section) => section.name === "Hook"));
});

test("a user JSON pack can be installed without changing LiveBrain source", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-packs-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const generalPath = fileURLToPath(new URL("../../packs/general.json", import.meta.url));
  const custom = JSON.parse(await readFile(generalPath, "utf8")) as StylePack;
  custom.id = "personal-jazz";
  custom.name = "Personal Jazz";
  custom.aliases = ["personal jazz", "bebop"];
  custom.genres = ["jazz", "bebop"];
  custom.defaultGenre = "jazz";
  custom.profile.id = "personal_jazz_profile";
  custom.profile.name = "Personal Jazz Profile";
  await writeFile(join(directory, "personal-jazz.json"), JSON.stringify(custom));
  await writeFile(join(directory, "broken.json"), "{ definitely not json }");

  const registry = new StylePackRegistry({ userDirs: [directory] });
  const resolution = registry.resolve("bebop nocturno", "personal-jazz");
  assert.equal(resolution.pack.source, "user");
  assert.equal(registry.diagnostics.length, 1);
  const plan = planProduction("bebop nocturno", { packResolution: resolution, bars: 96, seed: 8 });
  assert.equal(plan.brief.pack.id, "personal-jazz");
  assert.equal(plan.styleProfile.id, "personal_jazz_profile");
  assert.equal(plan.tracks.length, custom.tracks.length);
});
