# Taste Lab

Taste Lab gives LiveBrain a musical compass without pretending that an MCP server can be “trained” by listing artist names. It combines two deliberately separate layers:

1. **curated contexts** — sourced, human-authored hypotheses about a label, venue or scene;
2. **personal profiles** — measurements and ratings derived from audio files you legally control and keep on your machine.

## Bundled underground contexts

Run `music_list_style_profiles` to see the complete machine-readable catalogue. The initial set is:

| Profile ID | Context | What it biases |
| --- | --- | --- |
| `afterhours_2019` | Cabaret / Time Passages / Binh / Onur Özer | sparse mutation, odd cycles, negative space |
| `timeless_del_garda` | Timeless / Francesco Del Garda | off-kilter house, spacey electro, UK-garage inflection, restraint |
| `partout_city_series` | Partout | crisp minimal/electro dancefloor motion and compact hooks |
| `wicked_bass_noizar` | Wicked Bass / Noizar | rawness, broken pressure, darker low end and electro weight |
| `phonotheque_montevideo` | Phonotheque / Z@p / Montevideo | hypnotic long-form flow, acid/breaks/electro tension and unusual melody |
| `cdv_hoppetosse` | Club der Visionaere / Hoppetosse | patient, subtle, low-density minimal house/techno evolution |
| `my_own_jupiter` | My Own Jupiter / Nicolas Lutz | cosmic acid/electro tension, obscurity and playful machine detail |
| `yoyaku_ecosystem` | Yoyaku | deep hypnotic house, minimal, dub and futuristic electro breadth |
| `slow_life_berlin` | Slow Life | astral pads, broken beats, acid and ambient/deep-groove movement |
| `melliflow` | Melliflow / Vera & Alexandra | spacey swing, elastic microtiming and psychedelic restraint |
| `pressure_traxx` | Pressure Traxx | direct acid/house/techno roots, rawness and low-end pressure |
| `perlon` | Perlon | funky stripped-back microhouse, silence and off-kilter detail |
| `seekers_barcelona` | Seekers | hypnotic digging culture, odd detail and patient development |
| `cartulis_london` | Cartulis Music | psychedelic minimal, electro, breaks and machine-led club energy |
| `limousine_dream` | Limousine Dream / Gene On Earth | warm human swing, rolling bass and memorable playful motifs |
| `half_baked_london` | Half Baked | understated London minimal-house funk and afterhours pacing |

These profiles alter tempo defaults, density, syncopation, swing, silence, mutation, bass stability, chromaticism, timbral bias, space and arrangement evolution. They are marked `curation-only` and `needsAudioAnalysis: true`. A club profile describes the environment and curation tradition, not a fictional common chord progression for every DJ who plays there.

## Automatic resolution and blending

LiveBrain recognizes all matching contexts, not only the first one. `music_resolve_style` returns each matched alias, its normalized weight and the final blended StyleProfile. Use `profileMix` when you want exact manual weights; otherwise prompt specificity determines them deterministically.

```text
Resolve a style between Timeless, Phonotheque and Perlon. Show weights and
personalization before planning the track.
```

## Make it yours

Put 10–30 representative tracks in one local folder. Prefer full tracks or long excerpts of similar quality; do not mix unrelated styles into one group.

```text
Call reference_import_directory with:
directoryPath /Music/References/my_afterhours
group my_afterhours
analyze true
buildProfile true
```

Then rate what actually matters. Ratings are `0..10`; influence weights are `0..1` and independent:

```text
On reference <id>, rate bass 9 and groove 8, but set bass influence to 1,
groove influence to 0.7 and harmony influence to 0.2.
```

Finally produce with it:

```text
Plan a 128-bar restrained afterhours track with profileId my_afterhours,
seed 19. Show the style provenance and section variations before touching Ableton.
```

The same profile and seed produce the same plan. Change the seed for a new composition; change ratings or influences when the direction is consistently wrong.

## What is measured today

The built-in analyzer measures rhythm, estimated tempo, onset distribution, repetition, microtiming proxies, silence and basic dynamics. It does not yet identify exact synth models, reliably transcribe chords, measure masking inside the current Ableton mix or infer a producer's private technique.

The next useful additions are tonal/spectral descriptors, stem-aware analysis and an Ableton render-and-compare loop. Pairwise A/B preference learning is already available for generated StyleProfiles while keeping facts, heuristics and taste labels visibly separate.

## Research provenance

- Timeless / Francesco Del Garda: [Fabric interview](https://www.fabriclondon.com/posts/audio-francesco-del-garda-gives-a-glimpse-into-his-sweeping-record-collection), [Triangle Agency biography](https://triangleagency.com/francesco-del-garda/)
- Partout: [Resident Advisor label page](https://ra.co/labels/16924), [Decks label catalogue](https://www.decks.de/label/partout)
- Wicked Bass / Noizar: [Resident Advisor label page](https://ra.co/labels/7705)
- Phonotheque / Montevideo: [Resident Advisor](https://ra.co/news/42365), [Bandcamp Daily scene report](https://daily.bandcamp.com/scene-report/scene-report-techno-in-montevideo-uruguay), [Trommel interview](https://trommelmusic.com/featured/dj-koolt-a-moment-in-time/)
- Club der Visionaere / Hoppetosse: [Resident Advisor](https://ra.co/news/43951), [VisitBerlin](https://www.visitberlin.de/en/ms-hoppetosse)
- My Own Jupiter: [Resident Advisor label page](https://ra.co/labels/12868)
- Yoyaku: [official label overview](https://www.yoyaku.fr/label.html)
- Slow Life: [official Bandcamp](https://slowlife.bandcamp.com/), [Decks catalogue](https://www.decks.de/label/slow-life)
- Melliflow: [Resident Advisor launch report](https://ra.co/news/33727)
- Pressure Traxx: [official Bandcamp](https://pressuretraxx.bandcamp.com/)
- Perlon: [NTS guide](https://www.nts.live/shows/the-nts-guide-to/episodes/the-nts-guide-to-perlon-2nd-october-2025)
- Seekers: [official Bandcamp](https://seekers.bandcamp.com/)
- Cartulis Music: [official Bandcamp](https://cartulismusic.bandcamp.com/artists)
- Limousine Dream: [official overview](https://www.limousinedream.com/pages/about)
- Half Baked: [official Bandcamp](https://halfbakedrecords.bandcamp.com/)

The sources support scene and curation descriptions. Numeric profile values are LiveBrain's documented starting hypotheses and should be replaced or blended with local measurements whenever possible.
