export type SnapshotMode = "compact" | "detailed";

export interface MidiNote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
  mute?: boolean;
  probability?: number;
}

export interface DeviceParameterSnapshot {
  index: number;
  name: string;
  value: number;
  normalizedValue: number;
  min: number;
  max: number;
  isQuantized: boolean;
  enabled: boolean;
}

export interface LiveDeviceSnapshot {
  index: number;
  name: string;
  className: string;
  parameters?: DeviceParameterSnapshot[];
}

export interface ClipSnapshot {
  slotIndex: number;
  name: string;
  isMidi: boolean;
  length: number;
  loopStart: number;
  loopEnd: number;
  noteCount?: number;
  noteDensity?: number;
}

export interface MixerSnapshot {
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  arm: boolean;
  sends: number[];
}

export interface LiveTrackSnapshot {
  index: number;
  name: string;
  kind: "midi" | "audio" | "return" | "master";
  role?: string;
  mixer: MixerSnapshot;
  devices: LiveDeviceSnapshot[];
  clips: ClipSnapshot[];
}

export interface LiveSetSnapshot {
  mode: SnapshotMode;
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  isPlaying: boolean;
  currentSongTime: number;
  trackCount: number;
  returnCount: number;
  tracks: LiveTrackSnapshot[];
}

export interface BridgeCapabilities {
  protocolVersion: string;
  bridgeVersion: string;
  methods: string[];
  unsupported: string[];
}

export interface CreateTrackInput {
  index?: number;
  name?: string;
}

export interface CreateMidiClipInput {
  trackIndex: number;
  slotIndex: number;
  length: number;
  name?: string;
}

export interface ClipTarget {
  trackIndex: number;
  slotIndex: number;
}

export interface DeviceTarget {
  trackIndex: number;
  deviceIndex: number;
}

export interface ParameterTarget extends DeviceTarget {
  parameterIndex: number;
}

export interface ChangeSummary {
  operation: string;
  changed: boolean;
  dryRun: boolean;
  target: Record<string, number | string>;
  details?: Record<string, unknown>;
}
