# Quick Start Guide

Get the Automation Portal running in 3 easy steps!

## Prerequisites Check

Before starting, ensure you have:

1. **Node.js v16+** installed
   ```bash
   node --version
   ```

2. **Python 3.8+** installed
   ```bash
   python3 --version
   ```

3. **pip** (Python package manager)
   ```bash
   pip3 --version
   ```

If any are missing, install them first:
- Node.js: https://nodejs.org/
- Python: https://www.python.org/downloads/

## Step 1: Install Python Dependencies

```bash
pip3 install requests
```

## Step 2: Start the Backend

Open a terminal and run:

```bash
cd /Users/akshat.s/Downloads/PSE_PORTAL
./start-backend.sh
```

Or manually:
```bash
cd backend
npm install
npm start
```

You should see: `Backend listening on http://localhost:5000`

## Step 3: Start the Frontend

Open a **NEW** terminal window and run:

```bash
cd /Users/akshat.s/Downloads/PSE_PORTAL
./start-frontend.sh
```

Or manually:
```bash
cd frontend
npm install
npm run dev
```

You should see: `Local: http://localhost:5173`

## Step 4: Access the Application

Open your browser and go to:

```
http://localhost:5173
```

## Login

Use one of these test emails:
- `alice@example.com`
- `bob@example.com`
- `akshat@example.com`

No password required!

## Using the Stock Upload Feature

1. Click on **"Stock Upload"** from the dashboard
2. Drag and drop a CSV file (or click to browse)
3. Select a **Client** from the dropdown
4. Set **Amount Type** (rupee or paisa)
5. Enter **RZP Commission** percentage (e.g., 5 for 5%)
6. Click **"Start Upload"**
7. Monitor progress in the terminal at the bottom of the screen

## CSV File Format

Your CSV must have these columns:
- `offer_id` - The offer identifier
- `voucher_value` - Value (in rupee or paisa based on your selection)
- `expiry_date` - Unix timestamp (e.g., 1735689600)
- `voucher_code` - Unique voucher code
- `rzp_commission` - Commission amount

Optional:
- `pin` - Voucher PIN (if applicable)

### Example CSV:

```csv
offer_id,voucher_value,expiry_date,voucher_code,rzp_commission,pin
Q04hUQ3ctFFHmw,100,1735689600,VOUCHER001,5,1234
Q04hUQ3ctFFHmw,200,1735689600,VOUCHER002,5,5678
```

## Environment Switching

Use the dropdown in the top-right navbar to switch between:
- **PROD** - Production environment
- **TEST** - Test environment

## Troubleshooting

### "Port 5000 already in use"
Another application is using port 5000. Either:
- Stop the other application
- Or edit `backend/server.js` and change the PORT value

### "Port 5173 already in use"
Edit `frontend/vite.config.js` and change the port number.

### "Python command not found"
Make sure Python 3 is installed and accessible as `python3` (macOS/Linux) or `python` (Windows).

### "Module not found" errors
Make sure you ran `npm install` in both backend and frontend directories.

## Where Are Files Stored?

Uploaded files and results are stored in:
```
backend/storage/stock_uploads/<run-id>/
```

Each run creates a folder with:
- `raw.csv` - Original uploaded file
- `meta.json` - Run metadata
- `control.json` - Process control state
- `terminal_output.log` - Complete terminal output
- `*_upload_results.csv` - Upload results
- `*_failed_uploads.csv` - Failed uploads (if any)
- `procurement_batch_id.txt` - Generated batch ID

## Next Steps

- Read the full documentation in `docs/setup_guide_mac.md`
- Customize allowed users in `backend/config/allowed-users.json`
- Add more clients in `backend/config/clients.json`
- Update API credentials in `backend/config/credentials.json`

## Need Help?

Check the full documentation:
- [Setup Guide](docs/setup_guide_mac.md)
- [README](README.md)

---

**Happy Automating! 🚀**

