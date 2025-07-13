#!/bin/bash
# Readsb installation script for ADS-B Pi
# Run this on the Pi as: bash install-readsb.sh

echo "=== Readsb Installation Script ==="
echo "This will replace dump1090-fa with readsb"
echo

# Stop and disable FlightAware services
echo "=== Stopping FlightAware services ==="
sudo systemctl stop dump1090-fa piaware
sudo systemctl disable dump1090-fa piaware

# Install dependencies
echo -e "\n=== Installing dependencies ==="
sudo apt update
sudo apt install -y git build-essential debhelper libusb-1.0-0-dev \
    pkg-config dh-systemd libncurses-dev librtlsdr-dev librtlsdr0 \
    lighttpd protobuf-c-compiler libprotobuf-c-dev

# Clone readsb
echo -e "\n=== Cloning readsb ==="
cd /home/cy
if [ -d "readsb" ]; then
    echo "Removing existing readsb directory"
    rm -rf readsb
fi
git clone https://github.com/wiedehopf/readsb.git

# Build readsb
echo -e "\n=== Building readsb ==="
cd readsb
make -j3 RTLSDR=yes OPTIMIZE="-mcpu=arm1176jzf-s -mfpu=vfp"

# Install readsb
echo -e "\n=== Installing readsb ==="
sudo make install

# Create readsb config
echo -e "\n=== Creating readsb configuration ==="
sudo tee /etc/default/readsb > /dev/null << 'EOF'
# Readsb configuration
RECEIVER_OPTIONS="--device 0 --device-type rtlsdr --gain 60 --ppm 0"
DECODER_OPTIONS="--lat 40.88230 --lon -95.69146 --max-range 360"
NET_OPTIONS="--net --net-only --net-heartbeat 60 --net-ro-size 1250 --net-ro-interval 0.05 --net-ri-port 30001 --net-ro-port 30002 --net-sbs-port 30003 --net-bi-port 30004,30104 --net-bo-port 30005"
JSON_OPTIONS="--write-json /run/readsb --write-json-every 1"
OTHER_OPTIONS="--forward-mlat --json-location-accuracy 1 --json-trace-interval 15"
EOF

# Create systemd service
echo -e "\n=== Creating systemd service ==="
sudo tee /etc/systemd/system/readsb.service > /dev/null << 'EOF'
[Unit]
Description=readsb ADS-B receiver
After=network.target

[Service]
ExecStart=/usr/local/bin/readsb \
    $RECEIVER_OPTIONS \
    $DECODER_OPTIONS \
    $NET_OPTIONS \
    $JSON_OPTIONS \
    $OTHER_OPTIONS
Type=simple
Restart=always
RestartSec=30
User=readsb
RuntimeDirectory=readsb
RuntimeDirectoryMode=0755
Nice=-5

[Install]
WantedBy=multi-user.target
EOF

# Create readsb user
echo -e "\n=== Creating readsb user ==="
sudo useradd --system --no-create-home readsb || true

# Set up lighttpd for web interface
echo -e "\n=== Configuring web interface ==="
sudo cp -r /home/cy/readsb/webapp/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Enable and start readsb
echo -e "\n=== Starting readsb ==="
sudo systemctl daemon-reload
sudo systemctl enable readsb
sudo systemctl start readsb

# Check status
echo -e "\n=== Checking readsb status ==="
sudo systemctl status readsb | head -15

echo -e "\n=== Installation complete! ==="
echo "Web interface: http://$(hostname -I | cut -d' ' -f1):8080"
echo "JSON data: /run/readsb/aircraft.json"
echo "Ports:"
echo "  30001: Beast input"
echo "  30002: Beast output" 
echo "  30003: SBS output"
echo "  30004: Beast input (MLAT)"
echo "  30005: Beast output"

# Optional: Install tar1090 for better web interface
echo -e "\n=== Would you like to install tar1090 web interface? (y/n) ==="
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    bash -c "$(wget -nv -O - https://github.com/wiedehopf/tar1090/raw/master/install.sh)"
fi