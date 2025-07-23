#!/bin/bash
# Test Mosquitto MQTT Setup
# Verifies CAP aviation consciousness message flow

MQTT_HOST="192.168.1.253"
MQTT_USER="cap-daemon"

echo "=== CAP MQTT Test Suite ==="
echo "Testing MQTT broker at $MQTT_HOST"
echo ""

# Check if mosquitto_pub is installed
if ! command -v mosquitto_pub &> /dev/null; then
    echo "❌ mosquitto-clients not installed"
    echo "Run: sudo apt install mosquitto-clients"
    exit 1
fi

# Get password
read -s -p "Enter password for $MQTT_USER: " MQTT_PASS
echo ""

# Test 1: Basic connectivity
echo "🧪 Test 1: Basic connectivity"
if mosquitto_pub -h $MQTT_HOST -t "test/connectivity" -m "Connected at $(date)" -u $MQTT_USER -P "$MQTT_PASS" 2>/dev/null; then
    echo "✅ Connected to MQTT broker"
else
    echo "❌ Failed to connect. Check:"
    echo "  - Is Mosquitto running on $MQTT_HOST?"
    echo "  - Is password correct?"
    echo "  - Is port 1883 open?"
    exit 1
fi

# Test 2: Subscribe in background
echo ""
echo "🧪 Test 2: Pub/Sub test"
echo "Starting subscriber..."

# Create a temp file for capturing output
TEMP_FILE=$(mktemp)
mosquitto_sub -h $MQTT_HOST -t "test/#" -u $MQTT_USER -P "$MQTT_PASS" -C 1 > "$TEMP_FILE" 2>&1 &
SUB_PID=$!

# Give subscriber time to connect
sleep 1

# Publish test message
TEST_MSG="CAP Test Message $(date +%s)"
mosquitto_pub -h $MQTT_HOST -t "test/pubsub" -m "$TEST_MSG" -u $MQTT_USER -P "$MQTT_PASS"

# Wait for subscriber
wait $SUB_PID 2>/dev/null

# Check if message was received
if grep -q "CAP Test Message" "$TEMP_FILE" 2>/dev/null; then
    echo "✅ Pub/Sub working correctly"
else
    echo "❌ Pub/Sub test failed"
    cat "$TEMP_FILE"
fi
rm -f "$TEMP_FILE"

# Test 3: Aircraft simulation
echo ""
echo "🧪 Test 3: Simulated aircraft alert"

# Simulate low altitude aircraft
AIRCRAFT_JSON='{
  "hex": "a12345",
  "flight": "N126LA",
  "altitude": 1650,
  "speed": 125,
  "lat": 40.88230,
  "lon": -95.69146,
  "alert_type": "low_altitude",
  "timestamp": '$(date +%s)'
}'

if mosquitto_pub -h $MQTT_HOST -t "aircraft/a12345/alert" -m "$AIRCRAFT_JSON" -u $MQTT_USER -P "$MQTT_PASS"; then
    echo "✅ Aircraft alert published"
    echo "   Topic: aircraft/a12345/alert"
    echo "   Flight: N126LA at 1650ft"
else
    echo "❌ Failed to publish aircraft alert"
fi

# Test 4: Retained message
echo ""
echo "🧪 Test 4: Retained messages"
RETAINED_MSG="Last known position $(date)"
if mosquitto_pub -h $MQTT_HOST -t "aircraft/test/last_position" -m "$RETAINED_MSG" -r -u $MQTT_USER -P "$MQTT_PASS"; then
    echo "✅ Retained message set"
else
    echo "❌ Failed to set retained message"
fi

# Test 5: Topic permissions
echo ""
echo "🧪 Test 5: Topic permissions (using pi-publisher)"
echo "Testing restricted user access..."
echo "(This should fail if ACLs are working)"

# This should fail - pi-publisher can't write to system topics
if mosquitto_pub -h $MQTT_HOST -t "system/admin/command" -m "unauthorized" -u pi-publisher -P "pi-publisher-temp-pass" 2>/dev/null; then
    echo "⚠️  WARNING: ACLs may not be properly configured"
    echo "   pi-publisher could write to system/admin/command"
else
    echo "✅ ACLs working - unauthorized publish blocked"
fi

echo ""
echo "=== Test Summary ==="
echo "🟣 MQTT broker is ready for:"
echo "  - Pi to publish aircraft positions"
echo "  - CAP daemon to process and alert"
echo "  - Arduino to receive audio commands"
echo ""
echo "📋 Monitor aircraft events:"
echo "mosquitto_sub -h $MQTT_HOST -t 'aircraft/#' -v -u $MQTT_USER -P [password]"
echo ""
echo "🚩 N126LA consciousness bridge established!"
