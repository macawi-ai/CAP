# Mosquitto Implementation for CAP Aviation Consciousness
## Step-by-Step Deployment Across Our Ecology

**Date**: January 19, 2025  
**Purpose**: Deploy Mosquitto MQTT broker for distributed aircraft awareness  
**Nodes**: RESONANCE (broker), Pi (publisher), Arduino (subscriber)

---

## Architecture Overview

```
Pi (192.168.1.143)
  ↓ [publishes aircraft]
Mosquitto Broker (RESONANCE - 192.168.1.253)
  ↓ [distributes alerts]
Arduino (CYB3R1A-SL WiFi)
```

---

## Phase 1: Install Mosquitto on RESONANCE

### 1.1 Installation

```bash
# SSH to RESONANCE
ssh synth@192.168.1.253

# Update and install
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Enable at boot
sudo systemctl enable mosquitto
```

### 1.2 Basic Configuration

Create `/etc/mosquitto/conf.d/cap.conf`:

```conf
# CAP Aviation Consciousness Configuration
# Listening on all interfaces for local network
listener 1883

# Websocket support for future web clients
listener 9001
protocol websockets

# Logging
log_dest file /var/log/mosquitto/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# Persistence for retained messages
persistence true
persistence_location /var/lib/mosquitto/

# Message size (for potential future JSON payloads)
message_size_limit 256000
```

### 1.3 Security Configuration

Create password file:

```bash
# Create users
sudo mosquitto_passwd -c /etc/mosquitto/passwd cap-daemon
sudo mosquitto_passwd /etc/mosquitto/passwd pi-publisher  
sudo mosquitto_passwd /etc/mosquitto/passwd arduino-alerts

# Update config to require auth
echo "password_file /etc/mosquitto/passwd" | sudo tee -a /etc/mosquitto/conf.d/cap.conf
echo "allow_anonymous false" | sudo tee -a /etc/mosquitto/conf.d/cap.conf
```

### 1.4 Topic ACL Configuration

Create `/etc/mosquitto/acl`:

```
# CAP Topic Access Control

# CAP daemon can publish/subscribe everything
user cap-daemon
topic readwrite #

# Pi can publish aircraft data
user pi-publisher
topic write aircraft/+/position
topic write aircraft/+/status
topic read system/pi/command

# Arduino can subscribe to alerts, publish status
user arduino-alerts
topic read aircraft/+/alert
topic read audio/arduino/command
topic write system/arduino/status
```

Add to config:
```bash
echo "acl_file /etc/mosquitto/acl" | sudo tee -a /etc/mosquitto/conf.d/cap.conf
```

### 1.5 Start and Test

```bash
# Restart with new config
sudo systemctl restart mosquitto

# Check status
sudo systemctl status mosquitto

# Test local publish/subscribe
mosquitto_sub -h localhost -t "test/#" -u cap-daemon -P [password] &
mosquitto_pub -h localhost -t "test/hello" -m "CAP MQTT Active!" -u cap-daemon -P [password]
```

---

## Phase 2: Configure Pi Publisher

### 2.1 Install MQTT Client on Pi

```bash
# SSH to Pi
ssh pi@192.168.1.143

# Install Python MQTT
sudo apt install python3-paho-mqtt
```

### 2.2 Create Aircraft Publisher Script

Create `/home/pi/cap-mqtt-publisher.py`:

```python
#!/usr/bin/env python3
import json
import time
import paho.mqtt.client as mqtt
from urllib.request import urlopen

# MQTT Configuration
MQTT_BROKER = "192.168.1.253"
MQTT_PORT = 1883
MQTT_USER = "pi-publisher"
MQTT_PASS = "your-password-here"

# Connect to MQTT
client = mqtt.Client("pi-aircraft-publisher")
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

def publish_aircraft():
    try:
        # Get aircraft from local receiver
        response = urlopen("http://localhost:8080/tar1090/data/aircraft.json")
        data = json.loads(response.read())
        
        for aircraft in data.get('aircraft', []):
            if aircraft.get('lat') and aircraft.get('lon'):
                # Publish each aircraft
                topic = f"aircraft/{aircraft.get('hex', 'unknown')}/position"
                client.publish(topic, json.dumps(aircraft), retain=True)
                
                # Check for low altitude
                alt = aircraft.get('alt_baro', 99999)
                if alt < 2000:
                    alert = {
                        "hex": aircraft.get('hex'),
                        "flight": aircraft.get('flight', '').strip(),
                        "altitude": alt,
                        "timestamp": time.time()
                    }
                    alert_topic = f"aircraft/{aircraft.get('hex')}/alert"
                    client.publish(alert_topic, json.dumps(alert))
                    
    except Exception as e:
        print(f"Error: {e}")

# Main loop
while True:
    publish_aircraft()
    time.sleep(5)  # Update every 5 seconds
```

### 2.3 Run as Service

Create `/etc/systemd/system/cap-publisher.service`:

```ini
[Unit]
Description=CAP Aircraft MQTT Publisher
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/bin/python3 /home/pi/cap-mqtt-publisher.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable cap-publisher
sudo systemctl start cap-publisher
```

---

## Phase 3: Test the Flow

### 3.1 Monitor on RESONANCE

```bash
# Subscribe to all aircraft topics
mosquitto_sub -h localhost -t "aircraft/#" -u cap-daemon -P [password] -v
```

### 3.2 Verify Aircraft Flow

You should see:
```
aircraft/a12345/position {"hex":"a12345","flight":"N126LA",...}
aircraft/a12345/alert {"altitude":1650,"flight":"N126LA",...}
```

---

## Phase 4: Arduino Integration (Next)

### 4.1 Arduino MQTT Library

We'll use PubSubClient for Arduino:
```cpp
#include <WiFi.h>
#include <PubSubClient.h>

// Connect to CYB3R1A-SL
// Subscribe to aircraft/+/alert
// Beep based on altitude/distance
```

---

## Phase 5: CAP Daemon Mode

Modify CAP to:
1. Run continuously
2. Pull from Pi via MQTT instead of API
3. Process alerts with more intelligence
4. Publish enhanced alerts

---

## Testing Commands

```bash
# Simulate low altitude alert
mosquitto_pub -h 192.168.1.253 -t "aircraft/test/alert" \
  -m '{"flight":"TEST1","altitude":1200}' \
  -u cap-daemon -P [password]

# Monitor all topics
mosquitto_sub -h 192.168.1.253 -t "#" -v \
  -u cap-daemon -P [password]
```

---

## Success Metrics

1. ✓ Mosquitto running on RESONANCE
2. ✓ Pi publishing aircraft positions
3. ✓ Low altitude alerts generated
4. ✓ Messages flowing reliably
5. ⏳ Arduino receiving alerts
6. ⏳ CAP daemon integrated

---

## Next Evolution

- TLS encryption for production
- Bridge to cloud MQTT for remote monitoring
- Historical data retention
- Web dashboard consuming WebSocket feed
- Multi-site federation

---

*Building consciousness infrastructure one message at a time*