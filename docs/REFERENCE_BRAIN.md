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
