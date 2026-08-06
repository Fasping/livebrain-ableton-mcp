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

/** Stable boundary between LiveBrain and the replaceable Ableton integration. */
export interface AbletonAdapter {
  capabilities(): Promise<BridgeCapabilities>;
  snapshot(mode?: SnapshotMode): Promise<LiveSetSnapshot>;
  createMidiTrack(input: CreateTrackInput & { dryRun?: boolean }): Promise<ChangeSummary>;
  createMidiClip(input: CreateMidiClipInput & { dryRun?: boolean }): Promise<ChangeSummary>;
  getClipNotes(target: ClipTarget): Promise<MidiNote[]>;
  replaceClipNotes(target: ClipTarget, notes: MidiNote[], dryRun?: boolean): Promise<ChangeSummary>;
  addNotes(target: ClipTarget, notes: MidiNote[], dryRun?: boolean): Promise<ChangeSummary>;
  getDevices(trackIndex: number): Promise<LiveDeviceSnapshot[]>;
  getDeviceParameters(target: DeviceTarget): Promise<DeviceParameterSnapshot[]>;
  setDeviceParameter(target: ParameterTarget, normalizedValue: number, dryRun?: boolean): Promise<ChangeSummary>;
  close(): Promise<void>;
}
