#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$PROJECT_DIR/bridge/LiveBrain"
ABLETON_USER_LIBRARY="${ABLETON_USER_LIBRARY:-$HOME/Music/Ableton/User Library}"
TARGET_ROOT="$ABLETON_USER_LIBRARY/Remote Scripts"
TARGET_NAME="${LIVEBRAIN_REMOTE_SCRIPT_NAME:-LiveBrain}"
TARGET="$TARGET_ROOT/$TARGET_NAME"
BACKUP_ROOT="$PROJECT_DIR/data/remote-script-backups"

if [[ ! -d "$ABLETON_USER_LIBRARY" ]]; then
  echo "Ableton User Library not found: $ABLETON_USER_LIBRARY" >&2
  echo "Set ABLETON_USER_LIBRARY to your configured User Library path." >&2
  exit 1
fi

mkdir -p "$TARGET_ROOT"
echo "Installing LiveBrain Remote Script into: $TARGET"
if [[ -d "$TARGET" ]]; then
  mkdir -p "$BACKUP_ROOT"
  BACKUP="$BACKUP_ROOT/$TARGET_NAME.$(date +%Y%m%d%H%M%S)"
  echo "Backing up existing script to: $BACKUP"
  cp -R "$TARGET" "$BACKUP"
fi

mkdir -p "$TARGET"
cp "$SOURCE/__init__.py" "$SOURCE/LiveBrain.py" "$TARGET/"
echo "Installed. Restart Ableton Live and select $TARGET_NAME as a Control Surface."
