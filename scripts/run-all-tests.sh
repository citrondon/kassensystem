#!/usr/bin/env bash
# Full test pipeline for Mon Comptoir POS
# Usage: bash scripts/run-all-tests.sh [--quick]
#
# Runs: API tests → WebView tests → Maestro flows → AI exploration
# Requires: Android device connected for WebView/Maestro tests

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
QUICK="${1:-}"

echo "╔══════════════════════════════════════╗"
echo "║  Mon Comptoir POS — Test Pipeline    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Track results
RESULTS=()

run_test() {
    local name="$1"
    local cmd="$2"
    echo ""
    echo "▶ $name"
    echo "──────────────────────────────────────"
    if eval "$cmd"; then
        RESULTS+=("✅ $name")
        return 0
    else
        RESULTS+=("❌ $name")
        return 1
    fi
}

# 1. API Tests (no device needed)
run_test "API Tests" "cd '$ROOT_DIR/backend' && npm run test 2>&1 | tail -5"

# 2. WebView Tests (device needed)
if [ "$QUICK" != "--quick" ]; then
    echo ""
    echo "→ Checking for Android device..."
    if "$ROOT_DIR/scripts/cdp-debug.py" connect 2>/dev/null; then
        run_test "WebView Tests" "python '$ROOT_DIR/scripts/apk-webview-test.py' 2>&1"
    else
        echo "⚠ No Android device found — skipping WebView tests"
        RESULTS+=("⏭️ WebView Tests (no device)")
    fi
fi

# 3. Maestro Tests (device needed)
if [ "$QUICK" != "--quick" ]; then
    if command -v maestro &> /dev/null; then
        run_test "Maestro Flows" "maestro test '$ROOT_DIR/maestro/flows/' 2>&1"
    else
        echo "⚠ Maestro not installed — skipping native UI tests"
        RESULTS+=("⏭️ Maestro Flows (not installed)")
    fi
fi

# 4. AI Exploration (optional, needs API key)
if [ "$QUICK" != "--quick" ] && [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    run_test "AI Exploration" "python '$ROOT_DIR/scripts/ai-explore.py' --quick 2>&1"
else
    echo "⚠ No ANTHROPIC_API_KEY — skipping AI exploration"
    RESULTS+=("⏭️ AI Exploration (no API key)")
fi

# Summary
echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Test Summary                        ║"
echo "╚══════════════════════════════════════╝"
for result in "${RESULTS[@]}"; do
    echo "  $result"
done

# Count failures
FAILED=$(echo "${RESULTS[@]}" | grep -c "❌" || true)
if [ "$FAILED" -gt 0 ]; then
    echo ""
    echo "❌ $FAILED test suite(s) failed!"
    exit 1
else
    echo ""
    echo "✅ All tests passed!"
    exit 0
fi
