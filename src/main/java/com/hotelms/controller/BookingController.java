package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @GetMapping("/availability")
    public ResponseEntity<?> checkAvailability(
            @RequestParam("hotel_id") Integer hotelId,
            @RequestParam("check_in") String checkInStr,
            @RequestParam("check_out") String checkOutStr) {

        LocalDate checkIn = LocalDate.parse(checkInStr);
        LocalDate checkOut = LocalDate.parse(checkOutStr);

        if (checkIn.isBefore(LocalDate.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Check-in date cannot be in the past"));
        }
        if (checkOut.isBefore(checkIn) || checkOut.isEqual(checkIn)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Check-out date must be after check-in"));
        }

        List<Room> rooms = roomRepository.findAvailableRooms(hotelId, checkIn, checkOut);
        List<Map<String, Object>> responseData = new ArrayList<>();
        
        for (Room r : rooms) {
            Map<String, Object> map = new HashMap<>();
            map.add("id", r.getId());
            map.add("room_number", r.getRoomNumber());
            map.add("category_name", r.getCategory().getName());
            map.add("max_occupancy", r.getCategory().getMaxOccupancy());
            map.add("base_price", r.getCategory().getBasePrice());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Availability checked", responseData));
    }

    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody BookingRequest request) {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Customer profile not found"));

        Hotel hotel = hotelRepository.findById(request.hotel_id)
                .orElseThrow(() -> new RuntimeException("Hotel not found"));

        Room room = roomRepository.findById(request.room_id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        LocalDate checkIn = LocalDate.parse(request.check_in_date);
        LocalDate checkOut = LocalDate.parse(request.check_out_date);

        // Verify room is still available
        List<Room> available = roomRepository.findAvailableRooms(request.hotel_id, checkIn, checkOut);
        boolean isAvailable = available.stream().anyMatch(r -> r.getId().equals(room.getId()));
        if (!isAvailable) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, "Selected room is no longer available for these dates"));
        }

        Booking booking = new Booking();
        booking.setCustomer(customer);
        booking.setHotel(hotel);
        booking.setRoom(room);
        booking.setCheckInDate(checkIn);
        booking.setCheckOutDate(checkOut);
        booking.setStatus("confirmed");
        booking.setTotalAmount(request.total_amount);
        booking.setBookingRef("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        bookingRepository.save(booking);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse(true, "Booking successful", booking));
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<?> getMyBookings() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Customer profile not found"));

        List<Booking> bookings = bookingRepository.findByCustomerId(customer.getId());
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (Booking b : bookings) {
            Map<String, Object> map = new HashMap<>();
            map.add("id", b.getId());
            map.add("booking_ref", b.getBookingRef());
            map.add("check_in_date", b.getCheckInDate());
            map.add("check_out_date", b.getCheckOutDate());
            map.add("total_amount", b.getTotalAmount());
            map.add("status", b.getStatus());
            map.add("room_number", b.getRoom() != null ? b.getRoom().getRoomNumber() : null);
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Bookings loaded", responseData));
    }
}
