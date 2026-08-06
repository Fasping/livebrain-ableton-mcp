# Architecture

LiveBrain is a music-production brain, not a bag of remote-control commands. Low-level Ableton operations are separated from high-level musical decisions.

```text
MCP client → TypeScript MCP server → Music Brain → AbletonAdapter
                                                   ├─ PythonRemoteScriptAdapter
                                                   ├─ MockAbletonAdapter
                                                   └─ ExtensionsSdkAdapter (future)
```

## Rules

- TypeScript owns schemas, validation, generation and orchestration.
- Python contains no musical intelligence.
- Raw Live objects never escape the adapter.
- Bridge methods are allowlisted and versioned.
- The socket thread never touches Live directly; work is scheduled on Live's main thread.
- stdout is reserved for MCP; structured logs use stderr.
- Writes are validated and grouped into a Live undo step where possible.

## Audit result

The initial repository compiled and provided health, a basic snapshot and deterministic bass generation. It lacked a mock adapter, tests, compact project context, typed MIDI writes, normalized device control and high-level mutation. The v0.2 foundation adds those capabilities without discarding the working bridge.

A workspace/monorepo migration is intentionally deferred until package boundaries stabilize.
