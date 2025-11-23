import { API_BASE_URL, WS_URL } from "../config/api"
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'stock_upload', label: 'Stock Upload' },
  { id: 'data_change_operation', label: 'Data Change Operation' },
  { id: 'user_management', label: 'User Management' }
]

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'user',
    permissions: []
  })
  const { token } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
      } else {
        setError(data.message || 'Failed to fetch users')
      }
    } catch (e) {
      console.error('Error fetching users', e)
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (user, permissionId) => {
    if (editingUser?.email === user.email) {
      const newPermissions = editingUser.permissions.includes(permissionId)
        ? editingUser.permissions.filter(p => p !== permissionId)
        : [...editingUser.permissions, permissionId]
      
      setEditingUser({ ...editingUser, permissions: newPermissions })
    }
  }

  const handleSavePermissions = async (user) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: editingUser.email,
          permissions: editingUser.permissions
        })
      })
      
      const data = await res.json()
      if (data.success) {
        // Update local state
        setUsers(users.map(u => u.email === editingUser.email ? editingUser : u))
        setEditingUser(null)
        setError('')
      } else {
        setError(data.message || 'Failed to update permissions')
      }
    } catch (e) {
      console.error('Error updating permissions', e)
      setError('Failed to update permissions')
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
  }

  const startEditing = (user) => {
    setEditingUser({ ...user })
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate fields
    if (!newUser.username || !newUser.email || !newUser.role) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      })

      const data = await res.json()
      if (data.success) {
        setSuccess('User created successfully!')
        setShowCreateModal(false)
        setNewUser({
          username: '',
          email: '',
          role: 'user',
          permissions: []
        })
        fetchUsers() // Refresh user list
      } else {
        setError(data.message || 'Failed to create user')
      }
    } catch (e) {
      console.error('Error creating user', e)
      setError('Failed to create user')
    }
  }

  const handleNewUserRoleChange = (role) => {
    // Set default permissions based on role
    let defaultPermissions = []
    switch (role) {
      case 'super_admin':
        defaultPermissions = ['dashboard', 'stock_upload', 'data_change_operation', 'user_management']
        break
      case 'admin':
        defaultPermissions = ['dashboard', 'stock_upload', 'data_change_operation']
        break
      case 'user':
        defaultPermissions = ['dashboard', 'stock_upload']
        break
    }
    setNewUser({ ...newUser, role, permissions: defaultPermissions })
  }

  const handleNewUserPermissionToggle = (permissionId) => {
    const updatedPermissions = newUser.permissions.includes(permissionId)
      ? newUser.permissions.filter(p => p !== permissionId)
      : [...newUser.permissions, permissionId]
    setNewUser({ ...newUser, permissions: updatedPermissions })
  }

  const handleToggleUserStatus = async (user) => {
    setError('')
    setSuccess('')

    const action = user.active ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          active: !user.active
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccess(data.message)
        fetchUsers() // Refresh user list
      } else {
        setError(data.message || 'Failed to update user status')
      }
    } catch (e) {
      console.error('Error updating user status', e)
      setError('Failed to update user status')
    }
  }

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="p-6 flex items-center justify-center">
          <div className="text-lg">Loading users...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">User Management</h1>
            <p className="text-gray-600">Manage user permissions and access control</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Create New User
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="bg-white border rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Email</th>
                <th className="text-left p-4 font-semibold">Role</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Permissions</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editingUser?.email === user.email
                const currentUser = isEditing ? editingUser : user

                return (
                  <tr key={user.email} className={`border-b hover:bg-gray-50 ${!user.active ? 'bg-gray-100' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span>{user.email}</span>
                        {!user.active && (
                          <span className="text-xs text-gray-500 italic">(deactivated)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.active ? (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        {AVAILABLE_PERMISSIONS.map(perm => {
                          const hasPermission = currentUser.permissions.includes(perm.id)
                          return (
                            <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={() => handlePermissionToggle(user, perm.id)}
                                disabled={!isEditing}
                                className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span className={`text-sm ${!isEditing && 'text-gray-600'}`}>
                                {perm.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      {!isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditing(user)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                            disabled={!user.active}
                          >
                            Edit
                          </button>
                          {user.active ? (
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSavePermissions(user)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold mb-4">Create New User</h2>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., johndoe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., john.doe@razorpay.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => handleNewUserRoleChange(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Permissions</label>
                  <div className="space-y-2 border rounded p-3 bg-gray-50">
                    {AVAILABLE_PERMISSIONS.map(perm => (
                      <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUser.permissions.includes(perm.id)}
                          onChange={() => handleNewUserPermissionToggle(perm.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewUser({
                        username: '',
                        email: '',
                        role: 'user',
                        permissions: []
                      })
                      setError('')
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              <div className="mt-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 p-3 rounded">
                <strong>Note:</strong> Default password for all users is <code className="bg-white px-2 py-1 rounded">Greninja@#7860</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

