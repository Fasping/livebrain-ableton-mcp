# Reference Brain

The Reference Brain will analyze audio the user legally controls and convert measurements plus human feedback into abstract profiles.

## Policy

- Reference audio remains local and gitignored.
- Git stores only metadata, analysis and user-authored tags.
- Measured features remain separate from subjective ratings.
- LiveBrain will not intentionally reconstruct or clone a released track.

```text
ReferenceTrack
  metadata: artist, release, label, year, tags
  measured: tempo, spectral, dynamics, rhythm, tonal, arrangement
  human: ratings, darkness, weirdness, hypnotic, electro, cheese
```

Profiles will aggregate median, range, variance and outliers instead of flattening references into one average. Audio analysis will sit behind a TypeScript interface so JS/WASM implementations can change later.

## Storage

- `data/references/<id>.json`: metadata, measured features and human ratings; safe to version when desired.
- `data/references/.local-index.json`: local ID-to-audio-path mapping; always gitignored.
- `data/profiles/<group>.json`: aggregated distributions plus a generator-ready `StyleProfile`.

No reference audio is copied. Common audio extensions under `data/references` are also gitignored as a safety net.

## One-step local folder import

`reference_import_directory` recursively discovers supported audio, ignores already registered absolute paths, analyzes each new file and builds the requested group profile. WAV is analyzed directly; MP3, FLAC, M4A, OGG and AIFF require `ffmpeg`.

```json
{
  "directoryPath": "/absolute/path/to/my/records",
  "group": "my_afterhours",
  "tags": ["owned-reference", "afterhours"],
  "analyze": true,
  "buildProfile": true
}
```

The returned `profile.id` can be passed directly as `profileId` to `music_plan_production` and `music_create_production`.

## Analysis

The built-in PCM WAV analyzer measures:

- onset count and density;
- estimated BPM;
- 16-bin beat-relative onset and accent patterns;
- a syncopation proxy;
- consecutive-bar repetition;
- 16th-grid microtiming deviation;
- silence ratio;
- long-cycle bar-energy variation;
- RMS, peak and crest factor.

These are signal-processing estimates, not artistic truth. Compressed formats and AIFF are decoded to mono PCM through optional `ffmpeg`. Subjective properties remain human ratings.

## Human ratings and influence

Human ratings use `0..10`: groove, drums, bass, synth, arrangement, weirdness, hypnosis, darkness, electro, progressive, space, rawness, subtlety, predictability, cheese and overall reference value.

Influence is independent and uses `0..1` per DNA dimension. A bass rating of `10` with bass influence `0` means “excellent bass, but do not learn its bass behavior.” Groove, Drum, Bass, Synth, Sequence, Timbre, Harmony and Arrangement DNA are aggregated independently.

## Profile integration

`reference_build_profile` calculates min/max, median, p25/p75, variance, weighted mean and normalized per-dimension contributions. `reference_explain_profile` exposes exactly which references contributed to each DNA dimension. Generator tools accept `profileId`; they do not concatenate tags into prompts.

`music_compare_to_profile` returns three separate layers:

1. measured Live Set facts;
2. explicitly labelled heuristics;
3. subjective ratings inherited from curated references.
