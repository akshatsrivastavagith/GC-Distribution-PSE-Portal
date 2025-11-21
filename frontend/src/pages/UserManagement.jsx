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
  const [editingUser, setEditingUser] = useState(null)
  const { token } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:5001/auth/users', {
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
      const res = await fetch('http://localhost:5001/auth/users/permissions', {
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">User Management</h1>
          <p className="text-gray-600">Manage user permissions and access control</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-white border rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Email</th>
                <th className="text-left p-4 font-semibold">Role</th>
                <th className="text-left p-4 font-semibold">Permissions</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editingUser?.email === user.email
                const currentUser = isEditing ? editingUser : user

                return (
                  <tr key={user.email} className="border-b hover:bg-gray-50">
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
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
                        <button
                          onClick={() => startEditing(user)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                        >
                          Edit
                        </button>
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
      </div>
    </div>
  )
}

