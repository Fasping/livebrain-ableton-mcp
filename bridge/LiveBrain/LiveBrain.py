import json
import queue
import socket
import threading

from Live.Clip import MidiNoteSpecification
from ableton.v2.control_surface import ControlSurface


PROTOCOL_VERSION = "1.0"
BRIDGE_VERSION = "0.1.3"
MAX_REQUEST_BYTES = 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 5.0


class LiveBrain(ControlSurface):
    """Thread-safe JSON-lines compatibility bridge for LiveBrain."""

    def __init__(self, c_instance):
        super().__init__(c_instance)
        self._running = True
        self._server = None
        self._jobs = queue.Queue()
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
            "clip.create_midi": self._create_midi_clip,
            "clip.get_notes": self._get_clip_notes,
            "clip.replace_notes": self._replace_clip_notes,
            "clip.add_notes": self._add_notes,
            "clip.duplicate": self._duplicate_clip,
            "clip.set_loop": self._set_clip_loop,
            "device.list": self._list_devices,
            "device.parameters": self._device_parameters,
            "device.set_parameter": self._set_device_parameter,
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
                "system.capabilities", "live_set.snapshot", "track.create_midi",
                "clip.create_midi", "clip.get_notes", "clip.replace_notes",
                "clip.add_notes", "clip.duplicate", "clip.set_loop", "device.list", "device.parameters",
                "device.set_parameter",
            ],
            "unsupported": [
                "browser.load (Live Object Model support varies)",
                "arrangement automation curves (pending API verification)",
            ],
        }

    def _snapshot(self, params):
        song = self.song
        mode = params.get("mode", "compact")
        if mode not in ("compact", "detailed"):
            raise ValueError("mode must be compact or detailed")
        return {
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
                self._serialize_track(track, index, mode)
                for index, track in enumerate(song.tracks)
            ],
        }

    def _serialize_track(self, track, index, mode):
        clips = []
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
            "kind": "midi" if track.has_midi_input else "audio",
            "mixer": {
                "volume": float(track.mixer_device.volume.value),
                "pan": float(track.mixer_device.panning.value),
                "mute": bool(track.mute),
                "solo": bool(track.solo),
                "arm": bool(track.arm) if track.can_be_armed else False,
                "sends": [float(send.value) for send in track.mixer_device.sends],
            },
            "devices": [self._serialize_device(device, i, mode == "detailed") for i, device in enumerate(track.devices)],
            "clips": clips,
        }

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
        return {
            "index": index,
            "name": parameter.name,
            "value": value,
            "normalizedValue": (value - minimum) / span if span else 0.0,
            "min": minimum,
            "max": maximum,
            "isQuantized": bool(parameter.is_quantized),
            "enabled": bool(parameter.is_enabled),
        }

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
        track = self._track(self._int(params, "trackIndex"))
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
        track = self._track(self._int(params, "trackIndex"))
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
