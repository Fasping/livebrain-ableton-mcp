# Ableton API

## Supported foundation

| Capability | Bridge method |
|---|---|
| Capabilities | `system.capabilities` |
| Set snapshot | `live_set.snapshot` |
| Create/delete MIDI track | `track.create_midi`, `track.delete` |
| Create Session MIDI clip | `clip.create_midi` |
| Read/replace/add notes | `clip.get_notes`, `clip.replace_notes`, `clip.add_notes` |
| Duplicate Session clip | `clip.duplicate` |
| Set MIDI clip loop | `clip.set_loop` |
| Devices and parameters | `device.list`, `device.parameters`, `device.set_parameter` |
| Song settings and transport | `song.settings`, `transport.set` |
| Mixer | `track.mixer` |
| Master output meter | `master.meter` |
| Browser search and loading | `browser.search`, `browser.load` |
| Arrangement | `arrangement.duplicate`, `arrangement.duplicate_many`, `arrangement.clips`, `view.arrangement` |

Parameters use normalized values from 0 to 1. Writes validate targets and support dry-run where exposed.

## Track addressing

The device and mixer methods accept stable numeric aliases in `trackIndex`:

| `trackIndex` | Target |
|---:|---|
| `-1` | Master Track |
| `0..N-1` | Regular `song.tracks` index |
| `200 + i` | Return Track `i` (`200` = Return A, `201` = Return B) |

The aliases apply to `device.list`, `device.parameters`, `device.set_parameter` and `track.mixer`. Clip, Arrangement, track creation/deletion and Browser-loading methods still accept regular track indices only. `live_set.snapshot` includes `masterTrack` and `returnTracks` in `detailed` mode; each object reports its addressable index, name, devices and applicable mixer fields.

Mixer operations reject unsupported fields instead of ignoring them: `arm` is not applicable to Master/Returns, while Master also does not support `mute`, `solo` or sends. Return-track sends remain subject to the sends actually exposed by Live.

`master.meter` reads Live's documented `output_meter_left` and `output_meter_right` values. It returns linear amplitude plus calculated dBFS (`20 × log10(amplitude)`); dBFS fields are `null` at digital silence. Left/right output meters are momentary GUI-backed values, not integrated loudness measurements, and Ableton notes that observing them adds GUI load. See the [Live Object Model Track reference](https://docs.cycling74.com/apiref/lom/track/).

## Explicit limitations

- Arrangement clip placement is implemented; direct Arrangement clip creation/editing is still pending.
- Automation curves require Live 12 API verification.
- Browser search/loading is implemented with bounded traversal and must be verified against each installed Live library.
- Nested racks, Drum Rack pads, broad routing and automatic Return-track creation/effect-chain setup are pending. Existing Return tracks and their devices/mixers are addressable.
- Persistent Live object IDs are not exposed yet; resolve validated indices from a fresh snapshot.
- Modern note writing uses `add_new_notes`; older Live APIs only have a read fallback.
- High-level duplicate-transform workflows currently perform several individually undoable bridge calls. A future compound transaction should make the whole workflow one atomic undo step.
- `duplicate_clip_to` and extended loop growth are implemented but must still be verified in the installed Live 12 Remote Script.

## Smoke test

With Ableton running and LiveBrain selected as a Control Surface:

```bash
npm run smoke:ableton
```

This verifies TypeScript adapter → socket → Python bridge → Live Object Model for capabilities and compact snapshot. It does not claim Arrangement or Automation support.

## Remote Script

Run `./scripts/install-remote-script.sh`, restart Live, and select `LiveBrain` as the Control Surface. The installer uses `~/Music/Ableton/User Library/Remote Scripts` by default so Live upgrades do not overwrite it. Set `ABLETON_USER_LIBRARY` if your User Library lives elsewhere. Developers can choose a parallel name such as `LiveBrainDev` with `LIVEBRAIN_REMOTE_SCRIPT_NAME=LiveBrainDev`.

The bridge binds to `127.0.0.1`, rejects unknown commands and oversized messages, and never evaluates code or executes shell commands.
