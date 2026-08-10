import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { LIVEBRAIN_VERSION } from "../version.js";

test("health/server version stays aligned with package metadata", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  assert.equal(LIVEBRAIN_VERSION, packageJson.version);
});
