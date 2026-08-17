import type { AbletonAdapter } from "../ableton/adapter.js";
import type { ArrangementPlacementInput, BrowserItemSnapshot, LiveTrackSnapshot } from "../ableton/types.js";
import type { ProductionExecutionResult, ProductionPlan, ProductionTrackPlan } from "./types.js";

export async function executeProduction(ableton: AbletonAdapter, plan: ProductionPlan, dryRun = true): Promise<ProductionExecutionResult> {
  const snapshot = await ableton.snapshot("compact");
  const result: ProductionExecutionResult = {
    plan, dryRun, trackIndices: {}, changes: [], loadedDevices: [], warnings: [...plan.limitations],
  };
  const existingByName = new Map(snapshot.tracks.map((track) => [track.name, track]));
  let nextTrackIndex = snapshot.trackCount;
  for (const track of plan.tracks) {
    result.trackIndices[track.role] = existingByName.get(track.name)?.index ?? nextTrackIndex++;
  }
  if (dryRun) {
    result.changes.push({
      operation: "production.plan", tracks: plan.tracks.length, arrangementBars: plan.brief.bars,
      clipCount: plan.tracks.reduce((sum, track) => sum + track.clips.length, 0),
      noteCount: plan.tracks.reduce((sum, track) => sum + track.clips.reduce((clipSum, clip) => clipSum + clip.notes.length, 0), 0),
      reusableTracks: plan.tracks.filter((track) => existingByName.has(track.name)).map((track) => track.name),
    });
    return result;
  }

  result.changes.push(await ableton.setSongSettings({
    tempo: plan.brief.bpm,
    timeSignature: { numerator: 4, denominator: 4 },
    scale: { rootNote: plan.brief.rootNote, name: plan.brief.mode },
  }, false));

  const browserCache = new Map<string, BrowserItemSnapshot[]>();
  const resolvedTracks = new Map<string, LiveTrackSnapshot>();
  for (const track of plan.tracks) {
    const trackIndex = result.trackIndices[track.role]!;
    const existing = existingByName.get(track.name);
    if (!existing) {
      result.changes.push(await ableton.createMidiTrack({ index: trackIndex, name: track.name, dryRun: false }));
    } else {
      resolvedTracks.set(track.name, existing);
      result.changes.push({ operation: "track.reuse", changed: false, dryRun: false, target: { trackIndex }, details: { name: track.name } });
    }

    const knownDeviceNames = new Set((existing?.devices ?? []).map((device) => device.name.toLowerCase()));
    if (knownDeviceNames.size === 0) {
      const loaded = await loadFirstAvailable(ableton, trackIndex, track, track.instrumentQueries, ["instruments", "sounds", "drums"], browserCache, result);
      if (loaded) knownDeviceNames.add(loaded.toLowerCase());
    }

    for (const clip of track.clips) {
      const existingClip = existing?.clips.find((candidate) => candidate.slotIndex === clip.slotIndex);
      if (!existingClip) {
        result.changes.push(await ableton.createMidiClip({ trackIndex, slotIndex: clip.slotIndex, length: plan.brief.clipBars * 4, name: clip.name, dryRun: false }));
      } else {
        result.changes.push({ operation: "clip.reuse", changed: false, dryRun: false, target: { trackIndex, slotIndex: clip.slotIndex }, details: { name: existingClip.name } });
      }
      result.changes.push(await ableton.replaceClipNotes({ trackIndex, slotIndex: clip.slotIndex }, clip.notes, false));
    }
    const mixer = { ...track.mixer, sends: track.mixer.sends?.filter((send) => send.sendIndex < snapshot.returnCount) };
    result.changes.push(await ableton.setTrackMixer(trackIndex, mixer, false));
    for (const effect of track.effectQueries) {
      const existingEffect = [...knownDeviceNames].find((name) => name.includes(effect.toLowerCase()));
      if (existingEffect) {
        await configureRoleEffect(ableton, trackIndex, track, effect, result, existingEffect);
        continue;
      }
      const loaded = await loadFirstAvailable(ableton, trackIndex, track, [effect], ["audio_effects"], browserCache, result);
      if (loaded) knownDeviceNames.add(loaded.toLowerCase());
    }
  }

  const placements: ArrangementPlacementInput[] = [];
  for (const track of plan.tracks) {
    const trackIndex = result.trackIndices[track.role]!;
    const existingArrangement = resolvedTracks.has(track.name) ? await ableton.getArrangementClips(trackIndex) : [];
    for (const clip of track.clips) {
      for (const destinationTime of clip.arrangementPositions) {
        const alreadyPlaced = existingArrangement.some((candidate) => Math.abs(candidate.startTime - destinationTime) < .001);
        if (!alreadyPlaced) placements.push({ trackIndex, slotIndex: clip.slotIndex, destinationTime });
      }
    }
  }
  if (placements.length) {
    try {
      result.changes.push(await ableton.duplicateManyToArrangement(placements, false));
    } catch (error) {
      result.warnings.push(`Batch Arrangement placement failed: ${message(error)}`);
    }
  } else {
    result.changes.push({ operation: "arrangement.reuse", changed: false, dryRun: false, target: { arrangement: "live_set" }, details: { reason: "all planned positions already exist" } });
  }
  try {
    result.changes.push(await ableton.setSongSettings({ loop: { start: 0, length: plan.brief.bars * 4, enabled: true } }, false));
  } catch (error) {
    result.warnings.push(`Arrangement loop could not be set after placement: ${message(error)}`);
  }
  try {
    result.changes.push(await ableton.showArrangement(false));
  } catch (error) {
    result.warnings.push(`Arrangement view could not be opened: ${message(error)}`);
  }
  return result;
}

