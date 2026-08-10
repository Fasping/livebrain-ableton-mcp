# AI client setup

LiveBrain currently exposes a local MCP server over stdio. The client launches `node /absolute/path/to/livebrain-mcp/dist/index.js`; that process talks to the Ableton Remote Script on localhost.

Run `npm install && npm run build` and enable the `LiveBrain` Control Surface in Ableton before configuring a client.

## Claude Desktop

Add this server to `claude_desktop_config.json` and restart Claude Desktop:

```json
{
  "mcpServers": {
    "livebrain": {
      "command": "node",
      "args": ["/absolute/path/to/livebrain-mcp/dist/index.js"],
      "env": {
        "LIVEBRAIN_HOST": "127.0.0.1",
        "LIVEBRAIN_PORT": "9877"
      }
    }
  }
}
```

If a GUI client cannot find Node installed through a version manager, replace `node` with the absolute output of `command -v node`.

## Codex

Register the local stdio server from a terminal:

```bash
codex mcp add livebrain \
  --env LIVEBRAIN_HOST=127.0.0.1 \
  --env LIVEBRAIN_PORT=9877 \
  -- node /absolute/path/to/livebrain-mcp/dist/index.js
```

Restart or open a new Codex task after changing MCP configuration.

## Cursor and VS Code MCP clients

Use the same `command`, `args` and `env` object shown for Claude Desktop in the client's MCP settings. Exact settings locations vary by client version; the transport is a normal local stdio MCP server.

Only launch one LiveBrain MCP server against the bridge while diagnosing connection problems.

## Other local MCP clients

Any client that supports local stdio servers can launch:

```bash
node /absolute/path/to/livebrain-mcp/dist/index.js
```

The process writes MCP messages to stdout and structured logs to stderr.

## ChatGPT

ChatGPT cannot directly reach a local stdio or localhost-only MCP server. Current custom MCP app support requires a remote MCP endpoint or a supported secure tunnel, and availability/write permissions depend on the ChatGPT plan and workspace configuration.

LiveBrain does not ship that remote transport yet. The typed Music Brain and Ableton adapter are client-independent, but calling LiveBrain “one-click ChatGPT compatible” today would be misleading.

See OpenAI's current documentation:

- [Developer mode and MCP apps in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt)
- [Build with the Apps SDK](https://help.openai.com/en/articles/12515353-build-with-the-apps-sdk)

The planned path is a remote LiveBrain MCP gateway or Secure MCP Tunnel while the Ableton bridge remains bound to localhost.

## First connection test

Ask the client:

```text
Run LiveBrain health and capabilities. Do not modify Ableton.
```

Confirm the MCP and bridge versions, then run `livebrain_analyze_set` before any write request.
