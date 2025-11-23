import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { EnvironmentProvider } from './contexts/EnvironmentContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StockUpload from './pages/StockUpload'
import DataChangeOperation from './pages/DataChangeOperation'
import UserManagement from './pages/UserManagement'
import Profile from './pages/Profile'
import ActivityLog from './pages/ActivityLog'
import PasswordRequests from './pages/PasswordRequests'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EnvironmentProvider>
          <Routes>
            <Route path='/' element={<Login />} />
            <Route 
              path='/dashboard' 
              element={
                <ProtectedRoute requiredPermission="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path='/stock-upload' 
              element={
                <ProtectedRoute requiredPermission="stock_upload">
                  <StockUpload />
                </ProtectedRoute>
              } 
            />
            <Route 
              path='/data-change' 
              element={
                <ProtectedRoute requiredPermission="data_change_operation">
                  <DataChangeOperation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path='/user-management' 
              element={
                <ProtectedRoute requiredPermission="user_management">
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path='/profile' 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path='/activity-log' 
              element={
                <ProtectedRoute>
                  <ActivityLog />
                </ProtectedRoute>
              } 
            />
            <Route 
              path='/password-requests' 
              element={
                <ProtectedRoute>
                  <PasswordRequests />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </EnvironmentProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

