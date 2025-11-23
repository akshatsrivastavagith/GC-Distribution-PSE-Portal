# 🚀 GitHub CI/CD Setup Guide

## Overview

This guide will help you set up **automatic deployment** to AWS EC2 whenever code is pushed to the `main` branch on GitHub.

---

## 🎯 How It Works

```
Developer pushes to GitHub main branch
           ↓
GitHub Actions detects push
           ↓
Builds Frontend (React + Vite)
           ↓
Builds Backend (Go for Linux)
           ↓
Connects to EC2 via SSH
           ↓
Deploys new files
           ↓
Restarts services
           ↓
✅ Portal updated automatically!
```

---

## 📋 Step 1: Push Code to GitHub

### 1.1 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `GC-Distribution-Portal` (or any name)
3. Set to **Private** (recommended)
4. Don't initialize with README
5. Click **Create repository**

### 1.2 Push Code to GitHub

```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: GC Distribution Portal with AWS deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/GC-Distribution-Portal.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## 🔐 Step 2: Set Up GitHub Secrets

GitHub Actions needs access to your EC2 instance. We'll store sensitive data as **GitHub Secrets**.

### 2.1 Go to Repository Settings

1. Open your GitHub repository
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

### 2.2 Add These 3 Secrets

#### Secret 1: `EC2_PUBLIC_IP`
- **Name**: `EC2_PUBLIC_IP`
- **Value**: `13.205.4.29`
- Click **Add secret**

#### Secret 2: `EC2_SSH_KEY`
- **Name**: `EC2_SSH_KEY`
- **Value**: Copy the ENTIRE contents of `gc-distribution-key.pem`

To get the SSH key contents:
```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal
cat gc-distribution-key.pem
```

Copy everything including:
```
-----BEGIN RSA PRIVATE KEY-----
...entire key content...
-----END RSA PRIVATE KEY-----
```

Paste this into GitHub secret value
- Click **Add secret**

#### Secret 3: `AWS_REGION` (Optional)
- **Name**: `AWS_REGION`
- **Value**: `ap-south-1`
- Click **Add secret**

---

## ✅ Step 3: Verify GitHub Actions Setup

### 3.1 Check Workflow File

The workflow file is already created at:
```
.github/workflows/deploy.yml
```

This file tells GitHub Actions what to do on every push to `main`.

### 3.2 Test the Deployment

1. Make a small change (e.g., update README.md):
   ```bash
   cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal
   echo "# GC Distribution Portal" >> README.md
   git add README.md
   git commit -m "Test CI/CD deployment"
   git push origin main
   ```

2. Go to GitHub → Your repository → **Actions** tab
3. You should see a new workflow run starting
4. Click on it to see live progress
5. Wait for it to complete (takes 3-5 minutes)
6. ✅ Your portal is automatically updated!

---

## 📊 What Happens on Each Push

1. **Checkout**: Downloads your code
2. **Build Frontend**: Compiles React app
3. **Build Backend**: Compiles Go binary for Linux
4. **Deploy Backend**: 
   - Copies binary to EC2
   - Stops service
   - Replaces old binary
   - Starts service
5. **Deploy Frontend**:
   - Copies build files to EC2
   - Updates Nginx
6. **Verify**: Checks services are running

---

## 🔄 Daily Workflow (For Future Developers)

### For You (or Any Developer):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/GC-Distribution-Portal.git
   cd GC-Distribution-Portal
   ```

2. **Make changes locally**:
   ```bash
   # Make your changes to the code
   # Test locally if needed
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

4. **Automatic deployment happens!**
   - GitHub Actions runs automatically
   - Builds and deploys to EC2
   - No manual SSH or file copying needed!

5. **Check deployment**:
   - Go to GitHub → Actions tab
   - See the deployment progress
   - Or visit `http://13.205.4.29` to see changes live

---

## 🌿 Advanced: Using Branches (Recommended)

For safer deployments, use a branching strategy:

