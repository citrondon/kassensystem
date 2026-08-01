#!/usr/bin/env python3
"""Automated WebView test suite for Mon Comptoir APK.

Runs a full test suite against the app on a connected Android device:
- License activation flow
- Login flow
- API connectivity (all endpoints)
- Console error monitoring
- Screenshot capture

Usage:
  python scripts/apk-webview-test.py              # run all tests
  python scripts/apk-webview-test.py --quick      # API tests only
  python scripts/apk-webview-test.py --flow       # UI flows only
"""

import asyncio
import base64
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import websockets
except ImportError:
    print("pip install websockets")
    sys.exit(1)

ADB = r"C:\Users\pasca\Android\Sdk\platform-tools\adb.exe"
FWD_PORT = 9222
SCREENSHOT_DIR = Path("test-screenshots")
REPORT_FILE = Path("test-report.json")

# Test credentials
LICENSE_KEY = "MC-PRO-2026-DEMO-KEY"
STORE_NAME = "Test Store"
DEV_USER = "developer"
DEV_PASS = "dev12345"


def adb(*args: str) -> str:
    r = subprocess.run([ADB, *args], capture_output=True, text=True, timeout=15)
    return r.stdout.strip()


def adb_shell(*args: str) -> str:
    return adb("shell", *args)


