# Automation Portal - Project Information

## ✅ Project Setup Complete!

Your automation portal has been successfully created with all files in place.

## 🎯 How It Works

### The Python Script is NOT Run Directly

**Important:** The `voucher_upload_controlled.py` script should **NEVER** be run manually from the command line. It is designed to be executed automatically by the backend server when you upload a CSV file through the web portal.

### Workflow

1. **Start the servers** (backend + frontend)
2. **Login** to the web portal at `http://localhost:5173`
3. **Navigate** to "Stock Upload" page
4. **Upload CSV** file via drag-and-drop or file picker
5. **Configure** settings (client, amount type, commission)
6. **Click "Start Upload"** - This triggers the Python script automatically
7. **Monitor** real-time progress in the terminal window
8. **Results** are saved automatically in `backend/storage/stock_uploads/<run-id>/`

### What Happens Behind the Scenes

```
Frontend Upload → Backend API → Spawns Python Script → Real-time Logs → Results Saved
```

The backend (`stockController.js`) automatically:
- Receives your CSV file
- Creates a unique run folder
- Generates a procurement batch ID
- Spawns the Python script with correct parameters
- Streams terminal output to the frontend via WebSocket
- Saves all results and logs

## 🚀 Getting Started

### 1. Install Python Dependencies
```bash
pip3 install requests
```

### 2. Start Backend (Terminal 1)
```bash
cd /Users/akshat.s/Downloads/PSE_PORTAL
./start-backend.sh
```

### 3. Start Frontend (Terminal 2)
```bash
cd /Users/akshat.s/Downloads/PSE_PORTAL
./start-frontend.sh
```

### 4. Open Browser
```
http://localhost:5173
```

### 5. Login
Use any of these emails:
- `alice@example.com`
- `bob@example.com`
- `akshat@example.com`

### 6. Upload CSV via Portal
- Go to "Stock Upload"
- Drag and drop your CSV file
- Configure settings
- Click "Start Upload"
- Watch the magic happen! ✨

## 📁 Project Structure

```
PSE_PORTAL/
├── backend/                          # Node.js + Express server
│   ├── server.js                     # Main server with Socket.io
│   ├── routes/                       # API endpoints
│   ├── controllers/                  # Business logic
│   ├── scripts/
│   │   └── voucher_upload_controlled.py  # ⚠️ Run via portal only!
│   ├── storage/
│   │   └── stock_uploads/            # Upload results stored here
│   └── config/                       # Configuration files
│
├── frontend/                         # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/                    # Login, Dashboard, StockUpload
│   │   └── components/               # UI components
│   └── index.html
│
├── docs/
│   └── setup_guide_mac.md           # Detailed setup guide
│
├── start-backend.sh                 # Quick start script
├── start-frontend.sh                # Quick start script
├── sample_vouchers.csv              # Sample CSV for testing
├── QUICKSTART.md                    # Quick start guide
└── README.md                        # Full documentation
```

## 🔧 Configuration Files

### Add/Remove Users
Edit: `backend/config/allowed-users.json`

### Add/Modify Clients
Edit: `backend/config/clients.json`

### Update API Credentials
Edit: `backend/config/credentials.json`

## 📊 Sample CSV Included

A sample CSV file (`sample_vouchers.csv`) is included for testing. It contains:
- 5 sample vouchers
- 2 different clients (Swiggy, Spencer)
- All required columns

## 🎨 Features

✅ Email-based authentication
✅ Drag-and-drop CSV upload
✅ Real-time terminal output streaming
✅ Environment switching (PROD/TEST)
✅ Automatic batch ID generation
✅ Process control (pause/resume/stop)
✅ Organized file storage per run
✅ Complete logging and result tracking
✅ Modern, responsive UI with Tailwind CSS

## 📝 CSV Format Requirements

Required columns:
- `offer_id` - Offer identifier
- `voucher_value` - Value in paisa or rupee
- `expiry_date` - Unix timestamp
- `voucher_code` - Unique voucher code
- `rzp_commission` - Commission amount

Optional:
- `pin` - Voucher PIN

## 🔒 Security Note

This is an internal tool with basic email authentication. The credentials in `config/credentials.json` are used by the Python script to authenticate with the Razorpay API.

## 📚 Documentation

- **Quick Start:** `QUICKSTART.md`
- **Detailed Setup:** `docs/setup_guide_mac.md`
- **Full README:** `README.md`

## ⚠️ Important Reminders

1. **Never run the Python script manually** - Use the portal!
2. **Keep both servers running** - Backend (port 5000) + Frontend (port 5173)
3. **Check terminal output** - Logs appear in real-time at the bottom of the upload page
4. **Results are saved** - Check `backend/storage/stock_uploads/<run-id>/` for outputs

## 🎉 You're All Set!

Your automation portal is ready to use. Just start the servers and access the web interface!

---

**Need Help?** Check the documentation files or review the setup guide.

