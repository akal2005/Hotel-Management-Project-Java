import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CustomerPortal = () => {
  const [activeTab, setActiveTab] = useState('book');
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Form states
  const [newComplaintSubject, setNewComplaintSubject] = useState('');
  const [newComplaintDesc, setNewComplaintDesc] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewBookingId, setReviewBookingId] = useState('');

  const toast = useToast();

  // Load hotels
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await api.get('/hotels');
        if (res.data.success) {
          setHotels(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedHotel(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching hotels', err);
      }
    };
    fetchHotels();
  }, []);

  // Fetch lists based on active tab
  const loadBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/my-bookings');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching bookings', err);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const res = await api.get('/complaints/my-complaints');
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching complaints', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    } else if (activeTab === 'complaints') {
      loadComplaints();
    }
  }, [activeTab, loadBookings, loadComplaints]);

  // Search available rooms
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedHotel || !checkIn || !checkOut) {
      return toast.error('Please specify hotel, check-in, and check-out dates');
    }
    try {
      const res = await api.get(`/bookings/availability?hotel_id=${selectedHotel}&check_in=${checkIn}&check_out=${checkOut}`);
      if (res.data.success) {
        setAvailableRooms(res.data.data);
        if (res.data.data.length === 0) {
          toast.info('No rooms available for the selected range.');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error checking availability');
    }
  };

  // Create booking
  const handleBookRoom = async (roomId, price) => {
    try {
      const res = await api.post('/bookings', {
        hotel_id: selectedHotel,
        room_id: roomId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        total_amount: price, // base price per night for testing
      });
      if (res.data.success) {
        toast.success(`Booking successful! Ref: ${res.data.data.booking_ref}`);
        setAvailableRooms(availableRooms.filter((r) => r.id !== roomId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    }
  };

  // Submit complaint
  const handleAddComplaint = async (e) => {
    e.preventDefault();
    if (!newComplaintSubject || !newComplaintDesc) return;
    try {
      const res = await api.post('/complaints', {
        hotel_id: selectedHotel,
        subject: newComplaintSubject,
        description: newComplaintDesc,
      });
      if (res.data.success) {
        toast.success(`Support ticket raised. Ref: ${res.data.data.complaint_ref}`);
        setNewComplaintSubject('');
        setNewComplaintDesc('');
        loadComplaints();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to lodge complaint');
    }
  };

  // Submit Review
  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!reviewBookingId || !newReviewComment) return;
    try {
      const res = await api.post('/hotels/reviews', {
        booking_id: reviewBookingId,
        rating: newReviewRating,
        comment: newReviewComment,
      });
      if (res.data.success) {
        toast.success('Thank you for your review!');
        setNewReviewComment('');
        setReviewBookingId('');
        // Reload bookings to reflect review update
        loadBookings();
        setActiveTab('bookings');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <div>
      {/* Tab bar header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={`btn ${activeTab === 'book' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('book')}>
          Book a Room
        </button>
        <button className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('bookings')}>
          My Bookings
        </button>
        <button className={`btn ${activeTab === 'complaints' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('complaints')}>
          My Complaints
        </button>
      </div>

      {/* Tab: Book a Room */}
      {activeTab === 'book' && (
        <div>
          <div className="card">
            <h3 className="card-title">Search Room Availability</h3>
            <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Hotel</label>
                <select className="form-control" value={selectedHotel} onChange={(e) => setSelectedHotel(e.target.value)}>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} - {h.city}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Check-in Date</label>
                <input type="date" className="form-control" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Check-out Date</label>
                <input type="date" className="form-control" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary">Search Availability</button>
            </form>
          </div>

          {availableRooms.length > 0 && (
            <div className="card">
              <h3 className="card-title">Available Rooms</h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Room No</th>
                      <th>Category</th>
                      <th>Max Occupants</th>
                      <th>Price / Night</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableRooms.map((room) => (
                      <tr key={room.id}>
                        <td style={{ fontWeight: '600' }}>{room.room_number}</td>
                        <td>{room.category_name}</td>
                        <td>{room.max_occupancy} guests</td>
                        <td>${room.base_price}</td>
                        <td>
                          <button className="btn btn-primary" onClick={() => handleBookRoom(room.id, room.base_price)}>
                            Book Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: My Bookings */}
      {activeTab === 'bookings' && (
        <div className="card">
          <h3 className="card-title">Reservation History</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Dates</th>
                  <th>Room No</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No bookings found.</td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{b.booking_ref}</td>
                      <td>{new Date(b.check_in_date).toLocaleDateString()} to {new Date(b.check_out_date).toLocaleDateString()}</td>
                      <td>{b.room_number || 'Assign at check-in'}</td>
                      <td>${b.total_amount}</td>
                      <td>
                        <span className={`badge badge-${
                          b.status === 'confirmed' ? 'success' :
                          b.status === 'checked_in' ? 'info' :
                          b.status === 'checked_out' ? 'secondary' : 'warning'
                        }`}>{b.status}</span>
                      </td>
                      <td>
                        {b.status === 'checked_out' && (
                          <button className="btn btn-secondary" onClick={() => {
                            setReviewBookingId(b.id);
                            setActiveTab('review_form');
                          }}>
                            Write Review
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

      {/* Tab: My Complaints */}
      {activeTab === 'complaints' && (
        <div>
          <div className="card">
            <h3 className="card-title">File Support Ticket</h3>
            <form onSubmit={handleAddComplaint}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. WiFi not working, AC issue"
                  value={newComplaintSubject}
                  onChange={(e) => setNewComplaintSubject(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Provide details about the issue..."
                  value={newComplaintDesc}
                  onChange={(e) => setNewComplaintDesc(e.target.value)}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary">File Ticket</button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title">Submitted Tickets</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Staff Assignee</th>
                    <th>Resolution Details</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No tickets registered.</td>
                    </tr>
                  ) : (
                    complaints.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace' }}>{c.complaint_ref}</td>
                        <td style={{ fontWeight: '600' }}>{c.subject}</td>
                        <td>
                          <span className={`badge badge-${
                            c.status === 'resolved' ? 'success' :
                            c.status === 'open' ? 'danger' : 'warning'
                          }`}>{c.status}</span>
                        </td>
                        <td>{c.assigned_staff_name || 'Awaiting assignment'}</td>
                        <td>{c.resolution || 'Resolution pending'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Write Review Form */}
      {activeTab === 'review_form' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 className="card-title">Share Your Experience</h3>
          <form onSubmit={handleAddReview}>
            <div className="form-group">
              <label className="form-label">Rating (1 to 5 Stars)</label>
              <select className="form-control" value={newReviewRating} onChange={(e) => setNewReviewRating(parseInt(e.target.value))}>
                <option value="5">⭐⭐⭐⭐⭐ (Excellent)</option>
                <option value="4">⭐⭐⭐⭐ (Good)</option>
                <option value="3">⭐⭐⭐ (Average)</option>
                <option value="2">⭐⭐ (Poor)</option>
                <option value="1">⭐ (Terrible)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Comments</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="How was your stay? Let us know what you liked or how we can improve..."
                value={newReviewComment}
                onChange={(e) => setNewReviewComment(e.target.value)}
                required
              ></textarea>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">Submit Review</button>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('bookings')}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
