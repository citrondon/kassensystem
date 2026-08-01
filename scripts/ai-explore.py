#!/usr/bin/env python3
"""Autonomous AI exploration of Mon Comptoir POS app.

Uses browser-use AI agent to explore the app, find bugs, and document issues.
The agent navigates the app autonomously, takes screenshots, and reports findings.

Usage:
  python scripts/ai-explore.py              # full exploration
  python scripts/ai-explore.py --quick      # quick smoke test
  python scripts/ai-explore.py --target=X   # specific area to test

Requires: ANTHROPIC_API_KEY or OPENAI_API_KEY in environment or .env
"""

import asyncio
import os
import sys
from pathlib import Path

# Load .env if present
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

try:
    from browser_use import Agent, Browser
except ImportError:
    print("pip install browser-use")
    sys.exit(1)


async def explore(target: str = "full"):
    """Run AI exploration on the POS app."""

    # Configure browser to connect to Android WebView via CDP
    # Note: This is experimental — browser-use may not support direct CDP to Android
    # Alternative: Use OpenCLI or agent-browser for deterministic tests

    task = """Explore the Mon Comptoir POS app and find bugs:

1. Check if the app loads correctly (look for 'Mon Comptoir' title)
2. Try to activate a license with key MC-PRO-2026-DEMO-KEY and store name 'AI Test Store'
3. If license works, try to create a manager account with username 'aitest' and password 'test1234'
4. Try to login with developer/dev12345
5. Navigate to 'Caisse' (Cashier) and try to add a product
6. Try to checkout

For each step:
- Take a screenshot
- Note any errors, unexpected behavior, or UI issues
- Check if French text displays correctly
- Check if the layout works on mobile

Report:
- What works
- What doesn't work
- Any bugs found
- Screenshots taken
"""

    print("=== AI Exploration ===")
    print(f"Target: {target}")
    print()

    # Initialize browser — try to connect to existing Chrome or launch new
    browser = Browser(
        headless=False,  # Show browser window
        # Note: For Android WebView, we'd need custom CDP connection
        # browser-use primarily supports desktop browsers
    )

    agent = Agent(
        task=task,
        llm="claude-sonnet-4-20250514",  # or "gpt-4o"
        browser=browser,
    )

    print("Starting AI agent...")
    print("The agent will navigate the app and report findings.")
    print()

    try:
        result = await agent.run()
        print("\n=== AI Report ===")
        print(result)
    except Exception as e:
        print(f"AI exploration failed: {e}")
        print("Note: browser-use works best with desktop browsers.")
        print("For Android WebView, use OpenCLI or the CDP test suite instead.")


async def quick_test():
    """Quick smoke test — just check if app loads."""
    task = """Open the Mon Comptoir POS app and check:
1. Does it load without errors?
2. Is the license screen visible?
3. Take a screenshot.

Report what you see."""

    browser = Browser(headless=False)
    agent = Agent(task=task, llm="claude-sonnet-4-20250514", browser=browser)

    result = await agent.run()
    print(result)


if __name__ == "__main__":
    target = "full"
    if "--quick" in sys.argv:
        asyncio.run(quick_test())
    else:
        asyncio.run(explore(target))
