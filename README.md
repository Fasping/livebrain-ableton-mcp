# LiveBrain Ableton MCP

<p align="center"><strong>Describe the track. Preview the plan. Build it in Ableton. Keep everything editable.</strong></p>

<p align="center">
  <a href="https://github.com/Fasping/livebrain-ableton-mcp/stargazers"><img src="https://img.shields.io/github/stars/Fasping/livebrain-ableton-mcp?style=social" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e.svg" alt="MIT License"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-20%2B-339933.svg?logo=node.js&logoColor=white" alt="Node.js 20+"></a>
  <a href="https://www.ableton.com/live/"><img src="https://img.shields.io/badge/Ableton%20Live-12-111111.svg" alt="Ableton Live 12"></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-compatible-7c3aed.svg" alt="MCP compatible"></a>
</p>

<p align="center">
  <a href="#quick-start-on-macos">Quick start</a> ·
  <a href="#from-prompt-to-project">See it work</a> ·
  <a href="docs/STYLE_PACKS.md">Style packs</a> ·
  <a href="docs/CLIENTS.md">AI clients</a> ·
  <a href="docs/ROADMAP.md">Roadmap</a>
</p>

LiveBrain is a local, open-source MCP server and deterministic music-production engine for Ableton Live. Claude, Codex, Cursor and other MCP clients can use it to inspect a Live Set, compose MIDI, load installed devices, arrange sections, shape a starting mix and revise the result through natural language.

It builds a real Ableton project — separate tracks, clips, devices and Arrangement placements — rather than returning an opaque audio render.

| Local-first | Deterministic | Pack-driven | Previewable |
| --- | --- | --- | --- |
| Ableton communication stays on `127.0.0.1` | Same prompt + seed = same plan | 9 bundled styles, custom JSON packs supported | Important writes default to `dryRun` |

> **LiveBrain 1.0** is macOS-first and verified with Ableton Live 12 and Node.js 20. Save your Live Set before applying large AI-generated changes.

## From prompt to project

Give your MCP client a production brief:

```text
Plan a restrained 128-bar underground minimal/electro track at 130 BPM.
Use sparse drums, an odd-cycle sequence, negative space and subtle evolution.
Show me the plan and dry-run first, then build it in Arrangement View.
```

LiveBrain turns that into:

```text
prompt
  → style-pack and profile resolution
  → tempo, key, traits and section plan
  → independent MIDI parts and section variations
  → installed Ableton instruments and effects
  → mixer starting points and Arrangement placement
  → editable Live Set + generation ID for feedback
```

The production language is not fixed. The same engine can plan pop, R&B/neo-soul, hip-hop, rock, ambient, electronic, UK garage/breaks or a neutral custom workflow:

```text
Create a concise pop song with a quiet first verse, a clear pre-chorus,
a memorable vocal-guide hook and a wider final chorus.
```

```text
Build a raw indie-rock arrangement with separate drums, electric bass,
rhythm guitar, lead guitar, keys and an editable vocal-guide melody.
```

Every result stays editable. Regenerate a section, lock the bass, reduce the melody, change the groove or resume an interrupted build without starting over.

## More than remote control

Many Ableton integrations expose DAW commands and leave every musical decision to the current chat. LiveBrain keeps that control layer, then adds a reusable, tested production brain above it.

| Capability | Generic Ableton controller | LiveBrain |
| --- | ---: | ---: |
| Read/write tracks, clips, devices and mixer | Yes | Yes |
| Deterministic groove, bass, harmony and melody engines | Agent-dependent | Built in |
| Natural-language vibe → complete production plan | Agent-dependent | Built in |
| Installable genre/style packs | No | Validated JSON packs |
| Safe preview before changing Live | Rare | `dryRun` by default |
| Resume an interrupted full-song build | Rare | Built in |
| Local reference-audio profiles | No | Built in |
| Persistent locks and structured feedback | No | Built in |
| Same seed produces the same musical plan | No guarantee | Yes |

LiveBrain prioritizes repeatable musical decisions and full-production workflows. It is **not yet the widest Ableton control surface**: controller-focused projects still cover scenes, audio tracks, automation, routing and undo/redo more completely. See the honest [comparison and gap analysis](docs/COMPARISON.md).

## Style packs, not genre bias

The core is neutral. A validated JSON pack supplies genre vocabulary, track roles, Browser queries, arrangement shape, mix intent and drum topology.

| Pack | Production direction | Drum topology |
| --- | --- | --- |
| `general` | neutral songwriting fallback | backbeat |
| `electronic` | house, techno and general club music | four-on-floor |
| `underground-electronic` | eight research-informed minimal/electro variations | four-on-floor or broken |
| `underground-breaks` | breakbeat, 2-step and UK garage | broken |
| `hip-hop` | rap, trap, drill and boom-bap starting points | half-time |
| `pop` | verse / pre-chorus / chorus songwriting | backbeat |
| `rnb-soul` | R&B, neo-soul and slow-jam writing | half-time |
| `rock` | indie, alternative, punk and guitar-led arrangements | backbeat |
| `ambient` | pads, drones, cinematic texture and sparse pulse | broken |

