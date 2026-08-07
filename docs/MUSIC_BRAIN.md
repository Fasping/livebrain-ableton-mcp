# Music Brain

The Music Brain converts musical intent into deterministic transformations and normalized Ableton operations.

## `afterhours_2019`

This profile models abstract features rather than any artist or released work: sparse machine rhythm, negative space, syncopation, restrained transients, microtiming, short motifs, controlled chromaticism, gradual mutation and arrangement by subtraction.

Every numeric parameter must influence generation or analysis. Decorative parameters should not be added.

## Determinism

The same profile, seed and parameters produce identical notes. This enables testing, reproducible feedback and meaningful variations.

## Current operations

- Multi-role drum groove generation.
- Rhythm-first bass generation with motifs, rests, phrase cycles and controlled chromatic mutation.
- Short alien/digital/FM-oriented sequences, bleeps, stabs, one-shots and chord fragments with non-obvious cycles.
- Timing, velocity and density mutation while preserving selected pitches.
- “Less obvious” transformation through selective removal, delayed recurrence and restrained accent changes.

“Less obvious” does not mean randomize everything. MIDI pitch 36 is preserved by default so surrounding percussion can evolve without destroying the kick identity.

## Next

- Rich groove extraction and profile blending.
- Bass and short-sequence generators.
- Variation sets and 16/32/64-bar section evolution.
- Device/filter/send automation remains pending until verified against Live's API.

## Reference-derived profiles

Generated profiles directly influence rhythm density, syncopation, microtiming, repetition, silence, mutation rate, hat/ghost density and selected bass/timbre/arrangement parameters. Artist and label metadata never selects cloning logic.

Generation trait overrides create an in-memory EffectiveStyleProfile. They modify actual parameters and never overwrite the stored profile.
