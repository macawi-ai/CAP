# Raspberry Pi ADS-B Setup Guide

## Overview
This guide documents setting up a Raspberry Pi as an ADS-B receiver station using readsb and tar1090, replacing the older dump1090-fa setup.

## Hardware
- **Device**: Raspberry Pi 2 Model B (ARMv7, Cortex-A7, 1GB RAM)
- **SDR**: RTL-SDR USB dongle (RTL2832U)
- **Location**: Tabor, Iowa (40.88230°N, 95.69146°W) @ 1,205ft elevation

## Why readsb?
- More efficient than dump1090-fa on older hardware
- Better MQTT integration possibilities
- Modern codebase with active development
- Compatible with existing feeders (FlightAware, ADSBexchange)

## Installation Steps

### 1. Stop Existing Services
```bash
sudo systemctl stop dump1090-fa piaware
sudo systemctl disable dump1090-fa piaware
```

### 2. Install Dependencies
```bash
sudo apt update
sudo apt install -y \
    build-essential git pkg-config make \
    librtlsdr0 librtlsdr-dev \
    libusb-1.0-0-dev \
    libncurses5-dev \
    libzstd-dev libzstd1 \
    protobuf-c-compiler libprotobuf-c-dev \
    lighttpd
```

### 3. Build readsb
```bash
cd ~
git clone https://github.com/wiedehopf/readsb.git
cd readsb
make -j3 RTLSDR=yes OPTIMIZE="-mcpu=cortex-a7 -mfpu=neon-vfpv4"
```

**Note**: For Pi 2, use `cortex-a7` optimization, NOT `arm1176` (that's for Pi Zero/1)

### 4. Install readsb
```bash
sudo cp readsb /usr/local/bin/
sudo chmod +x /usr/local/bin/readsb
```

### 5. Create System Service
Create `/etc/systemd/system/readsb.service`:
```ini
[Unit]
Description=readsb ADS-B receiver
After=network.target

[Service]
ExecStart=/usr/local/bin/readsb \
    --device 0 --device-type rtlsdr --gain 60 --ppm 0 \
    --lat 40.88230 --lon -95.69146 --max-range 360 \
    --net --net-only --net-heartbeat 60 --net-ro-size 1250 --net-ro-interval 0.05 \
    --net-ri-port 30001 --net-ro-port 30002 --net-sbs-port 30003 \
    --net-bi-port 30004,30104 --net-bo-port 30005 \
    --write-json /run/readsb --write-json-every 1 \
    --forward-mlat --json-location-accuracy 1 --json-trace-interval 15
Type=simple
Restart=always
RestartSec=30
User=readsb
RuntimeDirectory=readsb
RuntimeDirectoryMode=0755
Nice=-5

[Install]
WantedBy=multi-user.target
```

### 6. Configure Permissions
```bash
# Create readsb user
sudo useradd --system --no-create-home readsb

# Add to plugdev for USB access
sudo usermod -a -G plugdev readsb

# Create udev rule for RTL-SDR
echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="2832", GROUP="plugdev", MODE="0666"' | \
    sudo tee /etc/udev/rules.d/99-rtlsdr.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### 7. Start readsb
```bash
sudo systemctl daemon-reload
sudo systemctl enable readsb
sudo systemctl start readsb
```

### 8. Install tar1090 Web Interface
```bash
cd ~
wget -O tar1090-install.sh https://github.com/wiedehopf/tar1090/raw/master/install.sh
chmod +x tar1090-install.sh
sudo bash tar1090-install.sh
```

Access at: `http://YOUR_PI_IP/tar1090`

### 9. Configure FlightAware Feeder
```bash
sudo piaware-config receiver-type other
sudo piaware-config receiver-host localhost
sudo piaware-config receiver-port 30005
sudo systemctl enable piaware
sudo systemctl start piaware
```

## Troubleshooting

### Missing Dependencies
During our build, we discovered these additional packages were needed:
- `libzstd-dev` - for compression support
- `libncurses5-dev` - for terminal UI support

### Build Optimization
The Pi 2 uses Cortex-A7 CPU, not ARM1176. Wrong optimization flags will cause build failures.

### Service Won't Start
Check logs with: `sudo journalctl -u readsb -n 50`

Common issues:
- RTL-SDR permissions (check udev rules)
- Runtime directory permissions
- Wrong binary path

## Performance Notes
On Pi 2 (1GB RAM, 4 cores @ 900MHz):
- Build takes ~10-15 minutes ("I think I can!")
- Uses ~150MB RAM when running
- Handles 10+ simultaneous aircraft easily
- CPU usage stays under 30%

## Status Check Script
Save as `~/adsb-status.sh`:
```bash
#!/bin/bash
echo "=== ADS-B Station Status ==="
echo "Location: Tabor, Iowa (40.88230, -95.69146) @ 1,205ft"
echo
echo "=== Services ==="
systemctl is-active readsb tar1090 piaware | xargs -I {} echo "{}"
echo
echo "=== Aircraft Tracking ==="
curl -s localhost/tar1090/data/aircraft.json 2>/dev/null | jq -r '.aircraft | length' | xargs -I {} echo "Aircraft tracked: {}"
echo
echo "=== Web Interface ==="
echo "http://$(hostname -I | cut -d' ' -f1)/tar1090"
```

## Next Steps
- [ ] Install ADSBexchange feeder
- [ ] Set up MQTT bridge for real-time alerts
- [ ] Add external antenna on 30ft tower
- [ ] Configure GPS for automatic position/time

## Resources
- [readsb GitHub](https://github.com/wiedehopf/readsb)
- [tar1090 GitHub](https://github.com/wiedehopf/tar1090)
- [RTL-SDR Blog](https://www.rtl-sdr.com/)