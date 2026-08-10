import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bridgePath = new URL("../../bridge/LiveBrain/LiveBrain.py", import.meta.url);

test("Python bridge converts JSON notes to Live MidiNoteSpecification objects", async () => {
  const source = await readFile(bridgePath, "utf8");

  assert.match(source, /from Live\.Clip import MidiNoteSpecification/);
  assert.match(source, /clip\.add_new_notes\(note_specifications\)/);
  assert.doesNotMatch(source, /clip\.add_new_notes\(tuple\(notes\)\)/);
});

test("Python bridge reads Live MidiNote objects without subscripting them", async () => {
  const source = await readFile(bridgePath, "utf8");
  const readMethod = source.slice(source.indexOf("    def _read_notes"), source.indexOf("    def _validate_notes"));

  assert.match(readMethod, /self\._note_value\(note, "pitch"\)/);
  assert.match(source, /return getattr\(note, key, default\)/);
  assert.doesNotMatch(readMethod, /note\["pitch"\]/);
});

test("Python bridge advertises the resumable production control surface", async () => {
  const source = await readFile(bridgePath, "utf8");

  for (const method of ["song.settings", "track.mixer", "track.delete", "browser.search", "browser.load", "arrangement.duplicate", "arrangement.duplicate_many", "arrangement.clips"]) {
    assert.match(source, new RegExp(`"${method.replace(".", "\\.")}"`));
  }
  assert.match(source, /self\.application\.browser/);
  assert.match(source, /self\.application\.view/);
  assert.doesNotMatch(source, /self\.application\(\)/);
});
