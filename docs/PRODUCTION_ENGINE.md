# Production Engine

The Production Engine is the high-level layer that turns a musical request into a reproducible Ableton project rather than a single MIDI pattern.

## Tools

### `music_plan_production`

Pure planning. It compiles the prompt into tempo, key/mode, genre, musical traits, style provenance, sections, eight track roles, MIDI material, browser queries, mixer settings and Arrangement positions. It never changes Ableton.

Use optional `profileId` to select either a bundled underground context or a profile built from your own local references. Without `profileId`, well-known aliases in the prompt are resolved automatically.

### `music_create_production`

Execution. It defaults to `dryRun: true`. With `dryRun: false` it:

1. sets tempo, time signature, scale and Arrangement loop;
2. creates independent kick, hats, percussion, bass, chords, lead, texture and FX tracks;
3. searches the local browser and loads the first suitable installed instrument;
4. creates a separate 16-bar source variation for each active section and writes deterministic MIDI;
5. applies conservative volume, pan and available sends;
6. loads EQ/Compressor starting chains and configures discoverable parameters by name;
7. copies active layers into the Arrangement according to the section plan;
8. opens Arrangement view and returns a detailed change/warning report.

If a run is interrupted, call `music_create_production` again with the identical prompt, seed and bar count. The executor reuses the canonical LiveBrain tracks and clips, avoids duplicate Arrangement positions, and attempts any missing Browser/device work. It sets the Arrangement loop at the end so an initially empty song does not need a synthetic length-anchor clip.

## Example

```json
{
  "prompt": "Dark, hypnotic and spacious minimal with Timeless-style restraint",
  "profileId": "timeless_del_garda",
  "bars": 128,
  "seed": 19,
  "dryRun": true
}
```

Review the returned plan, then repeat with `dryRun: false`.

Run `music_list_style_profiles` to inspect bundled IDs, aliases, sources and analysis status. Curated profiles describe a musical direction; they do not claim to reproduce a specific artist or release.

## Safety and honesty

- Generation is deterministic by seed.
- A dry-run never creates dependent temporary tracks or clips.
- Repeating an applied plan is idempotent for canonical LiveBrain track names and Arrangement positions.
- Instrument/effect failures are warnings and do not erase already-created musical material.
- Arrangement placement failures are reported per track and beat.
- LiveBrain does not claim adaptive EQ without measured audio.
- LiveBrain does not claim true external sidechain routing until that path is verified in the installed Live API.
