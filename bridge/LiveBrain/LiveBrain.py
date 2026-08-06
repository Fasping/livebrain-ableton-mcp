import json
import queue
import socket
import threading

from ableton.v2.control_surface import ControlSurface


PROTOCOL_VERSION = "1.0"
BRIDGE_VERSION = "0.1.1"
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
        }
        handler = handlers.get(method)
        if handler is None:
            return self._error(request["id"], "METHOD_NOT_FOUND", "Unsupported method: %s" % method)
        return self._success(request["id"], handler(request.get("params", {})))

    def _capabilities(self, _params):
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "bridgeVersion": BRIDGE_VERSION,
            "methods": ["system.capabilities", "live_set.snapshot"],
        }

    def _snapshot(self, _params):
        song = self.song
        return {
            "tempo": float(song.tempo),
            "isPlaying": bool(song.is_playing),
            "tracks": [
                {
                    "index": index,
                    "name": track.name,
                    "mute": bool(track.mute),
                    "solo": bool(track.solo),
                    "devices": [
                        {"index": i, "name": device.name, "className": device.class_name}
                        for i, device in enumerate(track.devices)
                    ],
                }
                for index, track in enumerate(song.tracks)
            ],
        }

    def _success(self, request_id, result):
        return {"id": request_id, "protocolVersion": PROTOCOL_VERSION, "ok": True, "result": result}

    def _error(self, request_id, code, message, details=None):
        error = {"code": code, "message": message}
        if details is not None:
            error["details"] = details
        return {"id": request_id, "protocolVersion": PROTOCOL_VERSION, "ok": False, "error": error}
