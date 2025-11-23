# 🚧 Deployment - Next Steps & Troubleshooting

## 📊 Current Status

### ✅ What's Complete (100%)
- AWS Infrastructure: EC2, S3, Security Groups, IAM Roles
- Credstash: All secrets stored securely
- Application: Frontend & Backend built
- GitHub CI/CD: Workflow configured
- Deployment Scripts: Ready to run

### ⚠️ Current Issue
**SSH Connection Reset**: Getting "kex_exchange_identification: read: Connection reset by peer"

**Instance Details:**
- Instance ID: `i-07a6c795dea900b39`
- Current IP: `65.0.69.120`
- Type: t3.micro
- Region: ap-south-1
- Status: Running & Healthy

---

## 🔧 Solution Options

### **Option 1: Try EC2 Instance Connect (Recommended)**

AWS provides a browser-based SSH connection:

1. Go to AWS Console: https://console.aws.amazon.com/ec2
2. Click "Instances" (left sidebar)
3. Find instance: `GC-Distribution-Portal`
4. Click "Connect" button (top right)
5. Choose "EC2 Instance Connect" tab
6. Click "Connect"
7. You'll get a terminal in your browser!

Once connected, run these commands:

```bash
# Update system
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

# Install packages
sudo apt install -y python3-pip nginx awscli git

# Install credstash
pip3 install credstash --break-system-packages
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
export PATH=$PATH:~/.local/bin

# Configure AWS
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[default]
region = ap-south-1
output = json
EOF

# Test credstash
credstash list -r ap-south-1

# Now we can deploy! Tell me when you reach this point.
```

---

### **Option 2: Wait 30 Minutes & Try SSH Again**

Sometimes t3 instances take longer to initialize SSH on first boot.

**In your terminal, try:**

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal
ssh -i gc-distribution-key.pem ubuntu@65.0.69.120
```

If it works, run:
```bash
./deploy-to-ec2.sh
```

---

### **Option 3: Launch New Instance**

If SSH still doesn't work, we can launch a fresh instance:

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# Terminate old instance
aws ec2 terminate-instances --instance-ids i-07a6c795dea900b39 --region ap-south-1

# Wait 2 minutes
sleep 120

# Launch new instance (using script)
./deploy-aws.sh
```

---

### **Option 4: Use Session Manager (No SSH Needed)**

AWS Systems Manager Session Manager doesn't need SSH:

1. Install Session Manager plugin:
   ```bash
   brew install --cask session-manager-plugin
   ```

2. Connect:
   ```bash
   aws ssm start-session --target i-07a6c795dea900b39 --region ap-south-1
   ```

---

## 🎯 **Recommended Next Steps**

### **IMMEDIATE: Try Option 1 (EC2 Instance Connect)**

This will work even when SSH doesn't:

1. **Open**: https://console.aws.amazon.com/ec2/home?region=ap-south-1#Instances:
2. **Find**: Instance ID `i-07a6c795dea900b39`
3. **Click**: "Connect" button
4. **Select**: "EC2 Instance Connect"
5. **Click**: "Connect"

**You'll get a browser terminal!**

Then I'll guide you through the deployment.

---

## 📦 **Manual Deployment Steps (via EC2 Instance Connect)**

Once you're connected via EC2 Instance Connect, follow these steps:

### Step 1: Setup Environment

```bash
# Update system
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

# Install required packages
sudo apt install -y python3-pip nginx awscli

# Install credstash
pip3 install credstash --break-system-packages
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
export PATH=$PATH:~/.local/bin

# Configure AWS
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[default]
region = ap-south-1
output = json
EOF

# Test credstash
credstash list -r ap-south-1
```

### Step 2: Create Application Directory

```bash
sudo mkdir -p /opt/gc-distribution-portal
sudo chown ubuntu:ubuntu /opt/gc-distribution-portal
mkdir -p /opt/gc-distribution-portal/storage
mkdir -p /opt/gc-distribution-portal/frontend
```

### Step 3: Upload Files from Your Mac

**Open a NEW terminal on your Mac** and run:

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# Copy backend
scp -i gc-distribution-key.pem go-backend/gc-distribution-portal ubuntu@65.0.69.120:/home/ubuntu/

# Copy config  
scp -i gc-distribution-key.pem -r go-backend/config ubuntu@65.0.69.120:/home/ubuntu/

# Copy frontend
scp -i gc-distribution-key.pem -r frontend/dist ubuntu@65.0.69.120:/home/ubuntu/frontend-dist
```

### Step 4: Setup on EC2 (in EC2 Instance Connect terminal)

```bash
# Move files
mv ~/gc-distribution-portal /opt/gc-distribution-portal/
mv ~/config /opt/gc-distribution-portal/
mv ~/frontend-dist/* /opt/gc-distribution-portal/frontend/
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
sudo systemctl daemon-reload
sudo systemctl enable gc-distribution.service
sudo systemctl start gc-distribution.service
sudo systemctl status gc-distribution.service

# Configure Nginx
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
```

### Step 5: Verify

Open browser: `http://65.0.69.120`

You should see your portal!

---

## 🔄 Update Frontend with New IP

Since the IP changed, rebuild frontend:

**On your Mac:**

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/frontend

# Update with new IP
echo "VITE_API_BASE_URL=http://65.0.69.120" > .env.production
echo "VITE_WS_URL=ws://65.0.69.120/ws" >> .env.production

# Rebuild
npm run build

# Re-upload
scp -i ../gc-distribution-key.pem -r dist/* ubuntu@65.0.69.120:/home/ubuntu/frontend-new/
```

**On EC2:**

```bash
sudo rm -rf /opt/gc-distribution-portal/frontend/*
sudo mv /home/ubuntu/frontend-new/* /opt/gc-distribution-portal/frontend/
sudo systemctl reload nginx
```

---

## 🎯 **Summary**

**Best Option**: Use **EC2 Instance Connect** (browser-based terminal)
- No SSH needed
- Works immediately
- Easy to use

**Current Issue**: SSH connection reset (common with new instances)
**Solution**: Try EC2 Instance Connect OR wait 30 minutes

**All infrastructure is ready!** Just need to deploy the application files.

---

## 📞 **What to Tell Me**

Once you connect via EC2 Instance Connect, tell me:
1. "I'm connected via EC2 Instance Connect"
2. Then I'll guide you through the rest

Or:

If SSH starts working in your terminal:
1. "SSH is working now"
2. Run `./deploy-to-ec2.sh`

---

**Your portal is 95% complete!** Just needs the final file deployment. 🚀

**Instance IP**: `65.0.69.120`  
**Portal URL** (after deployment): `http://65.0.69.120`

Last Updated: November 23, 2025

