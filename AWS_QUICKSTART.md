# 🚀 AWS Free Tier Deployment - Quick Start

## ✅ What You Get

- **$0 Monthly Cost** (within AWS Free Tier)
- **Production-Ready** deployment on AWS
- **Secure** secrets management with Credstash
- **Scalable** file storage with S3
- **Single EC2 instance** (t2.micro) running everything

---

## 📋 Prerequisites

1. ✅ AWS Account created
2. Install AWS CLI:
   ```bash
   brew install awscli
   ```
3. Configure AWS credentials:
   ```bash
   aws configure
   # Enter your Access Key ID and Secret Access Key
   # Region: ap-south-1 (Mumbai) or us-east-1 (Virginia)
   ```

To get AWS Access Keys:
- Go to AWS Console → IAM → Users → Your user → Security credentials
- Click "Create access key"
- Save the keys securely

---

## 🎯 Deployment Methods

Choose one:

### Method 1: Automated Script (Recommended)

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# Run the automated deployment script
./deploy-aws.sh

# Follow the prompts:
# - Enter Razorpay TEST credentials (default: pv/pw)
# - Enter Razorpay PROD credentials
# - Script will create all AWS resources automatically

# Wait 2-3 minutes for EC2 to initialize, then:
# Manually deploy the app (see "Deploy Application" section below)
```

### Method 2: Manual Step-by-Step

Follow the detailed guide: [AWS_FREE_TIER_DEPLOYMENT.md](./AWS_FREE_TIER_DEPLOYMENT.md)

---

## 📦 Deploy Application to EC2

After AWS resources are created:

###  1: Build Application

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# Build Frontend
cd frontend
npm install
npm run build
cd ..

# Build Backend (for Linux)
cd go-backend
GOOS=linux GOARCH=amd64 go build -o gc-distribution-portal main.go
cd ..
```

### Step 2: Upload to EC2

```bash
# Get your EC2 public IP from instance-details.txt
PUBLIC_IP=$(cat instance-details.txt | grep "Public IP:" | cut -d' ' -f3)

# Copy files
scp -i gc-distribution-key.pem go-backend/gc-distribution-portal ubuntu@$PUBLIC_IP:/home/ubuntu/
scp -i gc-distribution-key.pem -r go-backend/config ubuntu@$PUBLIC_IP:/home/ubuntu/
scp -i gc-distribution-key.pem -r frontend/dist ubuntu@$PUBLIC_IP:/home/ubuntu/frontend-dist
```

### Step 3: Set Up on EC2

```bash
# SSH to EC2
ssh -i gc-distribution-key.pem ubuntu@$PUBLIC_IP

# Once connected, run these commands:
```

**On EC2:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3-pip nginx

# Install credstash
pip3 install credstash
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
source ~/.bashrc

# Install AWS CLI
sudo apt install -y awscli

# Configure AWS region
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[default]
region = ap-south-1
output = json
EOF

# Test credstash
credstash list --region ap-south-1

# Create app directory
sudo mkdir -p /opt/gc-distribution-portal
sudo chown ubuntu:ubuntu /opt/gc-distribution-portal

# Move files
mv ~/gc-distribution-portal /opt/gc-distribution-portal/
mv ~/config /opt/gc-distribution-portal/
mv ~/frontend-dist /opt/gc-distribution-portal/frontend
mkdir -p /opt/gc-distribution-portal/storage

# Make binary executable
chmod +x /opt/gc-distribution-portal/gc-distribution-portal

