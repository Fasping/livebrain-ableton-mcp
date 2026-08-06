import json
import socket
import threading


class LiveBrain:
    """Minimal JSON-lines Remote Script bridge for LiveBrain v0.1."""

    def __init__(self, c_instance):
        self.c_instance = c_instance
        self.song = c_instance.song()
        self.running = True
        self.server = None
        self.thread = threading.Thread(target=self._serve, name="LiveBrainBridge", daemon=True)
        self.thread.start()

    def disconnect(self):
        self.running = False
        if self.server:
            self.server.close()

    def _serve(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", 9877))
        server.listen(4)
        server.settimeout(0.5)
        self.server = server
        while self.running:
            try:
                client, _ = server.accept()
                self._handle(client)
            except socket.timeout:
                continue

    def _handle(self, client):
        request = None
        try:
            data = b""
            while b"\n" not in data:
                data += client.recv(65536)
            request = json.loads(data.split(b"\n", 1)[0].decode("utf-8"))
            response = self._dispatch(request)
        except Exception as error:
            response = {"id": request.get("id") if request else None, "ok": False, "error": str(error)}
        client.sendall((json.dumps(response) + "\n").encode("utf-8"))
        client.close()

    def _dispatch(self, request):
        method = request.get("method")
        if method == "ping":
            result = {"pong": True}
        elif method == "live_set.snapshot":
            result = self._snapshot()
        else:
            return {"id": request.get("id"), "ok": False, "error": "Unsupported method: %s" % method}
        return {"id": request.get("id"), "ok": True, "result": result}

    def _snapshot(self):
        return {
            "tempo": float(self.song.tempo),
            "isPlaying": bool(self.song.is_playing),
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
                for index, track in enumerate(self.song.tracks)
            ],
        }
