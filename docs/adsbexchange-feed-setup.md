# ADSBexchange Feed Setup (Manual Method)

## The Challenge
The official ADSBexchange installer requires an interactive terminal, which doesn't work well over SSH. On our Pi 2, we created a custom solution.

## Our Solution: Simple Socat Feeder

Instead of wrestling with the complex installer, we built a minimal feeder using `socat`:

```bash
#!/bin/bash
# Simple ADSBexchange feeder using socat
source /etc/default/adsbexchange

while true; do
    echo "Connecting to ADSBexchange..."
    socat -u TCP:127.0.0.1:30005 TCP:feed.adsbexchange.com:30004
    echo "Connection lost, retrying in 30 seconds..."
    sleep 30
done
```

## Configuration File
Create `/etc/default/adsbexchange`:
```bash
INPUT="127.0.0.1:30005"
REDUCE_INTERVAL="0.5"
USER="TABOR-IOWA"  # Your feeder name
LATITUDE="40.88230"
LONGITUDE="-95.69146"
ALTITUDE="1205"
```

## UUID Generation
```bash
# Generate unique feeder ID
sudo /usr/local/share/adsbexchange/create-uuid.sh
```

Our UUID: `f9567a82-4015-4830-a2e1-aed10eae689f`

## Stats Package
For personal aircraft map showing only YOUR receiver's data:
```bash
curl -L -o /tmp/axstats.sh https://adsbexchange.com/stats.sh
sudo bash /tmp/axstats.sh
```

Access your personal map at:
`https://www.adsbexchange.com/api/feeders/?feed=YOUR-UUID`

## Verification
- Check connection: https://www.adsbexchange.com/myip
- MLAT sync status: https://adsbx.org/sync

## Why This Works
- Minimal dependencies (just socat)
- No complex binaries to compile
- Automatically reconnects if connection drops
- Works perfectly with readsb's Beast output on port 30005

Sometimes the simplest solution is the best solution! 🚀