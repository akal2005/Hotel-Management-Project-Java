import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const HousekeeperBoard = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch housekeeper's assigned hotel rooms
      const res = await api.get('/receptionist/rooms'); // receptionist endpoints return rooms lists, or we can use generic routes
      if (res.data.success) {
        setRooms(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load room board');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const updateRoomStatus = async (roomId, newStatus) => {
    try {
      const res = await api.patch(`/hotels/rooms/${roomId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Room status updated to ${newStatus}`);
        setRooms(rooms.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r)));
      }
    } catch (err) {
      toast.error('Failed to update room status');
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">Housekeeper Task Board</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
        Manage cleanliness and maintenance status of rooms in real time.
      </p>

      {loading && rooms.length === 0 ? (
        <p>Loading board...</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Room Number</th>
                <th>Category</th>
                <th>Current Status</th>
                <th>Mark Clean</th>
                <th>Mark Dirty</th>
                <th>Mark Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No rooms found in assigned hotel.</td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.id}>
                    <td style={{ fontWeight: 'bold', fontSize: '16px' }}>Room {room.room_number}</td>
                    <td>{room.category_name}</td>
                    <td>
                      <span className={`badge badge-${
                        room.status === 'available' ? 'success' :
                        room.status === 'occupied' ? 'info' :
                        room.status === 'dirty' ? 'danger' : 'warning'
                      }`}>{room.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        disabled={room.status === 'available'}
                        onClick={() => updateRoomStatus(room.id, 'available')}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Clean
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        disabled={room.status === 'dirty'}
                        onClick={() => updateRoomStatus(room.id, 'dirty')}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Dirty
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        disabled={room.status === 'maintenance'}
                        onClick={() => updateRoomStatus(room.id, 'maintenance')}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Maintenance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HousekeeperBoard;