### Option 1: Feature Branches

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push feature branch (won't deploy)
git push origin feature/new-feature

# Create Pull Request on GitHub
# Review and test
# Merge to main → Auto-deploys!
```

### Option 2: Development Branch

```mermaid
dev branch  →  (test here)  →  PR to main  →  Auto-deploy
```

To set this up:

1. Create `dev` branch:
   ```bash
   git checkout -b dev
   git push origin dev
   ```

2. Update workflow to trigger on PR merge:
   ```yaml
   on:
     push:
       branches:
         - main
     pull_request:
       branches:
         - main
       types: [closed]
   ```

---

## 🛠️ Troubleshooting

### Deployment Failed

1. **Check GitHub Actions logs**:
   - Go to GitHub → Actions
   - Click on failed workflow
   - Check which step failed

2. **Common issues**:

   **SSH Connection Failed**:
   - Verify `EC2_SSH_KEY` secret is correct
   - Check EC2 instance is running
   - Verify security group allows SSH

   **Build Failed**:
   - Check code compiles locally
   - Review error messages in logs

   **Service Start Failed**:
   - SSH to EC2 manually
   - Check logs: `sudo journalctl -u gc-distribution.service -n 50`

### Manual Deployment (If CI/CD Fails)

```bash
# SSH to EC2
ssh -i gc-distribution-key.pem ubuntu@13.205.4.29

# Check status
sudo systemctl status gc-distribution.service
sudo systemctl status nginx

# View logs
sudo journalctl -u gc-distribution.service -f
```

---

## 🔒 Security Best Practices

### 1. Protect Main Branch

1. Go to GitHub → Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Restrict who can push

### 2. Rotate SSH Keys

Every 3-6 months:
```bash
# Create new key pair
aws ec2 create-key-pair --key-name gc-dist-key-2024 --query 'KeyMaterial' --output text > new-key.pem
chmod 400 new-key.pem

# Update GitHub secret
# Update EC2 authorized_keys
```

### 3. Monitor Deployments

- Set up Slack/Email notifications for failed deployments
- Review GitHub Actions logs regularly
- Set up CloudWatch alarms

---

## 📈 Advanced Features (Optional)

### 1. Add Deployment Notifications

Add to workflow:
```yaml
- name: Notify on Success
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"✅ Deployment successful!"}'
```

### 2. Add Health Checks

```yaml
- name: Health Check
  run: |
    sleep 10
    curl -f http://${{ secrets.EC2_PUBLIC_IP }}/health || exit 1
```

### 3. Rollback on Failure

```yaml
- name: Rollback on Failure
  if: failure()
  run: |
    ssh -i ec2-key.pem ubuntu@${{ secrets.EC2_PUBLIC_IP }} << 'ENDSSH'
      sudo systemctl stop gc-distribution.service
      cd /opt/gc-distribution-portal
      sudo cp gc-distribution-portal.backup gc-distribution-portal
      sudo systemctl start gc-distribution.service
    ENDSSH
```

---

## 📝 Example Workflow

### Scenario: Adding a New Client

1. **Developer A** clones repo
2. **Creates branch**: `git checkout -b add-amazon-client`
3. **Makes changes**: Updates `clients.json`
4. **Tests locally**: Runs local servers
5. **Commits**: `git commit -m "Add Amazon as client"`
6. **Pushes**: `git push origin add-amazon-client`
7. **Creates PR** on GitHub
8. **Team reviews** the PR
9. **Merges to main**
10. **GitHub Actions automatically deploys** to EC2
11. **Amazon client is now live!** 🎉

No manual SSH, no file copying, no server configuration!

---

## 🎓 Benefits

✅ **No manual deployments** - Push and forget
✅ **Consistent deployments** - Same process every time
✅ **Audit trail** - See who deployed what and when
✅ **Fast rollbacks** - Revert git commit = automatic rollback
✅ **Team collaboration** - Multiple developers can work easily
✅ **Tested code** - Add tests before deployment
✅ **Zero downtime** - Automated graceful service restarts

---

## 🚀 You're All Set!

Every push to `main` now automatically:
1. ✅ Builds frontend
2. ✅ Builds backend
3. ✅ Deploys to EC2
4. ✅ Restarts services
5. ✅ Your portal is live!

**Future developers just need to**:
1. Clone repo
2. Make changes
3. Push to main
4. Done! ✨

---

## 📞 Need Help?

- Check GitHub Actions logs
- Review EC2 logs: `sudo journalctl -u gc-distribution.service`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

**Happy deploying! 🚀**

Last Updated: November 23, 2025

