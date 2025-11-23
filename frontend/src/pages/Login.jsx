import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE_URL } from '../config/api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetRequestSent, setResetRequestSent] = useState(false)
  const [hasApprovedReset, setHasApprovedReset] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()
  const { login, user } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Check if user has approved password reset on component mount
  useEffect(() => {
    const checkResetStatus = async () => {
      if (username && !user) {
        try {
          const response = await fetch(`${API_BASE_URL}/password-request/check-reset-status?username=${username}`)
          const data = await response.json()
          if (data.hasApprovedReset) {
            setHasApprovedReset(true)
            setShowResetForm(true)
            setErr('Your password reset was approved! Please set a new password.')
          }
        } catch (error) {
          console.error('Error checking reset status:', error)
        }
      }
    }
    checkResetStatus()
  }, [username, user])

  const handleLogin = async () => {
    setErr('')
    setLoading(true)
    setShowForgotPassword(false)
    
    if (!username || !password) {
      setErr('Username and password required')
      setLoading(false)
      return
    }

    const result = await login(username, password)
    
    if (result.success) {
      navigate('/dashboard')
    } else {
      setErr(result.message || 'Invalid username or password')
      setShowForgotPassword(true) // Show forgot password option after failed login
      
      // Check if user has approved reset request
      try {
        const response = await fetch(`${API_BASE_URL}/password-request/check-reset-status?username=${username}`)
        const data = await response.json()
        if (data.hasApprovedReset) {
          setHasApprovedReset(true)
          setShowResetForm(true)
          setErr('Your password reset was approved! Please set a new password below.')
        }
      } catch (error) {
        console.error('Error checking reset status:', error)
      }
    }
    
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!username) {
      setErr('Please enter your username first')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/password-request/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })

      const data = await response.json()
      
      if (response.ok) {
        setResetRequestSent(true)
        setErr('')
        alert('Password reset request sent! A Super Admin will review it shortly.')
      } else {
        setErr(data.message || 'Failed to send reset request')
      }
    } catch (error) {
      setErr('Error sending reset request: ' + error.message)
    }
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setErr('Please enter both password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setErr('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setErr('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/password-request/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          newPassword
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        alert('Password reset successfully! Please login with your new password.')
        setShowResetForm(false)
        setHasApprovedReset(false)
        setNewPassword('')
        setConfirmPassword('')
        setPassword('')
        setErr('')
      } else {
        setErr(data.message || 'Failed to reset password')
      }
    } catch (error) {
      setErr('Error resetting password: ' + error.message)
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">GC Distribution Portal</h1>
          <h2 className="text-lg font-semibold text-gray-600">
            {showResetForm ? 'Reset Password' : 'Login'}
          </h2>
        </div>
        
        {!showResetForm ? (
          <>
            <input 
              className="w-full p-3 border-2 rounded-lg mb-3 focus:border-blue-500 focus:outline-none transition" 
              placeholder="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              type="text"
              autoComplete="username"
            />
            
            <input 
              className="w-full p-3 border-2 rounded-lg mb-3 focus:border-blue-500 focus:outline-none transition" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              type="password"
              autoComplete="current-password"
            />
            
            {err && (
              <div className={`text-sm mb-3 p-2 border rounded ${hasApprovedReset ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-500 bg-red-50 border-red-200'}`}>
                {err}
              </div>
            )}
            
            {resetRequestSent && (
              <div className="text-blue-600 text-sm mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                ✓ Reset request sent! Wait for Super Admin approval, then try logging in again.
              </div>
            )}
            
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg mt-2 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed" 
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            
            {showForgotPassword && !resetRequestSent && (
              <button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg mt-3 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed" 
                onClick={handleForgotPassword}
                disabled={loading}
              >
                🔐 Forgot Password? Request Reset
              </button>
            )}
            
            <div className="mt-6 text-xs text-gray-500 text-center">
              <p>Enter your username and password</p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              <strong>Username:</strong> {username}
            </div>
            
            <input 
              className="w-full p-3 border-2 rounded-lg mb-3 focus:border-blue-500 focus:outline-none transition" 
              placeholder="New Password (visible for accuracy)" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              disabled={loading}
              type="text"
              autoComplete="new-password"
            />
            
            <input 
              className="w-full p-3 border-2 rounded-lg mb-3 focus:border-blue-500 focus:outline-none transition" 
              placeholder="Confirm New Password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={loading}
              type="password"
              autoComplete="new-password"
            />
            
            {newPassword && confirmPassword && (
              <div className={`text-sm mb-3 p-2 border rounded ${
                newPassword === confirmPassword 
                  ? 'text-green-700 bg-green-50 border-green-200' 
                  : 'text-orange-700 bg-orange-50 border-orange-200'
              }`}>
                {newPassword === confirmPassword ? '✓ Passwords match!' : '⚠ Passwords do not match'}
              </div>
            )}
            
            {err && (
              <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 border border-red-200 rounded">
                {err}
              </div>
            )}
            
            <button 
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg mt-2 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed" 
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <button 
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg mt-3 font-semibold transition" 
              onClick={() => {
                setShowResetForm(false)
                setHasApprovedReset(false)
                setNewPassword('')
                setConfirmPassword('')
                setErr('')
              }}
            >
              Cancel
            </button>
            
            <div className="mt-6 text-xs text-gray-500 text-center">
              <p>Password must be at least 8 characters</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

