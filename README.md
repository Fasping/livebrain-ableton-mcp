# LiveBrain

LiveBrain is an agent-agnostic music-production system for deep control of Ableton Live 12. It is built around the Model Context Protocol (MCP), so it is not tied to Claude Desktop or to one AI provider.

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

The initial MCP server uses stdio. The temporary Python bridge listens only on `127.0.0.1:9877`.

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
- **Future:** remote MCP transport and migration from the Python compatibility bridge to Ableton Extensions SDK.
