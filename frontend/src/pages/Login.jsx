import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, user } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleLogin = async () => {
    setErr('')
    setLoading(true)
    
    if (!email) {
      setErr('Email required')
      setLoading(false)
      return
    }

    const result = await login(email)
    
    if (result.success) {
      navigate('/dashboard')
    } else {
      setErr(result.message || 'Unauthorized')
    }
    
    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-96 p-8 shadow-2xl rounded-2xl border bg-white">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/razorpay-logo.svg" alt="Razorpay" className="h-14" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">PSE Portal</h1>
          <h2 className="text-lg font-semibold text-gray-600">Login</h2>
        </div>
        
        <input 
          className="w-full p-3 border-2 rounded-lg mb-3 focus:border-blue-500 focus:outline-none transition" 
          placeholder="Enter your email" 
          value={email} 
          onChange={e => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          type="email"
        />
        
        {err && (
          <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 border border-red-200 rounded">
            {err}
          </div>
        )}
        
        <button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg mt-2 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed" 
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Use your Razorpay email to login</p>
        </div>
      </div>
    </div>
  )
}

