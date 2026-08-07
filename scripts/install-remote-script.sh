#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/bridge/LiveBrain"
ABLETON_APP="${ABLETON_APP:-/Applications/Ableton Live 12 Standard.app}"
TARGET_ROOT="$ABLETON_APP/Contents/App-Resources/MIDI Remote Scripts"
TARGET="$TARGET_ROOT/LiveBrain"

if [[ ! -d "$TARGET_ROOT" ]]; then
  echo "Ableton MIDI Remote Scripts directory not found: $TARGET_ROOT" >&2
  echo "Set ABLETON_APP to your Ableton Live application path." >&2
  exit 1
fi

echo "Installing LiveBrain Remote Script into: $TARGET"
if [[ -d "$TARGET" ]]; then
  BACKUP="$TARGET.backup.$(date +%Y%m%d%H%M%S)"
  echo "Backing up existing script to: $BACKUP"
  cp -R "$TARGET" "$BACKUP"
fi

mkdir -p "$TARGET"
cp "$SOURCE/__init__.py" "$SOURCE/LiveBrain.py" "$TARGET/"
echo "Installed. Restart Ableton Live and select LiveBrain as a Control Surface."
