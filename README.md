# LiveBrain Ableton MCP — AI Music Production for Ableton Live

**Turn a musical idea into an editable, multi-track Ableton Live project with Claude, Codex, Cursor, or another MCP client.**

[![GitHub stars](https://img.shields.io/github/stars/Fasping/livebrain-ableton-mcp?style=social)](https://github.com/Fasping/livebrain-ableton-mcp/stargazers)
[![MIT License](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg?logo=node.js&logoColor=white)](package.json)
[![Ableton Live 12](https://img.shields.io/badge/Ableton%20Live-12-111111.svg)](https://www.ableton.com/live/)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-compatible-7c3aed.svg)](https://modelcontextprotocol.io/)

LiveBrain is an open-source Ableton Live MCP server **and** a deterministic music-production engine. It can inspect a Live Set, compose MIDI, load installed instruments and effects, build an Arrangement, create variations, and remember the musical characteristics you prefer.

> LiveBrain is currently a macOS-first beta verified with Ableton Live 12 and Node.js 20. Save your Live Set before letting any AI client make large changes.

## What can it make?

Ask for a vibe instead of manually describing every MIDI note:

```text
Create a dark, hypnotic and spacious 128-bar minimal track at 130 BPM.
Use separate kick, hats, percussion, bass, chords, lead, texture and FX tracks.
Show me the plan first, then build it in Arrangement View.
```

Or name an underground context directly:

```text
Make a restrained 128-bar afterhours track with the off-kilter space of
Timeless / Francesco Del Garda and a little Montevideo electro tension.
Plan it first. Keep every section editable and avoid generic tech-house tropes.
```

Several references are blended automatically and remain explainable:

```text
Make something between Timeless, Phonotheque and Perlon, with more Timeless
than the others. Resolve the style first and show me the weights.
```

LiveBrain can then:

- create eight independent, editable MIDI tracks;
- generate deterministic drums, bass, harmony, melody, texture and FX material;
- search your Ableton Browser and load devices that are actually installed;
- set tempo, scale, mixer levels, panning, sends, EQ and compression starting points;
- place sections in Arrangement View and resume an interrupted build without duplicating tracks;
- mutate selected musical dimensions while preserving the parts you lock;
- analyze local reference audio and build reusable style profiles.
- resolve researched underground contexts including Timeless / Francesco Del Garda, Partout, Wicked Bass / Noizar, Phonotheque / Z@p and Club der Visionaere / Hoppetosse.
- blend every recognized context in one prompt, report normalized weights and apply locally learned directional or A/B preferences.

Everything remains editable in Ableton. LiveBrain does not render a mysterious finished audio file and hide the production decisions from you.

## Why LiveBrain?

Most Ableton MCP projects expose DAW controls and leave all musical reasoning to the chat model. LiveBrain keeps the control layer, then adds a reusable production brain above it.

| Capability | Generic Ableton controller | LiveBrain |
| --- | ---: | ---: |
| Read/write tracks, clips, devices and mixer | Yes | Yes |
| Deterministic groove, bass, harmony and melody engines | Agent-dependent | Built in |
| Natural-language vibe → complete production plan | Agent-dependent | Built in |
| Safe preview before changing Live | Rare | `dryRun` by default |
| Resume an interrupted full-song build | Rare | Built in |
| Local reference-audio profiles | No | Built in |
| Persistent locks and structured feedback | No | Built in |
| Same seed produces the same musical plan | No guarantee | Yes |

LiveBrain is **not yet the widest Ableton control surface**. Mature controller-focused projects still cover operations such as scenes, audio tracks, automation envelopes, routing and undo/redo more completely. See the honest [comparison and gap analysis](docs/COMPARISON.md).

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

Production runs are resumable by the canonical `LB Kick`…`LB FX` names. Repeating the same prompt, seed and length reuses those tracks, replaces the source MIDI deterministically, skips existing Arrangement positions and completes missing device work.

To teach LiveBrain your own taste without uploading audio, put legally owned reference files in a local folder and ask your client:

```text
Use reference_import_directory on /absolute/path/to/my/references with group
my_afterhours. Analyze the files and build the profile, then plan a track with
profileId my_afterhours.
```

The bundled scene profiles are transparent curation hypotheses, not fake audio measurements. Your local reference profile is what makes the system personal. See [Taste Lab](docs/TASTE_LAB.md).

## Music and production features

### Production Engine

- vibe compiler for minimal, house, techno, trap, lo-fi, pop and ambient starting points;
- structured 64–512 bar arrangements;
- a distinct deterministic source variation for every active track section;
- independent kick, hats, percussion, bass, chords, lead, texture and FX roles;
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

LiveBrain currently exposes 49 tools across these groups:

- **Ableton:** Live Set analysis, MIDI tracks/clips/notes, mixer, song settings, transport, Browser, devices and Arrangement;
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

The current suite contains 40 automated tests covering the bridge contract, MIDI note compatibility, version alignment, deterministic generation, automatic multi-context resolution, A/B preference learning, reference-folder imports, locks, dry-run safety and resumable full-production execution.

## Documentation

- [AI client setup](docs/CLIENTS.md)
- [Production Engine](docs/PRODUCTION_ENGINE.md)
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
