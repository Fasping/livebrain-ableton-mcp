import type { AbletonAdapter } from "./adapter.js";
import type { BridgeCapabilities, LiveSetSnapshot } from "./types.js";
import { AbletonBridgeClient } from "../bridge/client.js";

export class PythonRemoteScriptAdapter implements AbletonAdapter {
  constructor(private readonly bridge = new AbletonBridgeClient()) {}

  capabilities(): Promise<BridgeCapabilities> {
    return this.bridge.request("system.capabilities");
  }

  snapshot(): Promise<LiveSetSnapshot> {
    return this.bridge.request("live_set.snapshot");
  }

  async close(): Promise<void> {
    // Connections are request-scoped in v0.1.1.
  }
}
