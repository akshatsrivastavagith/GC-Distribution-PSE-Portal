# 🚀 AWS Free Tier Deployment Guide - $0 Cost

## 📋 Overview

Deploy the GC Distribution Portal on AWS Free Tier with **zero ongoing costs** using Credstash for secrets management.

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│  User Browser                                            │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│  EC2 t2.micro (Single Instance)                          │
│  ├─ Frontend (React build) - Port 80/443                │
│  ├─ Backend (Go binary) - Port 5001                     │
│  └─ Nginx (Reverse proxy)                               │
└─────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
┌──────────────────┐          ┌──────────────────┐
│  S3 Bucket       │          │  Credstash       │
│  (CSV storage)   │          │  ├─ DynamoDB     │
│  Free: 5GB       │          │  └─ KMS          │
└──────────────────┘          └──────────────────┘
                        ↓
                ┌──────────────────┐
                │  Razorpay API    │
                └──────────────────┘
```

---

## ⚡ **Prerequisites**

1. AWS Account created ✅
2. AWS CLI installed on your Mac
3. SSH key pair for EC2 access

---

## 📦 **Part 1: Install AWS CLI & Configure**

### Step 1: Install AWS CLI on your Mac

```bash
# Install AWS CLI
brew install awscli

# Verify installation
aws --version
```

### Step 2: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# You'll be prompted:
# AWS Access Key ID: (get from AWS Console → IAM → Users → Security credentials)
# AWS Secret Access Key: (from same place)
# Default region: ap-south-1 (Mumbai) or us-east-1 (Virginia)
# Default output format: json
```

**To get Access Keys:**
1. Go to AWS Console → IAM
2. Click "Users" → Your username → "Security credentials"
3. Click "Create access key"
4. Save the keys securely

---

## 🔧 **Part 2: Set Up AWS Resources**

### Step 1: Create IAM Role for EC2

This role allows EC2 to access S3, DynamoDB, and KMS without hardcoding credentials.

```bash
# Create trust policy file
cat > ec2-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name GC-Distribution-EC2-Role \
  --assume-role-policy-document file://ec2-trust-policy.json

# Create policy for S3, DynamoDB, KMS access
cat > ec2-permissions-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::gc-distribution-storage-*",
        "arn:aws:s3:::gc-distribution-storage-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/credential-store"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Attach policy to role
aws iam put-role-policy \
  --role-name GC-Distribution-EC2-Role \
  --policy-name GC-Distribution-Permissions \
  --policy-document file://ec2-permissions-policy.json

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name GC-Distribution-EC2-Profile

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name GC-Distribution-EC2-Profile \
  --role-name GC-Distribution-EC2-Role
```

### Step 2: Create S3 Bucket for Storage

```bash
# Create S3 bucket (use unique name)
BUCKET_NAME="gc-distribution-storage-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region ap-south-1

# Save bucket name
echo $BUCKET_NAME > bucket-name.txt
echo "✅ S3 Bucket created: $BUCKET_NAME"

# Enable versioning (optional, for safety)
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Block public access (security)
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Step 3: Set Up Credstash (DynamoDB + KMS)

```bash
# Install credstash on your Mac
pip3 install credstash

# Create KMS key for encryption
KMS_KEY=$(aws kms create-key \
  --description "Credstash encryption key for GC Distribution Portal" \
  --query 'KeyMetadata.KeyId' \
  --output text)

# Create alias for the key
aws kms create-alias \
  --alias-name alias/credstash \
  --target-key-id $KMS_KEY

echo "✅ KMS Key created: $KMS_KEY"

# Create DynamoDB table for credstash
aws dynamodb create-table \
  --table-name credential-store \
  --attribute-definitions \
    AttributeName=name,AttributeType=S \
    AttributeName=version,AttributeType=S \
  --key-schema \
    AttributeName=name,KeyType=HASH \
    AttributeName=version,KeyType=RANGE \
  --provisioned-throughput \
    ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --region ap-south-1

echo "✅ Credstash DynamoDB table created"
```

### Step 4: Store Secrets in Credstash

```bash
# Store Razorpay TEST credentials
credstash put razorpay.test.username "pv" --region ap-south-1
credstash put razorpay.test.password "pw" --region ap-south-1
credstash put razorpay.test.url "https://offers-engine-test.dev.razorpay.in/v1" --region ap-south-1

