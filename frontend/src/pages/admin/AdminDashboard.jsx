import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Form states for creating staff user
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('receptionist');

  // Form states for creating hotel
  const [hotelsList, setHotelsList] = useState([]);
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelCity, setHotelCity] = useState('');
  const [hotelState, setHotelState] = useState('');
  const [hotelCountry, setHotelCountry] = useState('');
  const [hotelPhone, setHotelPhone] = useState('');
  const [hotelEmail, setHotelEmail] = useState('');
  const [hotelDesc, setHotelDesc] = useState('');

  // Staff assignment states
  const [assignments, setAssignments] = useState([]);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignHotelId, setAssignHotelId] = useState('');
  const [assignIsPrimary, setAssignIsPrimary] = useState(true);

  const location = useLocation();
  const toast = useToast();

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/users/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load system stats');
    }
  }, []);

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

  const loadHotels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hotels');
      if (res.data.success) {
        setHotelsList(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load hotel list');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAssignments = useCallback(async () => {
    try {
      const res = await api.get('/users/staff/assignments');
      if (res.data.success) {
        setAssignments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load staff assignments');
    }
  }, []);

  // Synchronize route paths to activeTab
  useEffect(() => {
    if (location.pathname.endsWith('/logs')) {
      setActiveTab('logs');
    } else if (location.pathname.endsWith('/hotels')) {
      setActiveTab('hotels');
    } else if (location.pathname.endsWith('/create')) {
      setActiveTab('create');
    } else if (location.pathname.endsWith('/assignments')) {
      setActiveTab('assignments');
    } else if (location.pathname.endsWith('/users')) {
      setActiveTab('users');
    } else {
      setActiveTab('overview');
    }
  }, [location]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'hotels') {
      loadHotels();
    } else if (activeTab === 'assignments') {
      loadAssignments();
      loadUsers();
      loadHotels();
    }
  }, [activeTab, loadStats, loadUsers, loadLogs, loadHotels, loadAssignments]);

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

  // Update user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.patch(`/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        toast.success('User role updated successfully!');
        setUsers(users.map(u => u.id === userId ? { ...u, role_name: newRole } : u));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user role');
    }
  };

  // Create hotel
  const handleCreateHotel = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/hotels', {
        name: hotelName,
        address: hotelAddress,
        city: hotelCity,
        state: hotelState,
        country: hotelCountry,
        phone: hotelPhone,
        email: hotelEmail,
        description: hotelDesc,
      });
      if (res.data.success) {
        toast.success(`Hotel ${hotelName} created successfully!`);
        setHotelName('');
        setHotelAddress('');
        setHotelCity('');
        setHotelState('');
        setHotelCountry('');
        setHotelPhone('');
        setHotelEmail('');
        setHotelDesc('');
        loadHotels();
        setActiveTab('hotels');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create hotel');
    }
  };

  // Handle staff assignment to hotel
  const handleAssignStaff = async (e) => {
    e.preventDefault();
    if (!assignStaffId || !assignHotelId) {
      return toast.error('Please select staff and hotel');
    }
    try {
      const res = await api.post('/users/staff/assign', {
        user_id: parseInt(assignStaffId),
        hotel_id: parseInt(assignHotelId),
        is_primary: assignIsPrimary
      });
      if (res.data.success) {
        toast.success('Staff assigned successfully!');
        setAssignStaffId('');
        setAssignHotelId('');
        loadAssignments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign staff');
    }
  };

  // Handle removing staff assignment
  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this staff assignment?')) return;
    try {
      const res = await api.delete(`/users/staff/assign/${assignmentId}`);
      if (res.data.success) {
        toast.success('Assignment removed successfully');
        loadAssignments();
      }
    } catch (err) {
      toast.error('Failed to remove assignment');
    }
  };

  return (
    <div>
      {/* Tab bar header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('overview')}>
          Overview Dashboard
        </button>
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('users')}>
          User Accounts
        </button>
        <button className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('create')}>
          Add Staff Account
        </button>
        <button className={`btn ${activeTab === 'hotels' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('hotels')}>
          Hotel Settings
        </button>
        <button className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('assignments')}>
          Staff Assignments
        </button>
        <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('logs')}>
          System Audit Logs
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div>
          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-details">
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Total Hotels</h4>
                <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>{stats?.totalHotels || 0}</p>
              </div>
              <div className="stat-icon" style={{ fontSize: '32px' }}>🏨</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-details">
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Registered Users</h4>
                <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>{stats?.totalUsers || 0}</p>
              </div>
              <div className="stat-icon" style={{ fontSize: '32px' }}>👥</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-details">
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Total Bookings</h4>
                <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>{stats?.totalBookings || 0}</p>
              </div>
              <div className="stat-icon" style={{ fontSize: '32px' }}>📅</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-details">
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>System Revenue</h4>
                <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>${stats?.totalRevenue || 0}</p>
              </div>
              <div className="stat-icon" style={{ fontSize: '32px' }}>💰</div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">System Health & Live Overview</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
              Welcome to the System Administration Panel. Use the menu tabs above to provision staff members, configure hotel branches worldwide, assign managers and receptionists to specific hotel properties, and review complete system security logs.
            </p>
          </div>
        </div>
      )}

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
                        {u.role_name === 'admin' ? (
                          <span className="badge badge-danger">admin</span>
                        ) : (
                          <select
                            className="form-control"
                            value={u.role_name}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '13px', width: 'auto', display: 'inline-block' }}
                          >
                            <option value="manager">manager</option>
                            <option value="receptionist">receptionist</option>
                            <option value="housekeeper">housekeeper</option>
                            <option value="customer">customer</option>
                          </select>
                        )}
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

      {/* Tab: Hotel Management */}
      {activeTab === 'hotels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Form to add a hotel */}
          <div className="card">
            <h3 className="card-title">Add New Hotel / Branch</h3>
            <form onSubmit={handleCreateHotel}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Hotel Name</label>
                  <input type="text" className="form-control" placeholder="e.g. Marina View Palace" value={hotelName} onChange={(e) => setHotelName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input type="text" className="form-control" placeholder="e.g. India" value={hotelCountry} onChange={(e) => setHotelCountry(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" className="form-control" placeholder="e.g. Tamil Nadu" value={hotelState} onChange={(e) => setHotelState(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-control" placeholder="e.g. Chennai" value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" placeholder="e.g. 5 Marina Beach Road" value={hotelAddress} onChange={(e) => setHotelAddress(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-control" placeholder="e.g. +91 44 2200 1122" value={hotelPhone} onChange={(e) => setHotelPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" placeholder="e.g. contact@hotelms.com" value={hotelEmail} onChange={(e) => setHotelEmail(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="3" placeholder="Hotel description..." value={hotelDesc} onChange={(e) => setHotelDesc(e.target.value)}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Create Hotel Branch
              </button>
            </form>
          </div>

          {/* List of existing hotels */}
          <div className="card">
            <h3 className="card-title">Registered Hotel Branches</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hotel Name</th>
                    <th>Location</th>
                    <th>Contact Info</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {hotelsList.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hotel branches registered yet.</td>
                    </tr>
                  ) : (
                    hotelsList.map((hotel) => (
                      <tr key={hotel.id}>
                        <td style={{ fontWeight: '600' }}>{hotel.name}</td>
                        <td>
                          <div>{hotel.address}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{hotel.city}, {hotel.state}, {hotel.country}</div>
                        </td>
                        <td>
                          <div>{hotel.phone || 'N/A'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{hotel.email || 'N/A'}</div>
                        </td>
                        <td style={{ maxWidth: '300px', fontSize: '13px', color: 'var(--text-secondary)' }}>{hotel.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Staff assignments */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Assignment form */}
          <div className="card" style={{ maxWidth: '600px' }}>
            <h3 className="card-title">Assign Staff to Hotel Branch</h3>
            <form onSubmit={handleAssignStaff}>
              <div className="form-group">
                <label className="form-label">Select Staff Member</label>
                <select className="form-control" value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)} required>
                  <option value="">-- Choose User --</option>
                  {users.filter(u => u.role_name !== 'customer' && u.role_name !== 'admin').map((u) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role_name})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Hotel Branch</label>
                <select className="form-control" value={assignHotelId} onChange={(e) => setAssignHotelId(e.target.value)} required>
                  <option value="">-- Choose Hotel Branch --</option>
                  {hotelsList.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} - {h.city}, {h.country}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="isPrimary" checked={assignIsPrimary} onChange={(e) => setAssignIsPrimary(e.target.checked)} />
                <label htmlFor="isPrimary" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Primary Assignment (Active Branch)</label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Link Staff to Branch
              </button>
            </form>
          </div>

          {/* Assignments table */}
          <div className="card">
            <h3 className="card-title">Active Staff Assignments</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Assigned Hotel Branch</th>
                    <th>Is Primary</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No staff assignments configured.</td>
                    </tr>
                  ) : (
                    assignments.map((as) => (
                      <tr key={as.id}>
                        <td style={{ fontWeight: '600' }}>{as.staff_name}</td>
                        <td>{as.staff_email}</td>
                        <td>
                          <span className={`badge badge-${
                            as.staff_role === 'manager' ? 'warning' :
                            as.staff_role === 'receptionist' ? 'info' : 'primary'
                          }`}>{as.staff_role}</span>
                        </td>
                        <td>{as.hotel_name}</td>
                        <td>
                          <span className={`badge badge-${as.is_primary ? 'success' : 'secondary'}`}>
                            {as.is_primary ? 'Primary' : 'Secondary'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#dc3545', borderColor: '#dc3545' }} onClick={() => handleRemoveAssignment(as.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
