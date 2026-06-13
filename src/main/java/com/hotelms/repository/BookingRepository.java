package com.hotelms.repository;

import com.hotelms.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
    List<Booking> findByCustomerId(Integer customerId);
    List<Booking> findByHotelId(Integer hotelId);
    Optional<Booking> findByBookingRef(String bookingRef);
}
