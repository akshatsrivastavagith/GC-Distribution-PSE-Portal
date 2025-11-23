# 🏗️ GC Distribution Portal - System Architecture

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Data Flow](#data-flow)
7. [Security Architecture](#security-architecture)
8. [API Integration](#api-integration)
9. [Real-time Communication](#real-time-communication)
10. [File Processing Pipeline](#file-processing-pipeline)
11. [Database & Storage](#database--storage)
12. [Authentication & Authorization](#authentication--authorization)

---

## 🎯 System Overview

**GC Distribution Portal** is a web-based application designed for bulk gift card voucher distribution management. It enables users to upload spreadsheets of voucher data and automatically distributes them to Razorpay's Offers Engine API with real-time progress tracking, comprehensive logging, and advanced control mechanisms.

### Key Capabilities:
- ✅ Bulk voucher upload (CSV/XLSX)
- ✅ Real-time progress tracking via WebSockets
- ✅ Multi-environment support (TEST/PROD)
- ✅ Concurrent API processing (10 parallel requests)
- ✅ Pause/Resume/Stop controls during execution
- ✅ Comprehensive audit logging
- ✅ Role-based access control
- ✅ Password change request workflow
- ✅ Upload history tracking
- ✅ Detailed success/failure reporting

---

## 💻 Technology Stack

### Frontend
```
Framework:      React 18.3.1
Build Tool:     Vite 5.4.10
Routing:        React Router DOM 6.28.0
HTTP Client:    Axios 1.7.7
Styling:        CSS Modules
File Parsing:   XLSX 0.18.5
State:          React Hooks (useState, useEffect, useContext)
WebSocket:      Native WebSocket API
```

### Backend
```
Language:       Go 1.23.3
Web Framework:  Gorilla Mux 1.8.1
WebSocket:      Gorilla WebSocket 1.5.3
Auth:           JWT (golang-jwt 5.2.1)
HTTP Client:    Native net/http
Crypto:         bcrypt
Concurrency:    Goroutines + Semaphores
```

### Infrastructure
```
Frontend Port:  5173 (Vite dev server)
Backend Port:   5001 (Go HTTP server)
WebSocket:      ws://localhost:5001/ws
Storage:        Local filesystem (JSON + CSV)
```

---

## 🎨 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │            React Frontend (Port 5173)                   │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │  Login   │  │Dashboard │  │  Stock   │  │Profile │ │   │
│  │  │  Page    │  │   Page   │  │  Upload  │  │  Page  │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘ │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐    │   │
│  │  │         AuthContext (JWT Management)            │    │   │
│  │  └────────────────────────────────────────────────┘    │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Go Backend (Port 5001)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    HTTP REST API                          │ │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────────┐  │ │
│  │  │  Auth  │  │ Stock  │  │Profile │  │  Password    │  │ │
│  │  │   API  │  │   API  │  │   API  │  │  Request API │  │ │
│  │  └────────┘  └────────┘  └────────┘  └──────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              WebSocket Handler (Real-time)                │ │
│  │      Progress Updates | Row Logs | Summary               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                Upload Processing Engine                    │ │
│  │  ┌──────────────────────────────────────────────────┐    │ │
│  │  │  Semaphore (10 concurrent goroutines)            │    │ │
│  │  │  • Parse CSV/XLSX                                 │    │ │
│  │  │  • Validate data                                  │    │ │
│  │  │  • Generate procurement batch ID                  │    │ │
│  │  │  • Process rows concurrently                      │    │ │
│  │  │  • Handle pause/resume/stop                       │    │ │
│  │  │  • Generate result CSV                            │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                  Middleware Layer                          │ │
│  │  • JWT Authentication                                      │ │
│  │  • CORS Handling                                           │ │
│  │  • Request Logging                                         │ │
│  │  • Error Handling                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST (Basic Auth)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Razorpay Offers Engine API                         │
│                                                                 │
│  TEST:  https://offers-engine-test.dev.razorpay.in/v1         │
│  PROD:  https://offers-engine-live-statuscake.razorpay.com/v1 │
│                                                                 │
│  Endpoint: POST /offers/voucher-benefits                       │
│  Auth:     Basic Auth (username:password)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Local File Storage                           │
│                                                                 │
│  go-backend/config/                                            │
│  ├── environments.json     (API credentials)                   │
│  ├── users.json            (User accounts)                     │
│  ├── clients.json          (Client-to-OfferID mapping)        │
│  ├── activity_log.json     (Audit logs)                       │
│  ├── upload_history.json   (Upload records)                   │
│  └── password_change_requests.json                            │
│                                                                 │
│  go-backend/storage/{runId}/                                   │
│  ├── terminal_output.log   (Execution logs)                   │
│  ├── result.csv            (Success records)                  │
│  ├── failed_uploads.csv    (Failed records)                   │
│  └── control.json          (Pause/resume state)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Architecture

### Component Structure

```
frontend/src/
├── App.jsx                         # Main app component, routing
├── main.jsx                        # Entry point
│
├── contexts/
│   └── AuthContext.jsx            # JWT token management, user state
│
├── components/
│   └── Navbar.jsx                 # Navigation with role-based menu
│
├── pages/
│   ├── Login.jsx                  # User authentication
│   ├── Dashboard.jsx              # Landing page
│   ├── StockUpload.jsx           # Main upload interface ⭐
│   ├── Profile.jsx                # User profile & history
│   ├── ActivityLog.jsx            # Super Admin: all activities
│   └── PasswordRequests.jsx       # Super Admin: password approvals
│
└── styles/
    ├── Login.module.css
    ├── Dashboard.module.css
    ├── StockUpload.module.css
    └── Profile.module.css
```

### Key Frontend Features

#### 1. **AuthContext** (Global State Management)
```javascript
{
  token: "JWT token",
  user: {
    username: "user@example.com",
    email: "user@example.com",
    role: "Admin" | "Super Admin" | "User",
    permissions: ["dashboard", "stock_upload", ...]
  },
  login: (token) => {},
  logout: () => {}
}
```

#### 2. **StockUpload Component** (Core Feature)
- File selection (CSV/XLSX)
- Environment selection (TEST/PROD)
- Client selection (dropdown)
- Real-time progress tracking
- Execution log display
- Pause/Resume/Stop controls
- Summary modal with download
- Error handling

#### 3. **WebSocket Integration**
```javascript
ws://localhost:5001/ws
Messages:
  - PROGRESS: {completed}/{total}
  - ROW_LOG: Row execution details
  - SUMMARY: JSON with results
  - FINISHED: Upload complete signal
```

#### 4. **Role-Based Rendering**
```javascript
- User:        Dashboard, Stock Upload, Profile
- Admin:       + User Management features
- Super Admin: + Activity Log, Password Requests, Notification Bell
```

---

## ⚙️ Backend Architecture

### Package Structure

```
go-backend/
├── main.go                         # Entry point, route setup
│
├── internal/
│   ├── api/
│   │   ├── auth.go                # Login, JWT generation
│   │   ├── stock.go               # Upload processing ⭐
│   │   ├── profile.go             # User profile, history
│   │   ├── password_request.go    # Password change workflow
│   │   └── websocket.go           # Real-time updates
│   │
│   ├── middleware/
│   │   └── auth.go                # JWT validation
│   │
│   └── utils/
│       ├── rzpid.go               # Razorpay UUID generation
│       ├── activity.go            # Activity logging
│       └── helpers.go             # Common utilities
│
├── config/
│   ├── environments.json          # API configs (protected)
│   ├── users.json                 # User accounts (protected)
│   ├── clients.json               # Client mappings
│   ├── activity_log.json          # Audit trail
│   ├── upload_history.json        # Upload records
│   └── password_change_requests.json
│
└── storage/{runId}/               # Per-upload storage
    ├── control.json               # State management
    ├── terminal_output.log        # Execution log
    ├── result.csv                 # Success records
    └── failed_uploads.csv         # Failed records
```

### Core Backend Components

#### 1. **Upload Processing Engine** (`stock.go`)
```go
Key Functions:
- StartUpload:     Initializes upload, generates runId
- uploadVouchers:  Goroutine-based concurrent processing
- ProcessRow:      Validates & sends API request
- GenerateCSV:     Creates result/failed CSV files
```

**Concurrency Model:**
```go
semaphore := make(chan struct{}, 10)  // Max 10 concurrent API calls

for each row:
    go uploadVouchers(row) {
        acquire semaphore
        check pause state
        process API request
        log result
        update progress
        release semaphore
    }
```

#### 2. **Pause/Resume/Stop Control**
```go
control.json:
{
  "state": "running" | "paused" | "stopped",
  "run_id": "abc123"
}

Worker checks control.json:
- Before acquiring semaphore
- After acquiring semaphore
- On pause: sleep 1 second, re-check
- On stop: exit goroutine immediately
```

#### 3. **Razorpay UUID Generation** (`rzpid.go`)
```go
Algorithm:
1. Get current nanosecond timestamp
2. Generate random 4-digit base62 string
3. Subtract epoch (Jan 1, 2014) from timestamp
4. Convert to base62
5. Append 4-digit random
6. Result: 14-character unique ID

Example: "Re26OY8zjkGChm"
```

#### 4. **Activity Logging** (`activity.go`)
```go
Tracks:
- User login/logout
- Upload start/complete
- Password change requests
- Admin actions

Structure:
{
  "timestamp": "2024-01-01T12:00:00Z",
  "username": "user@example.com",
  "action": "upload_start",
  "details": {...}
}
```

---

## 🔄 Data Flow

### 1. **Upload Workflow**

```
User Action → Frontend → Backend → Razorpay API → Storage
```

**Detailed Steps:**

```mermaid
1. User selects file (CSV/XLSX)
   ↓
2. Frontend parses file using XLSX library
   ↓
3. Frontend validates columns & converts to CSV string
   ↓
4. Frontend sends to: POST /stock/upload
   Body: {
     csvData: "...",
     environment: "TEST",
     offerID: "Q04hUQ3ctFFHmw",
     clientName: "Swiggy"
   }
   ↓
5. Backend generates runId & procurement_batch_id
   ↓
6. Backend creates storage directory: storage/{runId}/
   ↓
7. Backend spawns goroutines (max 10 concurrent)
   ↓
8. For each row:
   a. Parse & validate data
   b. Multiply amounts by 100 (convert to paise)
   c. Multiply commission by 100
   d. Create API payload
   e. Send POST to Razorpay API
   f. Log result to CSV
   g. Send WebSocket update
   ↓
9. After all rows processed:
   a. Generate result.csv
   b. Generate failed_uploads.csv
   c. Send SUMMARY via WebSocket
   d. Log to upload_history.json
   ↓
10. Frontend receives summary, displays modal
    ↓
11. Auto-download result CSV
```

### 2. **Real-time Updates Flow**

```
Backend Worker → WebSocket → Frontend → UI Update
```

**Message Types:**

```javascript
1. PROGRESS: "PROGRESS: 45/100"
   → Updates progress bar

2. ROW_LOG: "ROW_LOG: Swiggy | CODE123 | 500 | 31-Dec-2024 | SUCCESS"
   → Appends to execution log

3. SUMMARY: "SUMMARY: {json}"
   → Triggers summary modal

4. FINISHED: Type: "finished"
   → Closes WebSocket
```

### 3. **Authentication Flow**

```
1. User submits credentials
   ↓
2. POST /auth/login {username, password}
   ↓
3. Backend:
   - Reads users.json
   - Compares bcrypt hash
   - Generates JWT (7-day expiry)
   ↓
4. Frontend:
   - Stores JWT in localStorage as 'authToken'
   - Stores user data in AuthContext
   - Redirects to Dashboard
   ↓
5. Subsequent requests:
   - Include header: Authorization: Bearer {token}
   - Backend validates JWT in middleware
```

---

## 🔒 Security Architecture

### 1. **Authentication & Authorization**

```
Layer 1: JWT Token Validation
├── Token stored in localStorage
├── Sent in Authorization header
├── Validated by middleware
└── 7-day expiration

Layer 2: Role-Based Access Control (RBAC)
├── User roles: User, Admin, Super Admin
├── Permissions checked per endpoint
└── Frontend hides unauthorized features

Layer 3: Password Security
├── Bcrypt hashing (cost factor 10)
├── No plain text storage
└── Secure comparison
```

### 2. **API Security**

```
External API (Razorpay):
├── Basic Authentication
├── Credentials stored in environments.json (gitignored)
├── HTTPS only in production
└── Credentials per environment (TEST/PROD)

Internal API:
├── JWT bearer tokens
├── CORS enabled
├── Request validation
└── Error message sanitization
```

### 3. **Data Protection**

```
Sensitive Files (.gitignore):
├── environments.json        # API credentials
├── users.json               # User passwords
├── activity_log.json        # Audit trail
├── upload_history.json      # Upload records
├── password_change_requests.json
└── All CSV/XLSX files

File Permissions:
├── Storage directory: User-only access
├── Config files: Read-only for app
└── Logs: Restricted access
```

### 4. **Audit Trail**

```
All actions logged to activity_log.json:
├── User login/logout
├── Upload start/complete
├── Password change requests
├── Admin actions
└── Timestamp + user + details
```

---

## 🌐 API Integration

### Razorpay Offers Engine API

**Endpoint:**
```
POST {base_url}/offers/voucher-benefits
```

**Authentication:**
```
Basic Auth: base64(username:password)
Header: Authorization: Basic {encoded}
```

**Headers:**
```json
{
  "X-User-Type": "advertiser",
  "X-User-Id": "rzp.merchant.MK6oPUp488NKF6",
  "Content-Type": "application/json",
  "Authorization": "Basic {credentials}"
}
```

**Payload Structure:**
```json
{
  "voucher_benefits": [
    {
      "offer_id": "Q04hUQ3ctFFHmw",
      "voucher_type": "VOUCHER_TYPE_PERSONALISED",
      "voucher_status": "VOUCHER_BENEFIT_STATUS_UNCLAIMED",
      "voucher_value": 100000,           // Amount in paise (1000.00 * 100)
      "expiry_date": 1777334400,         // Unix epoch
      "voucher_code": "VIVEBVZ99LE9C6FF",
      "rzp_commission": "500",           // Commission in paise (5.00 * 100)
      "procurement_batch_id": "Re26OY8zjkGChm",  // 14-char UUID
      "pin": "386478"
    }
  ]
}
```

**Response Handling:**
```go
Success (200-299):
  - Log to result.csv
  - Status: "SUCCESS"

Error (400+):
  - Log to failed_uploads.csv
  - Status: "FAILED"
  - Include error message
```

**Environment Configurations:**

```json
TEST: {
  "base_url": "https://offers-engine-test.dev.razorpay.in/v1",
  "username": "pv",
  "password": "pw"
}

PROD: {
  "base_url": "https://offers-engine-live-statuscake.razorpay.com/v1",
  "username": "rmp_offers",
  "password": "{secure_password}"
}
```

---

## 📡 Real-time Communication

### WebSocket Architecture

**Connection:**
```
URL: ws://localhost:5001/ws
Protocol: Native WebSocket
Lifecycle: Per-upload session
```

**Message Format:**
```javascript
// Batched JSON (multiple messages per frame)
{
  "type": "progress" | "log" | "summary" | "finished",
  "line": "MESSAGE_TYPE: payload"
}

// Parsed by frontend:
messages = event.data.split('\n')
for each message:
  parse JSON
  handle by type
```

**Message Types:**

1. **PROGRESS**
```javascript
{
  "type": "progress",
  "line": "PROGRESS: 45/100"
}
→ Updates: uploadCompleted = 45, uploadTotal = 100
```

2. **ROW_LOG**
```javascript
{
  "type": "log",
  "line": "ROW_LOG: Swiggy | CODE123 | 500 | 31-Dec-2024 (1735689600) | SUCCESS"
}
→ Appends to execution log display
```

3. **SUMMARY**
```javascript
{
  "type": "summary",
  "line": "SUMMARY: {\"successCount\":95,\"failureCount\":5,...}"
}
→ Triggers summary modal with stats
```

4. **FINISHED**
```javascript
{
  "type": "finished"
}
→ Closes WebSocket, triggers auto-download
```

**Connection Management:**
```javascript
Frontend:
- Connects on upload start
- Auto-reconnect on disconnect
- Closes on summary received
- Error handling with user notification

Backend:
- Maintains connection pool
- Sends batched updates
- Graceful shutdown on completion
```

---

## 📁 File Processing Pipeline

### Input File Processing

```
1. File Selection (CSV/XLSX)
   ↓
2. Frontend Parsing (XLSX library)
   ↓
3. Column Validation:
   ✓ ClientName
   ✓ VoucherCode
   ✓ Amount
   ✓ RZP_Commission
   ✓ Validity (DD-MMM-YYYY)
   ✓ PIN
   ↓
4. Convert to CSV String
   ↓
5. Send to Backend
```

### Backend Processing

```
1. Receive CSV string
   ↓
2. Parse using csv.Reader
   ↓
3. Generate Unique IDs:
   - runId (timestamp-based)
   - procurement_batch_id (14-char UUID)
   ↓
4. Create storage directory
   ↓
5. Initialize control.json (state: "running")
   ↓
6. Open log writers:
   - terminal_output.log
   - result.csv
   - failed_uploads.csv
   ↓
7. Process rows concurrently (10 workers)
   ↓
8. Write results to CSV files
   ↓
9. Close all writers
   ↓
10. Send summary via WebSocket
```

### Output File Structure

**result.csv** (Success records)
```csv
ClientName,VoucherCode,Amount,RZP_Commission,Validity,EpochTime,PIN,ProcurementBatchID,OfferID,Status,APIResponse
Swiggy,CODE123,1000,5.00,31-Dec-2024,1735689600,123456,Re26OY8zjkGChm,Q04hUQ3ctFFHmw,SUCCESS,{...}
```

**failed_uploads.csv** (Failed records)
```csv
ClientName,VoucherCode,Amount,RZP_Commission,Validity,EpochTime,PIN,ProcurementBatchID,OfferID,Status,APIResponse
Spencer,CODE999,500,2.50,01-Jan-2025,1735776000,654321,Re26OY8zjkGChm,QadOiEJEm1SYAf,FAILED,{error: "..."}
```

**terminal_output.log**
```
[2024-01-01 12:00:00] Upload started for client: Swiggy
[2024-01-01 12:00:01] Processing row 1/100: CODE123
[2024-01-01 12:00:01] SUCCESS: Row 1 uploaded
[2024-01-01 12:00:02] Processing row 2/100: CODE456
...
[2024-01-01 12:05:00] Upload completed: 95 success, 5 failed
```

---

## 💾 Database & Storage

### File-based Storage (Current)

```
go-backend/
├── config/                          # Configuration & persistent data
│   ├── environments.json           # API credentials
│   ├── users.json                  # User accounts
│   ├── clients.json                # Client-to-OfferID mapping
│   ├── activity_log.json           # Audit trail
│   ├── upload_history.json         # Upload records
│   └── password_change_requests.json
│
└── storage/                         # Per-upload temporary storage
    └── {runId}/
        ├── control.json            # Upload state control
        ├── terminal_output.log     # Execution log
        ├── result.csv              # Success records
        └── failed_uploads.csv      # Failed records
```

### Data Models

#### User Model
```json
{
  "username": "user@example.com",
  "email": "user@example.com",
  "password": "$2a$10$hashed_password",
  "role": "Admin",
  "permissions": ["dashboard", "stock_upload"]
}
```

#### Upload History Model
```json
{
  "id": "run_abc123",
  "username": "user@example.com",
  "client_name": "Swiggy",
  "environment": "TEST",
  "offer_id": "Q04hUQ3ctFFHmw",
  "procurement_batch_id": "Re26OY8zjkGChm",
  "total_rows": 100,
  "success_count": 95,
  "failure_count": 5,
  "timestamp": "2024-01-01T12:00:00Z",
  "result_csv_path": "storage/run_abc123/result.csv",
  "failed_csv_path": "storage/run_abc123/failed_uploads.csv"
}
```

#### Activity Log Model
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "username": "user@example.com",
  "action": "upload_complete",
  "details": {
    "client": "Swiggy",
    "rows": 100,
    "success": 95
  }
}
```

#### Password Change Request Model
```json
{
  "id": "req_xyz789",
  "username": "user@example.com",
  "new_password": "requested_password",
  "status": "pending",
  "requested_at": "2024-01-01T12:00:00Z",
  "reviewed_by": null,
  "reviewed_at": null
}
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure

```javascript
Payload:
{
  "username": "user@example.com",
  "email": "user@example.com",
  "role": "Admin",
  "exp": 1735689600  // 7 days from issue
}

Signing:
- Algorithm: HS256
- Secret: "your-secret-key-here-replace-in-production"
- Expiration: 7 days (168 hours)
```

### Role Hierarchy

```
Super Admin (Full Access)
├── All Admin permissions
├── View all activity logs
├── View all upload history
├── Approve/reject password change requests
└── See notification bell for pending requests

Admin
├── All User permissions
├── View own upload history
├── Request password change
└── User management features (if implemented)

User
├── Dashboard access
├── Stock upload
├── View own profile
└── Request password change
```

### Permission Matrix

| Feature                    | User | Admin | Super Admin |
|---------------------------|------|-------|-------------|
| Login                     | ✅   | ✅    | ✅          |
| Dashboard                 | ✅   | ✅    | ✅          |
| Stock Upload              | ✅   | ✅    | ✅          |
| Profile                   | ✅   | ✅    | ✅          |
| Upload History (own)      | ✅   | ✅    | ✅          |
| Request Password Change   | ✅   | ✅    | ✅          |
| Activity Log (all)        | ❌   | ❌    | ✅          |
| Upload History (all)      | ❌   | ❌    | ✅          |
| Password Requests (approve)| ❌  | ❌    | ✅          |
| Notification Bell         | ❌   | ❌    | ✅          |

---

## 🚀 Deployment Architecture

### Development Environment

```
Machine:        macOS (Darwin 24.6.0)
Frontend:       http://localhost:5173
Backend:        http://localhost:5001
WebSocket:      ws://localhost:5001/ws
Storage:        Local filesystem
```

### Production Considerations

```
Frontend:
├── Build: npm run build
├── Output: dist/
├── Hosting: Nginx / Apache / CDN
└── Env vars: API_BASE_URL

Backend:
├── Build: go build -o gc-distribution-portal
├── Binary: Standalone executable
├── Config: Environment variables / Secrets manager
├── Reverse Proxy: Nginx
├── SSL: Let's Encrypt / AWS Certificate Manager
└── Process Manager: systemd / supervisor

Database:
├── Migrate to PostgreSQL / MySQL for production
├── Connection pooling
└── Backup strategy

Storage:
├── Migrate to S3 / Cloud Storage
├── CDN for CSV downloads
└── Retention policy

Security:
├── HTTPS only
├── Rate limiting
├── WAF (Web Application Firewall)
├── Secrets management (AWS Secrets Manager / Vault)
└── Regular security audits
```

---

## 📊 Performance Characteristics

### Concurrency

```
Upload Processing:
├── Max concurrent API requests: 10
├── Semaphore-based throttling
├── Goroutines per upload: # of rows
└── Memory: O(rows) for result storage

WebSocket:
├── One connection per upload session
├── Batched messages for efficiency
└── Graceful cleanup on completion
```

### Scalability

```
Current Limits:
├── Single server instance
├── File-based storage (no replication)
├── Concurrent uploads: Limited by CPU/memory
└── Max file size: Browser memory limit (~100MB)

Improvement Opportunities:
├── Add load balancer for multiple instances
├── Migrate to database (PostgreSQL)
├── Use message queue (RabbitMQ / Kafka)
├── Implement caching (Redis)
└── Add CDN for static files
```

---

## 🔧 Configuration Management

### Environment Variables (Recommended for Production)

```bash
# Server
PORT=5001
HOST=0.0.0.0

# Security
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=168h

# Razorpay API
RAZORPAY_TEST_URL=https://offers-engine-test.dev.razorpay.in/v1
RAZORPAY_TEST_USER=pv
RAZORPAY_TEST_PASS=pw
RAZORPAY_PROD_URL=https://offers-engine-live-statuscake.razorpay.com/v1
RAZORPAY_PROD_USER=rmp_offers
RAZORPAY_PROD_PASS=secure_password

# Storage
STORAGE_PATH=./storage
CONFIG_PATH=./config

# Upload
MAX_CONCURRENT_UPLOADS=10
UPLOAD_TIMEOUT=300s
```

---

## 📝 API Endpoints Reference

### Authentication
```
POST   /auth/login              Login and get JWT token
```

### Stock Upload
```
POST   /stock/upload            Start upload process
POST   /stock/pause             Pause current upload
POST   /stock/resume            Resume paused upload
POST   /stock/stop              Stop current upload
GET    /stock/download/{runId}/{filename}  Download result CSV
```

### Profile & History
```
GET    /profile                 Get user profile and upload history
GET    /activity-log            Get all activity logs (Super Admin)
GET    /upload-history          Get all upload history (Super Admin)
```

### Password Management
```
POST   /password-request/submit          Submit password change request
GET    /password-request/my-requests     Get own requests
GET    /password-request/all             Get all requests (Super Admin)
POST   /password-request/review          Approve/reject request (Super Admin)
GET    /password-request/pending-count   Get pending count (Super Admin)
```

### WebSocket
```
WS     /ws                      Real-time upload progress updates
```

---

## 🎯 Key Design Decisions

### 1. **File-based Storage**
- **Decision**: Use JSON files instead of database
- **Rationale**: Simple deployment, no DB setup required, sufficient for current scale
- **Trade-off**: Not suitable for high-scale production, manual backup required

### 2. **Goroutines with Semaphore**
- **Decision**: Use goroutines with semaphore (10 concurrent)
- **Rationale**: Efficient concurrency, prevents API overload
- **Trade-off**: Max 10 parallel requests, not configurable at runtime

### 3. **WebSocket for Real-time Updates**
- **Decision**: WebSocket instead of polling
- **Rationale**: True real-time updates, efficient, low latency
- **Trade-off**: More complex than polling, requires persistent connection

### 4. **JWT with 7-day Expiry**
- **Decision**: Long-lived tokens (7 days)
- **Rationale**: Better UX, fewer re-logins
- **Trade-off**: Security vs convenience (acceptable for internal tool)

### 5. **Frontend File Parsing**
- **Decision**: Parse XLSX in browser, send CSV to backend
- **Rationale**: Reduces backend complexity, instant validation
- **Trade-off**: Large files limited by browser memory

### 6. **Pause/Resume via control.json**
- **Decision**: File-based state management
- **Rationale**: Survives server restart, simple implementation
- **Trade-off**: Slight delay in state change (file I/O)

---

## 🔮 Future Enhancements

### Phase 1: Immediate Improvements
- [ ] Add request rate limiting
- [ ] Implement file upload size limits
- [ ] Add CSV preview before upload
- [ ] Export activity logs as CSV
- [ ] Add email notifications

### Phase 2: Scalability
- [ ] Migrate to PostgreSQL database
- [ ] Add Redis for caching & session management
- [ ] Implement message queue (RabbitMQ)
- [ ] Add horizontal scaling support
- [ ] S3 for file storage

### Phase 3: Advanced Features
- [ ] Scheduled uploads
- [ ] Bulk voucher search/filter
- [ ] Advanced analytics dashboard
- [ ] API versioning
- [ ] Webhook support for external integrations

---

## 📚 References

- [Go Documentation](https://golang.org/doc/)
- [React Documentation](https://react.dev/)
- [Gorilla WebSocket](https://github.com/gorilla/websocket)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Razorpay API Documentation](https://razorpay.com/docs/)

---

**Last Updated**: November 23, 2025  
**Version**: 1.0  
**Maintained By**: Development Team

