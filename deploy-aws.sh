#!/bin/bash

# GC Distribution Portal - AWS Free Tier Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 GC Distribution Portal - AWS Deployment Script"
echo "=================================================="
echo ""

# Colors
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo "Install it with: brew install awscli"
    exit 1
fi

# Check if credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Get AWS region
REGION=$(aws configure get region || echo "ap-south-1")
echo "Using region: $REGION"

# Step 1: Create IAM Role
echo ""
echo "Step 1: Creating IAM Role..."
if aws iam get-role --role-name GC-Distribution-EC2-Role &> /dev/null; then
    echo -e "${YELLOW}⚠️  IAM Role already exists${NC}"
else
    cat > /tmp/ec2-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ec2.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

    aws iam create-role \
      --role-name GC-Distribution-EC2-Role \
      --assume-role-policy-document file:///tmp/ec2-trust-policy.json

    cat > /tmp/ec2-permissions.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::gc-distribution-storage-*", "arn:aws:s3:::gc-distribution-storage-*/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:*"],
      "Resource": "arn:aws:dynamodb:*:*:table/credential-store"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:*"],
      "Resource": "*"
    }
  ]
}
EOF

    aws iam put-role-policy \
      --role-name GC-Distribution-EC2-Role \
      --policy-name GC-Distribution-Permissions \
      --policy-document file:///tmp/ec2-permissions.json

    aws iam create-instance-profile --instance-profile-name GC-Distribution-EC2-Profile
    aws iam add-role-to-instance-profile \
      --instance-profile-name GC-Distribution-EC2-Profile \
      --role-name GC-Distribution-EC2-Role

    echo -e "${GREEN}✅ IAM Role created${NC}"
fi

# Step 2: Create S3 Bucket
echo ""
echo "Step 2: Creating S3 Bucket..."
BUCKET_NAME="gc-distribution-storage-$(date +%s)"

if aws s3 mb s3://$BUCKET_NAME --region $REGION; then
    echo $BUCKET_NAME > bucket-name.txt
    echo -e "${GREEN}✅ S3 Bucket created: $BUCKET_NAME${NC}"
else
    echo -e "${RED}❌ Failed to create S3 bucket${NC}"
    exit 1
fi

# Step 3: Set up Credstash
echo ""
echo "Step 3: Setting up Credstash..."

# Check if credstash is installed
if ! command -v credstash &> /dev/null; then
    echo -e "${YELLOW}Installing credstash...${NC}"
    pip3 install credstash
fi

# Create KMS key
if ! aws kms list-aliases --query "Aliases[?AliasName=='alias/credstash'].AliasName" --output text | grep -q credstash; then
    KMS_KEY=$(aws kms create-key \
      --description "Credstash encryption key for GC Distribution Portal" \
      --region $REGION \
      --query 'KeyMetadata.KeyId' \
      --output text)
    
    aws kms create-alias \
      --alias-name alias/credstash \
      --target-key-id $KMS_KEY \
      --region $REGION
    
    echo -e "${GREEN}✅ KMS Key created${NC}"
else
    echo -e "${YELLOW}⚠️  KMS key already exists${NC}"
fi

# Create DynamoDB table
if ! aws dynamodb describe-table --table-name credential-store --region $REGION &> /dev/null; then
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
      --region $REGION
    
    echo "Waiting for table to be created..."
    aws dynamodb wait table-exists --table-name credential-store --region $REGION
    echo -e "${GREEN}✅ DynamoDB table created${NC}"
else
    echo -e "${YELLOW}⚠️  DynamoDB table already exists${NC}"
fi

# Step 4: Store secrets
echo ""
echo "Step 4: Storing secrets in Credstash..."
echo "Enter Razorpay TEST credentials:"
read -p "TEST Username [pv]: " TEST_USER
TEST_USER=${TEST_USER:-pv}
read -sp "TEST Password [pw]: " TEST_PASS
TEST_PASS=${TEST_PASS:-pw}
echo ""

