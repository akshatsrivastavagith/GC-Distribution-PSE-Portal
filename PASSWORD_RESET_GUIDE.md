# 🔐 Password Reset Feature - User Guide

## ✅ Features Implemented

### 1. **Forgot Password** (From Login Page)
- Users who forgot their password can request a reset
- NO login required
- Super Admin approval needed

### 2. **Request Password Change** (From Profile Page)
- Logged-in users can request to change their password
- Super Admin approval needed

### 3. **Super Admin Approval System**
- Bell icon shows pending request count
- Password Requests page to approve/reject
- Real-time updates

---

## 🎯 How To Use

### **For Users Who FORGOT Password:**

1. **Go to Login Page**
   - URL: `http://ec2-3-6-97-52.ap-south-1.compute.amazonaws.com`
   - Or: `http://3.6.97.52`

2. **Attempt Login**
   - Enter your username
   - Enter any password (it will fail)
   - You'll see: "Invalid username or password"

3. **Request Reset**
   - Click the **"🔐 Forgot Password? Request Reset"** button
   - You'll see: "Reset request sent!"

4. **Wait for Approval**
   - A Super Admin will review your request
   - You'll be notified

5. **Reset Password**
   - Go back to login page
   - Enter your username
   - Try to login → System will show **"Reset Password"** form
   - Enter new password twice
   - Click "Reset Password"
   - Done! Login with new password

---

### **For Logged-In Users (Password Change Request):**

1. **Login to Portal**

2. **Go to Profile Page**
   - Click "Profile" in the navbar

3. **Request Password Change**
   - Scroll down to see **"Request Password Change"** button
   - Click it
   - You'll see confirmation message

4. **Wait for Approval**
   - Super Admin will review

5. **Change Password** (after approval)
   - Go back to Profile page
   - You'll see option to set new password
   - Enter new password
   - Done!

---

### **For Super Admins (Approving Requests):**

1. **Login as Super Admin**
   - You'll see a 🔔 **bell icon** in the navbar
   - Number shows pending requests

2. **Go to Password Requests Page**
   - Click the bell icon
   - Or navigate to: `/password-requests`

3. **Review Requests**
   - See list of all pending requests
   - Shows: Username, Email, Role, Request Date

4. **Approve or Reject**
   - Click **"Approve"** - User can reset password
   - Click **"Reject"** - User must try again

5. **Done!**
   - User will be notified
   - They can now reset their password

---

## 🐛 Current Known Issues

### **Issue 1: "Request Password Change" from Profile**
**Error:** "Unexpected token '<', "<html>..."

**Status:** ✅ **FIXED** - Nginx configuration updated

**Solution:** The Nginx regex was requiring a trailing `/`, but the endpoint was `/password-request` without a slash. Updated regex from:
```nginx
location ~ ^/(auth|stock|profile|activity-log|upload-history|password-request|config)/ {
```
To:
```nginx
location ~ ^/(auth|stock|profile|activity-log|upload-history|password-request|config)(/|$) {
```

### **Issue 2: Bell Icon Not Showing**
**Status:** ✅ **ALREADY IMPLEMENTED**

The bell icon is ALREADY in the navbar! It should show for:
- **Super Admin** users only
- Located in the top-right area
- Shows number of pending requests

**If you don't see it:**
1. Make sure you're logged in as **Super Admin** (not just Admin)
2. Try hard-refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Clear browser cache

---

## 📝 Super Admin Users

Based on the User Management screenshot, these are Super Admins:
- ✅ `chanchal.s@razorpay.com` - Super Admin
- ✅ `harsh.l@razorpay.com` - Super Admin

These are NOT Super Admins (won't see bell icon):
- ❌ `akshat.s@razorpay.com` - Admin
- ❌ `manoj.rt@razorpay.com` - User

---

## 🔧 Technical Details

### **Endpoints:**

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/password-request` | POST | ✅ Yes | Request password change (logged in) |
| `/password-request/forgot` | POST | ❌ No | Forgot password (no login) |
| `/password-request/check-reset-status` | GET | ❌ No | Check if user has approved reset |
| `/password-request/reset-password` | POST | ❌ No | Reset password after approval |
| `/password-request/my-requests` | GET | ✅ Yes | Get user's own requests |
| `/password-request/all` | GET | ✅ Super Admin | Get all requests |
| `/password-request/review` | POST | ✅ Super Admin | Approve/reject request |
| `/password-request/pending-count` | GET | ✅ Super Admin | Get count of pending requests |

### **Request Statuses:**
- `pending` - Waiting for Super Admin review
- `approved` - Super Admin approved, user can reset
- `rejected` - Super Admin rejected
- `completed` - User has reset their password

---

## 🚀 Testing

### **Test Forgot Password Flow:**

```bash
# 1. Request reset (no auth needed)
curl -X POST http://3.6.97.52/password-request/forgot \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user"}'

# 2. Check reset status
curl "http://3.6.97.52/password-request/check-reset-status?username=test_user"

# 3. Reset password (after approval)
curl -X POST http://3.6.97.52/password-request/reset-password \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user","newPassword":"NewPassword123"}'
```

---

## ✅ Checklist

- [x] Forgot password from login page
- [x] Request password change from profile
- [x] Super Admin approval page
- [x] Bell icon with pending count
- [x] Nginx routing fixed
- [x] Password validation (8+ characters)
- [x] Secure hashing (bcrypt)
- [x] One pending request per user limit
- [x] Auto-complete status after reset

---

## 📞 Need Help?

If you encounter issues:

1. **Hard refresh browser:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Check Nginx logs:** `sudo journalctl -u nginx -f`
3. **Check backend logs:** `sudo journalctl -u gc-distribution.service -f`
4. **Test API directly:** Use the curl commands above

---

**Portal URL:** `http://ec2-3-6-97-52.ap-south-1.compute.amazonaws.com`

**Last Updated:** Nov 23, 2025

