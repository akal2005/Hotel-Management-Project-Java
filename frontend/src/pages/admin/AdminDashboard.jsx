import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states for creating staff user
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('receptionist');

  const toast = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load user list');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadLogs = useCallback(async () => {
    try {
      const res = await api.get('/users/activity/logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load system activity logs');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, loadUsers, loadLogs]);

  // Create staff user
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users/staff', {
        email: newEmail,
        first_name: newFirstName,
        last_name: newLastName,
        password: newPassword,
        phone: newPhone,
        role: newRole,
      });
      if (res.data.success) {
        toast.success(`Staff account created for ${newFirstName}!`);
        setNewEmail('');
        setNewFirstName('');
        setNewLastName('');
        setNewPassword('');
        setNewPhone('');
        loadUsers();
        setActiveTab('users');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create staff account');
    }
  };

  // Toggle user activation status
  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const res = await api.patch(`/users/${userId}/status`, {
        is_active: !currentStatus,
      });
      if (res.data.success) {
        toast.success(`User status updated!`);
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      }
    } catch (err) {
      toast.error('Failed to toggle user status');
    }
  };

  return (
    <div>
      {/* Tab bar header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('users')}>
          User Accounts
        </button>
        <button className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('create')}>
          Add Staff Account
        </button>
        <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('logs')}>
          System Audit Logs
        </button>
      </div>

      {/* Tab: Users accounts list */}
      {activeTab === 'users' && (
        <div className="card">
          <h3 className="card-title">System Users Registry</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Email Address</th>
                  <th>Phone</th>
                  <th>System Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '600' }}>{u.first_name} {u.last_name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${
                          u.role_name === 'admin' ? 'danger' :
                          u.role_name === 'manager' ? 'warning' :
                          u.role_name === 'receptionist' ? 'info' :
                          u.role_name === 'housekeeper' ? 'primary' : 'secondary'
                        }`}>{u.role_name}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${u.is_active ? 'success' : 'danger'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        {u.role_name !== 'admin' && (
                          <button
                            className={`btn ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Create Staff Account Form */}
      {activeTab === 'create' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 className="card-title">Provision New Staff User</h3>
          <form onSubmit={handleCreateStaff}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input type="text" className="form-control" placeholder="Jane" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-control" placeholder="Doe" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-control" placeholder="staff@hotelms.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Role Assignment</label>
              <select className="form-control" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="manager">Hotel Manager</option>
                <option value="receptionist">Front Desk Receptionist</option>
                <option value="housekeeper">Housekeeping Staff</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Temporary Password</label>
              <input type="password" className="form-control" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-control" placeholder="555-1234" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Create Staff Account
            </button>
          </form>
        </div>
      )}

      {/* Tab: System Audit Logs */}
      {activeTab === 'logs' && (
        <div className="card">
          <h3 className="card-title">System-wide Activity Audit Logs</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No audit events recorded.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{log.action}</td>
                      <td>{log.entity_type}</td>
                      <td>ID: {log.entity_id || 'N/A'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{log.ip_address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
