# 🏗️ GC Distribution Portal - Architecture Summary

## Quick Reference Guide

### 🎯 System Purpose
Bulk gift card voucher distribution portal for uploading spreadsheets and distributing them to Razorpay's Offers Engine API with real-time tracking and control.

---

## 🏛️ Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│                                                          │
│  React 18.3 + Vite + React Router + WebSocket          │
│  Port: 5173                                              │
│                                                          │
│  • Login/Auth UI                                         │
│  • Dashboard                                             │
│  • Stock Upload Interface ⭐                             │
│  • Profile & History                                     │
│  • Admin Panels (Activity, Password Requests)           │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/WS
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│                                                          │
│  Go 1.23 + Gorilla Mux + WebSocket                     │
│  Port: 5001                                              │
│                                                          │
│  • JWT Authentication                                    │
│  • RESTful API (6 endpoint groups)                      │
│  • WebSocket Server (real-time updates)                 │
│  • Upload Processing Engine ⭐                           │
│  • Concurrency Control (10 goroutines)                  │
│  • File Processing Pipeline                             │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP
┌─────────────────────────────────────────────────────────┐
│                    DATA/STORAGE LAYER                    │
│                                                          │
│  File-based (JSON + CSV)                                │
│                                                          │
│  • Config: users, environments, clients                 │
│  • Logs: activity, upload history                       │
│  • Storage: per-upload results & logs                   │
│                                                          │
│  External: Razorpay Offers Engine API                   │
│  • TEST environment                                      │
│  • PROD environment                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Components

### Frontend (React)
| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **AuthContext** | Global auth state | JWT storage, user data, login/logout |
| **StockUpload** | Main upload UI | File parsing, progress, controls, logs |
| **Navbar** | Navigation | Role-based menu, notification bell |
| **Profile** | User portal | Upload history, password requests |
| **ActivityLog** | Admin view | All user activities (Super Admin) |
| **PasswordRequests** | Admin panel | Approve/reject password changes |

### Backend (Go)
| Package | Purpose | Key Features |
|---------|---------|--------------|
| **api/stock** | Upload processing | Concurrent API calls, pause/resume/stop |
| **api/auth** | Authentication | JWT generation, validation |
| **api/profile** | User data | Upload history, activity logs |
| **api/password_request** | Password workflow | Submit, review, approve |
| **api/websocket** | Real-time comms | Progress updates, row logs, summary |
| **utils/rzpid** | UUID generation | 14-char Razorpay-style IDs |
| **middleware/auth** | JWT validation | Token verification, user extraction |

---

## 📊 Data Flow: Upload Process

```
1. User selects CSV/XLSX file
   ↓
2. Frontend parses & validates
   ↓
3. POST /stock/upload {csvData, environment, offerID, clientName}
   ↓
4. Backend generates:
   • runId: "run_1234567890"
   • procurement_batch_id: "Re26OY8zjkGChm" (14 chars)
   ↓
5. Creates storage/{runId}/ directory
   ↓
6. Spawns goroutines (max 10 concurrent)
   ↓
7. For each row:
   • Parse & validate
   • Multiply amounts × 100 (convert to paise)
   • Multiply commission × 100
   • POST to Razorpay API
   • Log result (success or failed)
   • Send WebSocket update: PROGRESS, ROW_LOG
   ↓
8. Generate result CSVs:
   • result.csv (success records)
   • failed_uploads.csv (failed records)
   ↓
9. Send WebSocket: SUMMARY + FINISHED
   ↓
10. Frontend:
    • Display summary modal
    • Auto-download result CSV
    • Log to upload_history.json
```

---

## 🔐 Security Layers

### Layer 1: Authentication
- JWT tokens (7-day expiry)
- Bcrypt password hashing
- Stored in localStorage

### Layer 2: Authorization
- Role-based access: User, Admin, Super Admin
- Permission checks per endpoint
- Frontend route protection

### Layer 3: API Security
- Basic Auth for Razorpay API
- Credentials in gitignored config
- CORS enabled
- Request validation

### Layer 4: Data Protection
- Sensitive files gitignored
- Audit logging (activity_log.json)
- File-based permissions
- No plain-text passwords

---

## ⚡ Performance Features

### Concurrency
```
Upload Engine:
├── Semaphore: 10 concurrent API calls
├── Goroutines: One per row
├── Non-blocking: Workers run independently
└── Efficient: CPU and network optimized
```

### Real-time Updates
```
WebSocket:
├── Connection: Per upload session
├── Messages: Batched JSON
├── Types: PROGRESS, ROW_LOG, SUMMARY, FINISHED
└── Auto-reconnect on disconnect
```

### Control Mechanisms
```
State Management (control.json):
├── States: running, paused, stopped
├── Pause: Workers sleep 1s, re-check
├── Resume: Change state to running
└── Stop: Workers exit immediately
```

---

## 🗃️ File Structure

```
go-backend/
├── main.go                         # Entry point
├── config/
│   ├── environments.json          # API credentials (PROTECTED)
│   ├── users.json                 # User accounts (PROTECTED)
│   ├── clients.json               # Client mappings ✅
│   ├── activity_log.json          # Audit trail (PROTECTED)
│   ├── upload_history.json        # Upload records (PROTECTED)
│   └── password_change_requests.json (PROTECTED)
├── internal/
│   ├── api/                       # API handlers
│   ├── middleware/                # Auth middleware
│   └── utils/                     # Helper functions
└── storage/{runId}/               # Per-upload storage
    ├── control.json               # State control
    ├── terminal_output.log        # Execution log
    ├── result.csv                 # Success records
    └── failed_uploads.csv         # Failed records

frontend/
├── src/
│   ├── App.jsx                    # Main app + routing
│   ├── main.jsx                   # Entry point
│   ├── contexts/
│   │   └── AuthContext.jsx        # Global auth state
│   ├── components/
│   │   └── Navbar.jsx             # Navigation
│   └── pages/
│       ├── Login.jsx              # Authentication
│       ├── Dashboard.jsx          # Landing
│       ├── StockUpload.jsx        # Main feature ⭐
│       ├── Profile.jsx            # User portal
│       ├── ActivityLog.jsx        # Admin: activities
│       └── PasswordRequests.jsx   # Admin: password mgmt
└── public/                        # Static assets
```