echo "Enter Razorpay PROD credentials:"
read -p "PROD Username: " PROD_USER
read -sp "PROD Password: " PROD_PASS
echo ""

credstash put razorpay.test.username "$TEST_USER" --region $REGION
credstash put razorpay.test.password "$TEST_PASS" --region $REGION
credstash put razorpay.test.url "https://offers-engine-test.dev.razorpay.in/v1" --region $REGION

credstash put razorpay.prod.username "$PROD_USER" --region $REGION
credstash put razorpay.prod.password "$PROD_PASS" --region $REGION
credstash put razorpay.prod.url "https://offers-engine-live-statuscake.razorpay.com/v1" --region $REGION

JWT_SECRET="jwt-secret-$(openssl rand -hex 32)"
credstash put jwt.secret "$JWT_SECRET" --region $REGION

echo -e "${GREEN}✅ Secrets stored${NC}"

# Step 5: Create Security Group
echo ""
echo "Step 5: Creating Security Group..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region $REGION)

if aws ec2 describe-security-groups --group-names gc-distribution-sg --region $REGION &> /dev/null; then
    SG_ID=$(aws ec2 describe-security-groups --group-names gc-distribution-sg --region $REGION --query 'SecurityGroups[0].GroupId' --output text)
    echo -e "${YELLOW}⚠️  Security Group already exists: $SG_ID${NC}"
else
    SG_ID=$(aws ec2 create-security-group \
      --group-name gc-distribution-sg \
      --description "Security group for GC Distribution Portal" \
      --vpc-id $VPC_ID \
      --region $REGION \
      --query 'GroupId' \
      --output text)

    YOUR_IP=$(curl -s https://checkip.amazonaws.com)
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $YOUR_IP/32 --region $REGION
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION

    echo -e "${GREEN}✅ Security Group created: $SG_ID${NC}"
fi

# Step 6: Create Key Pair
echo ""
echo "Step 6: Creating SSH Key Pair..."
if [ -f "gc-distribution-key.pem" ]; then
    echo -e "${YELLOW}⚠️  Key pair file already exists${NC}"
else
    aws ec2 create-key-pair \
      --key-name gc-distribution-key \
      --query 'KeyMaterial' \
      --output text \
      --region $REGION > gc-distribution-key.pem
    
    chmod 400 gc-distribution-key.pem
    echo -e "${GREEN}✅ SSH Key created: gc-distribution-key.pem${NC}"
fi

# Step 7: Launch EC2 Instance
echo ""
echo "Step 7: Launching EC2 Instance (t2.micro)..."

AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text \
  --region $REGION)

echo "Using AMI: $AMI_ID"

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t2.micro \
  --key-name gc-distribution-key \
  --security-group-ids $SG_ID \
  --iam-instance-profile Name=GC-Distribution-EC2-Profile \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp2}' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=GC-Distribution-Portal}]' \
  --region $REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo -e "${GREEN}✅ EC2 Instance launched: $INSTANCE_ID${NC}"
echo "Waiting for instance to be running..."

aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo -e "${GREEN}✅ Instance is running!${NC}"
echo -e "${GREEN}Public IP: $PUBLIC_IP${NC}"

# Save instance details
cat > instance-details.txt << EOF
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Security Group: $SG_ID
S3 Bucket: $BUCKET_NAME
Region: $REGION

To connect:
ssh -i gc-distribution-key.pem ubuntu@$PUBLIC_IP

To check status:
aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION
EOF

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}✅ AWS Resources Created Successfully!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "Instance details saved to: instance-details.txt"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for instance to initialize"
echo "2. Run: ./deploy-app.sh $PUBLIC_IP"
echo ""
echo "Or manually:"
echo "  ssh -i gc-distribution-key.pem ubuntu@$PUBLIC_IP"
echo ""