# Store Razorpay PROD credentials
credstash put razorpay.prod.username "rmp_offers" --region ap-south-1
credstash put razorpay.prod.password "YlrnUHueBbcjjauhsahrjoiqC" --region ap-south-1
credstash put razorpay.prod.url "https://offers-engine-live-statuscake.razorpay.com/v1" --region ap-south-1

# Store JWT secret
credstash put jwt.secret "your-super-secure-jwt-secret-change-this-$(openssl rand -hex 16)" --region ap-south-1

# Verify secrets are stored
echo "✅ Verifying stored secrets:"
credstash list --region ap-south-1

# Test retrieval
echo "Testing retrieval:"
credstash get razorpay.test.username --region ap-south-1
```

### Step 5: Create EC2 Key Pair

```bash
# Create SSH key pair
aws ec2 create-key-pair \
  --key-name gc-distribution-key \
  --query 'KeyMaterial' \
  --output text > gc-distribution-key.pem

# Set correct permissions
chmod 400 gc-distribution-key.pem

echo "✅ SSH key created: gc-distribution-key.pem"
```

### Step 6: Create Security Group

```bash
# Get your VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name gc-distribution-sg \
  --description "Security group for GC Distribution Portal" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

echo "✅ Security Group created: $SG_ID"

# Allow SSH (port 22) from your IP
YOUR_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $YOUR_IP/32

# Allow HTTP (port 80) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS (port 443) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

echo "✅ Security group configured"
```

---

## 🖥️ **Part 3: Launch EC2 Instance**

### Step 1: Launch t2.micro Instance

```bash
# Get latest Ubuntu AMI ID
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

echo "Using AMI: $AMI_ID"

# Launch EC2 instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t2.micro \
  --key-name gc-distribution-key \
  --security-group-ids $SG_ID \
  --iam-instance-profile Name=GC-Distribution-EC2-Profile \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp2}' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=GC-Distribution-Portal}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✅ EC2 Instance launched: $INSTANCE_ID"
echo "Waiting for instance to be running..."

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "✅ Instance is running!"
echo "Public IP: $PUBLIC_IP"
echo "Save this IP address!"

# Save details
cat > instance-details.txt << EOF
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Security Group: $SG_ID
S3 Bucket: $BUCKET_NAME
KMS Key: $KMS_KEY

To connect:
ssh -i gc-distribution-key.pem ubuntu@$PUBLIC_IP
EOF

cat instance-details.txt
```

### Step 2: Allocate Elastic IP (Optional, Recommended)

```bash
# Allocate Elastic IP (free if attached to running instance)
EIP_ALLOC=$(aws ec2 allocate-address \
  --domain vpc \
  --query 'AllocationId' \
  --output text)

# Associate with instance
aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $EIP_ALLOC

# Get new public IP
PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids $EIP_ALLOC \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo "✅ Elastic IP allocated: $PUBLIC_IP"
echo "This IP won't change even if you stop/start the instance"
```

---

## 📦 **Part 4: Prepare Application for Deployment**

### Step 1: Build Frontend

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/frontend

# Update API URL in .env.production
cat > .env.production << EOF
VITE_API_BASE_URL=http://$PUBLIC_IP
VITE_WS_URL=ws://$PUBLIC_IP/ws
EOF

# Install dependencies and build
npm install
npm run build

echo "✅ Frontend built: frontend/dist/"
```

### Step 2: Modify Backend for Credstash

I'll create a new Go file to handle Credstash integration:

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/go-backend
```

Now we'll create AWS integration files.

### Step 3: Add AWS SDK Dependencies

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/go-backend

# Add AWS SDK dependencies
go get github.com/aws/aws-sdk-go-v2/config
go get github.com/aws/aws-sdk-go-v2/service/s3
go get github.com/aws/aws-sdk-go-v2/aws

# Tidy dependencies
go mod tidy
```

The files `internal/aws/credstash.go` and `internal/aws/s3.go` have been created for you.

### Step 4: Build Backend for Linux

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/go-backend

# Build for Linux (EC2 runs Linux)
GOOS=linux GOARCH=amd64 go build -o gc-distribution-portal main.go