async function loadFirstAvailable(
  ableton: AbletonAdapter,
  trackIndex: number,
  track: ProductionTrackPlan,
  queries: string[],
  categories: Array<"instruments" | "sounds" | "drums" | "audio_effects">,
  cache: Map<string, BrowserItemSnapshot[]>,
  result: ProductionExecutionResult,
): Promise<string | undefined> {
  for (const query of queries) {
    const key = `${categories.join(",")}:${query.toLowerCase()}`;
    let matches = cache.get(key);
    try {
      if (!matches) {
        matches = await ableton.searchBrowser({ query, categories, maxResults: 8 });
        cache.set(key, matches);
      }
      const item = matches.find((candidate) => candidate.isLoadable);
      if (!item) continue;
      const change = await ableton.loadBrowserItem(trackIndex, item.uri, false);
      result.changes.push(change);
      result.loadedDevices.push({ trackIndex, role: track.role, query, item: item.name });
      if (categories.includes("audio_effects")) await configureRoleEffect(ableton, trackIndex, track, item.name, result);
      return item.name;
    } catch (error) {
      result.warnings.push(`Could not load '${query}' on ${track.name}: ${message(error)}`);
    }
  }
  result.warnings.push(`No installed browser match was found for ${track.name}: ${queries.join(" / ")}`);
  return undefined;
}

async function configureRoleEffect(ableton: AbletonAdapter, trackIndex: number, track: ProductionTrackPlan, effectName: string, result: ProductionExecutionResult, existingName?: string) {
  try {
    const devices = await ableton.getDevices(trackIndex);
    const device = existingName
      ? [...devices].reverse().find((candidate) => candidate.name.toLowerCase().includes(existingName.toLowerCase()))
      : devices.at(-1);
    if (!device) return;
    const parameters = await ableton.getDeviceParameters({ trackIndex, deviceIndex: device.index });
    const settings: Array<{ pattern: RegExp; value: number | ((items: string[]) => number | undefined) }> = [];
    if (/compressor/i.test(effectName)) {
      settings.push(
        { pattern: /^threshold$/i, value: track.generator === "kick" || track.generator === "drums" ? .68 : .58 },
        { pattern: /^ratio$/i, value: track.generator === "kick" || track.generator === "drums" ? .2 : .3 },
        { pattern: /^attack$/i, value: track.generator === "kick" || track.generator === "drums" ? .12 : .22 },
        { pattern: /^release$/i, value: .32 },
        { pattern: /dry.?wet/i, value: 1 },
      );
    }
    if (/eq eight/i.test(effectName)) {
      const cutoffByGenerator = { kick: .05, hats: .42, percussion: .3, drums: .08, bass: .06, harmony: .22, melody: .24, sequence: .24, texture: .28, fx: .3 } as const;
      settings.push(
        { pattern: /^1 filter on/i, value: 1 },
        { pattern: /^1 filter type/i, value: (items) => quantizedItem(items, /low cut|high.?pass/i) },
        { pattern: /^1 frequency/i, value: cutoffByGenerator[track.generator] },
      );
    }
    for (const setting of settings) {
      const parameter = parameters.find((candidate) => setting.pattern.test(candidate.name));
      if (!parameter) continue;
      const normalizedValue = typeof setting.value === "function" ? setting.value(parameter.valueItems ?? []) : setting.value;
      if (normalizedValue === undefined) continue;
      result.changes.push(await ableton.setDeviceParameter({ trackIndex, deviceIndex: device.index, parameterIndex: parameter.index }, normalizedValue, false));
    }
  } catch (error) {
    result.warnings.push(`Role-aware setup failed for ${effectName} on ${track.name}: ${message(error)}`);
  }
}

function quantizedItem(items: string[], pattern: RegExp) {
  const index = items.findIndex((item) => pattern.test(item));
  return index < 0 ? undefined : items.length <= 1 ? 0 : index / (items.length - 1);
}

function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
