#!/bin/bash
# Seed fake orders via the checkout API, then trigger local-sync
# This creates realistic analytics data without direct DB access

BASE="https://kassensystem-8vl2.onrender.com/api"

echo "=== Logging in as admin ==="
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"pos123"}' | jq -r '.token')
echo "Token: OK"

echo "=== Fetching products ==="
PRODUCTS=$(curl -s "$BASE/products")
echo "$PRODUCTS" | jq -c '.[0:4] | .[] | {id, name, price}'

# Extract product IDs
P1=$(echo "$PRODUCTS" | jq -r '.[0].id')
P2=$(echo "$PRODUCTS" | jq -r '.[1].id')
P3=$(echo "$PRODUCTS" | jq -r '.[2].id')
P4=$(echo "$PRODUCTS" | jq -r '.[3].id')
P5=$(echo "$PRODUCTS" | jq -r '.[4].id')
P6=$(echo "$PRODUCTS" | jq -r '.[5].id')
P7=$(echo "$PRODUCTS" | jq -r '.[6].id')
P8=$(echo "$PRODUCTS" | jq -r '.[7].id')

echo "=== Creating fake orders (last 30 days worth) ==="
# Create ~20 orders with various products
for i in $(seq 1 20); do
  # Pick 2-4 random products per order
  NUM_ITEMS=$(( (RANDOM % 3) + 2 ))
  ITEMS="["
  for j in $(seq 1 $NUM_ITEMS); do
    PID=$(( (RANDOM % 8) + 1 ))
    QTY=$(( (RANDOM % 5) + 1 ))
    if [ $j -gt 1 ]; then ITEMS="$ITEMS,"; fi
    ITEMS="$ITEMS{\"productId\":$PID,\"quantity\":$QTY}"
  done
  ITEMS="$ITEMS]"

  PAYMENT=$(( RANDOM % 3 ))
  case $PAYMENT in
    0) METHOD="cash" ;;
    1) METHOD="card" ;;
    2) METHOD="other" ;;
  esac

  RESULT=$(curl -s -X POST "$BASE/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"items\":$ITEMS,\"paymentMethod\":\"$METHOD\"}")
  echo "Order $i: $(echo $RESULT | jq -c '{success, orderId}')"
done

echo ""
echo "=== Now get a license token for local-sync ==="
LICENSE_KEY="789623E3-F7FCB8C5-91299428-2AF230CF"
MACHINE_ID="seed-machine-001"

ACTIVATE=$(curl -s -X POST "$BASE/license/activate" \
  -H "Content-Type: application/json" \
  -d "{\"licenseKey\":\"$LICENSE_KEY\",\"storeName\":\"Seed Store\",\"machineId\":\"$MACHINE_ID\"}")
LICENSE_TOKEN=$(echo "$ACTIVATE" | jq -r '.token')

if [ "$LICENSE_TOKEN" = "null" ] || [ -z "$LICENSE_TOKEN" ]; then
  echo "Activate failed, trying verify instead..."
  VERIFY=$(curl -s -X POST "$BASE/license/verify" \
    -H "Content-Type: application/json" \
    -d "{\"licenseKey\":\"$LICENSE_KEY\",\"machineId\":\"$MACHINE_ID\"}")
  LICENSE_TOKEN=$(echo "$VERIFY" | jq -r '.token')
fi

echo "License token: OK"

echo "=== Running local-sync ==="
SYNC=$(curl -s -X POST "$BASE/analytics/local-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LICENSE_TOKEN" \
  -d '{}')
echo "Sync result: $SYNC"

echo ""
echo "=== Checking analytics summary ==="
SUMMARY=$(curl -s "$BASE/analytics/summary" -H "Authorization: Bearer $TOKEN")
echo "$SUMMARY" | jq -c '.summary'

echo ""
echo "=== Checking bestsellers ==="
BEST=$(curl -s "$BASE/analytics/bestsellers?limit=5" -H "Authorization: Bearer $TOKEN")
echo "$BEST" | jq -c '.bestsellers[]'

echo ""
echo "=== Done! ==="
