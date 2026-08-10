# LiveBrain

**AI music production brain for Ableton Live.**

LiveBrain is an agent-agnostic music-production system for deep control of Ableton Live 12. Unlike a generic remote-control MCP, it combines a normalized Ableton API with deterministic musical generation, mutation, project analysis and—later—a local Reference Brain and preference model.

The same LiveBrain core is intended to work with Claude Desktop, Claude Code, ChatGPT, Codex, Cursor, VS Code and other MCP-compatible clients. Each client may require a different transport or deployment model.

## Architecture

- **MCP Server (TypeScript)** — stable tools exposed to any compatible AI client.
- **Music Brain (TypeScript)** — grooves, basslines, percussion and style-aware decisions.
- **Ableton Bridge (temporary Python Remote Script)** — deliberately small JSON-lines adapter to Live's current Python API.
- **Reference Brain (planned)** — musical analysis and reusable style profiles.
- **Ableton Extensions SDK adapter (planned)** — preferred native bridge once the required Ableton APIs are available and stable; it will replace the temporary Python layer.
- **React dashboard (optional)** — observability and manual control later.

## Client and transport strategy

```text
Claude Desktop / Claude Code / Cursor / VS Code
                    │
                 MCP stdio
                    │
                    ▼
              LiveBrain Core
                    ▲
                    │
        remote MCP / secure tunnel
                    │
             ChatGPT / Codex
```

- **Local clients:** use the `stdio` MCP transport.
- **Remote clients:** will use a remote MCP transport or secure tunnel.
- **Music Brain:** remains identical for every client.
- **Ableton adapter:** is isolated behind a typed interface so its implementation can change without rewriting the MCP tools or Music Brain.

## Ableton integration policy

Python is a compatibility bridge, not LiveBrain's long-term foundation. During the early releases it should contain only the code that must execute inside Ableton Live:

- read and serialize Live Set state;
- execute validated commands on Live objects;
- return normalized results and errors;
- avoid musical-generation or agent logic.

Musical reasoning, reference analysis, validation, schemas and orchestration belong in TypeScript. When Ableton's Extensions SDK exposes the control surface LiveBrain needs, a native Extensions adapter will replace the Python bridge while preserving the higher-level APIs.

## Quick start

```bash
npm install
npm run build
npm run dev
```

Use Node.js 20 or newer. Run without Ableton during development with:

```bash
LIVEBRAIN_ADAPTER=mock npm run dev
```

The initial MCP server uses stdio. The temporary Python bridge listens only on `127.0.0.1:9877`.

## Ableton Remote Script

1. Run `./scripts/install-remote-script.sh`. By default this installs the bridge as `LiveBrainDev` under `~/Music/Ableton/User Library/Remote Scripts`.
2. Restart Live.
3. In **Settings → Link, Tempo & MIDI**, select **LiveBrainDev** as a Control Surface.
4. Keep port `9877` on localhost; never expose the bridge publicly.

If your User Library is elsewhere, set `ABLETON_USER_LIBRARY` before running the installer. See `docs/ABLETON_API.md`.

## Claude Desktop

After `npm run build`, add the server to Claude Desktop's MCP configuration:

```json
{
  "mcpServers": {
    "livebrain": {
      "command": "node",
      "args": ["/absolute/path/to/livebrain-mcp/dist/index.js"],
      "env": { "LIVEBRAIN_HOST": "127.0.0.1", "LIVEBRAIN_PORT": "9877" }
    }
  }
}
```

## Development and testing

```bash
npm run typecheck
npm test
npm run build
```

Structured logs go only to stderr so MCP stdio is never corrupted.

## Current MCP tools

- `health`, `ableton_capabilities`
- `livebrain_analyze_set` (`compact` or `detailed`)
- `ableton_create_midi_track`, `ableton_create_midi_clip`
- `ableton_get_clip_notes`, `ableton_replace_notes`, `ableton_duplicate_clip`, `ableton_set_clip_loop`
- `ableton_get_devices`, `ableton_get_device_parameters`, `ableton_set_device_parameter`
- `music_generate_drum_groove`, `music_generate_bass`, `music_generate_sequence`
- `music_mutate_clip`, `music_make_less_obvious`, `music_make_bass_less_obvious`, `music_evolve_section`
- `music_compare_to_profile`
- `reference_add`, `reference_analyze`, `reference_tag`, `reference_rate`
- `reference_set_influence`, `reference_get`, `reference_list`, `reference_build_profile`, `reference_explain_profile`, `reference_blend_profiles`
- `feedback_generation`, `feedback_get_preferences`
- `generation_set_locks`, `generation_get_locks`

Write operations support `dryRun` where useful.

## Reference workflow

Reference audio remains at its original local path and is never copied into Git. LiveBrain stores shareable measurements separately from a gitignored local path index.

```bash
livebrain reference-add --audio "/local/music/reference.wav" --title "Reference 01" --groups afterhours_2019
livebrain reference-analyze --id UUID
livebrain reference-rate --id UUID --ratings '{"groove":9,"space":8,"cheese":0.5}'
livebrain reference-set-influence --id UUID --influence '{"groove":1,"bass":0,"arrangement":0.8}'
livebrain reference-build-profile --group afterhours_2019
```

PCM WAV analysis is built in. MP3, AIFF, FLAC, M4A and OGG use `ffmpeg`; install it and optionally set `LIVEBRAIN_FFMPEG_PATH`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Ableton API](docs/ABLETON_API.md)
- [Music Brain](docs/MUSIC_BRAIN.md)
- [Reference Brain](docs/REFERENCE_BRAIN.md)
- [Style Engine](docs/STYLE_ENGINE.md)
- [Feedback Engine](docs/FEEDBACK_ENGINE.md)
- [Selective Generation & Evolution](docs/SELECTIVE_EVOLUTION.md)
- [Roadmap](docs/ROADMAP.md)

## Layout

```text
src/
  index.ts
  bridge/client.ts
  music-brain/
bridge/LiveBrain/
```

## Roadmap

- **v0.1:** MCP, minimal bridge and first Music Brain.
- **v0.1.1:** thread-safe Live execution, versioned bridge protocol and replaceable Ableton adapter.
- **v0.2:** devices, automation, arrangement, browser, racks, routing and section operations.
- **v0.3:** Reference Brain and evolving producer profiles.
- **v0.4:** selective generation, persistent dimension locks and section evolution.
- **Future:** remote MCP transport and migration from the Python compatibility bridge to Ableton Extensions SDK.
