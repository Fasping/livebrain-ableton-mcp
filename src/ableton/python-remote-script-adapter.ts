import type { AbletonAdapter } from "./adapter.js";
import type {
  BridgeCapabilities,
  ChangeSummary,
  ClipTarget,
  CreateMidiClipInput,
  CreateTrackInput,
  DeviceParameterSnapshot,
  DeviceTarget,
  LiveDeviceSnapshot,
  LiveSetSnapshot,
  MidiNote,
  ParameterTarget,
  SnapshotMode,
} from "./types.js";
import { AbletonBridgeClient } from "../bridge/client.js";

export class PythonRemoteScriptAdapter implements AbletonAdapter {
  constructor(private readonly bridge = new AbletonBridgeClient()) {}

  capabilities(): Promise<BridgeCapabilities> {
    return this.bridge.request("system.capabilities");
  }

  snapshot(mode: SnapshotMode = "compact"): Promise<LiveSetSnapshot> {
    return this.bridge.request("live_set.snapshot", { mode });
  }

  createMidiTrack(input: CreateTrackInput & { dryRun?: boolean }): Promise<ChangeSummary> {
    return this.bridge.request("track.create_midi", input);
  }

  createMidiClip(input: CreateMidiClipInput & { dryRun?: boolean }): Promise<ChangeSummary> {
    return this.bridge.request("clip.create_midi", input);
  }

  getClipNotes(target: ClipTarget): Promise<MidiNote[]> {
    return this.bridge.request("clip.get_notes", target);
  }

  replaceClipNotes(target: ClipTarget, notes: MidiNote[], dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.replace_notes", { ...target, notes, dryRun });
  }

  addNotes(target: ClipTarget, notes: MidiNote[], dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.add_notes", { ...target, notes, dryRun });
  }

  duplicateClip(source: ClipTarget, destination: ClipTarget, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.duplicate", { source, destination, dryRun });
  }

  setClipLoop(target: ClipTarget, loopStart: number, loopEnd: number, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.set_loop", { ...target, loopStart, loopEnd, dryRun });
  }

  getDevices(trackIndex: number): Promise<LiveDeviceSnapshot[]> {
    return this.bridge.request("device.list", { trackIndex });
  }

  getDeviceParameters(target: DeviceTarget): Promise<DeviceParameterSnapshot[]> {
    return this.bridge.request("device.parameters", target);
  }

  setDeviceParameter(target: ParameterTarget, normalizedValue: number, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("device.set_parameter", { ...target, normalizedValue, dryRun });
  }

  async close(): Promise<void> {
    // Connections are request-scoped in v0.1.1.
  }
}
