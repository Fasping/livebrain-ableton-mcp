# Style Engine

## DNA aggregation

References are not indivisible style examples. Each has independent contribution weights for GrooveDNA, DrumDNA, BassDNA, SynthDNA, SequenceDNA, TimbreDNA, HarmonyDNA and ArrangementDNA.

Ratings express human appreciation on `0..10`. Influence expresses desired learning contribution on `0..1`. They never overwrite each other.

Profiles contain distributions and contribution tables. `reference_explain_profile` normalizes each dimension to 100% so curation decisions remain transparent.

## Effective profiles

One-off controls—BPM, groove, electro, progressive, weirdness and space—produce a deep-cloned EffectiveStyleProfile. The stored profile remains unchanged.

```text
stored profile + generation overrides + future preference weights
  → effective profile
  → deterministic generator
```

Overrides change real density, syncopation, digital/electro weighting, chromaticism, predictability, rests and subtraction parameters.

## Seed priors

Bundled curated priors are human metadata only. They have no `measured` audio features and are marked `needsAudioAnalysis`. Artist and label names are curation metadata, never generator switches.
