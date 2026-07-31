#!/usr/bin/env python3
"""CDP debug helper for Capacitor Android WebView.

Usage:
  python scripts/cdp-debug.py connect          # adb forward + show target
  python scripts/cdp-debug.py body             # body.innerText
  python scripts/cdp-debug.py eval "<js>"      # Runtime.evaluate
  python scripts/cdp-debug.py fetch <url>      # fetch test (JSON vs HTML)
  python scripts/cdp-debug.py errors           # recent console errors
"""

import asyncio
import json
import re
import subprocess
import sys

try:
    import websockets
except ImportError:
    print("pip install websockets")
    sys.exit(1)

ADB = r"C:\Users\pasca\Android\Sdk\platform-tools\adb.exe"
FWD_PORT = 9222


def adb(*args: str) -> str:
    r = subprocess.run([ADB, *args], capture_output=True, text=True, timeout=15)
    return r.stdout.strip()


def webview_socket() -> str:
    out = adb("shell", "cat /proc/net/unix | grep webview_devtools")
    if not out:
        print("No webview_devtools found. Is the app running?")
        sys.exit(1)
    # Take the last match (most recent app)
    line = out.strip().split("\n")[-1]
    m = re.search(r"webview_devtools_remote_\d+", line)
    if not m:
        print(f"Could not parse webview socket from: {line}")
        sys.exit(1)
    return m.group(0)


def forward() -> None:
    socket_name = webview_socket()
    r = adb("forward", f"tcp:{FWD_PORT}", f"localabstract:{socket_name}")
    if r:
        print(r)


def targets() -> list[dict]:
    import urllib.request
    with urllib.request.urlopen(f"http://localhost:{FWD_PORT}/json", timeout=5) as resp:
        return json.loads(resp.read())


async def evaluate(js: str, await_promise: bool = True) -> str:
    t = targets()
    if not t:
        print("No CDP targets. Forward first: python scripts/cdp-debug.py connect")
        sys.exit(1)
    uri = t[0]["webSocketDebuggerUrl"]
    async with websockets.connect(uri, max_size=10 * 1024 * 1024) as ws:
        await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
        await ws.recv()
        await ws.send(json.dumps({
            "id": 2, "method": "Runtime.evaluate",
            "params": {"expression": js, "awaitPromise": await_promise, "returnByValue": True},
        }))
        while True:
            msg = json.loads(await ws.recv())
            if msg.get("id") == 2:
                r = msg["result"]["result"]
                return str(r.get("value", r.get("description", json.dumps(r))))


def cmd_connect() -> None:
    forward()
    t = targets()
    for target in t:
        print(f"id={target['id']}  url={target['url']}  title={target.get('title', '')}")


def cmd_body() -> None:
    forward()
    out = asyncio.run(evaluate("document.body ? document.body.innerText.substring(0,1000) : 'no body'"))
    print(out)


def cmd_eval(js: str) -> None:
    forward()
    out = asyncio.run(evaluate(js))
    print(out)


def cmd_fetch(url: str) -> None:
    forward()
    out = asyncio.run(evaluate(
        f"fetch('{url}').then(r=>r.text()).then(t=>t.substring(0,500)).catch(e=>'ERR: '+e)"
    ))
    print(out)


def cmd_errors() -> None:
    forward()
    out = asyncio.run(evaluate(
        "JSON.stringify({url: location.href, title: document.title})"
    ))
    print(out)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "connect"
    if cmd == "connect":
        cmd_connect()
    elif cmd == "body":
        cmd_body()
    elif cmd == "eval":
        if len(sys.argv) < 3:
            print("Usage: python scripts/cdp-debug.py eval '<js>'")
            sys.exit(1)
        cmd_eval(sys.argv[2])
    elif cmd == "fetch":
        if len(sys.argv) < 3:
            print("Usage: python scripts/cdp-debug.py fetch <url>")
            sys.exit(1)
        cmd_fetch(sys.argv[2])
    elif cmd == "errors":
        cmd_errors()
    else:
        print(__doc__)
        sys.exit(1)
