# Selective Generation & Evolution

## Persistent locks

Locks can be scoped to a generation UUID, track, clip slot, or their combination.

```json
{
  "preserve": ["drums.notes", "drums.timing", "groove"],
  "mutate": ["bass.pitch", "bass.density", "bass.cycleLength", "bass.rests"]
}
```

Locks are stored locally under `data/locks/locks.json` and never committed. Mutation functions resolve locks before editing events.

## Bass-specific less obvious

`music_make_bass_less_obvious` independently controls fewer notes, rests, cycle selectivity, delayed resolution, slight chromaticism, phrase offset, pitch mutation and rhythm preservation. It only reads the selected bass clip. A separate drum clip is never rewritten.

The source clip is preserved. A destination slot must be explicit and empty; LiveBrain duplicates before replacing notes.

## Section evolution

`music_evolve_section` expands a 16-bar MIDI identity to 64 bars using four long cycles:

1. exact identity;
2. subtle velocity/microtiming movement;
3. subtraction;
4. re-entry plus rare mutation.

No instruments or tracks are added. There is no mandatory eight-bar change. Evolution is deterministic by seed.

## Current boundary

MIDI evolution is implemented and fully tested against MockAbletonAdapter. Filter/send automation is intentionally not marked complete because the required Live automation operations are not yet implemented and verified.
