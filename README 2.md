# Automation Portal

A full-stack web application for managing human-intervened automation workflows, specifically designed for stock/voucher upload processes.

## Overview

This portal provides:
- **User Authentication** - Email-based login with configurable allowed users
- **Stock Upload Interface** - Drag-and-drop CSV upload with real-time processing
- **Live Terminal Output** - WebSocket-based streaming of Python script execution
- **Environment Management** - Switch between PROD and TEST environments
- **Run Control** - Pause, resume, and stop running processes
- **Batch Tracking** - Automatic generation of Razorpay-style procurement IDs

## Tech Stack

### Backend
- **Node.js** with Express
- **Socket.io** for real-time communication
- **Multer** for file uploads
- **Python 3** for automation scripts

### Frontend
- **React 18** with React Router
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Socket.io Client** for real-time updates

## Quick Start

### Prerequisites
- Node.js v16+
- Python 3.8+
- npm or yarn

### Installation

1. **Clone or extract the project**

2. **Install backend dependencies:**
```bash
cd backend
npm install
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install
```

4. **Install Python dependencies:**
```bash
pip3 install requests
```

### Running the Application

1. **Start the backend** (in one terminal):
```bash
cd backend
npm start
```

2. **Start the frontend** (in another terminal):
```bash
cd frontend
npm run dev
```

3. **Open your browser** to `http://localhost:5173`

## Documentation

See [docs/setup_guide_mac.md](docs/setup_guide_mac.md) for detailed setup instructions, configuration options, and troubleshooting.

## Features

### Authentication
- Simple email-based authentication
- Configurable allowed users list
- No password required (internal tool)

### Stock Upload
- Drag-and-drop CSV file upload
- Client selection from predefined list
- Amount type configuration (rupee/paisa)
- RZP commission percentage input
- Real-time file analysis and preview
- Live terminal output during processing

### Process Control
- Pause/resume running uploads
- Stop processes mid-execution
- Persistent control state via JSON files

### Storage & Logging
- Organized file storage by run ID
- Complete terminal output logs
- Upload results and failed records saved as CSV
- Procurement batch ID tracking

## Project Structure

```
automation-portal/
├── backend/
│   ├── server.js                    # Express server with Socket.io
│   ├── routes/                      # API route definitions
│   ├── controllers/                 # Request handlers
│   ├── utils/                       # Helper utilities
│   ├── storage/                     # File uploads and logs
│   ├── config/                      # Configuration files
│   └── scripts/                     # Python automation scripts
│
├── frontend/
│   ├── src/
│   │   ├── pages/                   # Login, Dashboard, StockUpload
│   │   ├── components/              # Reusable UI components
│   │   └── lib/                     # Socket.io client
│   ├── index.html
│   └── package.json
│
└── docs/
    └── setup_guide_mac.md           # Detailed setup guide
```

## Configuration

### Allowed Users
Edit `backend/config/allowed-users.json`:
```json
[
  "alice@example.com",
  "bob@example.com"
]
```

### Clients
Edit `backend/config/clients.json`:
```json
[
  { "name": "Swiggy", "offer_id": "Q04hUQ3ctFFHmw" },
  { "name": "Spencer", "offer_id": "QadOiEJEm1SYAf" }
]
```

### API Credentials
Edit `backend/config/credentials.json`:
```json
{
  "PROD": { "username": "...", "password": "..." },
  "TEST": { "username": "...", "password": "..." }
}
```

## CSV Format

Required columns:
- `offer_id` - Offer identifier
- `voucher_value` - Value in paisa or rupee
- `expiry_date` - Unix timestamp
- `voucher_code` - Unique voucher code
- `rzp_commission` - Commission amount

Optional:
- `pin` - Voucher PIN

## License

Internal use only.

## Support

For issues or questions, contact the development team.

