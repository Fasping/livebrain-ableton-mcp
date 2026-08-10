#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install Node.js 20 or newer first." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "LiveBrain requires Node.js 20 or newer; found $(node -v)." >&2
  exit 1
fi

cd "$PROJECT_DIR"
export npm_config_cache="${LIVEBRAIN_NPM_CACHE:-${TMPDIR:-/tmp}/livebrain-npm-cache}"
echo "Installing dependencies..."
npm ci
echo "Building LiveBrain..."
npm run build
echo "Installing the Ableton Remote Script..."
"$PROJECT_DIR/scripts/install-remote-script.sh"

NODE_BIN="$(command -v node)"
ENTRY_FILE="$PROJECT_DIR/dist/index.js"

echo
echo "LiveBrain is built and installed. Restart Ableton Live and select LiveBrain as a Control Surface."
echo "Paste this MCP server entry into your local MCP client:"
LIVEBRAIN_NODE_BIN="$NODE_BIN" LIVEBRAIN_ENTRY_FILE="$ENTRY_FILE" node -e '
const config = {
  mcpServers: {
    livebrain: {
      command: process.env.LIVEBRAIN_NODE_BIN,
      args: [process.env.LIVEBRAIN_ENTRY_FILE],
      env: { LIVEBRAIN_HOST: "127.0.0.1", LIVEBRAIN_PORT: "9877" }
    }
  }
};
console.log(JSON.stringify(config, null, 2));
'
