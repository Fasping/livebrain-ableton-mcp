# Contributing to LiveBrain

LiveBrain needs both software feedback and musical feedback. A technically valid MIDI result can still be boring, overcrowded or wrong for the requested vibe.

## Useful contributions

- reproducible Ableton Live bridge bugs;
- Browser results from different Live editions and installed Packs;
- prompts plus screenshots or short descriptions of the result;
- new deterministic generators and arrangement strategies;
- tests for Live Object Model compatibility;
- documentation improvements for new users and MCP clients.

Do not commit commercial samples, copyrighted reference audio, Ableton project files containing third-party material, secrets or machine-specific paths. Reference audio belongs outside Git; LiveBrain stores only its local path index and derived measurements.

## Development setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

Use the mock adapter when Ableton is not running:

```bash
LIVEBRAIN_ADAPTER=mock npm run dev
```

## Reporting a bridge bug

Include:

1. macOS/Windows version and Ableton edition/version;
2. LiveBrain MCP and bridge versions from `health`;
3. the exact tool and input that failed;
4. the exact error text;
5. whether the write partially changed the Live Set;
6. the smallest reproducible Live Set state.

Save the Live Set before reproducing a write bug. Never upload private audio merely to demonstrate a protocol problem.

## Pull requests

- keep musical reasoning in TypeScript and Ableton-only execution in the bridge;
- preserve the typed `AbletonAdapter` boundary;
- add dry-run support to meaningful writes;
- keep generation deterministic when a seed is supplied;
- add or update tests and documentation;
- state real limitations rather than reporting an unverified production action as successful.
