import type { MeasuredAudioFeatures } from "./models.js";

export interface AudioAnalyzer {
  readonly id: string;
  readonly version: string;
  supports(path: string): boolean;
  analyze(path: string): Promise<MeasuredAudioFeatures>;
}

export class AnalyzerRegistry {
  constructor(private readonly analyzers: AudioAnalyzer[]) {}
  analyzerFor(path: string): AudioAnalyzer {
    const analyzer = this.analyzers.find((candidate) => candidate.supports(path));
    if (!analyzer) throw new Error("No analyzer can decode this file. PCM WAV is built in; configure ffmpeg support for compressed formats.");
    return analyzer;
  }
}
