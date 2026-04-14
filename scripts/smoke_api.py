import json
import threading
import time
import urllib.request
import sys
from pathlib import Path

import uvicorn

BASE_DIR = Path(__file__).resolve().parent.parent  # scripts is at repo root, go up to repo root
API_DIR = BASE_DIR / "apps" / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from app.main import app

HOST = "127.0.0.1"
PORT = 8010
BASE_URL = f"http://{HOST}:{PORT}"


def wait_for_server(timeout_seconds: float = 5.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{BASE_URL}/", timeout=1):
                return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("Server did not start in time")


def fetch_json(url: str) -> dict | list:
    with urllib.request.urlopen(url, timeout=3) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    config = uvicorn.Config(app, host=HOST, port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    try:
        wait_for_server()

        root = fetch_json(f"{BASE_URL}/")
        media_entries = fetch_json(f"{BASE_URL}/api/v1/media")
        graph = fetch_json(f"{BASE_URL}/api/v1/graph")

        print(f"ROOT_MESSAGE={root.get('message')}")
        print(f"MEDIA_COUNT={len(media_entries)}")
        first_media_id = media_entries[0]["id"] if media_entries else "<none>"
        print(f"FIRST_MEDIA_ID={first_media_id}")
        print(f"GRAPH_NODES={len(graph.get('nodes', []))}")
        print(f"GRAPH_EDGES={len(graph.get('edges', []))}")

        return 0
    finally:
        server.should_exit = True
        thread.join(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())
