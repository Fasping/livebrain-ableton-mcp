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

test("Python bridge resolves Master and Return aliases only for addressable track operations", async () => {
  const source = await readFile(bridgePath, "utf8");
  const resolver = source.slice(source.indexOf("    def _resolve_track"), source.indexOf("    def _slot"));
  const listDevices = source.slice(source.indexOf("    def _list_devices"), source.indexOf("    def _device_parameters"));
  const setMixer = source.slice(source.indexOf("    def _set_track_mixer"), source.indexOf("    def _get_master_meter"));
  const device = source.slice(source.indexOf("    def _device("), source.indexOf("    def _int"));

  assert.match(resolver, /index == MASTER_TRACK_INDEX/);
  assert.match(resolver, /self\.song\.master_track/);
  assert.match(resolver, /index >= RETURN_TRACK_INDEX_BASE/);
  assert.match(resolver, /self\.song\.return_tracks\[return_index\]/);
  assert.match(listDevices, /self\._resolve_track/);
  assert.match(setMixer, /self\._resolve_track/);
  assert.match(device, /self\._resolve_track/);
  assert.match(setMixer, /arm is not applicable to master\/return tracks/);

  const regularTrackResolver = source.slice(source.indexOf("    def _track("), source.indexOf("    def _resolve_track"));
  assert.match(regularTrackResolver, /self\.song\.tracks\[index\]/);
  assert.doesNotMatch(regularTrackResolver, /master_track|return_tracks/);
});

test("detailed snapshots include Master and Return tracks with stable aliases", async () => {
  const source = await readFile(bridgePath, "utf8");
  const snapshot = source.slice(source.indexOf("    def _snapshot"), source.indexOf("    def _serialize_track"));

  assert.match(snapshot, /if mode == "detailed"/);
  assert.match(snapshot, /snapshot\["masterTrack"\]/);
  assert.match(snapshot, /MASTER_TRACK_INDEX/);
  assert.match(snapshot, /snapshot\["returnTracks"\]/);
  assert.match(snapshot, /RETURN_TRACK_INDEX_BASE \+ index/);
});

test("Master meter reports documented linear values and derives dBFS without inventing silence", async () => {
  const source = await readFile(bridgePath, "utf8");
  const meter = source.slice(source.indexOf("    def _get_master_meter"), source.indexOf("    def _set_transport"));

  assert.match(meter, /master\.output_meter_left/);
  assert.match(meter, /master\.output_meter_right/);
  assert.match(meter, /20\.0 \* math\.log10\(value\)/);
  assert.match(meter, /if value > 0\.0 else None/);
});
