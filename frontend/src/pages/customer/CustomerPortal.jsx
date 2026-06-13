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
  const [reviewsList, setReviewsList] = useState([]);

  // Dynamic location selector states
  const [countries, setCountries] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [filteredHotels, setFilteredHotels] = useState([]);

  // Form states
  const [newComplaintSubject, setNewComplaintSubject] = useState('');
  const [newComplaintDesc, setNewComplaintDesc] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewBookingId, setReviewBookingId] = useState('');

  // Profile Form States
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileNationality, setProfileNationality] = useState('');
  const [profileIdType, setProfileIdType] = useState('Passport');
  const [profileIdNumber, setProfileIdNumber] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileCountry, setProfileCountry] = useState('');
  const [profilePreferredRoomType, setProfilePreferredRoomType] = useState('Standard');
  const [profileSpecialRequests, setProfileSpecialRequests] = useState('');

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

  // Compute unique countries
  useEffect(() => {
    if (hotels.length > 0) {
      const uniqueCountries = [...new Set(hotels.map(h => h.country))];
      setCountries(uniqueCountries);
      setSelectedCountry(uniqueCountries[0] || '');
    }
  }, [hotels]);

  // Compute unique states when selected country changes
  useEffect(() => {
    if (selectedCountry) {
      const match = hotels.filter(h => h.country === selectedCountry);
      const uniqueStates = [...new Set(match.map(h => h.state))];
      setStatesList(uniqueStates);
      setSelectedState(uniqueStates[0] || '');
    } else {
      setStatesList([]);
      setSelectedState('');
    }
  }, [selectedCountry, hotels]);

  // Compute unique cities when selected state changes
  useEffect(() => {
    if (selectedCountry && selectedState) {
      const match = hotels.filter(h => h.country === selectedCountry && h.state === selectedState);
      const uniqueCities = [...new Set(match.map(h => h.city))];
      setCitiesList(uniqueCities);
      setSelectedCity(uniqueCities[0] || '');
    } else {
      setCitiesList([]);
      setSelectedCity('');
    }
  }, [selectedState, selectedCountry, hotels]);

  // Compute hotels when selected city changes
  useEffect(() => {
    if (selectedCountry && selectedState && selectedCity) {
      const match = hotels.filter(h => h.country === selectedCountry && h.state === selectedState && h.city === selectedCity);
      setFilteredHotels(match);
      if (match.length > 0) {
        setSelectedHotel(match[0].id);
      } else {
        setSelectedHotel('');
      }
    } else {
      setFilteredHotels([]);
      setSelectedHotel('');
    }
  }, [selectedCity, selectedState, selectedCountry, hotels]);

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

  const loadReviews = useCallback(async () => {
    try {
      const res = await api.get('/hotels/reviews');
      if (res.data.success) {
        setReviewsList(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching reviews', err);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get('/customer/profile');
      if (res.data.success) {
        const p = res.data.data;
        setProfileFirstName(p.first_name || '');
        setProfileLastName(p.last_name || '');
        setProfilePhone(p.phone || '');
        setProfileDob(p.date_of_birth || '');
        setProfileNationality(p.nationality || '');
        setProfileIdType(p.id_type || 'Passport');
        setProfileIdNumber(p.id_number || '');
        setProfileAddress(p.address || '');
        setProfileCity(p.city || '');
        setProfileCountry(p.country || '');
        setProfilePreferredRoomType(p.preferred_room_type || 'Standard');
        setProfileSpecialRequests(p.special_requests || '');
      }
    } catch (err) {
      console.error('Error fetching profile details', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'book') {
      loadReviews();
    } else if (activeTab === 'bookings') {
      loadBookings();
    } else if (activeTab === 'complaints') {
      loadComplaints();
    } else if (activeTab === 'profile') {
      loadProfile();
    }
  }, [activeTab, loadBookings, loadComplaints, loadProfile, loadReviews]);

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
        hotel_id: parseInt(selectedHotel),
        room_id: roomId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        total_amount: price, // base price per night for testing
        guest_count: 1, // default guest count
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
    if (!selectedHotel || !newComplaintSubject || !newComplaintDesc) {
      return toast.error('Please specify hotel, subject, and details');
    }
    try {
      const res = await api.post('/complaints', {
        hotel_id: parseInt(selectedHotel),
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
        loadBookings();
        setActiveTab('bookings');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  // Submit Profile Changes
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/customer/profile', {
        first_name: profileFirstName,
        last_name: profileLastName,
        phone: profilePhone,
        date_of_birth: profileDob,
        nationality: profileNationality,
        id_type: profileIdType,
        id_number: profileIdNumber,
        address: profileAddress,
        city: profileCity,
        country: profileCountry,
        preferred_room_type: profilePreferredRoomType,
        special_requests: profileSpecialRequests
      });
      if (res.data.success) {
        toast.success('Your profile has been updated!');
        loadProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const selectedHotelObj = hotels.find((h) => h.id === parseInt(selectedHotel));

  return (
    <div>
      {/* Tab bar header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'book' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('book')}>
          Book a Room
        </button>
        <button className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('bookings')}>
          My Bookings
        </button>
        <button className={`btn ${activeTab === 'complaints' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('complaints')}>
          My Complaints
        </button>
        <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('profile')}>
          My Profile Settings
        </button>
      </div>

      {/* Tab: Book a Room */}
      {activeTab === 'book' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 className="card-title">Search Room Availability</h3>
            <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Country</label>
                <select className="form-control" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">State</label>
                <select className="form-control" value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                  {statesList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">City/District</label>
                <select className="form-control" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                  {citiesList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Hotel</label>
                <select className="form-control" value={selectedHotel} onChange={(e) => setSelectedHotel(e.target.value)}>
                  {filteredHotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
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
              <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Search Availability</button>
            </form>
          </div>

          {/* Hotel Information Card */}
          {selectedHotelObj && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--accent)' }}>
              <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '18px' }}>{selectedHotelObj.name} Details</h4>
              <p style={{ margin: '4px 0', fontSize: '14px', lineHeight: '1.5' }}>{selectedHotelObj.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                <div>📍 <strong>Address:</strong> {selectedHotelObj.address}, {selectedHotelObj.city}, {selectedHotelObj.state}, {selectedHotelObj.country}</div>
                <div>📞 <strong>Phone:</strong> {selectedHotelObj.phone || 'N/A'}</div>
                <div>✉️ <strong>Email:</strong> {selectedHotelObj.email || 'N/A'}</div>
              </div>
            </div>
          )}

          {/* Hotel Customer Reviews Section */}
          {selectedHotelObj && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '16px' }}>Guest Reviews & Ratings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '8px' }}>
                {reviewsList.filter(r => r.hotel_id === selectedHotelObj.id).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No guest reviews submitted for this branch yet.</p>
                ) : (
                  reviewsList.filter(r => r.hotel_id === selectedHotelObj.id).map((r) => (
                    <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                        <strong>{r.customer_name}</strong>
                        <span style={{ color: 'var(--accent)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                        "{r.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
                      <td>{b.room_number ? `Room ${b.room_number}` : 'Assign at check-in'}</td>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 className="card-title">File Support Ticket</h3>
            <form onSubmit={handleAddComplaint}>
              <div className="form-group">
                <label className="form-label">Select Hotel Branch</label>
                <select className="form-control" value={selectedHotel} onChange={(e) => setSelectedHotel(e.target.value)} required>
                  <option value="">-- Select Hotel --</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
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
                    <th>Hotel Branch</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Staff Assignee</th>
                    <th>Resolution Details</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No tickets registered.</td>
                    </tr>
                  ) : (
                    complaints.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace' }}>{c.complaint_ref}</td>
                        <td style={{ fontWeight: '600' }}>{c.hotel_name}</td>
                        <td style={{ fontWeight: '600' }}>{c.subject}</td>
                        <td>
                          <span className={`badge badge-${
                            c.status === 'resolved' ? 'success' :
                            c.status === 'open' ? 'danger' : 'warning'
                          }`}>{c.status}</span>
                        </td>
                        <td>{c.assigned_staff_name || 'Awaiting assignment'}</td>
                        <td style={{ fontStyle: c.resolution ? 'normal' : 'italic', color: c.resolution ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {c.resolution || 'Awaiting staff response'}
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

      {/* Tab: My Profile Settings */}
      {activeTab === 'profile' && (
        <div className="card" style={{ maxWidth: '700px' }}>
          <h3 className="card-title">Manage Profile Details</h3>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input type="text" className="form-control" value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-control" value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-control" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="form-control" value={profileDob} onChange={(e) => setProfileDob(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nationality</label>
                <input type="text" className="form-control" placeholder="e.g. Indian, American" value={profileNationality} onChange={(e) => setProfileNationality(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Room Type</label>
                <select className="form-control" value={profilePreferredRoomType} onChange={(e) => setProfilePreferredRoomType(e.target.value)}>
                  <option value="Standard">Standard Room</option>
                  <option value="Deluxe">Deluxe Room</option>
                  <option value="Suite">Executive Suite</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Verification ID Type</label>
                <select className="form-control" value={profileIdType} onChange={(e) => setProfileIdType(e.target.value)}>
                  <option value="Passport">Passport</option>
                  <option value="Aadhar">Aadhar Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="National ID">National Identity Card</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ID Document Number</label>
                <input type="text" className="form-control" placeholder="e.g. F9284102" value={profileIdNumber} onChange={(e) => setProfileIdNumber(e.target.value)} />
              </div>
            </div>

            <h4 style={{ margin: '20px 0 10px', fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Contact Address</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">City / Town</label>
                <input type="text" className="form-control" value={profileCity} onChange={(e) => setProfileCity(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input type="text" className="form-control" value={profileCountry} onChange={(e) => setProfileCountry(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input type="text" className="form-control" placeholder="123 Ocean Lane" value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Special requests / Preferences</label>
              <textarea className="form-control" rows="3" placeholder="e.g., Allergen warning, high floor preference..." value={profileSpecialRequests} onChange={(e) => setProfileSpecialRequests(e.target.value)}></textarea>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Save Profile Changes
            </button>
          </form>
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
