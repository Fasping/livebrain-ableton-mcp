# Underground Vibe Atlas

LiveBrain's underground pack contains research-informed generation variants, not artist clones. The atlas translates recurring critical language and documented production practice into controllable musical dimensions. It does not train on releases, copy compositions, or claim that every artist in a scene uses the same equipment.

The evidence has two layers:

- **Reported:** descriptions, interviews, catalogue notes and explicitly named equipment or workflow.
- **Inferred:** LiveBrain's production translation — tempo range, mode, sequence topology, synthesis recipe and arrangement behavior. These choices are hypotheses intended to create an original track in the described musical neighborhood.

For direct audio-derived measurements, import legally obtained local references through the Reference Brain and build a personal profile. That measurement layer can be combined with these variants.

## Variant map

| Variant ID | Prompt vocabulary | Generation behavior |
|---|---|---|
| `afterhours-mutant` | Time Passages, Binh, Onur Özer, Denial, Treatment, DC Salas, late-night jam, paranoid electro | 131 BPM center, Phrygian color, four-on-floor with swing, seven-step bleeps, wandering chromatic bass, rotating melodic focus |
| `cabaret-eerie-machine` | Cabaret, EKBOX, Evan Baggs, Katsuya Sano, Eris, eerie machine, panoramic electro | broken electro drums, elastic mono bass, concise machine hooks, ambiguous detuned pads, techno/electro/acid section changes |
| `montevideo-cosmic-swing` | Nicolas Lutz, My Own Jupiter, Omar, Z@P, Phonotheque, Montevideo, cosmic swing | bass-loaded broken rhythm, melancholy Dorian motifs, acid/electro timbre, strong negative space, genre contrast without losing groove |
| `partout-shadow-electro` | Partout, UHF, Nico Etorena, Overthink, dark electro | crisp broken drums, sync/FM bass, short interlocking lines, darker atmosphere, compact floor-functional transitions |
| `spacetravel-elastic-microfunk` | Spacetravel, Melliflow, elastic microfunk, highly swung, odd sequencing | selective sixteenth-note swing, seven-step chromatic cycles, high microtiming, performed filter/LFO motion, low density |
| `dojo-emotional-electro` | Dojo Zone, emotional electro, floaty 808, alien vocoder | 127 BPM center, airy broken 808 rhythm, broad pads, sparse formant-like lead, ambient-to-club arrangement arc |
| `timeless-digger-house` | Timeless, Francesco Del Garda, digger house, off-kilter house | patient four-on-floor pocket, sparse bass, odd-cycle micro-detail, garage/electro inflection, long DJ-friendly blends |
| `raw-analog-juno` | Oshana, Innershades, Juno, raw analog, Electribe | raw drum-machine groove, saturated transients, resonant acid bass, Juno-like harmony, deliberate low-end separation |

Selection is automatic when the prompt contains a strong alias. It is also explicit:

```json
{
  "prompt": "A tense, low-slung afterhours track with a wandering bass and rare bleeps",
  "packId": "underground-electronic",
  "variantId": "afterhours-mutant",
  "seed": 14,
  "dryRun": true
}
```

Changing the seed creates deterministic alternatives inside the same vocabulary. Changing `variantId` changes the musical topology itself.

## Research synthesis

### Afterhours mutant techno

Resident Advisor describes Time Passages' catalogue through low-slung minimal techno/electro, gnarled 808 color, off-beat drums, minor-key tension, haunted arpeggios and hypnotic paranoia. Reviews of Binh's *Mandarine* emphasize a steady rhythm beneath changing melodic leaders, short bleeps, acid, minor chords, reverberant percussion and the feeling of a late-night improvisation. Treatment is described through syncopated bit-reduced drums, wandering bass, atonal bleeps and abstract pads. Onur Özer's *Akmar* adds raw, direct 1990s-informed techno/electro, but retains carefully programmed bleeps and selective chords.

LiveBrain translates that into a stable but swung floor pulse, seven-step sequence cycles, rare melodic events, Phrygian/minor color, chromatic bass motion and tension created by subtraction rather than large drops.

