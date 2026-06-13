package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/receptionist")
public class ReceptionistController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/bookings")
    public ResponseEntity<?> listBookings() {
        List<Booking> bookings = bookingRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (Booking b : bookings) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", b.getId());
            map.put("booking_ref", b.getBookingRef());
            map.put("first_name", b.getCustomer().getUser().getFirstName());
            map.put("last_name", b.getCustomer().getUser().getLastName());
            map.put("room_number", b.getRoom() != null ? b.getRoom().getRoomNumber() : null);
            map.put("check_in_date", b.getCheckInDate());
            map.put("check_out_date", b.getCheckOutDate());
            map.put("total_amount", b.getTotalAmount());
            map.put("status", b.getStatus());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Bookings register loaded", responseData));
    }

    @PostMapping("/walk-in")
    @Transactional
    public ResponseEntity<?> createWalkin(@RequestBody WalkInRequest request) {
        // Find or create customer
        Optional<User> optionalUser = userRepository.findByEmail(request.email);
        User user;
        if (optionalUser.isEmpty()) {
            Role role = roleRepository.findByName("customer")
                    .orElseThrow(() -> new RuntimeException("Default customer role not found"));
            
            user = new User();
            user.setRole(role);
            user.setFirstName(request.first_name);
            user.setLastName(request.last_name);
            user.setEmail(request.email);
            user.setPasswordHash(passwordEncoder.encode("password123")); // Default password
            user.setPhone(request.phone);
            user.setIsActive(true);
            user.setEmailVerified(true);
            userRepository.save(user);

            Customer customer = new Customer();
            customer.setUser(user);
            customerRepository.save(customer);
        } else {
            user = optionalUser.get();
        }

        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Customer profile not found"));

        Room room = roomRepository.findById(request.room_id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        Booking booking = new Booking();
        booking.setCustomer(customer);
        booking.setHotel(room.getHotel());
        booking.setRoom(room);
        booking.setCheckInDate(LocalDate.parse(request.check_in_date));
        booking.setCheckOutDate(LocalDate.parse(request.check_out_date));
        booking.setStatus("checked_in"); // Walk-in is immediately checked in
        booking.setTotalAmount(request.total_amount);
        booking.setGuestCount(request.guest_count != null ? request.guest_count : 1);
        booking.setBookingRef("WK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        bookingRepository.save(booking);

        room.setStatus("occupied");
        roomRepository.save(room);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse(true, "Walk-in booking created", booking));
    }

    @PostMapping("/bookings/{id}/check-in")
    public ResponseEntity<?> checkIn(@PathVariable("id") Integer bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getStatus().equals("confirmed")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Can only check-in confirmed bookings"));
        }

        booking.setStatus("checked_in");
        bookingRepository.save(booking);

        if (booking.getRoom() != null) {
            Room room = booking.getRoom();
            room.setStatus("occupied");
            roomRepository.save(room);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Guest checked in successfully"));
    }

    @PostMapping("/bookings/{id}/check-out")
    public ResponseEntity<?> checkOut(@PathVariable("id") Integer bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getStatus().equals("checked_in")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Can only check-out checked-in bookings"));
        }

        booking.setStatus("checked_out");
        bookingRepository.save(booking);

        if (booking.getRoom() != null) {
            Room room = booking.getRoom();
            room.setStatus("dirty"); // Mark room dirty on checkout
            roomRepository.save(room);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Guest checked out successfully"));
    }

    @GetMapping("/rooms")
    public ResponseEntity<?> listRooms() {
        List<Room> rooms = roomRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (Room r : rooms) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("room_number", r.getRoomNumber());
            map.put("category_name", r.getCategory().getName());
            map.put("max_occupancy", r.getCategory().getMaxOccupancy());
            map.put("base_price", r.getCategory().getBasePrice());
            map.put("status", r.getStatus());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Rooms loaded", responseData));
    }
}
