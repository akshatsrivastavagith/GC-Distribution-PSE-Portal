import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [uploadHistory, setUploadHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    environment: '',
    client: '',
    status: ''
  });

  useEffect(() => {
    fetchUploadHistory();
    fetchMyRequests();
  }, [filters]);

  const fetchUploadHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Build query string with filters
      const params = new URLSearchParams();
      if (filters.environment) params.append('environment', filters.environment);
      if (filters.client) params.append('client', filters.client);
      if (filters.status) params.append('status', filters.status);
      
      const queryString = params.toString();
      const url = `http://localhost:5001/profile${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch upload history');
      }

      const data = await response.json();
      setUploadHistory(data.uploadHistory || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5001/password-request/my-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch password requests:', err);
    }
  };

  const handleRequestPasswordChange = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5001/password-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setRequestMessage('Password change request submitted successfully! Awaiting Super Admin approval.');
        setShowRequestModal(true);
        fetchMyRequests();
      } else {
        setRequestMessage(data.message || 'Failed to submit request');
        setShowRequestModal(true);
      }
    } catch (err) {
      setRequestMessage('Error submitting request: ' + err.message);
      setShowRequestModal(true);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      environment: '',
      client: '',
      status: ''
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Success':
        return 'status-success';
      case 'Failed':
        return 'status-failed';
      case 'Partial Success':
        return 'status-partial';
      default:
        return '';
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <div className="user-info">
          <div className="user-detail">
            <span className="label">Username:</span>
            <span className="value">{user?.username}</span>
          </div>
          <div className="user-detail">
            <span className="label">Email:</span>
            <span className="value">{user?.email}</span>
          </div>
          <div className="user-detail">
            <span className="label">Role:</span>
            <span className="value role-badge">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="upload-history-section">
        <div className="section-header">
          <h2>Upload History</h2>
          <div className="header-actions">
            {myRequests.some(req => req.status === 'pending') ? (
              <span className="pending-request-badge">Password Change Request Pending</span>
            ) : (
              <button className="btn-password-change" onClick={handleRequestPasswordChange}>
                Request Password Change
              </button>
            )}
          </div>
        </div>

        {/* Password Change Requests Status */}
        {myRequests.length > 0 && (
          <div className="requests-status">
            <h3>Password Change Requests</h3>
            <div className="requests-list">
              {myRequests.slice(0, 5).map((req) => (
                <div key={req.id} className={`request-item request-${req.status}`}>
                  <div className="request-info">
                    <span className="request-date">{formatDate(req.requestedAt)}</span>
                    <span className={`request-status status-${req.status}`}>{req.status.toUpperCase()}</span>
                  </div>
                  {req.reviewedBy && (
                    <div className="request-review-info">
                      Reviewed by: {req.reviewedBy} on {formatDate(req.reviewedAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-container">
          <div className="filter-group">
            <label>Environment:</label>
            <select 
              value={filters.environment} 
              onChange={(e) => handleFilterChange('environment', e.target.value)}
            >
              <option value="">All</option>
              <option value="TEST">TEST</option>
              <option value="PROD">PROD</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Client:</label>
            <input
              type="text"
              placeholder="Client name"
              value={filters.client}
              onChange={(e) => handleFilterChange('client', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
              <option value="Partial Success">Partial Success</option>
            </select>
          </div>

          <button className="btn-clear-filters" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {/* Upload History Table */}
        {loading ? (
          <div className="loading">Loading upload history...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : uploadHistory.length === 0 ? (
          <div className="no-data">No upload history found</div>
        ) : (
          <div className="table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>File Name</th>
                  <th>Environment</th>
                  <th>Client</th>
                  <th>Total Rows</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Batch ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.timestamp)}</td>
                    <td className="file-name">{entry.fileName}</td>
                    <td>
                      <span className={`env-badge env-${entry.environment.toLowerCase()}`}>
                        {entry.environment}
                      </span>
                    </td>
                    <td>{entry.clientName}</td>
                    <td>{entry.totalRows}</td>
                    <td className="success-count">{entry.successRows}</td>
                    <td className="failed-count">{entry.failedRows}</td>
                    <td className="batch-id">{entry.procurementBatchID}</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Password Change Request</h3>
            <p>{requestMessage}</p>
            <button className="btn-close-modal" onClick={() => setShowRequestModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

