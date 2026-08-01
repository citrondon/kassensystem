#!/usr/bin/env python3
"""AI exploration of the Mon Comptoir APK running on a connected Android device.

Connects browser-use AI agent to the app's WebView via CDP (adb forward),
then lets the agent explore, test, and find bugs autonomously.

Usage:
  python scripts/ai-apk-explore.py              # full exploration
  python scripts/ai-apk-explore.py --quick      # smoke test

Requires:
  - Android device connected with Mon Comptoir APK running
  - FIREWORKS_API_KEY in environment or .env
"""

import asyncio
import os
import re
import subprocess
import sys
from pathlib import Path

# Load .env if present
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

ADB = r"C:\Users\pasca\Android\Sdk\platform-tools\adb.exe"
FWD_PORT = 9222

from browser_use import Agent
from browser_use.browser.session import BrowserSession
from browser_use.llm.litellm import ChatLiteLLM


def adb(*args: str) -> str:
    r = subprocess.run([ADB, *args], capture_output=True, text=True, timeout=15)
    return r.stdout.strip()


def get_llm():
    key = os.environ.get("FIREWORKS_API_KEY", "")
    if not key:
        print("FIREWORKS_API_KEY not set. Add to .env or export.")
        sys.exit(1)
    return ChatLiteLLM(
        model="fireworks_ai/accounts/fireworks/models/deepseek-v4-flash",
        api_key=key,
        api_base="https://api.fireworks.ai/inference/v1",
    )


def find_and_forward():
    """Find webview socket and set up adb forward."""
    out = adb("shell", "cat /proc/net/unix | grep webview_devtools")
    if not out:
        print("No webview_devtools found. Start the app first!")
        sys.exit(1)
    line = out.strip().split("\n")[-1]
    m = re.search(r"webview_devtools_remote_\d+", line)
    if not m:
        print(f"Could not parse: {line}")
        sys.exit(1)
    socket_name = m.group(0)
    adb("forward", f"tcp:{FWD_PORT}", f"localabstract:{socket_name}")
    print(f"Forwarded {socket_name} → localhost:{FWD_PORT}")


async def explore(quick: bool = False):
    print("=== AI APK Exploration (Mon Comptoir) ===")
    print()

    find_and_forward()

    if quick:
        task = """You are testing the Mon Comptoir POS app running in a WebView on an Android phone.

Quick smoke test:
1. Report what screen you see (title, visible elements)
2. Check the license input fields exist
3. Take a screenshot
4. Report any obvious errors or issues

Be concise. Report what works and what doesn't."""
    else:
        task = """You are testing the Mon Comptoir POS app running in a WebView on an Android phone.

Explore the app thoroughly and find bugs:

1. Check the current screen — is it the license activation screen (Étape 1/2)?
2. Try to activate the license:
   - Fill the license key field with: MC-PRO-2026-DEMO-KEY
   - Fill the store name field with: AI Test Store
   - Click the Continue button
3. If the terms screen appears (CGU), scroll to the bottom and accept
4. Try to activate the license
5. If you reach account creation, try creating user 'aitest' with password 'test1234'
6. If you reach the login screen, try developer/dev12345
7. Navigate to the Cashier (Caisse) and try to add a product
8. Try to checkout

For each step:
- Take a screenshot
- Note any errors, unexpected behavior, or UI issues
- Check French text displays correctly
- Check the layout works on mobile

Final report:
- What works
- What doesn't work
- Any bugs found
- List of screenshots taken"""

    print("Starting AI agent...")
    print("It will navigate the app and report findings. This takes a few minutes.")
    print()

    try:
        session = BrowserSession(
            id="moncomptoir",
            cdp_url=f"http://localhost:{FWD_PORT}",
        )
        agent = Agent(
            task=task,
            llm=get_llm(),
            browser_session=session,
        )
        result = await agent.run()
        print("\n=== AI Report ===")
        print(result)
    except Exception as e:
        print(f"\n❌ AI exploration failed: {type(e).__name__}: {str(e)[:400]}")
        sys.exit(1)


if __name__ == "__main__":
    quick = "--quick" in sys.argv
    asyncio.run(explore(quick=quick))
