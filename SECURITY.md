# Security policy

## Local trust boundary

LiveBrain controls an open Ableton Live Set and can create, replace or delete project data. Only connect AI clients and MCP configurations you trust.

The Python bridge binds to `127.0.0.1:9877` by default. Do not expose this port to a public network, forward it through a router, or bind it to `0.0.0.0`.

Before large production requests:

- save the Live Set;
- use `dryRun: true` first;
- verify track/clip targets;
- keep Ableton's undo history available;
- inspect any third-party MCP client configuration.

Reference audio is not copied into the repository. Keep `data/reference-paths.json`, local audio, Remote Script backups and secrets out of Git.

## Reporting a vulnerability

Please do not open a public issue containing an exploit, private path, token or personal audio. Contact the repository owner through the private security-reporting option on GitHub. Include affected versions, reproduction steps and the smallest safe proof of concept.