Sources: [Time Passages: 10 Years](https://ra.co/reviews/36188), [Binh — Mandarine](https://ra.co/reviews/24762), [Treatment at Robert Johnson](https://ra.co/reviews/19345), [Onur Özer — Akmar](https://ra.co/reviews/23328), [Binh — Dreifach](https://xlr8r.com/reviews/binh-dreifach-ep/).

### Cabaret eerie machine funk

Reviews of EKBOX describe panoramic electro, hypnotic minimal techno, elastic bass, laser-like detail, squeaky motifs, light 808 cowbell and pads balanced between beauty and unease. Evan Baggs' work is repeatedly framed as a blend of electro, techno and minimal with addictive bass movement, strange synths and swung drums. Cabaret's broader catalogue moves between broken UK-techno rhythms, acid and compact machine worlds.

LiveBrain uses a broken electro topology, a resonant mono bass, one concise high-character hook, and a dark detuned pad under the main motif. Sections can change rhythmic language while preserving the bass identity.

Sources: [EKBOX — Mitsuboshi EP](https://ra.co/reviews/22680), [Evan Baggs — Untitled](https://ra.co/reviews/22888), [Evan Baggs interview](https://higher-frequency.com/interview/evan-baggs-ekbox-cabaret-daze-of-phaze), [Cabaret / Spacetravel news](https://ra.co/news/37742).

### Montevideo cosmic swing

Coverage of My Own Jupiter and Uruguay's Phonotheque-linked scene stresses bass-loaded techno, acid and breaks, apocalyptic undertones, eerie or melancholy melody, deep digging and genre flexibility. Z@P is described through warm swung drums, simple melodies with carefully chosen texture, acid color and rhythmic restraint. Nicolas Lutz describes the scene as a long-running collective direction rather than a personal invention; Omar's catalogue spans acid, breaks, house, techno and electro.

LiveBrain therefore avoids treating this as one genre. It combines broken electro rhythm, powerful mono low end, a simple melancholy hook, chromatic passing tones and enough negative space for the groove to remain legible.

Sources: [Labels that shaped the decade — My Own Jupiter](https://trommelmusic.com/featured/five-labels-which-shaped-and-reflected-the-sound-of-the-decade/), [Z@P podcast](https://ra.co/podcast/755), [Z@P — Aged](https://ra.co/reviews/33513), [Nicolas Lutz interview](https://mixmag.es/feature/entrevistamos-a-nicolas-lutz-1), [Omar profile](https://ra.co/dj/Omar-uy).

### Partout shadow electro

Partout describes itself through regional series rather than one fixed genre; the catalogue joins house, techno, electro and acid. UHF's *La Danse Des Ombres* is consistently categorized as darker electro, while Nico Etorena is associated with electro-tinged selection, breaks, challenge and surprise. Recent catalogue language stresses deep textures, hypnotic rhythmic language and compact counterpoint.

LiveBrain converts those cues into broken 808/909-derived drums, sync or FM bass, two short call-and-response lines, crystalline upper detail and darker atmospheric support.

Sources: [Partout label profile](https://ra.co/labels/16924), [Partout catalogue](https://www.deejay.de/Partout__L34773/lang_en), [UHF — La Danse Des Ombres](https://www.decks.de/track/uhf-la_danse_des_ombres_ep/cnk-or/en), [Nico Etorena podcast notes](https://trommelmusic.com/music/podcast/trommel-205-nico-etorena/).

### Elastic microfunk

Spacetravel's work is described through highly swung drum programming, tumbling movement, chromatic chatter, odd sequencing and recognizable patches made strange by contrasting timbres. Reviews highlight machine-performed imperfections, live-feeling fills and modulation, white-noise hats, filter/LFO movement and random bass sequences placed in a coherent context.

LiveBrain raises microtiming and syncopation while keeping density low. Seven-step motifs move against the four-beat bar; selected off-sixteenths are delayed, and compatible synth parameters receive restrained filter or LFO hints.

Sources: [Spacetravel — Dancing Therapy](https://ra.co/reviews/19601), [Melliflow in the decade overview](https://trommelmusic.com/featured/five-labels-which-shaped-and-reflected-the-sound-of-the-decade/).

### Emotional 808 drift

Dojo Zone's catalogue is described as floaty 808-informed electronic music with ambient pads, edgy synths, alien vocoder color and emotional harmony, while stronger tracks move into a straighter 909 club pulse. Other coverage mentions robust toms, detuned bass, dusty stabs, raspy snare rolls and cutting hats.

LiveBrain begins with harmony and space, adds a broken 808 groove, then reveals a stronger club section later. The lead recipe favors a sparse formant-like voice against a broad pad rather than dense melodic layering.

Sources: [Dojo Zone — In a Heartbeat](https://dojozone.bandcamp.com/album/in-a-heartbeat), [Dojo Zone — Durian Dance](https://trommelmusic.com/music/freedownload/free-download-dojo-zone-durian-dance-tfd109/).

### Timeless digger house

Coverage of Francesco Del Garda emphasizes wide-ranging record knowledge, electro and UK-garage edges, careful selection and a DJ-functional relationship between apparently unrelated records. LiveBrain interprets this as negative space, a sparse rounded bass, a single odd-cycle detail and patient transitions designed to leave room for long blends.

Sources: [Francesco Del Garda — fabric](https://www.fabriclondon.com/posts/audio-francesco-del-garda-gives-a-glimpse-into-his-sweeping-record-collection), [Francesco Del Garda profile](https://triangleagency.com/francesco-del-garda/).

### Raw analog Juno house

Oshana has described a hybrid workflow that starts quickly in software and moves through external machines and sequencers. Interviews name raw drum patterns, saturation for rugged analog character, careful sound design and mixdowns, an Electribe EMX-1, Juno-106 and later Octatrack/TR-08 performance setups. Time Passages' catalogue also provides a reference point for Juno-colored machine music through Innershades.

LiveBrain turns the documented workflow into a raw four-on-floor machine pattern, resonant acid bass, saturated but preserved transients, warm poly-synth harmony and explicit separation between kick and mono bass.

Sources: [Oshana interview — Electronic Groove](https://electronicgroove.com/interview-oshana-1/), [Oshana — Recognise](https://djmag.com/content/recognise-01-oshana), [Oshana interview — Mixmag Spain](https://mixmag.es/read/entrevistamos-a-oshana-features), [Time Passages: 10 Years](https://ra.co/reviews/36188).

## Production safeguards

- Descriptive vocabulary is paraphrased; it is not used as a request to reproduce a copyrighted track.
- Equipment named in an interview is treated as workflow evidence, not as a mandatory shopping list.
- Ableton browser queries prefer stock devices (`Operator`, `Drift`, `Analog`, `Wavetable`, drum racks) and degrade to installed alternatives.
- Parameter hints are applied only when a compatible named parameter exists. LiveBrain does not invent a parameter or silently target an unrelated control.
- Curated values remain hypotheses. Local reference analysis and user feedback are the route to personal calibration.
