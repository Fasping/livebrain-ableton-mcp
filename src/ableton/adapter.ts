import type {
  ArrangementClipSnapshot,
  ArrangementPlacementInput,
  BridgeCapabilities,
  BrowserItemSnapshot,
  BrowserSearchInput,
  ChangeSummary,
  ClipTarget,
  CreateMidiClipInput,
  CreateTrackInput,
  DeviceParameterSnapshot,
  DeviceTarget,
  LiveDeviceSnapshot,
  LiveSetSnapshot,
  MasterMeterSnapshot,
  MidiNote,
  ParameterTarget,
  SongSettingsInput,
  SnapshotMode,
  TrackMixerInput,
  TransportAction,
} from "./types.js";

/** Stable boundary between LiveBrain and the replaceable Ableton integration. */
export interface AbletonAdapter {
  capabilities(): Promise<BridgeCapabilities>;
  snapshot(mode?: SnapshotMode): Promise<LiveSetSnapshot>;
  createMidiTrack(input: CreateTrackInput & { dryRun?: boolean }): Promise<ChangeSummary>;
  deleteTrack(trackIndex: number, dryRun?: boolean): Promise<ChangeSummary>;
  createMidiClip(input: CreateMidiClipInput & { dryRun?: boolean }): Promise<ChangeSummary>;
  getClipNotes(target: ClipTarget): Promise<MidiNote[]>;
  replaceClipNotes(target: ClipTarget, notes: MidiNote[], dryRun?: boolean): Promise<ChangeSummary>;
  addNotes(target: ClipTarget, notes: MidiNote[], dryRun?: boolean): Promise<ChangeSummary>;
  duplicateClip(source: ClipTarget, destination: ClipTarget, dryRun?: boolean): Promise<ChangeSummary>;
  setClipLoop(target: ClipTarget, loopStart: number, loopEnd: number, dryRun?: boolean): Promise<ChangeSummary>;
  getDevices(trackIndex: number): Promise<LiveDeviceSnapshot[]>;
  getDeviceParameters(target: DeviceTarget): Promise<DeviceParameterSnapshot[]>;
  setDeviceParameter(target: ParameterTarget, normalizedValue: number, dryRun?: boolean): Promise<ChangeSummary>;
  setSongSettings(input: SongSettingsInput, dryRun?: boolean): Promise<ChangeSummary>;
  setTrackMixer(trackIndex: number, input: TrackMixerInput, dryRun?: boolean): Promise<ChangeSummary>;
  getMasterMeter(): Promise<MasterMeterSnapshot>;
  setTransport(action: TransportAction, dryRun?: boolean): Promise<ChangeSummary>;
  searchBrowser(input: BrowserSearchInput): Promise<BrowserItemSnapshot[]>;
  loadBrowserItem(trackIndex: number, uri: string, dryRun?: boolean): Promise<ChangeSummary>;
  duplicateToArrangement(target: ClipTarget, destinationTime: number, dryRun?: boolean): Promise<ChangeSummary>;
  duplicateManyToArrangement(placements: ArrangementPlacementInput[], dryRun?: boolean): Promise<ChangeSummary>;
  getArrangementClips(trackIndex: number): Promise<ArrangementClipSnapshot[]>;
  showArrangement(dryRun?: boolean): Promise<ChangeSummary>;
  close(): Promise<void>;
}
