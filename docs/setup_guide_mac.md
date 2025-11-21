# Setup Guide (macOS & Windows)

## Prerequisites

- **Node.js** (v16+) - [Download here](https://nodejs.org/)
- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **pip** (Python package manager, usually comes with Python)

## Installation Steps

### 1. Install Python Dependencies

The Python script requires the `requests` library:

```bash
pip3 install requests
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

## Running the Application

### Start the Backend Server

Open a terminal window and run:

```bash
cd backend
npm start
```

The backend server will start on `http://localhost:5000`

### Start the Frontend Development Server

Open a **new** terminal window and run:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

## Login

Use one of the allowed emails from `backend/config/allowed-users.json`:

- `alice@example.com`
- `bob@example.com`
- `akshat@example.com`

## Configuration

### Allowed Users

Edit `backend/config/allowed-users.json` to add or remove authorized email addresses.

### Clients

Edit `backend/config/clients.json` to add or modify client configurations with their offer IDs.

### Credentials

Edit `backend/config/credentials.json` to update API credentials for PROD and TEST environments.

## File Structure

```
automation-portal/
├── backend/
│   ├── server.js                    # Main server file
│   ├── routes/                      # API routes
│   ├── controllers/                 # Business logic
│   ├── utils/                       # Helper functions
│   ├── storage/                     # File uploads and logs
│   ├── config/                      # Configuration files
│   └── scripts/                     # Python automation scripts
│
└── frontend/
    ├── src/
    │   ├── pages/                   # React pages
    │   ├── components/              # React components
    │   └── lib/                     # Utilities (socket.io)
    └── index.html
```

## Features

### Stock Upload

1. Navigate to "Stock Upload" from the dashboard
2. Drag and drop a CSV file or click to select
3. Configure:
   - Client selection
   - Amount type (rupee/paisa)
   - RZP Commission percentage
   - File password (if needed)
4. Click "Start Upload" to begin processing
5. Monitor progress in the terminal window at the bottom

### Environment Switching

Use the environment selector in the navbar to switch between:
- **PROD** - Production environment
- **TEST** - Test environment

## Troubleshooting

### Python Not Found

**macOS/Linux:**
```bash
which python3
```

If not found, install Python 3 from [python.org](https://www.python.org/downloads/)

**Windows:**
```bash
where python
```

Make sure Python is added to your PATH during installation.

### Port Already in Use

If port 5000 or 5173 is already in use:

**Backend:**
Edit `backend/server.js` and change the PORT variable.

**Frontend:**
Edit `frontend/vite.config.js` and change the server port.

### Module Not Found Errors

Make sure you've run `npm install` in both backend and frontend directories.

## Notes

- Files are stored in `backend/storage/stock_uploads/` with a unique run ID for each upload
- Terminal logs are saved to `terminal_output.log` in each run folder
- The Python script checks `control.json` for pause/resume/stop commands
- Procurement batch IDs are appended to `backend/storage/procurement_batch_id.txt`

## CSV Format Requirements

Your CSV file must include these columns:
- `offer_id` - The offer identifier
- `voucher_value` - Value in paisa or rupee (based on selection)
- `expiry_date` - Unix timestamp
- `voucher_code` - Unique voucher code
- `rzp_commission` - Commission amount

Optional columns:
- `pin` - PIN for voucher (if applicable)

