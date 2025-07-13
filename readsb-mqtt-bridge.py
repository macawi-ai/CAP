#!/usr/bin/env python3
"""
Readsb to MQTT Bridge
Publishes aircraft data from readsb to MQTT for CAPwarn and other consumers
"""

import json
import time
import os
import sys
import paho.mqtt.client as mqtt
from datetime import datetime
import logging
import argparse

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('readsb-mqtt')

class ReadsbMQTTBridge:
    def __init__(self, mqtt_host='localhost', mqtt_port=1883, mqtt_topic='cap/aircraft',
                 json_path='/run/readsb/aircraft.json', update_interval=1.0):
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.mqtt_topic = mqtt_topic
        self.json_path = json_path
        self.update_interval = update_interval
        
        # MQTT client setup
        self.mqtt_client = mqtt.Client(client_id='readsb-bridge')
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_disconnect = self.on_disconnect
        
        # Track aircraft for changes
        self.last_aircraft = {}
        
    def on_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            logger.info(f"Connected to MQTT broker at {self.mqtt_host}:{self.mqtt_port}")
            # Publish status
            client.publish(f"{self.mqtt_topic}/status", json.dumps({
                'status': 'online',
                'timestamp': datetime.utcnow().isoformat()
            }), retain=True)
        else:
            logger.error(f"Failed to connect to MQTT broker: {rc}")
            
    def on_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        logger.warning(f"Disconnected from MQTT broker: {rc}")
        
    def start(self):
        """Start the bridge"""
        logger.info("Starting Readsb-MQTT bridge...")
        
        # Connect to MQTT
        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, 60)
            self.mqtt_client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            return
            
        # Main loop
        while True:
            try:
                self.process_aircraft()
                time.sleep(self.update_interval)
            except KeyboardInterrupt:
                logger.info("Shutting down...")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(5)
                
        # Cleanup
        self.mqtt_client.publish(f"{self.mqtt_topic}/status", json.dumps({
            'status': 'offline',
            'timestamp': datetime.utcnow().isoformat()
        }), retain=True)
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()
        
    def process_aircraft(self):
        """Read aircraft.json and publish updates"""
        try:
            with open(self.json_path, 'r') as f:
                data = json.load(f)
                
            aircraft_list = data.get('aircraft', [])
            current_time = time.time()
            
            # Publish summary
            summary = {
                'timestamp': datetime.utcnow().isoformat(),
                'total_aircraft': len(aircraft_list),
                'with_position': sum(1 for a in aircraft_list if 'lat' in a and 'lon' in a),
                'with_altitude': sum(1 for a in aircraft_list if 'alt_baro' in a or 'alt_geom' in a)
            }
            self.mqtt_client.publish(f"{self.mqtt_topic}/summary", json.dumps(summary))
            
            # Process each aircraft
            current_aircraft = {}
            for aircraft in aircraft_list:
                if 'hex' not in aircraft:
                    continue
                    
                hex_id = aircraft['hex']
                current_aircraft[hex_id] = aircraft
                
                # Check if this is new or updated
                if hex_id not in self.last_aircraft or \
                   self.aircraft_changed(aircraft, self.last_aircraft[hex_id]):
                    
                    # Enhance with calculated fields
                    enhanced = self.enhance_aircraft_data(aircraft)
                    
                    # Publish individual aircraft
                    self.mqtt_client.publish(
                        f"{self.mqtt_topic}/aircraft/{hex_id}",
                        json.dumps(enhanced),
                        retain=False
                    )
                    
                    # Check for special conditions
                    self.check_alerts(enhanced)
                    
            # Check for departed aircraft
            for hex_id in self.last_aircraft:
                if hex_id not in current_aircraft:
                    self.mqtt_client.publish(
                        f"{self.mqtt_topic}/departed/{hex_id}",
                        json.dumps({
                            'hex': hex_id,
                            'timestamp': datetime.utcnow().isoformat()
                        })
                    )
                    
            self.last_aircraft = current_aircraft
            
        except FileNotFoundError:
            logger.warning(f"Aircraft file not found: {self.json_path}")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in aircraft file: {e}")
        except Exception as e:
            logger.error(f"Error processing aircraft: {e}")
            
    def aircraft_changed(self, new, old):
        """Check if aircraft data has significantly changed"""
        # Check position change
        if ('lat' in new and 'lat' in old):
            if abs(new['lat'] - old['lat']) > 0.001 or \
               abs(new['lon'] - old['lon']) > 0.001:
                return True
                
        # Check altitude change
        if ('alt_baro' in new and 'alt_baro' in old):
            if abs(new.get('alt_baro', 0) - old.get('alt_baro', 0)) > 100:
                return True
                
        # Check if newly seen
        if new.get('seen', 999) < 1 and old.get('seen', 999) > 10:
            return True
            
        return False
        
    def enhance_aircraft_data(self, aircraft):
        """Add calculated fields to aircraft data"""
        enhanced = aircraft.copy()
        enhanced['timestamp'] = datetime.utcnow().isoformat()
        
        # Add altitude category
        alt = aircraft.get('alt_baro') or aircraft.get('alt_geom')
        if alt:
            if alt < 1000:
                enhanced['alt_category'] = 'ground'
            elif alt < 5000:
                enhanced['alt_category'] = 'low'
            elif alt < 10000:
                enhanced['alt_category'] = 'medium'
            elif alt < 25000:
                enhanced['alt_category'] = 'high'
            else:
                enhanced['alt_category'] = 'very_high'
                
        # Add speed category
        gs = aircraft.get('gs')
        if gs:
            if gs < 100:
                enhanced['speed_category'] = 'very_slow'
            elif gs < 200:
                enhanced['speed_category'] = 'slow'
            elif gs < 350:
                enhanced['speed_category'] = 'medium'
            elif gs < 500:
                enhanced['speed_category'] = 'fast'
            else:
                enhanced['speed_category'] = 'very_fast'
                
        return enhanced
        
    def check_alerts(self, aircraft):
        """Check for alert conditions"""
        # Emergency squawks
        squawk = aircraft.get('squawk')
        if squawk in ['7700', '7600', '7500']:
            self.mqtt_client.publish(
                f"{self.mqtt_topic}/alerts/emergency",
                json.dumps({
                    'type': 'emergency_squawk',
                    'squawk': squawk,
                    'aircraft': aircraft,
                    'timestamp': datetime.utcnow().isoformat()
                })
            )
            
        # Low altitude alert
        alt = aircraft.get('alt_baro') or aircraft.get('alt_geom')
        if alt and alt < 1000 and aircraft.get('gs', 0) > 50:
            self.mqtt_client.publish(
                f"{self.mqtt_topic}/alerts/low_altitude",
                json.dumps({
                    'type': 'low_altitude',
                    'altitude': alt,
                    'aircraft': aircraft,
                    'timestamp': datetime.utcnow().isoformat()
                })
            )
            
        # Special callsigns (STRATCOM patterns)
        flight = aircraft.get('flight', '').strip()
        if any(pattern in flight for pattern in ['DOOM', 'KING', 'ATOM', 'JAKE']):
            self.mqtt_client.publish(
                f"{self.mqtt_topic}/alerts/military",
                json.dumps({
                    'type': 'military_callsign',
                    'callsign': flight,
                    'aircraft': aircraft,
                    'timestamp': datetime.utcnow().isoformat()
                })
            )

def main():
    parser = argparse.ArgumentParser(description='Readsb to MQTT Bridge')
    parser.add_argument('--mqtt-host', default='localhost', help='MQTT broker host')
    parser.add_argument('--mqtt-port', type=int, default=1883, help='MQTT broker port')
    parser.add_argument('--mqtt-topic', default='cap/aircraft', help='Base MQTT topic')
    parser.add_argument('--json-path', default='/run/readsb/aircraft.json', 
                        help='Path to readsb aircraft.json')
    parser.add_argument('--interval', type=float, default=1.0, 
                        help='Update interval in seconds')
    
    args = parser.parse_args()
    
    bridge = ReadsbMQTTBridge(
        mqtt_host=args.mqtt_host,
        mqtt_port=args.mqtt_port,
        mqtt_topic=args.mqtt_topic,
        json_path=args.json_path,
        update_interval=args.interval
    )
    
    try:
        bridge.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()