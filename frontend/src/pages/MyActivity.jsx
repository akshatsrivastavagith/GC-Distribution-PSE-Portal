import { API_BASE_URL } from "../config/api"
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ActivityLog.css';

const MyActivity = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('activities');
  
  // Filters for activities
  const [activityFilters, setActivityFilters] = useState({
    operation: '',
    environment: ''
  });

  // Filters for upload history
  const [uploadFilters, setUploadFilters] = useState({
    environment: '',
    client: '',
    status: ''
  });

  useEffect(() => {
    if (activeTab === 'activities') {
      fetchMyActivityLog();
    } else {
      fetchMyUploadHistory();
    }
  }, [activeTab, activityFilters, uploadFilters]);

  const fetchMyActivityLog = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Build query string with filters
      const params = new URLSearchParams();
      if (activityFilters.operation) params.append('operation', activityFilters.operation);
      if (activityFilters.environment) params.append('environment', activityFilters.environment);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/my-activity-log${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity log');
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyUploadHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Build query string with filters
      const params = new URLSearchParams();
      if (uploadFilters.environment) params.append('environment', uploadFilters.environment);
      if (uploadFilters.client) params.append('client', uploadFilters.client);
      if (uploadFilters.status) params.append('status', uploadFilters.status);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/profile${queryString ? '?' + queryString : ''}`;
      
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

  const handleActivityFilterChange = (filterName, value) => {
    setActivityFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleUploadFilterChange = (filterName, value) => {
    setUploadFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearActivityFilters = () => {
    setActivityFilters({
      operation: '',
      environment: ''
    });
  };

  const clearUploadFilters = () => {
    setUploadFilters({
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
      minute: '2-digit',
      second: '2-digit'
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
    <div className="activity-log-container">
      <div className="activity-log-header">
        <h1>My Activity History</h1>
        <p>View your personal activity log and upload history</p>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          My Activities
        </button>
        <button 
          className={`tab ${activeTab === 'uploads' ? 'active' : ''}`}
          onClick={() => setActiveTab('uploads')}
        >
          My Uploads
        </button>
      </div>

      {/* Activity Log Tab */}
      {activeTab === 'activities' && (
        <div className="tab-content">
          <div className="filters-container">
            <div className="filter-group">
              <label>Operation:</label>
              <select 
                value={activityFilters.operation} 
                onChange={(e) => handleActivityFilterChange('operation', e.target.value)}
              >
                <option value="">All</option>
                <option value="Stock Upload">Stock Upload</option>
                <option value="Password Change Request">Password Change Request</option>
                <option value="Password Reset Completed">Password Reset</option>
                <option value="Login">Login</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Environment:</label>
              <select 
                value={activityFilters.environment} 
                onChange={(e) => handleActivityFilterChange('environment', e.target.value)}
              >
                <option value="">All</option>
                <option value="TEST">TEST</option>
                <option value="PROD">PROD</option>
              </select>
            </div>

            <button className="btn-clear-filters" onClick={clearActivityFilters}>
              Clear Filters
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading activity log...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : activities.length === 0 ? (
            <div className="no-data">No activities found</div>
          ) : (
            <div className="table-container">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Operation</th>
                    <th>Environment</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td>{formatDate(activity.timestamp)}</td>
                      <td>{activity.operation}</td>
                      <td>
                        <span className={`env-badge env-${activity.environment?.toLowerCase()}`}>
                          {activity.environment || 'N/A'}
                        </span>
                      </td>
                      <td className="details">{activity.details}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload History Tab */}
      {activeTab === 'uploads' && (
        <div className="tab-content">
          <div className="filters-container">
            <div className="filter-group">
              <label>Environment:</label>
              <select 
                value={uploadFilters.environment} 
                onChange={(e) => handleUploadFilterChange('environment', e.target.value)}
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
                value={uploadFilters.client}
                onChange={(e) => handleUploadFilterChange('client', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={uploadFilters.status} 
                onChange={(e) => handleUploadFilterChange('status', e.target.value)}
              >
                <option value="">All</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
                <option value="Partial Success">Partial Success</option>
              </select>
            </div>

            <button className="btn-clear-filters" onClick={clearUploadFilters}>
              Clear Filters
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading upload history...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : uploadHistory.length === 0 ? (
            <div className="no-data">No upload history found</div>
          ) : (
            <div className="table-container">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>File Name</th>
                    <th>Environment</th>
                    <th>Client</th>
                    <th>Total</th>
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
      )}
    </div>
  );
};

export default MyActivity;

