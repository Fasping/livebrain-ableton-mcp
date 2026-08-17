import json
import math
import queue
import socket
import threading

from Live.Clip import MidiNoteSpecification
from ableton.v2.control_surface import ControlSurface


PROTOCOL_VERSION = "1.0"
BRIDGE_VERSION = "0.3.0"
MAX_REQUEST_BYTES = 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 15.0
MASTER_TRACK_INDEX = -1
RETURN_TRACK_INDEX_BASE = 200


class LiveBrain(ControlSurface):
    """Thread-safe JSON-lines compatibility bridge for LiveBrain."""

    def __init__(self, c_instance):
        super().__init__(c_instance)
        self._running = True
        self._server = None
        self._jobs = queue.Queue()
        self._browser_uri_cache = {}
        self._thread = threading.Thread(target=self._serve, name="LiveBrainBridge")
        self._thread.daemon = True
        self._thread.start()
        self.schedule_message(1, self._drain_jobs)
        self._log("LiveBrain bridge %s listening on 127.0.0.1:9877" % BRIDGE_VERSION)

    def disconnect(self):
        self._running = False
        if self._server:
            try:
                self._server.close()
            except Exception:
                pass
        super().disconnect()

    def _log(self, message):
        try:
            self.log_message(message)
        except Exception:
            pass

    def _serve(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", 9877))
        server.listen(4)
        server.settimeout(0.5)
        self._server = server

        while self._running:
            try:
                client, _ = server.accept()
                client.settimeout(REQUEST_TIMEOUT_SECONDS)
                self._handle_client(client)
            except socket.timeout:
                continue
            except Exception as error:
                if self._running:
                    self._log("LiveBrain socket error: %s" % error)

    def _handle_client(self, client):
        request = None
        try:
            request = self._read_request(client)
            done = threading.Event()
            job = {"request": request, "done": done, "response": None}
            self._jobs.put(job)
            if not done.wait(REQUEST_TIMEOUT_SECONDS):
                response = self._error(request.get("id"), "TIMEOUT", "Live main-thread execution timed out")
            else:
                response = job["response"]
        except Exception as error:
            response = self._error(
                request.get("id") if request else None,
                "BAD_REQUEST",
                str(error),
            )

        try:
            client.sendall((json.dumps(response) + "\n").encode("utf-8"))
        finally:
            client.close()

    def _read_request(self, client):
        data = b""
        while b"\n" not in data:
            chunk = client.recv(65536)
            if not chunk:
                raise ValueError("Connection closed before newline")
            data += chunk
            if len(data) > MAX_REQUEST_BYTES:
                raise ValueError("Request exceeded 1 MiB")
        request = json.loads(data.split(b"\n", 1)[0].decode("utf-8"))
        if not isinstance(request, dict):
            raise ValueError("Request must be an object")
        if request.get("protocolVersion") != PROTOCOL_VERSION:
            raise ValueError("Unsupported protocolVersion")
        if not isinstance(request.get("id"), str) or not request.get("id"):
            raise ValueError("Request id must be a non-empty string")
        if not isinstance(request.get("method"), str):
            raise ValueError("Request method must be a string")
        if not isinstance(request.get("params", {}), dict):
            raise ValueError("Request params must be an object")
        return request

    def _drain_jobs(self):
        processed = 0
        while processed < 32:
            try:
                job = self._jobs.get_nowait()
            except queue.Empty:
                break
            try:
                job["response"] = self._dispatch(job["request"])
            except Exception as error:
                job["response"] = self._error(job["request"].get("id"), "LIVE_ERROR", str(error))
            finally:
                job["done"].set()
                processed += 1
        if self._running:
            self.schedule_message(1, self._drain_jobs)

    def _dispatch(self, request):
        method = request["method"]
        handlers = {
            "system.capabilities": self._capabilities,
            "live_set.snapshot": self._snapshot,
            "track.create_midi": self._create_midi_track,
            "track.delete": self._delete_track,
            "clip.create_midi": self._create_midi_clip,
            "clip.get_notes": self._get_clip_notes,
            "clip.replace_notes": self._replace_clip_notes,
            "clip.add_notes": self._add_notes,
            "clip.duplicate": self._duplicate_clip,
            "clip.set_loop": self._set_clip_loop,
            "device.list": self._list_devices,
            "device.parameters": self._device_parameters,
            "device.set_parameter": self._set_device_parameter,
            "song.settings": self._set_song_settings,
            "track.mixer": self._set_track_mixer,
            "master.meter": self._get_master_meter,
            "transport.set": self._set_transport,
            "browser.search": self._search_browser,
            "browser.load": self._load_browser_item,
            "arrangement.duplicate": self._duplicate_to_arrangement,
            "arrangement.duplicate_many": self._duplicate_many_to_arrangement,
            "arrangement.clips": self._arrangement_clips,
            "view.arrangement": self._show_arrangement,
        }
        handler = handlers.get(method)
        if handler is None:
            return self._error(request["id"], "METHOD_NOT_FOUND", "Unsupported method: %s" % method)
        return self._success(request["id"], handler(request.get("params", {})))

    def _capabilities(self, _params):
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "bridgeVersion": BRIDGE_VERSION,
            "methods": [
                "system.capabilities", "live_set.snapshot", "track.create_midi", "track.delete",
                "clip.create_midi", "clip.get_notes", "clip.replace_notes",
                "clip.add_notes", "clip.duplicate", "clip.set_loop", "device.list", "device.parameters",
                "device.set_parameter", "song.settings", "track.mixer", "transport.set",
                "master.meter",
                "browser.search", "browser.load", "arrangement.duplicate", "arrangement.duplicate_many", "arrangement.clips",
                "view.arrangement",
            ],
            "unsupported": [
                "sidechain input routing (not exposed consistently by the Live Object Model)",
                "adaptive spectral mixing without an analyzer device",
                "arrangement automation curves (pending API verification)",
            ],
        }

    def _snapshot(self, params):
        song = self.song
        mode = params.get("mode", "compact")
        if mode not in ("compact", "detailed"):
            raise ValueError("mode must be compact or detailed")
        snapshot = {
            "mode": mode,
            "tempo": float(song.tempo),
            "timeSignature": {
                "numerator": int(song.signature_numerator),
                "denominator": int(song.signature_denominator),
            },
            "isPlaying": bool(song.is_playing),
            "currentSongTime": float(song.current_song_time),
            "trackCount": len(song.tracks),
            "returnCount": len(song.return_tracks),
            "tracks": [
                self._serialize_track(track, index, mode, "midi" if track.has_midi_input else "audio")
                for index, track in enumerate(song.tracks)
            ],
        }
        if mode == "detailed":
            snapshot["masterTrack"] = self._serialize_track(song.master_track, MASTER_TRACK_INDEX, mode, "master")
            snapshot["returnTracks"] = [
                self._serialize_track(track, RETURN_TRACK_INDEX_BASE + index, mode, "return")
                for index, track in enumerate(song.return_tracks)
            ]
        return snapshot

    def _serialize_track(self, track, index, mode, kind):
        clips = []
        if kind not in ("master", "return"):
            for slot_index, slot in enumerate(track.clip_slots):
                if not slot.has_clip:
                    continue
                clip = slot.clip
                item = {
                    "slotIndex": slot_index,
                    "name": clip.name,
                    "isMidi": bool(clip.is_midi_clip),
                    "length": float(clip.length),
                    "loopStart": float(clip.loop_start),
                    "loopEnd": float(clip.loop_end),
                }
                if clip.is_midi_clip:
                    note_count = len(self._read_notes(clip))
                    item["noteCount"] = note_count
                    item["noteDensity"] = note_count / max(float(clip.length), 0.0001)
                clips.append(item)

        return {
            "index": index,
            "name": track.name,
            "kind": kind,
            "mixer": self._serialize_mixer(track, kind),
            "devices": [self._serialize_device(device, i, mode == "detailed") for i, device in enumerate(track.devices)],
            "clips": clips,
        }

    def _serialize_mixer(self, track, kind):
        mixer = {
            "volume": float(track.mixer_device.volume.value),
            "pan": float(track.mixer_device.panning.value),
            "sends": [float(send.value) for send in track.mixer_device.sends],
        }
        if kind != "master":
            mixer["mute"] = bool(track.mute)
            mixer["solo"] = bool(track.solo)
        if kind not in ("master", "return"):
            mixer["arm"] = bool(track.arm) if track.can_be_armed else False
        return mixer

    def _serialize_device(self, device, index, include_parameters):
        result = {"index": index, "name": device.name, "className": device.class_name}
        if include_parameters:
            result["parameters"] = [self._serialize_parameter(parameter, i) for i, parameter in enumerate(device.parameters)]
        return result

    def _serialize_parameter(self, parameter, index):
        minimum = float(parameter.min)
        maximum = float(parameter.max)
        value = float(parameter.value)
        span = maximum - minimum
        result = {
            "index": index,
            "name": parameter.name,
            "value": value,
            "normalizedValue": (value - minimum) / span if span else 0.0,
            "min": minimum,
            "max": maximum,
            "isQuantized": bool(parameter.is_quantized),
            "enabled": bool(parameter.is_enabled),
        }
        if bool(parameter.is_quantized) and hasattr(parameter, "value_items"):
            result["valueItems"] = [str(item) for item in parameter.value_items]
        return result

    def _create_midi_track(self, params):
        index = int(params.get("index", len(self.song.tracks)))
        if index < 0 or index > len(self.song.tracks):
            raise ValueError("track index out of range")
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            self._undo(lambda: self.song.create_midi_track(index))
            if params.get("name"):
                self.song.tracks[index].name = str(params["name"])
        return self._change("track.create_midi", not dry_run, dry_run, {"trackIndex": index})

    def _delete_track(self, params):
        track_index = self._int(params, "trackIndex")
        self._track(track_index)
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            self._undo(lambda: self.song.delete_track(track_index))
        return self._change("track.delete", not dry_run, dry_run, {"trackIndex": track_index})

    def _create_midi_clip(self, params):
        track_index = self._int(params, "trackIndex")
        slot_index = self._int(params, "slotIndex")
        length = float(params.get("length", 0))
        if length <= 0:
            raise ValueError("clip length must be positive")
        track = self._track(track_index)
        slot = self._slot(track, slot_index)
        if slot.has_clip:
            raise ValueError("clip slot already contains a clip")
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            self._undo(lambda: slot.create_clip(length))
            if params.get("name"):
                slot.clip.name = str(params["name"])
        return self._change("clip.create_midi", not dry_run, dry_run, {"trackIndex": track_index, "slotIndex": slot_index}, {"length": length})

    def _get_clip_notes(self, params):
        clip = self._midi_clip(params)
        return self._read_notes(clip)

    def _replace_clip_notes(self, params):
        clip = self._midi_clip(params)
        notes = self._validate_notes(params.get("notes"))
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            note_specifications = self._note_specifications(notes)
            def operation():
                clip.remove_notes_extended(0, 128, 0.0, max(float(clip.length), 999999.0))
                clip.add_new_notes(note_specifications)
            self._undo(operation)
        return self._change("clip.replace_notes", not dry_run, dry_run, self._clip_target(params), {"noteCount": len(notes)})

    def _add_notes(self, params):
        clip = self._midi_clip(params)
        notes = self._validate_notes(params.get("notes"))
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            note_specifications = self._note_specifications(notes)
            self._undo(lambda: clip.add_new_notes(note_specifications))
        return self._change("clip.add_notes", not dry_run, dry_run, self._clip_target(params), {"noteCount": len(notes)})

    def _duplicate_clip(self, params):
        source_params = params.get("source") or {}
        destination_params = params.get("destination") or {}
        source_track = self._track(self._int(source_params, "trackIndex"))
        destination_track = self._track(self._int(destination_params, "trackIndex"))
        source_slot = self._slot(source_track, self._int(source_params, "slotIndex"))
        destination_slot = self._slot(destination_track, self._int(destination_params, "slotIndex"))
        if not source_slot.has_clip:
            raise ValueError("source clip slot is empty")
        if destination_slot.has_clip:
            raise ValueError("destination clip slot is occupied")
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            self._undo(lambda: source_slot.duplicate_clip_to(destination_slot))
        return self._change("clip.duplicate", not dry_run, dry_run, {
            "trackIndex": self._int(destination_params, "trackIndex"), "slotIndex": self._int(destination_params, "slotIndex"),
        }, {"sourceTrackIndex": self._int(source_params, "trackIndex"), "sourceSlotIndex": self._int(source_params, "slotIndex")})

    def _set_clip_loop(self, params):
        clip = self._midi_clip(params)
        loop_start = float(params.get("loopStart", 0))
        loop_end = float(params.get("loopEnd", 0))
        if loop_start < 0 or loop_end <= loop_start:
            raise ValueError("invalid loop range")
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            def operation():
                clip.looping = True
                clip.loop_start = loop_start
                clip.loop_end = loop_end
            self._undo(operation)
        return self._change("clip.set_loop", not dry_run, dry_run, self._clip_target(params), {"loopStart": loop_start, "loopEnd": loop_end})

    def _list_devices(self, params):
        track, _kind = self._resolve_track(self._int(params, "trackIndex"))
        return [self._serialize_device(device, i, False) for i, device in enumerate(track.devices)]

    def _device_parameters(self, params):
        device = self._device(params)
        return [self._serialize_parameter(parameter, i) for i, parameter in enumerate(device.parameters)]

    def _set_device_parameter(self, params):
        device = self._device(params)
        parameter_index = self._int(params, "parameterIndex")
        if parameter_index < 0 or parameter_index >= len(device.parameters):
            raise ValueError("parameter index out of range")
        normalized = float(params.get("normalizedValue"))
        if normalized < 0.0 or normalized > 1.0:
            raise ValueError("normalizedValue must be between 0 and 1")
        parameter = device.parameters[parameter_index]
        if not parameter.is_enabled:
            raise ValueError("parameter is disabled")
        dry_run = bool(params.get("dryRun", False))
        value = float(parameter.min) + normalized * (float(parameter.max) - float(parameter.min))
        if not dry_run:
            self._undo(lambda: setattr(parameter, "value", value))
        return self._change("device.set_parameter", not dry_run, dry_run, {
            "trackIndex": self._int(params, "trackIndex"), "deviceIndex": self._int(params, "deviceIndex"), "parameterIndex": parameter_index,
        }, {"normalizedValue": normalized, "value": value})

    def _set_song_settings(self, params):
        dry_run = bool(params.get("dryRun", False))
        tempo = params.get("tempo")
        signature = params.get("timeSignature")
        scale = params.get("scale")
        loop = params.get("loop")
        if tempo is not None and (float(tempo) < 20 or float(tempo) > 999):
            raise ValueError("tempo is out of range")
        if signature is not None:
            numerator = int(signature.get("numerator", 0))
            denominator = int(signature.get("denominator", 0))
            if numerator < 1 or numerator > 16 or denominator not in (1, 2, 4, 8, 16):
                raise ValueError("invalid time signature")
        if scale is not None:
            root_note = int(scale.get("rootNote", -1))
            if root_note < 0 or root_note > 11 or not str(scale.get("name", "")):
                raise ValueError("invalid song scale")
            if not hasattr(self.song, "root_note") or not hasattr(self.song, "scale_name"):
                raise ValueError("song scale is unavailable in this Live version")
        if loop is not None and (float(loop.get("start", -1)) < 0 or float(loop.get("length", 0)) <= 0):
            raise ValueError("invalid arrangement loop")
        if not dry_run:
            def operation():
                if tempo is not None:
                    self.song.tempo = float(tempo)
                if signature is not None:
                    self.song.signature_numerator = int(signature["numerator"])
                    self.song.signature_denominator = int(signature["denominator"])
                if scale is not None:
                    self.song.root_note = int(scale["rootNote"])
                    self.song.scale_name = str(scale["name"])
                if loop is not None:
                    self.song.loop_start = float(loop["start"])
                    self.song.loop_length = float(loop["length"])
                    self.song.loop = bool(loop.get("enabled", True))
            self._undo(operation)
        return self._change("song.settings", not dry_run, dry_run, {"song": "live_set"}, {
            "tempo": tempo, "timeSignature": signature, "scale": scale, "loop": loop,
        })

    def _set_track_mixer(self, params):
        track_index = self._int(params, "trackIndex")
        track, kind = self._resolve_track(track_index)
        dry_run = bool(params.get("dryRun", False))
        volume = params.get("volume")
        pan = params.get("pan")
        sends = params.get("sends") or []
        if pan is not None and (float(pan) < -1 or float(pan) > 1):
            raise ValueError("pan must be between -1 and 1")
        if volume is not None and (float(volume) < 0 or float(volume) > 1):
            raise ValueError("volume must be between 0 and 1")
        if kind in ("master", "return") and params.get("arm") is not None:
            raise ValueError("arm is not applicable to master/return tracks")
        if kind == "master" and params.get("mute") is not None:
            raise ValueError("mute is not applicable to master tracks")
        if kind == "master" and params.get("solo") is not None:
            raise ValueError("solo is not applicable to master tracks")
        if kind == "master" and sends:
            raise ValueError("sends are not applicable to master tracks")
        for send in sends:
            send_index = int(send.get("sendIndex", -1))
            value = float(send.get("value", -1))
            if send_index < 0 or send_index >= len(track.mixer_device.sends) or value < 0 or value > 1:
                raise ValueError("invalid send")
        if params.get("arm") is not None and not getattr(track, "can_be_armed", False):
            raise ValueError("track cannot be armed")
        if not dry_run:
            def operation():
                if volume is not None:
                    parameter = track.mixer_device.volume
                    parameter.value = float(parameter.min) + float(volume) * (float(parameter.max) - float(parameter.min))
                if pan is not None:
                    track.mixer_device.panning.value = float(pan)
                if params.get("mute") is not None:
                    track.mute = bool(params["mute"])
                if params.get("solo") is not None:
                    track.solo = bool(params["solo"])
                if params.get("arm") is not None:
                    track.arm = bool(params["arm"])
                for send in sends:
                    parameter = track.mixer_device.sends[int(send["sendIndex"])]
                    parameter.value = float(parameter.min) + float(send["value"]) * (float(parameter.max) - float(parameter.min))
            self._undo(operation)
        return self._change("track.mixer", not dry_run, dry_run, {"trackIndex": track_index}, {
            "volume": volume, "pan": pan, "mute": params.get("mute"), "solo": params.get("solo"),
            "arm": params.get("arm"), "sends": sends,
        })

    def _get_master_meter(self, _params):
        master = self.song.master_track
        if not hasattr(master, "output_meter_left") or not hasattr(master, "output_meter_right"):
            raise ValueError("master output meter is not supported by this Live version")
        left = float(master.output_meter_left)
        right = float(master.output_meter_right)
        left_dbfs = self._linear_to_dbfs(left)
        right_dbfs = self._linear_to_dbfs(right)
        dbfs_values = [value for value in (left_dbfs, right_dbfs) if value is not None]
        return {
            "leftLinear": left,
            "rightLinear": right,
            "leftDbfs": left_dbfs,
            "rightDbfs": right_dbfs,
            "peakDbfs": max(dbfs_values) if dbfs_values else None,
        }

    def _linear_to_dbfs(self, value):
        return 20.0 * math.log10(value) if value > 0.0 else None

    def _set_transport(self, params):
        action = str(params.get("action", ""))
        if action not in ("start", "stop"):
            raise ValueError("action must be start or stop")
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            if action == "start":
                self.song.start_playing()
            else:
                self.song.stop_playing()
        return self._change("transport.set", not dry_run, dry_run, {"action": action}, {"isPlaying": action == "start"})

    def _search_browser(self, params):
        query = str(params.get("query", "")).strip().lower()
        if not query:
            raise ValueError("browser query is required")
        categories = params.get("categories") or ["instruments", "sounds", "drums", "audio_effects", "midi_effects"]
        max_results = max(1, min(50, int(params.get("maxResults", 12))))
        browser = self.application.browser
        results = []
        scanned = [0]
        query_tokens = [token for token in query.replace("-", " ").split() if token]

        def visit(item, category, path, depth):
            if item is None or depth > 10 or scanned[0] >= 8000:
                return
            scanned[0] += 1
            name = str(getattr(item, "name", ""))
            lowered = name.lower()
            uri = str(getattr(item, "uri", ""))
            if uri:
                self._browser_uri_cache[uri] = item
            loadable = bool(getattr(item, "is_loadable", False))
            children = getattr(item, "children", ()) or ()
            score = 0
            if lowered == query:
                score = 100
            elif lowered.startswith(query):
                score = 80
            elif query in lowered:
                score = 65
            elif query_tokens and all(token in lowered for token in query_tokens):
                score = 50
            if score and loadable and uri:
                results.append({
                    "name": name, "uri": uri, "category": category,
                    "path": "/".join(path + [name]), "isLoadable": True,
                    "isFolder": bool(children), "score": score,
                })
            for child in children:
                visit(child, category, path + ([name] if name else []), depth + 1)

        for category in categories:
            if not hasattr(browser, category):
                continue
            visit(getattr(browser, category), category, [], 0)
        results.sort(key=lambda item: (-item["score"], len(item["path"]), item["name"].lower()))
        return results[:max_results]

    def _load_browser_item(self, params):
        track_index = self._int(params, "trackIndex")
        uri = str(params.get("uri", ""))
        if not uri:
            raise ValueError("browser item URI is required")
        dry_run = bool(params.get("dryRun", False))
        track = self._track(track_index)
        item = self._browser_uri_cache.get(uri)
        if item is None:
            item = self._find_browser_item_by_uri(self.application.browser, uri)
        if item is None:
            raise ValueError("browser item not found: %s" % uri)
        if not bool(getattr(item, "is_loadable", False)):
            raise ValueError("browser item is not loadable")
        before = [device.name for device in track.devices]
        if not dry_run:
            self.song.view.selected_track = track
            self.application.browser.load_item(item)
        after = [device.name for device in track.devices]
        return self._change("browser.load", not dry_run, dry_run, {"trackIndex": track_index, "uri": uri}, {
            "name": str(getattr(item, "name", "")), "devicesBefore": before, "devicesAfter": after,
        })

    def _find_browser_item_by_uri(self, root, uri, depth=0):
        if root is None or depth > 10:
            return None
        if str(getattr(root, "uri", "")) == uri:
            return root
        if hasattr(root, "instruments"):
            for category in ("instruments", "sounds", "drums", "audio_effects", "midi_effects"):
                if hasattr(root, category):
                    found = self._find_browser_item_by_uri(getattr(root, category), uri, depth + 1)
                    if found is not None:
                        return found
            return None
        for child in (getattr(root, "children", ()) or ()):
            found = self._find_browser_item_by_uri(child, uri, depth + 1)
            if found is not None:
                return found
        return None

    def _duplicate_to_arrangement(self, params):
        track_index = self._int(params, "trackIndex")
        slot_index = self._int(params, "slotIndex")
        destination_time = float(params.get("destinationTime", -1))
        if destination_time < 0:
            raise ValueError("destinationTime must be non-negative")
        track = self._track(track_index)
        slot = self._slot(track, slot_index)
        if not slot.has_clip:
            raise ValueError("source clip slot is empty")
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            self._undo(lambda: track.duplicate_clip_to_arrangement(slot.clip, destination_time))
        return self._change("arrangement.duplicate", not dry_run, dry_run, {
            "trackIndex": track_index, "slotIndex": slot_index,
        }, {"destinationTime": destination_time, "clipName": slot.clip.name})

    def _duplicate_many_to_arrangement(self, params):
        raw_placements = params.get("placements")
        if not isinstance(raw_placements, list) or not raw_placements:
            raise ValueError("placements must be a non-empty list")
        placements = []
        for raw in raw_placements:
            track_index = self._int(raw, "trackIndex")
            slot_index = self._int(raw, "slotIndex")
            destination_time = float(raw.get("destinationTime", -1))
            if destination_time < 0:
                raise ValueError("destinationTime must be non-negative")
            track = self._track(track_index)
            slot = self._slot(track, slot_index)
            if not slot.has_clip:
                raise ValueError("source clip slot is empty")
            placements.append((track, slot.clip, destination_time))
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            def operation():
                for track, clip, destination_time in placements:
                    track.duplicate_clip_to_arrangement(clip, destination_time)
            self._undo(operation)
        return self._change("arrangement.duplicate_many", not dry_run, dry_run, {"arrangement": "live_set"}, {
            "placementCount": len(placements),
        })

    def _arrangement_clips(self, params):
        track_index = self._int(params, "trackIndex")
        track = self._track(track_index)
        return [{
            "index": index, "name": clip.name, "startTime": float(clip.start_time),
            "endTime": float(clip.end_time), "length": float(clip.length),
            "isMidi": bool(clip.is_midi_clip), "isAudio": bool(clip.is_audio_clip),
        } for index, clip in enumerate(track.arrangement_clips)]

    def _show_arrangement(self, params):
        dry_run = bool(params.get("dryRun", False))
        if not dry_run:
            self.application.view.show_view("Arranger")
        return self._change("view.arrangement", not dry_run, dry_run, {"view": "arrangement"})

    def _read_notes(self, clip):
        if hasattr(clip, "get_notes_extended"):
            raw = clip.get_notes_extended(0, 128, 0.0, max(float(clip.length), 999999.0))
            return [{
                "pitch": int(self._note_value(note, "pitch")),
                "start": float(self._note_value(note, "start_time")),
                "duration": float(self._note_value(note, "duration")),
                "velocity": int(self._note_value(note, "velocity")),
                "mute": bool(self._note_value(note, "mute", False)),
                "probability": float(self._note_value(note, "probability", 1.0)),
            } for note in raw]
        raw = clip.get_notes(0.0, 0, max(float(clip.length), 999999.0), 128)
        return [{"pitch": int(n[0]), "start": float(n[1]), "duration": float(n[2]), "velocity": int(n[3]), "mute": bool(n[4])} for n in raw]

    def _validate_notes(self, notes):
        if not isinstance(notes, list):
            raise ValueError("notes must be a list")
        result = []
        for note in notes:
            pitch = int(note["pitch"])
            start = float(note["start"])
            duration = float(note["duration"])
            velocity = int(note["velocity"])
            if pitch < 0 or pitch > 127 or start < 0 or duration <= 0 or velocity < 1 or velocity > 127:
                raise ValueError("invalid MIDI note")
            result.append({
                "pitch": pitch, "start_time": start, "duration": duration,
                "velocity": velocity, "mute": bool(note.get("mute", False)),
                "probability": max(0.0, min(1.0, float(note.get("probability", 1.0)))),
            })
        return result

    def _note_specifications(self, notes):
        return tuple(MidiNoteSpecification(
            pitch=note["pitch"],
            start_time=note["start_time"],
            duration=note["duration"],
            velocity=note["velocity"],
            mute=note["mute"],
            probability=note["probability"],
        ) for note in notes)

    def _note_value(self, note, key, default=None):
        if isinstance(note, dict):
            return note.get(key, default)
        return getattr(note, key, default)

    def _undo(self, operation):
        self.song.begin_undo_step()
        try:
            operation()
        finally:
            self.song.end_undo_step()

    def _track(self, index):
        if index < 0 or index >= len(self.song.tracks):
            raise ValueError("track index out of range")
        return self.song.tracks[index]

    def _resolve_track(self, index):
        if index == MASTER_TRACK_INDEX:
            return self.song.master_track, "master"
        if index >= RETURN_TRACK_INDEX_BASE:
            return_index = index - RETURN_TRACK_INDEX_BASE
            if return_index >= len(self.song.return_tracks):
                raise ValueError("return track index out of range")
            return self.song.return_tracks[return_index], "return"
        return self._track(index), "track"

    def _slot(self, track, index):
        if index < 0 or index >= len(track.clip_slots):
            raise ValueError("clip slot index out of range")
        return track.clip_slots[index]

    def _midi_clip(self, params):
        track = self._track(self._int(params, "trackIndex"))
        slot = self._slot(track, self._int(params, "slotIndex"))
        if not slot.has_clip or not slot.clip.is_midi_clip:
            raise ValueError("target is not a MIDI clip")
        return slot.clip

    def _device(self, params):
        track, _kind = self._resolve_track(self._int(params, "trackIndex"))
        index = self._int(params, "deviceIndex")
        if index < 0 or index >= len(track.devices):
            raise ValueError("device index out of range")
        return track.devices[index]

    def _int(self, params, key):
        if key not in params:
            raise ValueError("missing %s" % key)
        return int(params[key])

    def _clip_target(self, params):
        return {"trackIndex": self._int(params, "trackIndex"), "slotIndex": self._int(params, "slotIndex")}

    def _change(self, operation, changed, dry_run, target, details=None):
        result = {"operation": operation, "changed": changed, "dryRun": dry_run, "target": target}
        if details is not None:
            result["details"] = details
        return result

    def _success(self, request_id, result):
        return {"id": request_id, "protocolVersion": PROTOCOL_VERSION, "ok": True, "result": result}

    def _error(self, request_id, code, message, details=None):
        error = {"code": code, "message": message}
        if details is not None:
            error["details"] = details
        return {"id": request_id, "protocolVersion": PROTOCOL_VERSION, "ok": False, "error": error}
