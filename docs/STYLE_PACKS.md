# Style Packs

LiveBrain's core does not assume that every user makes underground electronic music. A style pack is a versioned JSON file that supplies the musical vocabulary around the deterministic engine:

- natural-language aliases and genres;
- a default `StyleProfile`;
- track roles and MIDI generator families;
- preferred Ableton Browser searches;
- mixer, effects and send starting points;
- one of four drum topologies through `drumPattern`;
- section names, durations, active roles and energy;
- headroom, sidechain intent and spectral-analysis requirements.

The built-in packs are `general`, `electronic`, `underground-electronic`, `underground-breaks`, `hip-hop`, `pop`, `rnb-soul`, `rock` and `ambient`. `general` is the neutral fallback. The underground catalogue and its researched label/scene profiles remain available, but they no longer bias unrelated prompts.

Packs may also define prompt-selectable `variants`. A variant can override profile dimensions, drum topology, sections, instrument queries, mixer values and synthesis recipes while leaving the base pack reusable. Pass `variantId` for an exact choice or omit it for automatic alias matching. The bundled underground variants and their evidence are documented in the [Underground Vibe Atlas](UNDERGROUND_VIBE_ATLAS.md).

Packs can choose `four-on-floor`, `broken`, `backbeat` or `half-time` drum topology. This prevents a rock, R&B or UK-garage request from receiving the same kick grid with different device names.

## Use a pack

Natural language selects a pack automatically:

```text
Plan an indie-rock song with a restrained verse and a wide final chorus.
```

For a deterministic choice, pass `packId` to `music_resolve_style`, `music_plan_production` or `music_create_production`:

```json
{
  "prompt": "A slow, raw song with a melodic bass part",
  "packId": "rock",
  "bars": 112,
  "seed": 9
}
```

Use `music_list_style_packs` to list installed packs and `music_get_style_pack` to inspect one.

## Install a personal pack

Place one or more `.json` files here:

```text
~/.livebrain/packs/
```

Restart the MCP client so it starts a new LiveBrain process. Invalid packs are ignored safely and reported by `health` and `music_list_style_packs` under `packDiagnostics`/`diagnostics`.

To use a different directory, set `LIVEBRAIN_PACK_DIR`. Multiple directories use the platform path separator (`:` on macOS/Linux). A user pack with the same `id` intentionally overrides the built-in pack for that process.

The quickest authoring workflow is to copy [`packs/general.json`](../packs/general.json), give it a unique `id`, then change its profile, roles, queries and sections. Every role referenced by a section must exist in `tracks`.

## Generator families

Pack tracks choose one safe built-in generator:

| Generator | Intended material |
| --- | --- |
| `kick`, `hats`, `percussion` | split drum-kit lanes |
| `drums` | complete drum part on one track |
| `bass` | monophonic bass motifs |
| `harmony` | chords, keys, pads or rhythm-instrument guide parts |
| `melody` | lead, topline or vocal-guide MIDI |
| `sequence` | repeating plucks and arpeggiated material |
| `texture` | sparse sustained harmonic material |
| `fx` | rare one-shot events |

At pack level, `drumPattern` accepts `four-on-floor`, `broken`, `backbeat` or `half-time`. It affects tracks using `drums` and the split drum generators while preserving deterministic output for a given seed.

JSON packs cannot execute arbitrary code. This makes community packs inspectable and safe to load. A future generator plug-in API can add custom algorithms behind an explicit trust boundary; it should not be hidden inside data files.

## Packs, profiles and client skills

These layers solve different problems:

- the **pack** is executable production data used by LiveBrain;
- a **reference profile** is measured/personal taste data built from local audio;
- an optional client **skill** teaches Claude, Codex or another agent a preferred workflow and prompting vocabulary.

A skill is useful guidance, but the music behavior should live in the pack/profile so it works with every MCP client. You can pair a `SKILL.md` with a pack in a repository; LiveBrain intentionally loads only the JSON.

## Honest boundary

Rock guitar and vocal roles are MIDI guide parts. Their realism depends on installed Ableton instruments, multisamples or a later recorded performance. A pack can improve structure, voicing, register, instrumentation and mix intent; it cannot turn a generic MIDI device into a recorded singer or guitarist.
