import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './PasswordRequests.css';

const PasswordRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmAction, setConfirmAction] = useState('');

  useEffect(() => {
    // Check if user is Super Admin
    if (user?.role !== 'Super Admin') {
      navigate('/');
      return;
    }
    
    fetchRequests();
  }, [user, navigate]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('http://localhost:5001/password-request/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch password change requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (request, action) => {
    setSelectedRequest(request);
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const confirmReview = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('http://localhost:5001/password-request/review', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: confirmAction
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to review request');
      }

      // Refresh requests list
      await fetchRequests();
      setShowConfirmModal(false);
      setSelectedRequest(null);
    } catch (err) {
      setError(err.message);
      setShowConfirmModal(false);
    }
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
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  // Separate requests by status
  const pendingRequests = requests.filter(req => req.status === 'pending');
  const reviewedRequests = requests.filter(req => req.status !== 'pending');

  return (
    <div className="password-requests-container">
      <div className="password-requests-header">
        <h1>Password Change Requests</h1>
        <p>Review and manage password change requests from users</p>
      </div>

      {loading ? (
        <div className="loading">Loading requests...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          {/* Pending Requests */}
          <div className="requests-section">
            <h2>Pending Requests ({pendingRequests.length})</h2>
            {pendingRequests.length === 0 ? (
              <div className="no-data">No pending requests</div>
            ) : (
              <div className="requests-grid">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="request-card pending-card">
                    <div className="card-header">
                      <div className="user-info">
                        <div className="username">{request.username}</div>
                        <div className="user-role">{request.role}</div>
                      </div>
                      <span className={`status-badge ${getStatusColor(request.status)}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="info-row">
                        <span className="label">Email:</span>
                        <span className="value">{request.email}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Requested:</span>
                        <span className="value">{formatDate(request.requestedAt)}</span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="btn-approve"
                        onClick={() => handleReview(request, 'approve')}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleReview(request, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewed Requests */}
          {reviewedRequests.length > 0 && (
            <div className="requests-section">
              <h2>Recent Reviews ({reviewedRequests.length})</h2>
              <div className="table-container">
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Requested</th>
                      <th>Reviewed</th>
                      <th>Reviewed By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewedRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="username">{request.username}</td>
                        <td>{request.email}</td>
                        <td>{request.role}</td>
                        <td>{formatDate(request.requestedAt)}</td>
                        <td>{request.reviewedAt ? formatDate(request.reviewedAt) : 'N/A'}</td>
                        <td>{request.reviewedBy || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${getStatusColor(request.status)}`}>
                            {request.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}</h3>
            <p>
              Are you sure you want to {confirmAction} the password change request from{' '}
              <strong>{selectedRequest?.username}</strong>?
            </p>
            {confirmAction === 'approve' && (
              <p className="note">
                Note: After approval, the user will be able to change their password.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button 
                className={confirmAction === 'approve' ? 'btn-approve' : 'btn-reject'}
                onClick={confirmReview}
              >
                Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordRequests;

