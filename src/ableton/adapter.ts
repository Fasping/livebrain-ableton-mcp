import type { BridgeCapabilities, LiveSetSnapshot } from "./types.js";

/** Stable boundary between LiveBrain and the replaceable Ableton integration. */
export interface AbletonAdapter {
  capabilities(): Promise<BridgeCapabilities>;
  snapshot(): Promise<LiveSetSnapshot>;
  close(): Promise<void>;
}