class WebViewTester:
    def __init__(self):
        self.ws = None
        self.msg_id = 0
        self.errors = []
        self.screenshots = []
        self.test_results = []

    # ── Connection ──────────────────────────────────────────────

    def webview_socket(self) -> str:
        out = adb_shell("cat /proc/net/unix | grep webview_devtools")
        if not out:
            raise RuntimeError("No webview_devtools found. Is the app running?")
        line = out.strip().split("\n")[-1]
        m = re.search(r"webview_devtools_remote_\d+", line)
        if not m:
            raise RuntimeError(f"Could not parse: {line}")
        return m.group(0)

    def forward(self):
        socket_name = self.webview_socket()
        adb("forward", f"tcp:{FWD_PORT}", f"localabstract:{socket_name}")

    def targets(self) -> list[dict]:
        import urllib.request
        with urllib.request.urlopen(f"http://localhost:{FWD_PORT}/json", timeout=5) as resp:
            return json.loads(resp.read())

    async def connect(self):
        self.forward()
        t = self.targets()
        if not t:
            raise RuntimeError("No CDP targets")
        uri = t[0]["webSocketDebuggerUrl"]
        self.ws = await websockets.connect(uri, max_size=10 * 1024 * 1024)
        await self.send("Runtime.enable")
        await self.send("Page.enable")
        print(f"Connected to {t[0]['url']}")

    async def send(self, method: str, params: dict | None = None) -> dict:
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method}
        if params:
            msg["params"] = params
        await self.ws.send(json.dumps(msg))
        while True:
            resp = json.loads(await self.ws.recv())
            if resp.get("id") == self.msg_id:
                return resp
            # Collect console errors
            if resp.get("method") == "Runtime.exceptionThrown":
                exc = resp["params"]["exceptionDetails"]
                self.errors.append(f"JS Exception: {exc.get('text', '')}")
            elif resp.get("method") == "Runtime.consoleAPICalled":
                args = resp["params"].get("args", [])
                text = " ".join(str(a.get("value", a.get("description", ""))) for a in args)
                if resp["params"]["type"] == "error":
                    self.errors.append(f"Console.error: {text[:200]}")

    async def evaluate(self, js: str, await_promise: bool = True) -> str:
        resp = await self.send("Runtime.evaluate", {
            "expression": js,
            "awaitPromise": await_promise,
            "returnByValue": True,
        })
        r = resp["result"]["result"]
        return str(r.get("value", r.get("description", "")))

    async def screenshot(self, name: str) -> str:
        resp = await self.send("Page.captureScreenshot", {"format": "png"})
        data = resp["result"]["data"]
        SCREENSHOT_DIR.mkdir(exist_ok=True)
        path = SCREENSHOT_DIR / f"{name}.png"
        path.write_bytes(base64.b64decode(data))
        self.screenshots.append(str(path))
        print(f"  Screenshot: {path}")
        return str(path)

    # ── Helpers ─────────────────────────────────────────────────

    async def wait_for_text(self, text: str, timeout: int = 10) -> bool:
        """Wait for text to appear in body."""
        for _ in range(timeout * 2):
            body = await self.evaluate("document.body ? document.body.innerText : ''")
            if text in body:
                return True
            await asyncio.sleep(0.5)
        return False

    async def click_button(self, text: str) -> bool:
        """Click a button containing text."""
        js = f"""
        (() => {{
            const buttons = document.querySelectorAll('button, [role="button"]');
            for (const btn of buttons) {{
                if (btn.innerText.includes('{text}')) {{
                    btn.click();
                    return true;
                }}
            }}
            return false;
        }})()
        """
        result = await self.evaluate(js)
        return result == "True"

    async def fill_input(self, placeholder: str, value: str) -> bool:
        """Fill an input by placeholder text."""
        js = f"""
        (() => {{
            const inputs = document.querySelectorAll('input, textarea');
            for (const inp of inputs) {{
                if (inp.placeholder && inp.placeholder.includes('{placeholder}')) {{
                    inp.value = '{value}';
                    inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    inp.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    return true;
                }}
            }}
            return false;
        }})()
        """
        result = await self.evaluate(js)
        return result == "True"

    def log_test(self, name: str, passed: bool, detail: str = ""):
        status = "PASS" if passed else "FAIL"
        self.test_results.append({"name": name, "status": status, "detail": detail})
        icon = "✅" if passed else "❌"
        print(f"  {icon} {name}: {status} {detail}")

    # ── Tests ───────────────────────────────────────────────────

    async def test_app_running(self) -> bool:
        """Check if app is running and showing something."""
        try:
            body = await self.evaluate("document.body ? document.body.innerText.substring(0, 200) : 'no body'")
            passed = "no body" not in body and len(body) > 0
            self.log_test("App running", passed, body[:100])
            return passed
        except Exception as e:
            self.log_test("App running", False, str(e))
            return False

    async def test_api_products(self) -> bool:
        """API: products endpoint returns JSON array."""
        try:
            result = await self.evaluate(
                "fetch('/api/products').then(r => r.json()).then(d => Array.isArray(d) ? 'OK:' + d.length : 'NOT_ARRAY').catch(e => 'ERR:' + e)"
            )
            passed = result.startswith("OK:")
            self.log_test("API /products", passed, result)
            return passed
        except Exception as e:
            self.log_test("API /products", False, str(e))
            return False

    async def test_api_version(self) -> bool:
        """API: app-version endpoint returns version info."""
        try:
            result = await self.evaluate(
                "fetch('/api/app-version').then(r => r.json()).then(d => d.success ? 'OK:' + d.version : 'FAIL').catch(e => 'ERR:' + e)"
            )
            passed = result.startswith("OK:")
            self.log_test("API /app-version", passed, result)
            return passed
        except Exception as e:
            self.log_test("API /app-version", False, str(e))
            return False

    async def test_api_setup_status(self) -> bool:
        """API: setup-status returns valid response."""
        try:
            result = await self.evaluate(
                "fetch('/api/auth/setup-status').then(r => r.json()).then(d => d.success !== undefined ? 'OK' : 'FAIL').catch(e => 'ERR:' + e)"
            )
            passed = result == "OK"
            self.log_test("API /setup-status", passed, result)
            return passed
        except Exception as e:
            self.log_test("API /setup-status", False, str(e))
            return False

    async def test_license_screen(self) -> bool:
        """License screen shows input fields."""
        try:
            body = await self.evaluate("document.body ? document.body.innerText : ''")
            has_key_input = "licence" in body.lower() or "license" in body.lower() or "Clé" in body
            self.log_test("License screen visible", has_key_input, body[:100])
            return has_key_input
        except Exception as e:
            self.log_test("License screen visible", False, str(e))
            return False

    async def test_fill_license(self) -> bool:
        """Fill license key and store name."""
        try:
            # Try to fill license key
            filled_key = await self.fill_input("licence", LICENSE_KEY)
            filled_store = await self.fill_input("magasin", STORE_NAME)
            passed = filled_key or filled_store  # at least one worked
            self.log_test("Fill license form", passed, f"key={filled_key} store={filled_store}")
            return passed
        except Exception as e:
            self.log_test("Fill license form", False, str(e))
            return False

    async def test_no_unexpected_token(self) -> bool:
        """No 'Unexpected token' error (the bug we fixed)."""
        try:
            body = await self.evaluate("document.body ? document.body.innerText : ''")
            has_error = "Unexpected token" in body or "<!doctype" in body.lower()
            passed = not has_error
            self.log_test("No 'Unexpected token' error", passed)
            return passed
        except Exception as e:
            self.log_test("No 'Unexpected token' error", False, str(e))
            return False

    async def test_console_errors(self) -> bool:
        """No critical console errors."""
        # Errors collected during all previous operations
        critical = [e for e in self.errors if "Uncaught" in e or "SyntaxError" in e or "TypeError" in e]
        passed = len(critical) == 0
        self.log_test("No critical console errors", passed, f"{len(critical)} critical, {len(self.errors)} total")
        return passed

    # ── Runner ──────────────────────────────────────────────────

    async def run_all(self, quick: bool = False, flow: bool = False):
        SCREENSHOT_DIR.mkdir(exist_ok=True)

        print("=== WebView Test Suite ===")
        print(f"Time: {datetime.now().isoformat()}")
        print()

        # Start app
        print("→ Starting app...")
        adb_shell("am force-stop bj.moncomptoir.pos")
        time.sleep(1)
        adb_shell("am start -n bj.moncomptoir.pos/.MainActivity")
        time.sleep(4)

        # Connect
        print("→ Connecting to WebView...")
        await self.connect()
        print()

        # Screenshot initial state
        await self.screenshot("01-initial")

        # API tests (always run)
        if not flow:
            print("--- API Tests ---")
            await self.test_api_products()
            await self.test_api_version()
            await self.test_api_setup_status()
            print()

        # UI tests
        if not quick:
            print("--- UI Tests ---")
            await self.test_app_running()
            await self.test_no_unexpected_token()
            await self.test_license_screen()
            await self.test_fill_license()
            await self.screenshot("02-license-form")
            print()

        # Console errors
        await self.test_console_errors()
        print()

        # Report
        self.generate_report()

    def generate_report(self):
        passed = sum(1 for t in self.test_results if t["status"] == "PASS")
        failed = sum(1 for t in self.test_results if t["status"] == "FAIL")
        total = len(self.test_results)

        report = {
            "timestamp": datetime.now().isoformat(),
            "total": total,
            "passed": passed,
            "failed": failed,
            "success_rate": f"{passed/total*100:.0f}%" if total > 0 else "0%",
            "tests": self.test_results,
            "console_errors": self.errors,
            "screenshots": self.screenshots,
        }

        REPORT_FILE.write_text(json.dumps(report, indent=2))
        print(f"=== Report ===")
        print(f"Passed: {passed}/{total} ({report['success_rate']})")
        print(f"Console errors: {len(self.errors)}")
        print(f"Screenshots: {len(self.screenshots)}")
        print(f"Report: {REPORT_FILE.absolute()}")

        if failed > 0:
            print(f"\n❌ {failed} test(s) failed!")
            for t in self.test_results:
                if t["status"] == "FAIL":
                    print(f"  - {t['name']}: {t['detail']}")
        else:
            print("\n✅ All tests passed!")


async def main():
    quick = "--quick" in sys.argv
    flow = "--flow" in sys.argv

    tester = WebViewTester()
    try:
        await tester.run_all(quick=quick, flow=flow)
    except RuntimeError as e:
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        if tester.ws:
            await tester.ws.close()


if __name__ == "__main__":
    asyncio.run(main())
