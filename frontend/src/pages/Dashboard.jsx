import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { useEnvironment } from '../contexts/EnvironmentContext'

export default function Dashboard(){
  const { user, hasPermission } = useAuth()
  const { getEnvLabel, isEnvSelected } = useEnvironment()

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img src="/razorpay-logo.svg" alt="Razorpay" className="h-12" />
            <div>
              <h1 className="text-3xl font-bold">GC Distribution Portal</h1>
              <p className="text-sm text-gray-500">Gift Card Distribution Management</p>
            </div>
          </div>
          <p className="text-gray-600">Logged in as: <span className="font-semibold">{user?.email}</span></p>
          <p className="text-sm text-gray-500 capitalize">Role: {user?.role?.replace('_', ' ')}</p>
        </div>

        {/* Environment Status */}
        <div className="mb-6">
          {!isEnvSelected() ? (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-1">No Environment Selected</h3>
              <p className="text-yellow-700 text-sm">Please select an environment (Test or Prod) from the navbar dropdown before performing operations.</p>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-1">Environment Selected</h3>
              <p className="text-green-700 text-sm">Current Environment: <span className="font-bold">{getEnvLabel()}</span></p>
            </div>
          )}
        </div>

        {/* Available Operations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hasPermission('stock_upload') && (
              <Link to="/stock-upload" className="block">
                <div className="bg-white border-2 border-blue-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition cursor-pointer">
                  <h3 className="text-lg font-semibold text-blue-600 mb-2">Stock Upload</h3>
                  <p className="text-sm text-gray-600">Upload and manage stock vouchers</p>
                </div>
              </Link>
            )}

            {hasPermission('data_change_operation') && (
              <Link to="/data-change" className="block">
                <div className="bg-white border-2 border-purple-200 rounded-lg p-6 hover:shadow-lg hover:border-purple-400 transition cursor-pointer">
                  <h3 className="text-lg font-semibold text-purple-600 mb-2">Data Change Operation</h3>
                  <p className="text-sm text-gray-600">Perform data modification operations</p>
                </div>
              </Link>
            )}

            {hasPermission('user_management') && (
              <Link to="/user-management" className="block">
                <div className="bg-white border-2 border-green-200 rounded-lg p-6 hover:shadow-lg hover:border-green-400 transition cursor-pointer">
                  <h3 className="text-lg font-semibold text-green-600 mb-2">User Management</h3>
                  <p className="text-sm text-gray-600">Manage user permissions and access</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Permissions Info */}
        <div className="mt-8 bg-gray-50 border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Your Permissions</h3>
          <div className="flex flex-wrap gap-2">
            {user?.permissions?.map(perm => (
              <span key={perm} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {perm.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

