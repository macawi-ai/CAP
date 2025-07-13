# Cyber Air Patrol Setup Guide

## Quick Start

1. **Clone and Install**
   ```bash
   cd /home/cy/git/macawi-ai/CAP
   npm install
   ```

2. **Configure API Access**
   - Get an API key from [ADSBexchange](https://www.adsbexchange.com/data/)
   - Copy `.env.example` to `.env`
   - Add your API key to `.env`

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Test Your Setup**
   ```bash
   npm run dev -- test
   ```

5. **First Run - See Aircraft Above You!**
   ```bash
   # Using your actual coordinates
   npm run dev -- --lat 41.1234 --lon -95.5678 --range 10
   ```

## Watch Mode for Continuous Monitoring

Track aircraft continuously (updates every 30 seconds):
```bash
npm run dev -- --lat 41.1234 --lon -95.5678 --watch
```

## Output Formats

- **Text** (default): Colorized terminal output with aircraft details
- **JSON**: Machine-readable format for integration
- **HTML**: Web page with styled aircraft list
- **XML**: Structured data format
- **YAML**: Human-readable data serialization

Example:
```bash
npm run dev -- --format json > aircraft.json
```

## Special Features

### Low Altitude Warnings
The tool automatically highlights aircraft below 5,000 feet - perfect for drone pilots!

### Military Aircraft Detection
Special callsign patterns are recognized:
- DOOM/KING/ATOM/JAKE (STRATCOM aircraft)
- GOLD/BLUE/RED (Tankers)
- And more!

### Agricultural Aircraft
Air Tractors and crop dusters are specially marked with yellow highlighting.

## For Drone Pilots

Before flying, check your airspace:
```bash
npm run dev -- --max-alt 1000 --range 5
```

This shows only low-altitude aircraft within 5 miles - your immediate concern zone.

## Future Mobile App

The "SEE MY PLANES!" mobile app is coming soon, bringing one-button aircraft awareness to everyone!

---

*Happy plane spotting! And remember - when you see an RC-135 flying low, wave your arms like an airplane. They might just wave back! ✈️*