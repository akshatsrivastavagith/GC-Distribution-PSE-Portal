const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const usersPath = path.join(__dirname, '..', 'config', 'users.json');

// In-memory session store (for local development)
const sessions = new Map();

// Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

exports.login = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  let usersData = { users: [] };
  try {
    usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  } catch (e) {
    console.error('Users config not found', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }

  const user = usersData.users.find(u => u.email === email);
  
  if (user) {
    const token = generateToken();
    sessions.set(token, { email: user.email, role: user.role, permissions: user.permissions });
    
    return res.json({ 
      success: true, 
      token,
      user: {
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  }
  
  return res.status(401).json({ success: false, message: 'Unauthorized' });
};

// Verify session middleware
exports.verifySession = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
  
  req.user = session;
  next();
};

// Get current user info
exports.me = (req, res) => {
  res.json({ success: true, user: req.user });
};

// Logout
exports.logout = (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out' });
};

// Get all users (super admin only)
exports.getAllUsers = (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  try {
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    res.json({ success: true, users: usersData.users });
  } catch (e) {
    console.error('Error reading users', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user permissions (super admin only)
exports.updateUserPermissions = (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  const { email, permissions } = req.body;
  
  if (!email || !permissions) {
    return res.status(400).json({ success: false, message: 'Email and permissions required' });
  }
  
  try {
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const userIndex = usersData.users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    usersData.users[userIndex].permissions = permissions;
    fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
    
    res.json({ success: true, message: 'Permissions updated', user: usersData.users[userIndex] });
  } catch (e) {
    console.error('Error updating permissions', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