---

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - Login & get JWT

### Stock Upload
- `POST /stock/upload` - Start upload
- `POST /stock/pause` - Pause upload
- `POST /stock/resume` - Resume upload
- `POST /stock/stop` - Stop upload
- `GET /stock/download/{runId}/{filename}` - Download result

### Profile
- `GET /profile` - User profile & history

### Activity (Super Admin)
- `GET /activity-log` - All activity logs
- `GET /upload-history` - All upload history

### Password Requests
- `POST /password-request/submit` - Submit request
- `GET /password-request/my-requests` - Get own requests
- `GET /password-request/all` - All requests (Super Admin)
- `POST /password-request/review` - Approve/reject (Super Admin)
- `GET /password-request/pending-count` - Pending count (Super Admin)

### WebSocket
- `WS /ws` - Real-time updates

---

## 🎭 User Roles

### User (Basic Access)
- ✅ Dashboard
- ✅ Stock Upload
- ✅ Profile & own history
- ✅ Request password change

### Admin (Extended Access)
- ✅ All User permissions
- ✅ User management features
- ✅ View own upload history

### Super Admin (Full Access)
- ✅ All Admin permissions
- ✅ View all activity logs
- ✅ View all upload history
- ✅ Approve/reject password requests
- ✅ Notification bell (pending requests)

---

## 🌐 External Integration

### Razorpay Offers Engine API

**TEST Environment:**
```
URL: https://offers-engine-test.dev.razorpay.in/v1
Endpoint: POST /offers/voucher-benefits
Auth: Basic pv:pw
```

**PROD Environment:**
```
URL: https://offers-engine-live-statuscake.razorpay.com/v1
Endpoint: POST /offers/voucher-benefits
Auth: Basic rmp_offers:{password}
```

**Payload:**
```json
{
  "voucher_benefits": [{
    "offer_id": "Q04hUQ3ctFFHmw",
    "voucher_type": "VOUCHER_TYPE_PERSONALISED",
    "voucher_status": "VOUCHER_BENEFIT_STATUS_UNCLAIMED",
    "voucher_value": 100000,
    "expiry_date": 1777334400,
    "voucher_code": "CODE123",
    "rzp_commission": "500",
    "procurement_batch_id": "Re26OY8zjkGChm",
    "pin": "123456"
  }]
}
```

---

## 📈 System Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Max Concurrent API Calls** | 10 | Semaphore controlled |
| **JWT Expiry** | 7 days | 168 hours |
| **Frontend Port** | 5173 | Vite dev server |
| **Backend Port** | 5001 | Go HTTP server |
| **WebSocket Protocol** | Native | ws:// |
| **Password Hash** | bcrypt | Cost factor 10 |
| **UUID Length** | 14 chars | Razorpay format |
| **Max File Size** | ~100MB | Browser memory limit |

---

## 🚦 Status Indicators

### Upload States
- 🟢 **RUNNING** - Upload in progress
- 🟡 **PAUSED** - Temporarily paused, can resume
- 🔴 **STOPPED** - Manually stopped, cannot resume
- ✅ **COMPLETED** - Upload finished successfully

### API Response Codes
- ✅ **200-299** - Success, logged to result.csv
- ❌ **400-599** - Error, logged to failed_uploads.csv

---

## 🎯 Critical Paths

### 1. **Upload Critical Path**
```
File Select → Parse → Validate → Upload → Process (10 concurrent) 
→ API Call → Log Result → WebSocket Update → Summary → Download
```

### 2. **Authentication Critical Path**
```
Login Form → POST /auth/login → Validate Credentials → Generate JWT 
→ Store Token → Redirect to Dashboard
```

### 3. **Real-time Update Critical Path**
```
Worker Process → Write Log → Send WebSocket → Frontend Receive 
→ Update UI → Display to User
```

---

## 💡 Key Design Principles

1. **Simplicity**: File-based storage for easy deployment
2. **Efficiency**: Concurrent processing with goroutines
3. **Transparency**: Real-time logs and progress
4. **Control**: Pause/resume/stop mechanisms
5. **Security**: JWT + RBAC + gitignore protection
6. **Audit**: Comprehensive activity logging
7. **UX**: Auto-download, smart form clearing, error handling

---

## 🔮 Technology Choices

| Requirement | Technology | Reason |
|-------------|-----------|---------|
| Frontend Framework | React 18.3 | Component-based, large ecosystem |
| Build Tool | Vite | Fast HMR, modern, optimized |
| Backend Language | Go 1.23 | Performance, concurrency, simple deployment |
| Web Framework | Gorilla Mux | Mature, well-documented, flexible |
| Real-time | WebSocket | Bi-directional, low latency, efficient |
| Auth | JWT | Stateless, scalable, standard |
| File Parsing | XLSX (JS) | Browser-based, instant validation |
| Storage | JSON files | Simple, no DB setup, sufficient for scale |
| Password | bcrypt | Industry standard, secure |

---

**For detailed architecture documentation, see**: [ARCHITECTURE.md](./ARCHITECTURE.md)

**Last Updated**: November 23, 2025