Install personal or community packs in `~/.livebrain/packs/`; no TypeScript fork is required. LiveBrain validates every pack before loading it and reports invalid files instead of executing arbitrary code. See [Style Packs](docs/STYLE_PACKS.md).

## Quick start on macOS

### Requirements

- Ableton Live 12
- Node.js 20 or newer
- Git

### 1. Install LiveBrain

```bash
git clone https://github.com/Fasping/livebrain-ableton-mcp.git
cd livebrain-ableton-mcp
./scripts/setup-macos.sh
```

The setup script installs dependencies, builds the MCP server, copies the Remote Script into your Ableton User Library, and prints a ready-to-paste MCP configuration. It does not overwrite your AI client's configuration.

### 2. Enable it in Ableton

1. Restart Ableton Live.
2. Open **Settings → Link, Tempo & MIDI**.
3. Select **LiveBrain** as a Control Surface.
4. Leave its MIDI Input and Output set to **None**.

### 3. Connect an AI client

For Claude Desktop, add this to `claude_desktop_config.json`, replacing the path with your clone:

```json
{
  "mcpServers": {
    "livebrain": {
      "command": "node",
      "args": ["/absolute/path/to/livebrain-ableton-mcp/dist/index.js"],
      "env": {
        "LIVEBRAIN_HOST": "127.0.0.1",
        "LIVEBRAIN_PORT": "9877"
      }
    }
  }
}
```

Restart the client and ask:

```text
Run LiveBrain health and tell me the bridge version.
```

See [AI client setup](docs/CLIENTS.md) for Claude Desktop, Codex, Cursor, VS Code and ChatGPT availability.

## Client compatibility

| Client | Status | Connection |
| --- | --- | --- |
| Claude Desktop | Verified | Local MCP over stdio |
| Codex | Compatible | Local MCP over stdio |
| Cursor / VS Code MCP clients | Compatible | Local MCP over stdio |
| Other local MCP clients | Compatible | Launch `node dist/index.js` |
| ChatGPT | Architecture-ready, remote transport pending | ChatGPT does not connect directly to a localhost MCP server |

ChatGPT's current custom MCP support expects a remote server or a supported secure tunnel; LiveBrain currently ships a local stdio transport. We document this boundary instead of claiming one-click ChatGPT support that is not implemented yet. See OpenAI's [developer mode and MCP apps documentation](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt).

## Recommended workflow

All important write paths support a preview-first workflow:

1. `health` — confirm MCP, adapter and bridge versions.
2. `livebrain_analyze_set` — inspect the current Live Set.
3. `music_plan_production` — compile the vibe without changing Ableton.
4. `music_create_production` with `dryRun: true` — validate targets and planned changes.
5. Repeat with `dryRun: false` — build the production.
6. Listen, then request changes in natural language.

Applied productions return a `generationId`. Give direct feedback with tags such as `bass-too-obvious`, `less-melody`, `more-space`, `more-swing` or their documented Spanish equivalents. You can also generate two alternatives and call `feedback_compare_generations`; later plans apply the resulting preference delta conservatively.

Production runs are resumable by the canonical track names defined by the selected pack. Repeating the same prompt, seed and length reuses those tracks, replaces the source MIDI deterministically, skips existing Arrangement positions and completes missing device work.

Run `music_list_style_packs` to see what is installed, or pass `packId` to choose one explicitly. See [Style Packs](docs/STYLE_PACKS.md) to install or author a pack without changing LiveBrain source.

To teach LiveBrain your own taste without uploading audio, put legally owned reference files in a local folder and ask your client:

```text
Use reference_import_directory on /absolute/path/to/my/references with group
my_afterhours. Analyze the files and build the profile, then plan a track with
profileId my_afterhours.
```

The bundled scene profiles are transparent curation hypotheses, not fake audio measurements. Your local reference profile is what makes the system personal. See [Taste Lab](docs/TASTE_LAB.md).

## Music and production features

### Production Engine

- neutral vibe compiler with automatic or explicit style-pack selection;
- nine bundled packs: general, electronic, underground minimal/electro, underground breaks/UK garage, hip-hop, pop, R&B/neo-soul, rock and ambient;
- automatic or explicit pack variants that change groove, synthesis recipes, arrangement and mix behavior;
- distinct four-on-floor, broken, backbeat and half-time drum topologies;
- versioned JSON pack schema for custom genres, track roles, browser queries, arrangements and mix defaults;
- structured 64–512 bar arrangements;
- a distinct deterministic source variation for every active track section;
- pack-defined track roles instead of one fixed eight-track electronic template;
- deterministic harmony, motif-based melody, drums, bass and generative sequences;
- Browser device discovery with installed-device fallbacks;
- conservative gain staging, panning, sends, EQ, compression and reverb setup;
- batched Arrangement placement and idempotent resume.

