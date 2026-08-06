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

## Human ratings

All ratings use `0..1`: groove, drums, bass, arrangement, weirdness, hypnosis, darkness, electro, progressive, space, cheese and overall reference value.

## Profile integration

`reference_build_profile` aggregates distributions and maps supported measurements/ratings into real generator parameters. `music_generate_drum_groove` accepts `profileId`; it does not concatenate tags into a prompt. Tests verify that sparse and dense reference profiles generate measurably different MIDI patterns with the same seed.

`music_compare_to_profile` returns three separate layers:

1. measured Live Set facts;
2. explicitly labelled heuristics;
3. subjective ratings inherited from curated references.
