import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Form states for resolutions
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  // Form states for adding a room
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');

  // Form states for adding a room category
  const [catHotelId, setCatHotelId] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catMaxOccupancy, setCatMaxOccupancy] = useState(2);
  const [catBasePrice, setCatBasePrice] = useState('');

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
      const res = await api.get('/users'); // fetch staff list
      if (res.data.success) {
        setStaff(res.data.data.filter(u => u.role_name !== 'customer' && u.role_name !== 'admin'));
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
        if (res.data.data.length > 0) {
          setSelectedCategoryId(res.data.data[0].id);
        }
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
        if (res.data.data.length > 0) {
          setSelectedHotelId(res.data.data[0].id);
          setCatHotelId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading hotels list', err);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const res = await api.get('/hotels/reviews');
      if (res.data.success) {
        setReviews(res.data.data);
      }
    } catch (err) {
      console.error('Error loading reviews list', err);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Error loading bookings', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadAnalytics();
      loadBookings();
    } else if (activeTab === 'categories') {
      loadCategories();
      loadHotels();
    } else if (activeTab === 'rooms') {
      loadRooms();
      loadCategories();
      loadHotels();
    } else if (activeTab === 'bookings') {
      loadBookings();
    } else if (activeTab === 'complaints') {
      loadComplaints();
      loadStaff();
    } else if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab, loadAnalytics, loadComplaints, loadStaff, loadRooms, loadCategories, loadHotels, loadReviews, loadBookings]);

  // Create room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomNumber || !selectedCategoryId || !selectedHotelId) {
      return toast.error('Please specify room number, category, and hotel');
    }
    try {
      const res = await api.post('/rooms', {
        room_number: newRoomNumber,
        category_id: parseInt(selectedCategoryId),
        hotel_id: parseInt(selectedHotelId),
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

  // Create room category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catHotelId || !catName || !catBasePrice) {
      return toast.error('Please fill in hotel, category name, and price');
    }
    try {
      const res = await api.post('/room-categories', {
        hotel_id: parseInt(catHotelId),
        name: catName,
        description: catDesc,
        max_occupancy: parseInt(catMaxOccupancy),
        base_price: parseFloat(catBasePrice)
      });
      if (res.data.success) {
        toast.success(`Category "${catName}" added successfully!`);
        setCatName('');
        setCatDesc('');
        setCatBasePrice('');
        loadCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room category');
    }
  };

  // Assign complaint
  const handleAssignComplaint = async (e) => {
    e.preventDefault();
    if (!activeComplaint || !assigneeId) return;
    try {
      const res = await api.post(`/complaints/${activeComplaint.id}/assign`, {
        assigned_to: parseInt(assigneeId),
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

  // Resolve complaint
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
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('overview')}>
          Overview Dashboard
        </button>
        <button className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('categories')}>
          Room Categories
        </button>
        <button className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('rooms')}>
          Rooms Status
        </button>
        <button className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('bookings')}>
          Reservations registry
        </button>
        <button className={`btn ${activeTab === 'complaints' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('complaints')}>
          Guest Complaints
        </button>
        <button className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('reviews')}>
          Customer Reviews
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div>
          {/* Stat widgets */}
          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-details">
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Completed Revenue</h4>
                <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>${analytics?.revenueStats?.totalRevenue || 0}</p>
              </div>
              <div className="stat-icon" style={{ fontSize: '32px' }}>💰</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-details">
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Room Occupancy Rate</h4>
                <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>{analytics?.occupancyStats?.occupancyRate || '0%'}</p>
              </div>
              <div className="stat-icon" style={{ fontSize: '32px' }}>🏨</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-details">
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Open Support Tickets</h4>
                <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>{complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length}</p>
              </div>
              <div className="stat-icon" style={{ fontSize: '32px' }}>⚠️</div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Live Revenue & Occupancy Analytics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
              Select tabs to manage categories, view specific room statuses, assign/resolve guest complaints, and review customer ratings.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Room Categories */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Create Category form */}
          <div className="card" style={{ maxWidth: '600px' }}>
            <h3 className="card-title">Create Room Category</h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Hotel Branch</label>
                <select className="form-control" value={catHotelId} onChange={(e) => setCatHotelId(e.target.value)} required>
                  <option value="">-- Select Hotel --</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input type="text" className="form-control" placeholder="e.g. Presidential Suite" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="2" placeholder="Describe the room size, amenities..." value={catDesc} onChange={(e) => setCatDesc(e.target.value)}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Max Occupants</label>
                  <input type="number" className="form-control" min="1" max="10" value={catMaxOccupancy} onChange={(e) => setCatMaxOccupancy(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Price per Night ($)</label>
                  <input type="number" className="form-control" min="1" step="0.01" placeholder="250.00" value={catBasePrice} onChange={(e) => setCatBasePrice(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Create Category
              </button>
            </form>
          </div>

          {/* List Categories */}
          <div className="card">
            <h3 className="card-title">Registered Room Categories</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Hotel Branch</th>
                    <th>Max Occupancy</th>
                    <th>Base Price / Night</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No room categories defined.</td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '600' }}>{c.name}</td>
                        <td>{hotels.find(h => h.id === c.hotel_id)?.name || 'Linked Hotel'}</td>
                        <td>{c.max_occupancy} guests</td>
                        <td>${c.base_price}</td>
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px' }}>{c.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                <select className="form-control" value={selectedHotelId} onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                }} required>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Room Category</label>
                <select className="form-control" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} required>
                  {categories.filter(c => c.hotel_id === parseInt(selectedHotelId)).map((cat) => (
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
                    <th>Hotel Branch</th>
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
                      <td>{hotels.find(h => h.id === room.hotel_id)?.name || 'Linked Hotel'}</td>
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

      {/* Tab: Reservations registry */}
      {activeTab === 'bookings' && (
        <div className="card">
          <h3 className="card-title">Guest Reservations Registry</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Guest Name</th>
                  <th>Hotel Branch</th>
                  <th>Room</th>
                  <th>Guest Count</th>
                  <th>Stay Period</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No bookings recorded in the system.</td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{b.booking_ref}</td>
                      <td style={{ fontWeight: '600' }}>{b.customer_name}</td>
                      <td>{b.hotel_name}</td>
                      <td>Room {b.room_number}</td>
                      <td>{b.guest_count} guests</td>
                      <td style={{ fontSize: '13px' }}>
                        {new Date(b.check_in_date).toLocaleDateString()} to {new Date(b.check_out_date).toLocaleDateString()}
                      </td>
                      <td>${b.total_amount}</td>
                      <td>
                        <span className={`badge badge-${
                          b.status === 'confirmed' ? 'success' :
                          b.status === 'checked_in' ? 'info' :
                          b.status === 'checked_out' ? 'secondary' : 'warning'
                        }`}>{b.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

      {/* Tab: Customer Reviews */}
      {activeTab === 'reviews' && (
        <div className="card">
          <h3 className="card-title">Guest Reviews & Ratings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '16px' }}>
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center' }}>No guest reviews submitted yet.</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{r.customer_name}</div>
                    <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{'⭐'.repeat(r.rating)}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Stayed at: <strong>{r.hotel_name}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                    "{r.comment}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