### Music Brain

- deterministic generation by seed;
- groove, bass and alien/digital sequence generators;
- selective mutation and “make it less obvious” workflows;
- 16→64-bar section evolution;
- persistent generation, track and clip locks.

### Reference Brain

- register local reference audio without copying it into Git;
- analyze PCM WAV directly and other formats through `ffmpeg`;
- separate measured features from human ratings and tags;
- build, explain and blend reusable style profiles;
- recursively import and analyze a reference folder in one call;
- store structured feedback without pretending to retrain an AI model.

## Current boundaries

LiveBrain is honest about what has and has not been verified:

- device selection depends on the Ableton content installed on the machine;
- EQ and compression are role-aware starting points, not analyzer-backed mastering decisions;
- external compressor sidechain routing is not consistently exposed by the current Python Live Object Model bridge;
- scenes, audio-track workflows, automation envelopes, nested racks and broad routing are not yet at parity with mature Ableton controllers;
- the automatic installer is currently macOS-first;
- ChatGPT requires a future remote MCP transport or secure tunnel.

These gaps are tracked in the [roadmap](docs/ROADMAP.md).

## MCP tools

LiveBrain currently exposes 54 tools across these groups:

- **Ableton:** Live Set analysis, MIDI tracks/clips/notes, regular/Master/Return devices and mixer, Master output meter, song settings, transport, Browser and Arrangement;
- **Production:** full production planning and execution;
- **Music:** drums, bass, sequences, mutation and section evolution;
- **References:** local audio analysis, ratings, influence and profile blending;
- **Learning controls:** structured feedback and persistent dimension locks.

See [Ableton API](docs/ABLETON_API.md) and [Production Engine](docs/PRODUCTION_ENGINE.md) for the exact surface.

## Architecture

```text
Claude / Codex / Cursor / another local MCP client
                         │
                      MCP stdio
                         │
                         ▼
                 LiveBrain (TypeScript)
                  ├─ Production Engine
                  │    └─ Style Pack Registry (JSON)
                  ├─ Music Brain
                  ├─ Reference Brain
                  └─ Typed Ableton Adapter
                         │
                  JSON-lines on localhost
                         │
                         ▼
             Ableton Live Remote Script (Python)
```

The bridge listens only on `127.0.0.1:9877`. Musical reasoning stays outside Ableton in typed, tested TypeScript. The adapter boundary allows the Python compatibility layer to be replaced by Ableton's Extensions SDK when the required APIs become stable.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Run without Ableton using the deterministic mock adapter:

```bash
LIVEBRAIN_ADAPTER=mock npm run dev
```

The current suite contains 52 automated tests covering the bridge contract, MIDI note compatibility, version alignment, deterministic generation, drum topologies, style-pack validation and routing, automatic multi-context resolution, A/B preference learning, reference-folder imports, locks, dry-run safety and resumable full-production execution.

## Documentation

- [AI client setup](docs/CLIENTS.md)
- [Production Engine](docs/PRODUCTION_ENGINE.md)
- [Style Packs: install and author genres](docs/STYLE_PACKS.md)
- [Underground Vibe Atlas: variants, production translations and sources](docs/UNDERGROUND_VIBE_ATLAS.md)
- [Comparison with controller-focused Ableton MCPs](docs/COMPARISON.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Ableton API](docs/ABLETON_API.md)
- [Music Brain](docs/MUSIC_BRAIN.md)
- [Reference Brain](docs/REFERENCE_BRAIN.md)
- [Taste Lab: underground contexts and personal profiles](docs/TASTE_LAB.md)
- [Style Engine](docs/STYLE_ENGINE.md)
- [Feedback Engine](docs/FEEDBACK_ENGINE.md)
- [Selective Generation & Evolution](docs/SELECTIVE_EVOLUTION.md)
- [Roadmap](docs/ROADMAP.md)

## Contributing

Bug reports, musical examples, device-compatibility reports and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

If LiveBrain helps your workflow, consider [starring the repository](https://github.com/Fasping/livebrain-ableton-mcp) and sharing what you made. Real Ableton projects, reproducible prompts and honest failure reports are more valuable than hype.

## License and disclaimer

[MIT](LICENSE). LiveBrain is an independent open-source project and is not affiliated with or endorsed by Ableton, Anthropic or OpenAI. Ableton and Ableton Live are trademarks of Ableton AG.
