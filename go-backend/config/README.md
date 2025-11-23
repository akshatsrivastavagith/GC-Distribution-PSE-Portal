# Configuration Files

This directory contains configuration files for the GC Distribution Portal backend.

## ⚠️ IMPORTANT: Security Notice

**NEVER commit sensitive configuration files to Git!**

The following files are excluded from Git (via `.gitignore`) because they contain sensitive credentials:
- `environments.json` - API credentials for TEST and PROD environments
- `users.json` - User login credentials
- `activity_log.json` - User activity logs
- `upload_history.json` - Upload history records
- `password_change_requests.json` - Password change requests

## 🔧 Setup Instructions

### 1. Create `environments.json`

Copy the example file and fill in your actual credentials:

```bash
cp environments.json.example environments.json
```

Then edit `environments.json` with your actual API credentials:

```json
{
  "TEST": {
    "base_url": "https://your-test-api-url.com/v1",
    "username": "your_test_username",
    "password": "your_test_password"
  },
  "PROD": {
    "base_url": "https://your-prod-api-url.com/v1",
    "username": "your_prod_username",
    "password": "your_prod_password"
  }
}
```

### 2. Create `users.json`

Copy the example file and set up your users:

```bash
cp users.json.example users.json
```

Then edit `users.json` with your actual user credentials:

```json
[
  {
    "username": "admin_username",
    "email": "admin@example.com",
    "password": "secure_password_here",
    "role": "Admin",
    "permissions": ["dashboard", "stock_upload", "user_management"]
  },
  {
    "username": "superadmin_username",
    "email": "superadmin@example.com",
    "password": "secure_password_here",
    "role": "Super Admin",
    "permissions": ["dashboard", "stock_upload", "data_change_operation", "user_management"]
  },
  {
    "username": "user_username",
    "email": "user@example.com",
    "password": "secure_password_here",
    "role": "User",
    "permissions": ["dashboard", "stock_upload"]
  }
]
```

**Note**: Passwords should be plain text in this file. The backend will handle them securely.

## 📝 Configuration Files Reference

### `clients.json` (safe to commit)
Contains client configurations (names and offer IDs). This file is tracked in Git.

### `environments.json` (DO NOT COMMIT)
Contains API endpoint URLs and authentication credentials for TEST and PROD environments.

**Fields**:
- `base_url`: API endpoint base URL
- `username`: Basic auth username
- `password`: Basic auth password

### `users.json` (DO NOT COMMIT)
Contains user login credentials and permissions.

**Fields**:
- `username`: Login username
- `email`: User email
- `password`: Plain text password (handled securely by backend)
- `role`: User role (User, Admin, Super Admin)
- `permissions`: Array of permitted features

**Available Permissions**:
- `dashboard`: Access to dashboard
- `stock_upload`: Stock upload functionality
- `data_change_operation`: Data change operations (Super Admin only)
- `user_management`: User management features

**Available Roles**:
- `User`: Basic access to stock upload and dashboard
- `Admin`: Extended access including user management
- `Super Admin`: Full access including data change operations, activity logs, and password request approvals

### Auto-generated files (DO NOT COMMIT)

These files are created automatically by the application:

- `activity_log.json`: Logs of user activities
- `upload_history.json`: Record of all uploads
- `password_change_requests.json`: Password change requests from users
- `procurement_batch_id.txt`: Generated procurement batch IDs

## 🔐 Security Best Practices

1. **Never commit credentials**: Always use `.example` files for templates
2. **Use strong passwords**: Especially for production environments
3. **Rotate credentials regularly**: Update API keys and user passwords periodically
4. **Limit access**: Only give users the permissions they need
5. **Review logs**: Regularly check activity logs for suspicious behavior

## 🚀 Quick Start

For a new deployment:

```bash
# Navigate to config directory
cd go-backend/config

# Create configuration files from examples
cp environments.json.example environments.json
cp users.json.example users.json

# Edit the files with your actual credentials
nano environments.json
nano users.json

# Start the backend
cd ..
go run main.go
```

## 📚 Additional Information

For more details on configuration and deployment, see:
- `/QUICKSTART-GO.md` - Quick start guide
- `/GO_DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `/NEW_FEATURES_GUIDE.md` - Feature documentation

