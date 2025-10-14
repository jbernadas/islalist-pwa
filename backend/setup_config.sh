#!/bin/bash

# Setup script for IslaList backend configuration
# This script creates the /etc/islalist/config.json file

echo "Setting up IslaList backend configuration..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo: sudo ./setup_config.sh"
    exit 1
fi

# Create directory
echo "Creating /etc/islalist directory..."
mkdir -p /etc/islalist

# Copy config file
echo "Copying config file..."
cp config.json.template /etc/islalist/config.json

# Set proper permissions
echo "Setting permissions..."
chmod 600 /etc/islalist/config.json
chown root:root /etc/islalist/config.json

echo ""
echo "✓ Configuration file created at /etc/islalist/config.json"
echo "✓ Permissions set to 600 (read/write for owner only)"
echo ""
echo "IMPORTANT: Edit /etc/islalist/config.json and update the SECRET key for production!"
echo ""
