#!/bin/bash
# Mosquitto Installation Script for RESONANCE
# CAP Aviation Consciousness MQTT Infrastructure

set -e

echo "=== CAP MQTT Installation for RESONANCE ==="
echo "This script will install and configure Mosquitto"
echo "Host: RESONANCE (192.168.1.253)"
echo ""

# Check if running on RESONANCE
HOSTNAME=$(hostname)
if [[ "$HOSTNAME" != "RESONANCE" ]]; then
    echo "WARNING: This script is intended for RESONANCE but running on $HOSTNAME"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update and install
echo "📦 Installing Mosquitto..."
sudo apt update
sudo apt install -y mosquitto mosquitto-clients

# Create config directory
echo "📝 Creating configuration..."
sudo mkdir -p /etc/mosquitto/conf.d

# Create main config
cat << 'EOF' | sudo tee /etc/mosquitto/conf.d/cap.conf
# CAP Aviation Consciousness Configuration
# Generated: $(date)

# Main listener
listener 1883

# WebSocket support for future web clients
listener 9001
protocol websockets

# Security
allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file /etc/mosquitto/acl

# Logging
log_dest file /var/log/mosquitto/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# Persistence for retained messages
persistence true
persistence_location /var/lib/mosquitto/

# Message size (for JSON payloads)
message_size_limit 256000

# Connection settings
max_keepalive 120
EOF

# Create password file
echo "🔐 Setting up authentication..."
echo "Creating user: cap-daemon"
sudo mosquitto_passwd -c /etc/mosquitto/passwd cap-daemon

echo "Creating user: pi-publisher"
sudo mosquitto_passwd -b /etc/mosquitto/passwd pi-publisher "pi-publisher-temp-pass"

echo "Creating user: arduino-alerts"
sudo mosquitto_passwd -b /etc/mosquitto/passwd arduino-alerts "arduino-temp-pass"

echo ""
echo "⚠️  IMPORTANT: Change the default passwords!"
echo "sudo mosquitto_passwd /etc/mosquitto/passwd pi-publisher"
echo "sudo mosquitto_passwd /etc/mosquitto/passwd arduino-alerts"
echo ""

# Create ACL file
echo "🔒 Setting up access control..."
cat << 'EOF' | sudo tee /etc/mosquitto/acl
# CAP Topic Access Control

# CAP daemon - full access
user cap-daemon
topic readwrite #

# Pi publisher - aircraft data
user pi-publisher
topic write aircraft/+/position
topic write aircraft/+/status
topic read system/pi/command

# Arduino - alerts and status
user arduino-alerts
topic read aircraft/+/alert
topic read audio/arduino/command
topic write system/arduino/status

# Future patterns
# user mobile-app
# topic read aircraft/+/position
# topic read aircraft/+/alert
EOF

# Enable and start
echo "🚀 Starting Mosquitto..."
sudo systemctl enable mosquitto
sudo systemctl restart mosquitto

# Wait for startup
sleep 2

# Check status
if sudo systemctl is-active --quiet mosquitto; then
    echo "✅ Mosquitto is running!"
else
    echo "❌ Mosquitto failed to start. Check logs:"
    echo "sudo journalctl -u mosquitto -n 50"
    exit 1
fi

# Test connectivity
echo ""
echo "🧪 Testing MQTT broker..."
echo "Enter cap-daemon password to test:"
mosquitto_pub -h localhost -t "system/test" -m "CAP MQTT Active at $(date)" -u cap-daemon -P

if [ $? -eq 0 ]; then
    echo "✅ MQTT broker test successful!"
else
    echo "❌ MQTT broker test failed"
    exit 1
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "📋 Next steps:"
echo "1. Change default passwords for pi-publisher and arduino-alerts"
echo "2. Test from remote machine:"
echo "   mosquitto_sub -h 192.168.1.253 -t 'test/#' -u cap-daemon -P [password]"
echo "3. Configure Pi publisher script"
echo "4. Configure Arduino subscriber"
echo ""
echo "📊 Monitor all topics:"
echo "mosquitto_sub -h localhost -t '#' -v -u cap-daemon -P [password]"
echo ""
echo "🟣 Purple Line MQTT infrastructure ready!"
