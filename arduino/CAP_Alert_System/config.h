// CAP Alert System - Arduino Configuration
// For untethered operation on CYB3R1A-SL network

#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "CYB3R1A-SL"
#define WIFI_PASSWORD "Th3R3dSqu@r3"

// MQTT Configuration
#define MQTT_BROKER_HOST "192.168.1.253"  // RESONANCE
#define MQTT_BROKER_PORT 1883
#define MQTT_CLIENT_ID "cap-arduino-alerts"
#define MQTT_USERNAME "arduino"
#define MQTT_PASSWORD "generated-on-install"

// MQTT Topics
#define TOPIC_AIRCRAFT_ALERT "aircraft/+/alert"
#define TOPIC_SYSTEM_STATUS "system/arduino/status"
#define TOPIC_AUDIO_COMMAND "audio/arduino/command"

// Alert Configuration
#define ALTITUDE_CRITICAL 1500   // Urgent beeping below this
#define ALTITUDE_WARNING 2500    // Warning beeps below this
#define DISTANCE_CRITICAL 3.0    // Miles - urgent if closer
#define DISTANCE_WARNING 5.0     // Miles - warning if closer

// Audio Patterns (milliseconds)
#define PATTERN_URGENT_ON 100
#define PATTERN_URGENT_OFF 100
#define PATTERN_WARNING_ON 200
#define PATTERN_WARNING_OFF 400
#define PATTERN_AGRICULTURAL_ON 150
#define PATTERN_AGRICULTURAL_OFF 150
#define PATTERN_AGRICULTURAL_REPEAT 3

// Pin Configuration (Arduino Uno R4 WiFi)
#define BUZZER_PIN 9        // PWM capable pin
#define STATUS_LED LED_BUILTIN
#define WIFI_LED 10         // External LED for WiFi status

// Debug
#define DEBUG_SERIAL Serial
#define DEBUG_BAUD 115200

#endif // CONFIG_H