echo "✅ Backend built: gc-distribution-portal (Linux binary)"
```

---

## 🚀 **Part 5: Deploy to EC2**

### Step 1: Copy Files to EC2

```bash
# Set variables
PUBLIC_IP="<your-ec2-public-ip>"  # From instance-details.txt
KEY_FILE="gc-distribution-key.pem"

# Create deployment package
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# Copy backend binary
scp -i $KEY_FILE go-backend/gc-distribution-portal ubuntu@$PUBLIC_IP:/home/ubuntu/

# Copy config directory (we'll use this for clients.json and users.json still)
scp -i $KEY_FILE -r go-backend/config ubuntu@$PUBLIC_IP:/home/ubuntu/

# Copy frontend build
scp -i $KEY_FILE -r frontend/dist ubuntu@$PUBLIC_IP:/home/ubuntu/frontend-dist

echo "✅ Files copied to EC2"
```

### Step 2: SSH into EC2 and Set Up Server

```bash
# Connect to EC2
ssh -i $KEY_FILE ubuntu@$PUBLIC_IP
```

**Now you're on the EC2 instance. Run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3-pip nginx

# Install credstash
pip3 install credstash

# Add credstash to PATH
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
source ~/.bashrc

# Verify credstash
credstash --version

# Install AWS CLI
sudo apt install -y awscli

# Configure AWS region (IAM role handles credentials automatically)
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[default]
region = ap-south-1
output = json
EOF

# Test credstash access
credstash list --region ap-south-1
credstash get razorpay.test.username --region ap-south-1

echo "✅ If you see secrets listed above, credstash is working!"
```

### Step 3: Set Up Application Directory

```bash
# Create app directory
sudo mkdir -p /opt/gc-distribution-portal
sudo chown ubuntu:ubuntu /opt/gc-distribution-portal

# Move files
mv ~/gc-distribution-portal /opt/gc-distribution-portal/
mv ~/config /opt/gc-distribution-portal/
mv ~/frontend-dist /opt/gc-distribution-portal/frontend

# Create storage directory
mkdir -p /opt/gc-distribution-portal/storage

# Make binary executable
chmod +x /opt/gc-distribution-portal/gc-distribution-portal

# Create environment file
cat > /opt/gc-distribution-portal/.env << 'EOF'
PORT=5001
AWS_REGION=ap-south-1
S3_BUCKET=<your-s3-bucket-name>
USE_CREDSTASH=true
USE_S3=true
EOF

# Replace S3_BUCKET with actual bucket name
# Get bucket name from your local machine's bucket-name.txt

echo "✅ Application directory set up"
```

### Step 4: Create Systemd Service

```bash
# Create service file
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

# Environment variables
Environment="PATH=/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin"

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gc-distribution

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable gc-distribution.service

# Start service
sudo systemctl start gc-distribution.service

# Check status
sudo systemctl status gc-distribution.service

# View logs
sudo journalctl -u gc-distribution.service -f

# If service is running, press Ctrl+C to exit logs
```

