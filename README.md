# Cyber Air Patrol (CAP)
### SEE MY PLANES! 🛩️

A real-time aircraft tracking tool that brings aviation awareness to everyone - from drone pilots ensuring safe operations to kids discovering the invisible world above them.

## 🎯 Mission
Honor the legacy of Civil Air Patrol volunteers by creating modern tools for aviation safety and education. Named in tribute to Grandpa Saker and his service.

## ✈️ Features
- **Real-time aircraft tracking** within configurable radius (5-50 miles)
- **Early warning system** for low-altitude aircraft (crop dusters, helicopters)
- **STRATCOM pattern recognition** for regular military training routes
- **Multiple output formats**: text, JSON, XML, HTML, YAML
- **Future mobile app**: "SEE MY PLANES!" - one button aviation awareness

## 🚀 Quick Start
```bash
# Install dependencies
npm install

# Run with your location
cap --lat 41.234 --lon -95.678 --range 10

# Get JSON output for integration
cap --lat 41.234 --lon -95.678 --range 10 --format json
```

## 🏗️ Architecture
- **Core CLI Tool**: TypeScript/Node.js command-line interface
- **Data Sources**: 
  - ADSBexchange API (requires API key)
  - Local Raspberry Pi receivers (readsb/tar1090)
- **Alert System**: MQTT publishing for real-time notifications
- **Mobile App**: React Native (future development)

## 🥧 Raspberry Pi Setup
CAP now supports direct integration with local ADS-B receivers! Check out our [Raspberry Pi Setup Guide](docs/raspberry-pi-setup.md) to turn your Pi into an aircraft tracking station.

## 🤝 Contributing
This project aims to make aviation accessible to everyone. Contributions welcome!

## 📜 License
MIT - Free as in flight

---
*"Look mom, there's 17 planes above us right now!"*