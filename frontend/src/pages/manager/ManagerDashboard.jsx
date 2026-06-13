import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Form states for resolutions
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  // Form states for adding a room
  const [categories, setCategories] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');

  const toast = useToast();

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/analytics/overview');
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics', err);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const res = await api.get('/complaints');
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching complaints', err);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/users?role=staff'); // fetch staff to assign complaints
      if (res.data.success) {
        // filter manager/receptionist/housekeeper
        setStaff(res.data.data.filter(u => u.role_name !== 'customer'));
      }
    } catch (err) {
      console.error('Error fetching staff list', err);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const res = await api.get('/receptionist/rooms');
      if (res.data.success) {
        setRooms(res.data.data);
      }
    } catch (err) {
      console.error('Error loading room list', err);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/room-categories');
      if (res.data.success) {
        setCategories(res.data.data);
        if (res.data.data.length > 0) setSelectedCategoryId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Error loading room categories', err);
    }
  }, []);

  const loadHotels = useCallback(async () => {
    try {
      const res = await api.get('/hotels');
      if (res.data.success) {
        setHotels(res.data.data);
        if (res.data.data.length > 0) setSelectedHotelId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Error loading hotels list', err);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadComplaints();
    loadStaff();
    loadRooms();
    loadCategories();
    loadHotels();
  }, [loadAnalytics, loadComplaints, loadStaff, loadRooms, loadCategories, loadHotels]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomNumber || !selectedCategoryId || !selectedHotelId) {
      return toast.error('Please specify room number, category, and hotel');
    }
    try {
      const res = await api.post('/rooms', {
        room_number: newRoomNumber,
        category_id: selectedCategoryId,
        hotel_id: selectedHotelId,
      });
      if (res.data.success) {
        toast.success(`Room ${newRoomNumber} added successfully!`);
        setNewRoomNumber('');
        loadRooms();
      }
    } catch (err) {
      toast.error('Failed to add room. Room number may already exist.');
    }
  };

  const handleAssignComplaint = async (e) => {
    e.preventDefault();
    if (!activeComplaint || !assigneeId) return;
    try {
      const res = await api.post(`/complaints/${activeComplaint.id}/assign`, {
        assigned_to: assigneeId,
      });
      if (res.data.success) {
        toast.success('Complaint ticket assigned successfully');
        loadComplaints();
        setActiveComplaint(null);
        setAssigneeId('');
      }
    } catch (err) {
      toast.error('Failed to assign complaint');
    }
  };

  const handleResolveComplaint = async (e) => {
    e.preventDefault();
    if (!activeComplaint || !resolutionText) return;
    try {
      const res = await api.post(`/complaints/${activeComplaint.id}/resolve`, {
        resolution: resolutionText,
      });
      if (res.data.success) {
        toast.success('Complaint resolved and closed');
        loadComplaints();
        setActiveComplaint(null);
        setResolutionText('');
      }
    } catch (err) {
      toast.error('Failed to resolve complaint');
    }
  };

  return (
    <div>
      {/* Tab bar header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('rooms')}>
          Rooms Status
        </button>
        <button className={`btn ${activeTab === 'complaints' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('complaints')}>
          Guest Complaints
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div>
          {/* Stat widgets */}
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-details">
                <h4>Total Revenue</h4>
                <p>${analytics?.revenueStats?.totalRevenue || 0}</p>
              </div>
              <div className="stat-icon">💰</div>
            </div>
            <div className="stat-card">
              <div className="stat-details">
                <h4>Occupancy Rate</h4>
                <p>{analytics?.occupancyStats?.occupancyRate || '0%'}</p>
              </div>
              <div className="stat-icon">🏨</div>
            </div>
            <div className="stat-card">
              <div className="stat-details">
                <h4>Open Complaints</h4>
                <p>{complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length}</p>
              </div>
              <div className="stat-icon">⚠️</div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Recent Activity Logs</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              System statistics, complaints, and occupancy rates are synced automatically.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Rooms Status */}
      {activeTab === 'rooms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Add Room Form Card */}
          <div className="card">
            <h3 className="card-title">Add New Room</h3>
            <form onSubmit={handleCreateRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Room Number</label>
                <input type="text" className="form-control" placeholder="e.g. 401" value={newRoomNumber} onChange={(e) => setNewRoomNumber(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Hotel</label>
                <select className="form-control" value={selectedHotelId} onChange={(e) => setSelectedHotelId(e.target.value)} required>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Room Category</label>
                <select className="form-control" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} required>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (${cat.base_price}/night)
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Add Room</button>
            </form>
          </div>

          {/* Room Inventory Board Card */}
          <div className="card">
            <h3 className="card-title">Room Inventory Board</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Room No</th>
                    <th>Category</th>
                    <th>Occupancy</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id}>
                      <td style={{ fontWeight: 'bold' }}>Room {room.room_number}</td>
                      <td>{room.category_name}</td>
                      <td>{room.max_occupancy} guests</td>
                      <td>${room.base_price}</td>
                      <td>
                        <span className={`badge badge-${
                          room.status === 'available' ? 'success' :
                          room.status === 'occupied' ? 'info' :
                          room.status === 'dirty' ? 'danger' : 'warning'
                        }`}>{room.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Guest Complaints */}
      {activeTab === 'complaints' && (
        <div>
          <div className="card">
            <h3 className="card-title">Complaints Dispatch Board</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Guest</th>
                    <th>Subject</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No support tickets registered.</td>
                    </tr>
                  ) : (
                    complaints.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace' }}>{c.complaint_ref}</td>
                        <td>{c.customer_first_name} {c.customer_last_name}</td>
                        <td style={{ fontWeight: '600' }}>{c.subject}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</td>
                        <td>
                          <span className={`badge badge-${
                            c.status === 'resolved' ? 'success' :
                            c.status === 'open' ? 'danger' : 'warning'
                          }`}>{c.status}</span>
                        </td>
                        <td>{c.assigned_staff_name || 'Unassigned'}</td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          {c.status === 'open' && (
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setActiveComplaint(c)}>
                              Assign Staff
                            </button>
                          )}
                          {c.status !== 'resolved' && c.status !== 'closed' && (
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
                              setActiveComplaint(c);
                              setResolutionText('');
                            }}>
                              Resolve
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

          {/* Action Modals */}
          {activeComplaint && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>Handle Complaint: {activeComplaint.complaint_ref}</h3>
                  <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }} onClick={() => setActiveComplaint(null)}>
                    &times;
                  </button>
                </div>
                <div className="modal-body">
                  <p style={{ marginBottom: '16px', fontSize: '14px' }}>
                    <strong>Details:</strong> {activeComplaint.description}
                  </p>
                  
                  {activeComplaint.status === 'open' ? (
                    <form onSubmit={handleAssignComplaint}>
                      <div className="form-group">
                        <label className="form-label">Select Assignee</label>
                        <select className="form-control" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required>
                          <option value="">-- Select Staff Member --</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.role_name})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="submit" className="btn btn-primary">Assign Ticket</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveComplaint(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleResolveComplaint}>
                      <div className="form-group">
                        <label className="form-label">Resolution Summary</label>
                        <textarea
                          className="form-control"
                          rows="4"
                          placeholder="Summarize resolution findings..."
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          required
                        ></textarea>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="submit" className="btn btn-primary">Resolve & Close</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveComplaint(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
