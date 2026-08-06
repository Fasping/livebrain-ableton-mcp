# LiveBrain

LiveBrain is an Ableton Live 12 production system for Claude Desktop.

## Architecture

- **MCP Server (TypeScript)** — stable tools exposed to Claude.
- **Music Brain (TypeScript)** — grooves, basslines, percussion and style-aware decisions.
- **Ableton Bridge (Python Remote Script)** — minimal JSON-lines bridge to Live's Python API.
- **Reference Brain (planned)** — musical analysis and reusable style profiles.
- **Ableton Extensions SDK adapter (planned)** — future replacement for the Python bridge.
- **React dashboard (optional)** — observability and manual control later.

## Quick start

```bash
npm install
npm run build
npm run dev
```

The MCP server uses stdio. The bridge listens on `127.0.0.1:9877`.

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
- **v0.2:** devices, automation, arrangement, browser, racks, routing and section operations.
- **v0.3:** Reference Brain and evolving producer profiles.

