import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Walk-in form states
  const [walkinEmail, setWalkinEmail] = useState('');
  const [walkinFirstName, setWalkinFirstName] = useState('');
  const [walkinLastName, setWalkinLastName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [hotels, setHotels] = useState([]);
  
  // Dynamic location selector states
  const [countries, setCountries] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [guestCount, setGuestCount] = useState(1);

  // Billing and Invoice print state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  const toast = useToast();

  // Load all bookings
  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/receptionist/bookings');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load bookings register');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBookings();
    
    // Fetch hotels for walk-in
    const fetchHotels = async () => {
      try {
        const res = await api.get('/hotels');
        if (res.data.success) {
          setHotels(res.data.data);
          if (res.data.data.length > 0) setSelectedHotelId(res.data.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching hotels', err);
      }
    };
    fetchHotels();
  }, [loadBookings]);

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
        setSelectedHotelId(match[0].id);
      } else {
        setSelectedHotelId('');
      }
    } else {
      setFilteredHotels([]);
      setSelectedHotelId('');
    }
  }, [selectedCity, selectedState, selectedCountry, hotels]);

  // Check availability for walk-in
  const checkWalkinAvailability = async () => {
    if (!selectedHotelId || !checkInDate || !checkOutDate) {
      return toast.error('Please specify hotel, check-in and check-out dates');
    }
    try {
      const res = await api.get(`/bookings/availability?hotel_id=${selectedHotelId}&check_in=${checkInDate}&check_out=${checkOutDate}`);
      if (res.data.success) {
        setAvailableRooms(res.data.data);
        if (res.data.data.length > 0) setSelectedRoomId(res.data.data[0].id);
      }
    } catch (err) {
      toast.error('Error checking room availability');
    }
  };

  // Submit walk-in booking
  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    if (!walkinEmail || !walkinFirstName || !walkinLastName || !selectedRoomId) {
      return toast.error('Please fill in all customer and room details');
    }
    try {
      const room = availableRooms.find((r) => r.id === parseInt(selectedRoomId));
      const amount = room ? room.base_price : 100; // default fallback amount

      const res = await api.post('/receptionist/walk-in', {
        email: walkinEmail,
        first_name: walkinFirstName,
        last_name: walkinLastName,
        phone: walkinPhone,
        hotel_id: selectedHotelId,
        room_id: selectedRoomId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        total_amount: amount,
        guest_count: guestCount,
      });

      if (res.data.success) {
        toast.success(`Walk-in booking created. Ref: ${res.data.data.booking_ref}`);
        setWalkinEmail('');
        setWalkinFirstName('');
        setWalkinLastName('');
        setWalkinPhone('');
        setGuestCount(1);
        setAvailableRooms([]);
        loadBookings();
        setActiveTab('list');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create walk-in booking');
    }
  };

  // Check-in action
  const handleCheckIn = async (bookingId) => {
    try {
      const res = await api.post(`/receptionist/bookings/${bookingId}/check-in`);
      if (res.data.success) {
        toast.success('Guest checked in successfully!');
        loadBookings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  // Checkout action: generates invoice details
  const handleCheckOut = async (bookingId) => {
    try {
      const res = await api.post(`/receptionist/bookings/${bookingId}/check-out`);
      if (res.data.success) {
        toast.success('Guest checked out successfully! Generating invoice...');
        loadInvoice(bookingId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    }
  };

  // Load invoice
  const loadInvoice = async (bookingId) => {
    try {
      const res = await api.get(`/payments/invoice/${bookingId}`);
      if (res.data.success) {
        setActiveInvoice(res.data.data);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      toast.error('Failed to retrieve checkout invoice details');
    }
  };

  // Record payment
  const handleRecordPayment = async (method) => {
    if (!activeInvoice) return;
    try {
      const res = await api.post('/payments/capture', {
        booking_id: activeInvoice.booking.id,
        amount: activeInvoice.billing.netTotal,
        payment_method: method,
        transaction_ref: 'REC-' + Date.now().toString().slice(-6),
      });
      if (res.data.success) {
        toast.success('Payment captured successfully!');
        setShowInvoiceModal(false);
        loadBookings();
      }
    } catch (err) {
      toast.error('Payment capture failed');
    }
  };

  return (
    <div>
      {/* Tab bar header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('list')}>
          Bookings Registry
        </button>
        <button className={`btn ${activeTab === 'walk-in' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('walk-in')}>
          New Walk-in Booking
        </button>
      </div>

      {/* Tab: Bookings list */}
      {activeTab === 'list' && (
        <div className="card">
          <h3 className="card-title">Front Desk Check-in / Checkout Register</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Guest Name</th>
                  <th>Room</th>
                  <th>Dates</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No active reservations.</td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{b.booking_ref}</td>
                      <td>{b.first_name} {b.last_name}</td>
                      <td>Room {b.room_number || 'TBD'}</td>
                      <td>{new Date(b.check_in_date).toLocaleDateString()} - {new Date(b.check_out_date).toLocaleDateString()}</td>
                      <td>${b.total_amount}</td>
                      <td>
                        <span className={`badge badge-${
                          b.status === 'confirmed' ? 'info' :
                          b.status === 'checked_in' ? 'success' :
                          b.status === 'checked_out' ? 'secondary' : 'warning'
                        }`}>{b.status}</span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        {b.status === 'confirmed' && (
                          <button className="btn btn-primary" onClick={() => handleCheckIn(b.id)}>
                            Check-In
                          </button>
                        )}
                        {b.status === 'checked_in' && (
                          <button className="btn btn-danger" onClick={() => handleCheckOut(b.id)}>
                            Checkout & Bill
                          </button>
                        )}
                        {b.status === 'checked_out' && (
                          <button className="btn btn-secondary" onClick={() => loadInvoice(b.id)}>
                            View Invoice
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

      {/* Tab: Walk-in Form */}
      {activeTab === 'walk-in' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '24px' }}>Create Walk-in Reservation</h3>
          <form onSubmit={handleWalkinSubmit}>
            <h4 style={{ color: 'var(--accent)', marginBottom: '16px' }}>1. Select Hotel & Dates</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label className="form-label">Country</label>
                <select className="form-control" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <select className="form-control" value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                  {statesList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">City/District</label>
                <select className="form-control" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                  {citiesList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hotel</label>
                <select className="form-control" value={selectedHotelId} onChange={(e) => setSelectedHotelId(e.target.value)}>
                  {filteredHotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Check-in Date</label>
                <input type="date" className="form-control" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Check-out Date</label>
                <input type="date" className="form-control" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} required />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={checkWalkinAvailability}>
                Search Available Rooms
              </button>
            </div>

            {availableRooms.length > 0 && (
              <div>
                <h4 style={{ color: 'var(--accent)', marginBottom: '16px' }}>2. Room & Customer Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Available Rooms</label>
                    <select className="form-control" value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)}>
                      {availableRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          Room {room.room_number} - {room.category_name} (${room.base_price}/night)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Email</label>
                    <input type="email" className="form-control" placeholder="guest@example.com" value={walkinEmail} onChange={(e) => setWalkinEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Members Count</label>
                    <input type="number" className="form-control" min="1" max="10" value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value))} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" placeholder="John" value={walkinFirstName} onChange={(e) => setWalkinFirstName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" placeholder="Doe" value={walkinLastName} onChange={(e) => setWalkinLastName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-control" placeholder="555-1234" value={walkinPhone} onChange={(e) => setWalkinPhone(e.target.value)} />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">Book Walk-in Guest</button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Invoice Details Modal */}
      {showInvoiceModal && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-title)' }}>Guest Billing Invoice</h3>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowInvoiceModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Hotel & Guest Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ color: 'var(--accent)' }}>{activeInvoice.hotel.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{activeInvoice.hotel.city}, {activeInvoice.hotel.country}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '600' }}>Ref: {activeInvoice.booking.booking_ref}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '14px' }}>
                <p><strong>Guest:</strong> {activeInvoice.customer.first_name} {activeInvoice.customer.last_name}</p>
                <p><strong>Email:</strong> {activeInvoice.customer.email}</p>
                <p><strong>Room No:</strong> {activeInvoice.room.room_number}</p>
                <p><strong>Stay Duration:</strong> {activeInvoice.billing.nights} Nights</p>
              </div>

              {/* Invoicing calculation */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Room Charge ({activeInvoice.billing.nights} Nights)</span>
                  <span>${activeInvoice.billing.roomCharges.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>CGST (9%)</span>
                  <span>${activeInvoice.billing.cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>SGST (9%)</span>
                  <span>${activeInvoice.billing.sgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', fontWeight: 'bold', fontSize: '16px', color: 'var(--accent)' }}>
                  <span>Net Total (payable)</span>
                  <span>${activeInvoice.billing.netTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', gap: '10px' }}>
              {activeInvoice.payment ? (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--success)', fontWeight: '600' }}>Paid via {activeInvoice.payment.payment_method}</span>
                  <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Close</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => handleRecordPayment('Cash')}>Pay Cash</button>
                  <button className="btn btn-primary" onClick={() => handleRecordPayment('Card')}>Pay Card</button>
                  <button className="btn btn-primary" onClick={() => handleRecordPayment('UPI')}>Pay UPI</button>
                  <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
