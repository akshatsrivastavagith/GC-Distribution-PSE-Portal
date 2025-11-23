#!/bin/bash

# GC Distribution Portal - EC2 Deployment Script
# Run this script once SSH is working

set -e

PUBLIC_IP="13.127.174.160"
KEY_FILE="gc-distribution-key.pem"
BUCKET_NAME="gc-distribution-storage-1763901293"

echo "🚀 Deploying GC Distribution Portal to EC2"
echo "=========================================="

# Test SSH connection
echo ""
echo "Testing SSH connection..."
if ssh -i $KEY_FILE -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$PUBLIC_IP "echo 'SSH OK'" 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ Cannot connect to EC2 yet. Wait a few more minutes and try again."
    echo "   Test with: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP"
    exit 1
fi

# Copy files
echo ""
echo "📦 Copying files to EC2..."
scp -i $KEY_FILE -o StrictHostKeyChecking=no go-backend/gc-distribution-portal ubuntu@$PUBLIC_IP:/home/ubuntu/
scp -i $KEY_FILE -o StrictHostKeyChecking=no -r go-backend/config ubuntu@$PUBLIC_IP:/home/ubuntu/
scp -i $KEY_FILE -o StrictHostKeyChecking=no -r frontend/dist ubuntu@$PUBLIC_IP:/home/ubuntu/frontend-dist

echo "✅ Files copied"

# Deploy on EC2
echo ""
echo "⚙️  Setting up on EC2..."
ssh -i $KEY_FILE -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'ENDSSH'

# Update system
echo "Updating system..."
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

# Install packages
echo "Installing required packages..."
sudo apt install -y python3-pip nginx awscli

# Install credstash
echo "Installing credstash..."
pip3 install credstash --break-system-packages
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
export PATH=$PATH:~/.local/bin

# Configure AWS
echo "Configuring AWS..."
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[default]
region = ap-south-1
output = json
EOF

# Test credstash
echo "Testing credstash..."
credstash list -r ap-south-1

# Create app directory
echo "Setting up application directory..."
sudo mkdir -p /opt/gc-distribution-portal
sudo chown ubuntu:ubuntu /opt/gc-distribution-portal

# Move files
mv ~/gc-distribution-portal /opt/gc-distribution-portal/
mv ~/config /opt/gc-distribution-portal/
mv ~/frontend-dist /opt/gc-distribution-portal/frontend
mkdir -p /opt/gc-distribution-portal/storage
chmod +x /opt/gc-distribution-portal/gc-distribution-portal

# Create environment file
cat > /opt/gc-distribution-portal/.env << 'EOF'
PORT=5001
AWS_REGION=ap-south-1
S3_BUCKET=gc-distribution-storage-1763898888
USE_CREDSTASH=true
USE_S3=false
EOF

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/gc-distribution.service << 'EOF'
[Unit]
Description=GC Distribution Portal Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/gc-distribution-portal
EnvironmentFile=/opt/gc-distribution-portal/.env
ExecStart=/opt/gc-distribution-portal/gc-distribution-portal
Restart=always
RestartSec=10
Environment="PATH=/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gc-distribution

[Install]
WantedBy=multi-user.target
EOF

# Start service
echo "Starting backend service..."
sudo systemctl daemon-reload
sudo systemctl enable gc-distribution.service
sudo systemctl start gc-distribution.service
sleep 3
sudo systemctl status gc-distribution.service --no-pager

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/gc-distribution << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /opt/gc-distribution-portal/frontend;
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://localhost:5001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location ~ ^/(auth|stock|profile|activity-log|upload-history|password-request)/ {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/gc-distribution /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Deployment complete!"

ENDSSH

echo ""
echo "=========================================="
echo "✅ GC Distribution Portal is LIVE!"
echo "=========================================="
echo ""
echo "🌐 Portal URL: http://$PUBLIC_IP"
echo ""
echo "To check status:"
echo "  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP"
echo "  sudo systemctl status gc-distribution.service"
echo "  sudo journalctl -u gc-distribution.service -f"
echo ""
echo "Next: Set up GitHub CI/CD (see GITHUB_CICD_SETUP.md)"
echo ""

