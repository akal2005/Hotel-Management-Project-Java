package com.hotelms.repository;

import com.hotelms.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Integer> {
    List<Room> findByHotelId(Integer hotelId);
    
    @Query("SELECT r FROM Room r WHERE r.hotel.id = ?1 AND r.status = 'available' AND r.id NOT IN " +
           "(SELECT b.room.id FROM Booking b WHERE b.room IS NOT NULL AND b.hotel.id = ?1 " +
           "AND b.status IN ('confirmed', 'checked_in') " +
           "AND b.checkInDate < ?3 AND b.checkOutDate > ?2)")
    List<Room> findAvailableRooms(Integer hotelId, LocalDate checkIn, LocalDate checkOut);
}
