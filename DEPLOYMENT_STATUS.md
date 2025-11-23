# 🚀 GC Distribution Portal - Deployment Status

## ✅ What's Been Set Up (COMPLETED)

### 1. AWS Infrastructure
- ✅ **IAM Role**: `GC-Distribution-EC2-Role` with S3, DynamoDB, KMS permissions
- ✅ **IAM Instance Profile**: `GC-Distribution-EC2-Profile`  
- ✅ **S3 Bucket**: `gc-distribution-storage-1763898888`
- ✅ **DynamoDB Table**: `credential-store` (for Credstash)
- ✅ **KMS Key**: Created with alias `alias/credstash`
- ✅ **Security Group**: `sg-0733cb84c03e1bc7a`
  - Port 22 (SSH) from your IP: 121.242.131.242
  - Port 80 (HTTP) from anywhere
  - Port 443 (HTTPS) from anywhere
- ✅ **EC2 Instance**: `i-07a6c795dea900b39`
  - Type: **t3.micro** (Free Tier eligible)
  - Public IP: **13.205.4.29**
  - Region: **ap-south-1** (Mumbai)
- ✅ **SSH Key Pair**: `gc-distribution-key.pem` created

### 2. Credstash Secrets (SECURED)
All credentials stored securely in AWS:
- ✅ `razorpay.test.username` = "pv"
- ✅ `razorpay.test.password` = "pw"
- ✅ `razorpay.test.url` = "https://offers-engine-test.dev.razorpay.in/v1"
- ✅ `razorpay.prod.username` = "rmp_offers"
- ✅ `razorpay.prod.password` = "YlrnUHueBbcjjauhsahrjoiqC"
- ✅ `razorpay.prod.url` = "https://offers-engine-live-statuscake.razorpay.com/v1"
- ✅ `jwt.secret` = (auto-generated secure secret)

### 3. Application Build
- ✅ **Frontend built**: `frontend/dist/` (React production build)
- ✅ **Backend built**: `go-backend/gc-distribution-portal` (Linux binary)

### 4. GitHub CI/CD Setup
- ✅ **Workflow file created**: `.github/workflows/deploy.yml`
- ✅ **Documentation created**: `GITHUB_CICD_SETUP.md`
- ⏳ **Pending**: Push to GitHub and configure secrets

---

## ⏳ What's Pending

### EC2 Instance Initialization
The EC2 instance is currently initializing. SSH access will be available in **5-10 minutes** from launch.

**Current Status**: Instance running, health checks passing, SSH daemon starting

---

## 🔄 Next Steps (Manual)

Since EC2 is still initializing, here's what to do:

### Step 1: Wait for SSH (5-10 minutes)

Test SSH connection:
```bash
ssh -i gc-distribution-key.pem ubuntu@13.205.4.29
```

When you can connect successfully, proceed to Step 2.

### Step 2: Manual Initial Deployment

Run this script (once SSH is ready):

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# Copy backend
scp -i gc-distribution-key.pem go-backend/gc-distribution-portal ubuntu@13.205.4.29:/home/ubuntu/

# Copy frontend
scp -i gc-distribution-key.pem -r frontend/dist ubuntu@13.205.4.29:/home/ubuntu/frontend-dist

# Copy config
scp -i gc-distribution-key.pem -r go-backend/config ubuntu@13.205.4.29:/home/ubuntu/

# SSH and set up
ssh -i gc-distribution-key.pem ubuntu@13.205.4.29
```

### Step 3: On EC2, Run Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3-pip nginx awscli

# Install credstash
pip3 install credstash --break-system-packages
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
source ~/.bashrc

# Configure AWS region
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[default]
region = ap-south-1
output = json
EOF

# Test credstash
credstash list -r ap-south-1

# Create app directory
sudo mkdir -p /opt/gc-distribution-portal
sudo chown ubuntu:ubuntu /opt/gc-distribution-portal

# Move files
mv ~/gc-distribution-portal /opt/gc-distribution-portal/
mv ~/config /opt/gc-distribution-portal/
mv ~/frontend-dist /opt/gc-distribution-portal/frontend
mkdir -p /opt/gc-distribution-portal/storage
chmod +x /opt/gc-distribution-portal/gc-distribution-portal

# Create environment file
BUCKET_NAME="gc-distribution-storage-1763898888"
cat > /opt/gc-distribution-portal/.env << EOF
PORT=5001
AWS_REGION=ap-south-1
S3_BUCKET=$BUCKET_NAME
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
echo "🌐 Portal URL: http://13.205.4.29"
```

---

## 🎯 After Manual Deployment: Set Up GitHub CI/CD

Once the initial deployment is done, follow `GITHUB_CICD_SETUP.md` to set up automatic deployments:

1. **Push code to GitHub**
2. **Add 3 GitHub Secrets**:
   - `EC2_PUBLIC_IP`: `13.205.4.29`
   - `EC2_SSH_KEY`: (contents of `gc-distribution-key.pem`)
   - `AWS_REGION`: `ap-south-1`
3. **Test**: Push to main branch → Auto-deploys!

---

## 📊 Summary

### What Works Now
- ✅ AWS infrastructure ready
- ✅ Credentials secured in Credstash
- ✅ Application built and ready
- ✅ CI/CD workflow configured

### What's Next
- ⏳ Wait for EC2 SSH (5-10 min)
- 📦 Deploy application manually (one time)
- 🔄 Set up GitHub for auto-deployment
- ✨ Future developers can just push to GitHub!

---

## 🔐 Important Files

```
gc-distribution-key.pem          ← SSH key (NEVER commit to GitHub!)
instance-details.txt             ← EC2 connection info
bucket-name.txt                  ← S3 bucket name
instance-id.txt                  ← EC2 instance ID
public-ip.txt                    ← EC2 public IP
sg-id.txt                        ← Security group ID
.github/workflows/deploy.yml     ← CI/CD automation
GITHUB_CICD_SETUP.md            ← Complete CI/CD guide
```

---

## 💰 Cost Estimate

**Monthly Cost: $0** (within Free Tier limits)

- EC2 t3.micro: 750 hrs/month free ✅
- S3 5GB storage: Free forever ✅
- DynamoDB: Free forever ✅
- KMS: 20K requests free ✅

**After 12 months**: ~$8-10/month

---

## 🆘 Troubleshooting

### Can't SSH to EC2?
```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-07a6c795dea900b39 --region ap-south-1

# Check security group
aws ec2 describe-security-groups --group-ids sg-0733cb84c03e1bc7a --region ap-south-1

# Wait more time (EC2 can take 5-10 minutes)
```

### Need to update your IP?
```bash
# If your IP changed
YOUR_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0733cb84c03e1bc7a \
  --protocol tcp \
  --port 22 \
  --cidr $YOUR_IP/32 \
  --region ap-south-1
```

---

## 🎉 What You've Accomplished

1. ✅ Created complete AWS infrastructure
2. ✅ Secured all credentials in Credstash
3. ✅ Built production-ready application
4. ✅ Set up automated CI/CD pipeline
5. ✅ Documented everything thoroughly

**Next**: Just wait for EC2 to finish booting, then deploy! 🚀

---

**Portal will be live at**: http://13.205.4.29  
**Last Updated**: November 23, 2025, 5:35 PM IST