# Create environment file
# Replace <your-bucket-name> with actual bucket name from bucket-name.txt
cat > /opt/gc-distribution-portal/.env << 'EOF'
PORT=5001
AWS_REGION=ap-south-1
S3_BUCKET=<your-bucket-name>
USE_CREDSTASH=true
USE_S3=true
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

    location /auth/ {
        proxy_pass http://localhost:5001/auth/;
        proxy_set_header Host $host;
        client_max_body_size 50M;
    }

    location /stock/ {
        proxy_pass http://localhost:5001/stock/;
        proxy_set_header Host $host;
        client_max_body_size 50M;
    }

    location /profile {
        proxy_pass http://localhost:5001/profile;
        proxy_set_header Host $host;
    }

    location /activity-log {
        proxy_pass http://localhost:5001/activity-log;
        proxy_set_header Host $host;
    }

    location /upload-history {
        proxy_pass http://localhost:5001/upload-history;
        proxy_set_header Host $host;
    }

    location /password-request/ {
        proxy_pass http://localhost:5001/password-request/;
        proxy_set_header Host $host;
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

---

## ✅ Verify Deployment

1. **Open browser**: http://YOUR-EC2-IP
2. **Login** with your credentials
3. **Test upload** with a small CSV file
4. **Check logs** on EC2:
   ```bash
   sudo journalctl -u gc-distribution.service -f
   ```

---

## 🔧 Common Commands

### View Logs
```bash
# Application logs
sudo journalctl -u gc-distribution.service -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart backend
sudo systemctl restart gc-distribution.service

# Restart Nginx
sudo systemctl restart nginx
```

### Test Credstash
```bash
# List secrets
credstash list --region ap-south-1

# Get a secret
credstash get razorpay.test.username --region ap-south-1
```

### Check Service Status
```bash
# Backend
sudo systemctl status gc-distribution.service

# Nginx
sudo systemctl status nginx

# Check ports
sudo netstat -tlnp | grep :5001
sudo netstat -tlnp | grep :80
```

---

## 💰 Cost Management

### Free Tier Limits
- **EC2**: 750 hours/month (t2.micro) - Keep 1 instance running 24/7 ✅
- **S3**: 5GB storage - Clean old uploads regularly
- **DynamoDB**: 25GB storage - Credstash uses minimal space ✅
- **KMS**: 20,000 requests/month - Credstash uses minimal requests ✅

### Set Up Billing Alert
1. Go to AWS Console → Billing Dashboard
2. Click "Billing Preferences"
3. Enable "Receive Free Tier Usage Alerts"
4. Set alert threshold: $1

### Monitor Usage
```bash
# Check EC2 status
aws ec2 describe-instances --filters "Name=instance-type,Values=t2.micro"

# Check S3 storage
aws s3 ls s3://your-bucket-name --recursive --human-readable --summarize
```

---

## 🔒 Security

### Firewall (UFW)
```bash
# On EC2:
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### SSL (HTTPS)
If you have a domain name:
```bash
# On EC2:
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🆘 Troubleshooting

### Can't connect to EC2?
```bash
# Update security group to allow your IP
YOUR_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id <your-sg-id> \
  --protocol tcp \
  --port 22 \
  --cidr $YOUR_IP/32
```

### Backend not starting?
```bash
# On EC2, check logs:
sudo journalctl -u gc-distribution.service -n 100

# Check credstash access:
credstash get razorpay.test.username --region ap-south-1

# Restart service:
sudo systemctl restart gc-distribution.service
```

### Frontend shows 502 error?
```bash
# Check backend is running:
sudo systemctl status gc-distribution.service

# Check nginx:
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## 📚 Documentation

- **Detailed Deployment**: [AWS_FREE_TIER_DEPLOYMENT.md](./AWS_FREE_TIER_DEPLOYMENT.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security Setup**: [SECURITY_SETUP.md](./SECURITY_SETUP.md)
- **Local Development**: [QUICKSTART-GO.md](./QUICKSTART-GO.md)

---

## 🎉 Success!

Your GC Distribution Portal is now running on AWS with:
- ✅ $0 monthly cost
- ✅ Secure Credstash secrets
- ✅ S3 storage
- ✅ Production-ready

**Access your portal**: `http://<your-ec2-ip>`

---

**Questions?** Check the detailed guides or EC2 logs for troubleshooting.

**Last Updated**: November 23, 2025