### Step 5: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/gc-distribution << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend (React build)
    location / {
        root /opt/gc-distribution-portal/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:5001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Direct backend access (for uploads)
    location /auth/ {
        proxy_pass http://localhost:5001/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /stock/ {
        proxy_pass http://localhost:5001/stock/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 50M;
    }

    location /profile {
        proxy_pass http://localhost:5001/profile;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /activity-log {
        proxy_pass http://localhost:5001/activity-log;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /upload-history {
        proxy_pass http://localhost:5001/upload-history;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /password-request/ {
        proxy_pass http://localhost:5001/password-request/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/gc-distribution /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx

echo "✅ Nginx configured and started"
```

### Step 6: Update Frontend API URLs

Since we're using Nginx reverse proxy, we need to rebuild the frontend with correct URLs:

**Exit EC2 (type `exit`) and run on your local Mac:**

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/frontend

# Update .env.production
cat > .env.production << EOF
VITE_API_BASE_URL=http://$PUBLIC_IP
VITE_WS_URL=ws://$PUBLIC_IP/ws
EOF

# Rebuild
npm run build

# Re-upload to EC2
scp -i ../gc-distribution-key.pem -r dist/* ubuntu@$PUBLIC_IP:/opt/gc-distribution-portal/frontend/

echo "✅ Frontend updated and re-uploaded"
```

---

## ✅ **Part 6: Verify Deployment**

### Step 1: Check Services are Running

**On EC2:**

```bash
# Check backend service
sudo systemctl status gc-distribution.service

# Check Nginx
sudo systemctl status nginx

# Check if port 5001 is listening
sudo netstat -tlnp | grep 5001

# View recent logs
sudo journalctl -u gc-distribution.service -n 50
```

### Step 2: Test from Your Browser

```
1. Open browser and go to: http://<your-ec2-ip>

2. You should see the login page

3. Login with your credentials from users.json

4. Try uploading a small CSV file

5. Verify WebSocket connection in browser console
```

### Step 3: Test Credstash Integration

**On EC2:**

```bash
# Test secret retrieval
credstash get razorpay.test.username --region ap-south-1
credstash get razorpay.prod.username --region ap-south-1

# List all secrets
credstash list --region ap-south-1
```

---

## 🔒 **Part 7: Security Hardening**

### Step 1: Set Up SSL (HTTPS) with Let's Encrypt

**On EC2:**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Note: You need a domain name for this
# If you have a domain (e.g., gc.yourdomain.com):

sudo certbot --nginx -d gc.yourdomain.com

# Follow the prompts
# Certbot will automatically update Nginx configuration
```

### Step 2: Set Up Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

### Step 3: Set Up Automatic Updates

```bash
# Install unattended upgrades
sudo apt install -y unattended-upgrades

# Enable automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📊 **Part 8: Monitoring & Maintenance**

### Viewing Logs

```bash
# Application logs
sudo journalctl -u gc-distribution.service -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -f
```

### Restarting Services

```bash
# Restart backend
sudo systemctl restart gc-distribution.service

# Restart Nginx
sudo systemctl restart nginx

# Restart both
sudo systemctl restart gc-distribution.service nginx
```

### Updating the Application

**On your Mac:**

```bash
# Build new version
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/go-backend
GOOS=linux GOARCH=amd64 go build -o gc-distribution-portal main.go

# Upload to EC2
scp -i ../gc-distribution-key.pem gc-distribution-portal ubuntu@$PUBLIC_IP:/home/ubuntu/

# SSH to EC2
ssh -i ../gc-distribution-key.pem ubuntu@$PUBLIC_IP

# On EC2:
sudo systemctl stop gc-distribution.service
sudo mv /home/ubuntu/gc-distribution-portal /opt/gc-distribution-portal/
sudo chmod +x /opt/gc-distribution-portal/gc-distribution-portal
sudo systemctl start gc-distribution.service
sudo systemctl status gc-distribution.service
```

---

## 💰 **Part 9: Cost Management (Stay in Free Tier)**

### Free Tier Limits (12 months)

| Service | Free Tier | How to Stay Free |
|---------|-----------|------------------|
| **EC2** | 750 hrs/month t2.micro | Keep 1 instance running 24/7 ✅ |
| **S3** | 5GB storage, 20K GET, 2K PUT | Clean old uploads regularly |
| **DynamoDB** | 25GB storage, 25 RCU/WCU | Credstash uses minimal capacity ✅ |
| **KMS** | 20,000 requests/month | Credstash uses minimal requests ✅ |
| **Data Transfer** | 100GB/month out | Monitor usage |

### Monitoring Costs

```bash
# Check AWS Free Tier usage
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Set up billing alerts in AWS Console:
# 1. Go to AWS Billing Dashboard
# 2. Click "Billing Preferences"
# 3. Enable "Receive Free Tier Usage Alerts"
# 4. Set alert threshold: $1
```

### Staying Within Free Tier

```bash
# Clean old upload files from S3 (run monthly)
aws s3 ls s3://your-bucket-name/storage/ --recursive | \
  awk '{if ($1 < "2024-01-01") print $4}' | \
  xargs -I {} aws s3 rm s3://your-bucket-name/{}

# Monitor EC2 instance hours
aws ec2 describe-instances --filters "Name=instance-type,Values=t2.micro" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,LaunchTime]'
```

---

## 🎯 **Part 10: Backup & Disaster Recovery**

### Backup Credstash Secrets

```bash
# Export all secrets (run on your Mac)
mkdir -p ~/gc-distribution-backups
credstash list --region ap-south-1 | while read secret; do
  value=$(credstash get $secret --region ap-south-1)
  echo "$secret=$value" >> ~/gc-distribution-backups/secrets-backup-$(date +%Y%m%d).txt
done

# Encrypt the backup
gpg -c ~/gc-distribution-backups/secrets-backup-$(date +%Y%m%d).txt
rm ~/gc-distribution-backups/secrets-backup-$(date +%Y%m%d).txt

echo "✅ Secrets backed up and encrypted"
```

### Backup Config Files

```bash
# Backup users.json and clients.json from EC2
scp -i gc-distribution-key.pem ubuntu@$PUBLIC_IP:/opt/gc-distribution-portal/config/*.json \
  ~/gc-distribution-backups/
```

### EC2 Snapshot

```bash
# Create AMI snapshot of your EC2 instance
aws ec2 create-image \
  --instance-id $INSTANCE_ID \
  --name "gc-distribution-backup-$(date +%Y%m%d)" \
  --description "Backup of GC Distribution Portal"
```

---

## 🔧 **Troubleshooting**

### Issue: Can't connect to EC2

```bash
# Check security group allows your IP
YOUR_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $YOUR_IP/32

# Verify instance is running
aws ec2 describe-instances --instance-ids $INSTANCE_ID
```

### Issue: Backend not starting

```bash
# On EC2, check logs
sudo journalctl -u gc-distribution.service -n 100

# Check if credstash works
credstash get razorpay.test.username --region ap-south-1

# Check IAM role is attached
aws sts get-caller-identity
```

### Issue: Credstash errors

```bash
# Verify DynamoDB table exists
aws dynamodb describe-table --table-name credential-store --region ap-south-1

# Verify KMS key exists
aws kms list-keys --region ap-south-1

# Test credstash manually
credstash put test-key test-value --region ap-south-1
credstash get test-key --region ap-south-1
credstash delete test-key --region ap-south-1
```

### Issue: Frontend shows 502 Bad Gateway

```bash
# Check backend is running
sudo systemctl status gc-distribution.service

# Check Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check backend port
sudo netstat -tlnp | grep 5001
```

---

## 📚 **Quick Reference**

### Important Commands

```bash
# Restart backend
sudo systemctl restart gc-distribution.service

# View logs
sudo journalctl -u gc-distribution.service -f

# Get secret
credstash get secret-name --region ap-south-1

# Upload to S3
aws s3 cp file.csv s3://bucket-name/path/

# SSH to EC2
ssh -i gc-distribution-key.pem ubuntu@<public-ip>
```

### Important Files

```
EC2 Instance:
/opt/gc-distribution-portal/gc-distribution-portal  # Binary
/opt/gc-distribution-portal/config/                 # Config files
/opt/gc-distribution-portal/frontend/               # React build
/opt/gc-distribution-portal/.env                    # Environment vars
/etc/systemd/system/gc-distribution.service         # Service file
/etc/nginx/sites-available/gc-distribution          # Nginx config

Local Machine:
gc-distribution-key.pem                             # SSH key
instance-details.txt                                # Instance info
bucket-name.txt                                     # S3 bucket name
```

---

## ✅ **Success Checklist**

- [  ] AWS account created
- [  ] AWS CLI installed and configured
- [  ] IAM role created with S3, DynamoDB, KMS permissions
- [  ] S3 bucket created
- [  ] Credstash set up (DynamoDB + KMS)
- [  ] Secrets stored in Credstash
- [  ] EC2 instance launched (t2.micro)
- [  ] Security group configured
- [  ] Elastic IP allocated
- [  ] Frontend built and uploaded
- [  ] Backend built (Linux) and uploaded
- [  ] Systemd service created and running
- [  ] Nginx installed and configured
- [  ] Application accessible via browser
- [  ] Login working
- [  ] File upload working
- [  ] WebSocket updates working
- [  ] Billing alerts set up

---

## 🎉 **Congratulations!**

Your GC Distribution Portal is now running on AWS Free Tier with:
- ✅ $0 monthly cost (within free tier limits)
- ✅ Secure secret management with Credstash
- ✅ Scalable storage with S3
- ✅ Production-ready deployment
- ✅ Automatic service restart on failure

**Your portal is accessible at**: `http://<your-ec2-ip>`

**Next steps**:
1. Set up a domain name and SSL certificate
2. Set up CloudWatch monitoring
3. Configure automated backups
4. Add more clients to clients.json

---

**Need help?** Check the troubleshooting section or review logs on EC2.

**Last Updated**: November 23, 2025

