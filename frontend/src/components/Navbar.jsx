import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEnvironment } from '../contexts/EnvironmentContext'

export default function Navbar() {
  const { user, logout, hasPermission } = useAuth()
  const { environment, setEnvironment, ENV_CONFIG } = useEnvironment()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleEnvChange = (e) => {
    setEnvironment(e.target.value)
  }

  // Get environment color based on selection
  const getEnvColor = () => {
    if (environment === 'prod') return 'bg-red-100 text-red-800 border-red-300'
    if (environment === 'test') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <nav className="w-full bg-white shadow-md p-4 flex items-center gap-6 border-b">
      <div className="flex items-center gap-2">
        <img src="/razorpay-logo.svg" alt="Razorpay" className="h-10" />
      </div>
      
      {hasPermission('dashboard') && (
        <Link to="/dashboard" className="hover:text-blue-600 transition">
          Dashboard
        </Link>
      )}
      
      {hasPermission('stock_upload') && (
        <Link to="/stock-upload" className="hover:text-blue-600 transition">
          Stock Upload
        </Link>
      )}
      
      {hasPermission('data_change_operation') && (
        <Link to="/data-change" className="hover:text-blue-600 transition">
          Data Change Operation
        </Link>
      )}
      
      {hasPermission('user_management') && (
        <Link to="/user-management" className="hover:text-blue-600 transition">
          User Management
        </Link>
      )}

      <div className="ml-auto flex items-center gap-4">
        {/* Environment Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Environment:</label>
          <select 
            value={environment} 
            onChange={handleEnvChange} 
            className={`border-2 px-3 py-1 rounded font-medium ${getEnvColor()}`}
          >
            <option value="none">{ENV_CONFIG.none.label}</option>
            <option value="test">{ENV_CONFIG.test.label}</option>
            <option value="prod">{ENV_CONFIG.prod.label}</option>
          </select>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="text-sm">
            <div className="font-medium">{user?.email}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

