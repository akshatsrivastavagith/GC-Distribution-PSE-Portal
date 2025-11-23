# New Features Guide - Profile, Activity Log & Password Requests

## 🔄 IMPORTANT: Hard Refresh Required!
After the new features are added, please do a **hard refresh** in your browser:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

Or simply **log out and log back in**.

---

## 📍 Where to Find Everything

### 1. **Profile Page** (All Users: User, Admin, Super Admin)
**Location**: Top navigation bar → "Profile" link

**What you'll see:**
- Your user information (username, email, role)
- **Upload History** table showing:
  - Date & Time
  - File Name
  - Environment (TEST/PROD)
  - Client
  - Total/Success/Failed rows
  - Procurement Batch ID
  - Status (Success/Failed/Partial Success)
  
**Filters Available:**
- Environment (TEST/PROD)
- Client name
- Status (Success/Failed/Partial Success)

**Password Change Request:**
- Button to request password change
- View status of your requests (Pending/Approved/Rejected)

---

### 2. **Notification Bell Icon** (Super Admin Only)
**Location**: Top navigation bar → Bell icon (🔔)

**What it shows:**
- Red badge with number = pending password change requests
- Click to go to Password Requests management page
- Auto-refreshes every 30 seconds

**NOTE:** If you don't see the bell icon:
1. Make sure you're logged in as Super Admin (adchanchal)
2. Hard refresh your browser
3. Check if `user.role === 'Super Admin'` (case-sensitive)

---

### 3. **Activity Log** (Super Admin Only)
**Location**: Top navigation bar → "Activity Log" link

**Two Tabs:**

#### Tab 1: Activity Log
Shows ALL operations performed by users/admins/super admin:
- Stock Uploads
- Password Change Requests
- Login activities
- Etc.

**Columns:**
- Date & Time
- Username
- Operation
- Environment
- Details
- Status (Success/Failed/Partial Success)

**Filters:**
- Username
- Operation type
- Environment (TEST/PROD)

#### Tab 2: Upload History
Shows ALL users' upload history:
- Date & Time
- Username
- File Name
- Environment
- Client
- Total/Success/Failed rows
- Batch ID
- Status

**Filters:**
- Username
- Environment (TEST/PROD)
- Client
- Status

---

### 4. **Password Requests Management** (Super Admin Only)
**Location**: Click the Bell icon (🔔) OR navigate to `/password-requests`

**Pending Requests Section:**
- Card-based UI showing pending requests
- Each card shows: Username, Email, Role, Request Date
- Actions: Approve ✅ or Reject ❌
- Confirmation modal before approving/rejecting

**Recent Reviews Section:**
- Table showing all reviewed requests
- Shows who reviewed and when
- Status: Approved or Rejected

---

## 🧪 Testing the Features

### Step 1: Test Upload History (Any User)
1. Log in as any user (akgreninja, razormanoj, or adchanchal)
2. Go to Stock Upload
3. Upload a file and complete the upload
4. Go to Profile page
5. You should see your upload in the history

### Step 2: Test Password Change Request (Any User)
1. Go to Profile page
2. Click "Request Password Change"
3. A modal will confirm your request is submitted
4. The button will change to "Password Change Request Pending"
5. You'll see your request status in the "Password Change Requests" section

### Step 3: Test Super Admin Notification Bell
1. Log out
2. Log in as Super Admin (adchanchal / Greninja@#7860)
3. Look at the top navigation bar - you should see a bell icon (🔔)
4. If there are pending requests, you'll see a red badge with the count
5. Click the bell to go to Password Requests page

### Step 4: Test Password Request Approval/Rejection
1. As Super Admin, click the bell icon
2. You'll see pending password change requests
3. Click "Approve" or "Reject" on any request
4. Confirm your action in the modal
5. The request will move to "Recent Reviews" section

### Step 5: Test Activity Log
1. As Super Admin, click "Activity Log" in the navigation
2. **Activity Log tab**: See all operations by all users
   - Try filtering by username, operation, environment
3. **Upload History tab**: See all uploads by all users
   - Try filtering by username, environment, client, status

---

## 🐛 Troubleshooting

### "I don't see the Profile link"
- Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
- Log out and log back in

### "I don't see the bell icon" (Super Admin)
- Make sure you're logged in as **adchanchal** (username, not email)
- The role must be exactly "Super Admin" (case-sensitive)
- Hard refresh your browser
- Check browser console for errors (F12 → Console)

### "Upload History is empty"
- The history only tracks uploads made AFTER this feature was implemented
- Try doing a new upload to see it appear
- Make sure the backend is running on port 5001

### "Activity Log shows nothing"
- Activities are only logged AFTER this feature was implemented
- Try doing operations (upload, password request) to see them logged
- Use the filters to narrow down search

### "Password change request button doesn't work"
- Make sure backend is running (port 5001)
- Check browser console for errors
- Try logging out and back in

---

## 📊 API Endpoints (For Reference)

- `GET /profile` - Get user profile with upload history (filtered)
- `GET /activity-log` - Get all activity logs (Super Admin, filtered)
- `GET /upload-history` - Get all upload history (Super Admin, filtered)
- `POST /password-request` - Create password change request
- `GET /password-request/my-requests` - Get user's own requests
- `GET /password-request/all` - Get all requests (Super Admin)
- `POST /password-request/review` - Approve/reject request (Super Admin)
- `GET /password-request/pending-count` - Get pending count (Super Admin)

---

## 🎯 Current Servers

- **Backend**: http://localhost:5001
- **Frontend**: http://localhost:5173

---

## ✅ Feature Checklist

- [x] User Profile page with upload history
- [x] Upload history filters (environment, client, status)
- [x] Password change request system
- [x] Super Admin notification bell icon with count
- [x] Password request approval/rejection workflow
- [x] Activity Log with filters (username, operation, environment)
- [x] All users' upload history for Super Admin
- [x] Real-time notification count updates (every 30 seconds)

---

## 📝 User Credentials

- **Admin**: akgreninja / Greninja@#7860
- **Super Admin**: adchanchal / Greninja@#7860
- **User**: razormanoj / Greninja@#7860

