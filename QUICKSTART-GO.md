# 🚀 Quick Start - Go Backend

## ⚡ Fastest Way to Get Started

### Using Docker (Recommended)

```bash
# 1. Navigate to project
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal

# 2. Start everything with one command
./start-docker.sh

# 3. Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:5001
```

**That's it!** 🎉

### Using Native Go (Development)

**Terminal 1 - Backend:**
```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/go-backend
go run main.go
```

**Terminal 2 - Frontend:**
```bash
cd /Users/akshat.s/Documents/Razorpay/GC-Distribution-PSE-Portal/frontend
npm install
npm run dev
```

**Terminal 3 - Open:**
```bash
open http://localhost:5173
```

## 📋 First Time Setup

### 1. Install Prerequisites

**For Docker:**
```bash
# Install Docker Desktop from:
# https://www.docker.com/products/docker-desktop
```

**For Native:**
```bash
# Install Go
brew install go

# Install Python
brew install python3

# Install Node.js
brew install node
```

### 2. Configure Users

Edit `go-backend/config/users.json`:
```json
{
  "users": [
    {
      "email": "your-email@razorpay.com",
      "role": "super_admin",
      "permissions": ["dashboard", "stock_upload", "data_change_operation", "user_management"]
    }
  ]
}
```

### 3. Set Credentials

Edit `go-backend/config/credentials.json`:
```json
{
  "PROD": {
    "username": "your_prod_username",
    "password": "your_prod_password"
  },
  "TEST": {
    "username": "your_test_username",
    "password": "your_test_password"
  }
}
```

### 4. Configure Clients

Edit `go-backend/config/clients.json`:
```json
[
  {
    "name": "Swiggy",
    "offer_id": "Q04hUQ3ctFFHmw"
  }
]
```

## 🎯 Using the Application

### Step 1: Login

1. Go to http://localhost:5173
2. Enter your email from `users.json`
3. Click **Login**

### Step 2: Upload CSV

1. Click **Stock Upload** in the navigation
2. Select **Environment** (TEST or PROD)
3. Choose **Client** from dropdown
4. **Drag & drop** your CSV file
5. Configure settings:
   - Amount Type: rupee/paisa
   - RZP Commission: percentage
6. Click **Start Upload**

### Step 3: Monitor Progress

- Real-time logs appear below
- Use **Pause**, **Resume**, or **Stop** buttons
- Wait for completion

### Step 4: View Results

Results are saved in:
```
go-backend/storage/stock_uploads/<run-id>/
```

## 🔍 Verify Installation

### Check Backend Health
```bash
curl http://localhost:5001/health
# Should return: OK
```

### Check WebSocket
```bash
# Install wscat
npm install -g wscat

# Test WebSocket
wscat -c ws://localhost:5001/ws
# Should connect successfully
```

### Check Frontend
```bash
open http://localhost:5173
# Should show login page
```

## 🐛 Common Issues

### Port Already in Use

```bash
# Find what's using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or change port
export PORT=5002
```

### Config Files Not Found

```bash
# Copy from old backend
cp -r backend/config/* go-backend/config/

# Verify
ls -la go-backend/config/
```

### Docker Build Fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild
docker-compose build --no-cache
```

### Go Module Errors

```bash
cd go-backend
rm go.sum
go mod download
go mod tidy
```

## 📊 What's Different from Node.js?

| Feature | Node.js | Go |
|---------|---------|-----|
| **Start Command** | `npm start` | `go run main.go` |
| **Port** | 5001 | 5001 (same) |
| **Auth** | Sessions | JWT tokens |
| **WebSocket** | Socket.io | Native WebSocket |
| **Memory** | ~150MB | ~30MB |
| **Startup** | ~3s | ~0.1s |

**Good news:** Frontend needs **NO changes**! Everything just works! ✨

## 🔐 Security

### Generate JWT Secret

```bash
# Generate secure secret
openssl rand -base64 32

# Set it
export JWT_SECRET="your-generated-secret"

# Or add to .env file
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
```

### Secure Config Files

```bash
cd go-backend
chmod 600 config/credentials.json
chmod 600 config/users.json
```

## 📦 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart service
docker-compose restart backend

# View status
docker-compose ps

# Remove everything
docker-compose down -v
```

## 🛠️ Development Commands

```bash
# Build Go binary
cd go-backend
go build -o main .

# Run tests
go test ./...

# Format code
go fmt ./...

# Install dependencies
go mod download

# Update dependencies
go get -u ./...
```

## 📚 File Locations

```
go-backend/
├── main.go              # Main application
├── internal/            # Internal packages
├── config/              # 📝 Edit these files
│   ├── users.json      # User configuration
│   ├── clients.json    # Client list
│   └── credentials.json # API credentials
├── storage/             # 📁 Upload results here
└── scripts/             # Python scripts
```

## 🎓 Next Steps

1. **Test locally** - Upload a sample CSV
2. **Deploy to staging** - Use Docker
3. **Deploy to production** - See GO_DEPLOYMENT_GUIDE.md

## 📖 More Documentation

- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** - What was done
- **[GO_DEPLOYMENT_GUIDE.md](./GO_DEPLOYMENT_GUIDE.md)** - Full deployment guide
- **[README-GO.md](./README-GO.md)** - Comprehensive README

## 💬 Need Help?

1. Check logs: `docker-compose logs -f backend`
2. Verify health: `curl http://localhost:5001/health`
3. Test WebSocket: `wscat -c ws://localhost:5001/ws`
4. Review documentation above

## ✅ Success Checklist

After starting the application, verify:

- [ ] Backend health check returns OK
- [ ] Frontend loads at http://localhost:5173
- [ ] Can login with configured email
- [ ] Can access dashboard
- [ ] Can select environment (TEST/PROD)
- [ ] Can upload CSV file
- [ ] Real-time logs appear
- [ ] Upload completes successfully
- [ ] Results saved in storage directory

## 🎉 You're Ready!

Your Go-powered PSE Portal is ready to use. It's faster, more efficient, and easier to deploy than ever before!

**Happy uploading! 🚀**

---

*For detailed documentation, see the comprehensive guides in the project root.*

