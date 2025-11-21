# PSE Portal - Authentication & Authorization Guide

## Overview

The PSE Portal implements a comprehensive role-based access control (RBAC) system with email-based authentication. This guide explains how the system works and how to manage users.

## Architecture

### Authentication Flow

1. **Login**: Users enter their email address
2. **Verification**: Backend checks if email exists in `backend/config/users.json`
3. **Session Creation**: Server generates a session token stored in-memory
4. **Token Storage**: Frontend stores token in localStorage
5. **Protected Routes**: All routes except login require valid authentication

### Role Hierarchy

```
Super Admin (highest privileges)
    ↓
Admin (operational privileges)
    ↓
User (limited privileges)
```

## User Roles

### 1. Super Admin
- **Full System Access**: Can access all operations
- **User Management**: Can modify permissions for all users
- **Available Permissions**:
  - Dashboard
  - Stock Upload
  - Data Change Operation
  - User Management (exclusive to Super Admin)

**Example User**: `chanchal.s@razorpay.com`

### 2. Admin
- **Operational Access**: Can perform all business operations
- **No User Management**: Cannot modify other users' permissions
- **Available Permissions**:
  - Dashboard
  - Stock Upload
  - Data Change Operation

**Example User**: `akshat.s@razorpay.com`

### 3. User
- **Limited Access**: Can only access specifically assigned operations
- **Customizable**: Super Admin can enable/disable specific permissions
- **Default Permissions**:
  - Dashboard
  - One or more operational permissions as assigned

**Example User**: `manoj.rt@razorpay.com` (Stock Upload only)

## Permission System

### Available Permissions

| Permission ID | Display Name | Description |
|--------------|--------------|-------------|
| `dashboard` | Dashboard | Home page with overview |
| `stock_upload` | Stock Upload | Upload and manage stock vouchers |
| `data_change_operation` | Data Change Operation | Perform data modifications |
| `user_management` | User Management | Manage user permissions (Super Admin only) |

### How Permissions Work

1. **Navbar Display**: Users only see menu items they have permission for
2. **Route Protection**: Attempting to access unauthorized routes shows "Access Denied"
3. **Dynamic UI**: Dashboard cards only show operations user can access
4. **API Protection**: Backend verifies permissions before executing operations

## Environment Management

### Environment Selector

The portal supports multiple environments with different API base URLs:

| Environment | Base URL |
|------------|----------|
| **Test** | `https://offers-engine-test.dev.razorpay.in` |
| **Prod** | `https://offers-engine-live-statuscake.razorpay.com` |
| **Choose your env** | Default - No URL (must select before operations) |

### Environment Features

- **Persistent Selection**: Environment choice saved in localStorage
- **Visual Indicators**: Color-coded dropdown (Yellow=Test, Red=Prod, Gray=Not Selected)
- **Operation Blocking**: Most operations require environment selection
- **Global Context**: All API calls and scripts use selected environment

## Managing Users

### Adding a New User

1. Open `backend/config/users.json`
2. Add new user object:

```json
{
  "email": "newuser@razorpay.com",
  "role": "user",
  "permissions": [
    "dashboard",
    "stock_upload"
  ]
}
```

3. Restart backend server
4. User can now login with their email

### Modifying User Permissions (Super Admin)

1. Login as Super Admin
2. Navigate to **User Management** from navbar
3. Find the user in the table
4. Click **Edit** button
5. Toggle permissions on/off using checkboxes
6. Click **Save** to apply changes
7. Changes take effect immediately

### Removing a User

1. Open `backend/config/users.json`
2. Remove the user's object from the array
3. Restart backend server

## Security Features

### Session Management

- **In-Memory Storage**: Sessions stored in backend memory (local development)
- **Token-Based**: Each session has unique cryptographic token
- **Automatic Cleanup**: Sessions cleared on logout
- **Token Expiry**: Sessions persist until explicit logout or server restart

### Route Protection

- **Frontend Guards**: `ProtectedRoute` component checks authentication
- **Backend Middleware**: `verifySession` validates all API requests
- **Permission Checks**: Both frontend and backend verify permissions
- **Redirect on Failure**: Unauthorized users redirected to login

### Direct URL Access Prevention

Users cannot bypass authentication by:
- Typing URLs directly in browser
- Using browser back/forward buttons
- Bookmarking protected pages
- Using curl/API tools without valid token

All protected routes check authentication before rendering.

## Configuration Files

### `backend/config/users.json`

Main user database with roles and permissions:

```json
{
  "users": [
    {
      "email": "user@example.com",
      "role": "admin",
      "permissions": ["dashboard", "stock_upload"]
    }
  ]
}
```

### Session Storage

- **Backend**: In-memory Map (development)
- **Frontend**: localStorage key `authToken`
- **Environment**: localStorage key `environment`

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/login` | POST | No | Login with email |
| `/auth/me` | GET | Yes | Get current user info |
| `/auth/logout` | POST | Yes | Logout and clear session |
| `/auth/users` | GET | Yes (Super Admin) | Get all users |
| `/auth/users/permissions` | PUT | Yes (Super Admin) | Update user permissions |

## Best Practices

### For Super Admins

1. **Principle of Least Privilege**: Only grant permissions users actually need
2. **Regular Audits**: Periodically review user permissions
3. **Environment Awareness**: Ensure users understand Test vs Prod
4. **Documentation**: Keep track of why specific permissions were granted

### For All Users

1. **Environment Selection**: Always verify environment before operations
2. **Logout**: Logout when finished, especially on shared computers
3. **Email Accuracy**: Use exact Razorpay email for login
4. **Permission Requests**: Contact Super Admin for additional access

## Troubleshooting

### "Unauthorized" Error on Login

- Verify email is in `users.json`
- Check for typos in email address
- Ensure backend server is running
- Check backend console for errors

### "Access Denied" on Page

- User doesn't have required permission
- Contact Super Admin to request access
- Verify correct user is logged in

### Environment Not Selected Warning

- Select Test or Prod from navbar dropdown
- Warning appears on operations requiring API calls
- Selection persists across page refreshes

### Session Expired

- Token may have been cleared
- Server may have restarted
- Simply login again

## Development Notes

### Local Development

- Backend runs on `http://localhost:5001`
- Frontend runs on `http://localhost:5173`
- Sessions stored in memory (cleared on restart)
- CORS enabled for local development

### Production Considerations

For production deployment, consider:
- Database-backed user storage
- Redis/persistent session storage
- JWT tokens with expiry
- HTTPS enforcement
- Rate limiting on login endpoint
- Audit logging for permission changes

## Example Workflows

### Workflow 1: New User Onboarding

1. Super Admin adds user to `users.json` with minimal permissions
2. User logs in and tests access
3. User requests additional permissions
4. Super Admin grants via User Management UI
5. User can immediately access new features

### Workflow 2: Stock Upload Operation

1. User logs in
2. Selects environment (Test/Prod) from navbar
3. Navigates to Stock Upload
4. Uploads file and configures settings
5. System uses selected environment for API calls
6. Results displayed in terminal

### Workflow 3: Permission Audit

1. Super Admin logs in
2. Opens User Management
3. Reviews each user's permissions
4. Adjusts as needed using Edit/Save
5. Changes reflected immediately

## Support

For issues or questions:
- Check this guide first
- Review backend console logs
- Contact system administrator
- Check `PROJECT_INFO.md` for technical details

