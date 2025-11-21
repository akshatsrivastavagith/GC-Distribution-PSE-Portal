import Navbar from '../components/Navbar'
import { useEnvironment } from '../contexts/EnvironmentContext'
import { useState } from 'react'

export default function DataChangeOperation() {
  const { isEnvSelected, getBaseUrl, getEnvLabel } = useEnvironment()
  const [loading, setLoading] = useState(false)

  if (!isEnvSelected()) {
    return (
      <div>
        <Navbar />
        <div className="p-6">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Environment Not Selected</h2>
            <p className="text-yellow-700">Please select an environment (Test or Prod) from the dropdown in the navbar before proceeding.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Data Change Operation</h1>
          <p className="text-gray-600">
            Current Environment: <span className="font-semibold">{getEnvLabel()}</span>
          </p>
          <p className="text-sm text-gray-500">Base URL: {getBaseUrl()}</p>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Available Operations</h2>
          <p className="text-gray-600 mb-4">Data change operations will be integrated here.</p>
          
          <div className="space-y-3">
            <div className="border rounded p-4 hover:bg-gray-50 cursor-pointer transition">
              <h3 className="font-semibold">Operation 1</h3>
              <p className="text-sm text-gray-600">Description of operation 1</p>
            </div>
            
            <div className="border rounded p-4 hover:bg-gray-50 cursor-pointer transition">
              <h3 className="font-semibold">Operation 2</h3>
              <p className="text-sm text-gray-600">Description of operation 2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

