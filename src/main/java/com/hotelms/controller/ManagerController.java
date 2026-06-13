package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ManagerController {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private RoomCategoryRepository roomCategoryRepository;

    @Autowired
    private CustomerRepository customerRepository;

    // Analytics Dashboard
    @GetMapping("/analytics/overview")
    public ResponseEntity<?> getAnalytics() {
        List<Payment> payments = paymentRepository.findAll();
        BigDecimal totalRevenue = payments.stream()
                .filter(p -> p.getStatus().equals("completed"))
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Room> rooms = roomRepository.findAll();
        long totalRooms = rooms.size();
        long occupiedRooms = rooms.stream().filter(r -> r.getStatus().equals("occupied")).count();
        
        String occupancyRate = totalRooms > 0 ? 
                String.format("%.1f%%", ((double) occupiedRooms / totalRooms) * 100) : "0%";

        Map<String, Object> revenueStats = new HashMap<>();
        revenueStats.put("totalRevenue", totalRevenue);

        Map<String, Object> occupancyStats = new HashMap<>();
        occupancyStats.put("occupancyRate", occupancyRate);

        Map<String, Object> data = new HashMap<>();
        data.put("revenueStats", revenueStats);
        data.put("occupancyStats", occupancyStats);

        return ResponseEntity.ok(new ApiResponse(true, "Analytics loaded", data));
    }

    // List Complaints
    @GetMapping("/complaints")
    public ResponseEntity<?> listComplaints() {
        List<Complaint> list = complaintRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (Complaint c : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("complaint_ref", c.getComplaintRef());
            map.put("customer_first_name", c.getCustomer() != null ? c.getCustomer().getUser().getFirstName() : "Walk-in");
            map.put("customer_last_name", c.getCustomer() != null ? c.getCustomer().getUser().getLastName() : "Guest");
            map.put("subject", c.getSubject());
            map.put("description", c.getDescription());
            map.put("status", c.getStatus());
            map.put("assigned_staff_name", c.getAssignee() != null ? 
                    c.getAssignee().getFirstName() + " " + c.getAssignee().getLastName() : null);
            map.put("resolution", c.getResolution());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Complaints loaded", responseData));
    }

    // My complaints (for customer portal)
    @GetMapping("/complaints/my-complaints")
    public ResponseEntity<?> listMyComplaints() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Customer profile not found"));
        List<Complaint> list = complaintRepository.findByCustomerId(customer.getId());
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (Complaint c : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("complaint_ref", c.getComplaintRef());
            map.put("subject", c.getSubject());
            map.put("description", c.getDescription());
            map.put("status", c.getStatus());
            map.put("hotel_name", c.getHotel() != null ? c.getHotel().getName() : "N/A");
            map.put("assigned_staff_name", c.getAssignee() != null ? 
                    c.getAssignee().getFirstName() + " " + c.getAssignee().getLastName() : null);
            map.put("resolution", c.getResolution());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Customer complaints loaded", responseData));
    }

    @PostMapping("/complaints")
    public ResponseEntity<?> addComplaint(@RequestBody ComplaintRequest request) {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Customer profile not found"));
        Hotel hotel = hotelRepository.findById(request.hotel_id)
                .orElseThrow(() -> new RuntimeException("Hotel not found"));

        Complaint c = new Complaint();
        c.setComplaintRef("CMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setSubject(request.subject);
        c.setDescription(request.description);
        c.setStatus("open");
        c.setCustomer(customer);
        c.setHotel(hotel);

        complaintRepository.save(c);
        return ResponseEntity.ok(new ApiResponse(true, "Complaint lodged successfully", c));
    }

    public static class ComplaintRequest {
        public int hotel_id;
        public String subject;
        public String description;
    }

    // Assign Complaint
    @PostMapping("/complaints/{id}/assign")
    public ResponseEntity<?> assignComplaint(@PathVariable("id") Integer id, @RequestBody AssignRequest request) {
        Complaint c = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        User assignee = userRepository.findById(request.assigned_to)
                .orElseThrow(() -> new RuntimeException("Staff member not found"));

        c.setAssignee(assignee);
        c.setStatus("assigned");
        complaintRepository.save(c);

        return ResponseEntity.ok(new ApiResponse(true, "Staff member assigned successfully"));
    }

    // Resolve Complaint
    @PostMapping("/complaints/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable("id") Integer id, @RequestBody ResolveRequest request) {
        Complaint c = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        c.setResolution(request.resolution);
        c.setStatus("resolved");
        complaintRepository.save(c);

        return ResponseEntity.ok(new ApiResponse(true, "Support ticket resolved successfully"));
    }

    // Housekeeper Room Status Toggle
    @PatchMapping("/hotels/rooms/{id}/status")
    public ResponseEntity<?> updateRoomStatus(@PathVariable("id") Integer id, @RequestBody StatusRequest request) {
        Room r = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        r.setStatus(request.status);
        roomRepository.save(r);

        return ResponseEntity.ok(new ApiResponse(true, "Room status updated successfully"));
    }

    // Reviews & Ratings Submission
    @PostMapping("/hotels/reviews")
    public ResponseEntity<?> addReview(@RequestBody ReviewRequest request) {
        Review r = new Review();
        r.setRating(request.rating);
        r.setComment(request.comment);
        
        // Populate default customer and hotel from booking
        bookingRepository.findById(request.booking_id).ifPresent(b -> {
            r.setBooking(b);
            r.setCustomer(b.getCustomer());
            r.setHotel(b.getHotel());
            reviewRepository.save(r);
        });

        return ResponseEntity.ok(new ApiResponse(true, "Review submitted successfully"));
    }

    // List all hotels for booking dropdowns
    @GetMapping("/hotels")
    public ResponseEntity<?> listHotels() {
        return ResponseEntity.ok(new ApiResponse(true, "Hotels loaded", hotelRepository.findAll()));
    }

    // Create new hotel (Admin only)
    @PostMapping("/hotels")
    public ResponseEntity<?> createHotel(@RequestBody Hotel hotel) {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!user.getRole().getName().equals("admin")) {
            return ResponseEntity.status(403)
                    .body(new ApiResponse(false, "Only administrators can add hotels"));
        }
        if (hotel.getName() == null || hotel.getCity() == null || hotel.getState() == null || hotel.getCountry() == null) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Name, City, State, and Country are required"));
        }
        Hotel saved = hotelRepository.save(hotel);
        return ResponseEntity.status(201)
                .body(new ApiResponse(true, "Hotel created successfully", saved));
    }

    // List all room categories
    @GetMapping("/room-categories")
    public ResponseEntity<?> listCategories() {
        return ResponseEntity.ok(new ApiResponse(true, "Room categories loaded", roomCategoryRepository.findAll()));
    }

    // Create a new room category (Manager/Admin only)
    @PostMapping("/room-categories")
    public ResponseEntity<?> createCategory(@RequestBody RoomCategoryCreationRequest request) {
        Hotel hotel = hotelRepository.findById(request.hotel_id)
                .orElseThrow(() -> new RuntimeException("Hotel not found"));
        RoomCategory category = new RoomCategory();
        category.setHotel(hotel);
        category.setName(request.name);
        category.setDescription(request.description);
        category.setMaxOccupancy(request.max_occupancy);
        category.setBasePrice(request.base_price);

        RoomCategory saved = roomCategoryRepository.save(category);
        return ResponseEntity.status(201)
                .body(new ApiResponse(true, "Room category created successfully", saved));
    }

    public static class RoomCategoryCreationRequest {
        public int hotel_id;
        public String name;
        public String description;
        public int max_occupancy;
        public BigDecimal base_price;
    }

    // List all reviews (Manager/Admin only)
    @GetMapping("/hotels/reviews")
    public ResponseEntity<?> listReviews() {
        List<Review> list = reviewRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();
        for (Review r : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("rating", r.getRating());
            map.put("comment", r.getComment());
            map.put("customer_name", r.getCustomer() != null ? r.getCustomer().getUser().getFirstName() + " " + r.getCustomer().getUser().getLastName() : "Anonymous");
            map.put("hotel_name", r.getHotel() != null ? r.getHotel().getName() : "N/A");
            map.put("created_at", r.getCreatedAt());
            responseData.add(map);
        }
        return ResponseEntity.ok(new ApiResponse(true, "Reviews loaded", responseData));
    }

    // List all bookings (Manager/Admin only)
    @GetMapping("/bookings")
    public ResponseEntity<?> listAllBookings() {
        List<Booking> list = bookingRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();
        for (Booking b : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", b.getId());
            map.put("booking_ref", b.getBookingRef());
            map.put("customer_name", b.getCustomer() != null ? b.getCustomer().getUser().getFirstName() + " " + b.getCustomer().getUser().getLastName() : "Walk-in Guest");
            map.put("hotel_name", b.getHotel() != null ? b.getHotel().getName() : "N/A");
            map.put("room_number", b.getRoom() != null ? b.getRoom().getRoomNumber() : "N/A");
            map.put("check_in_date", b.getCheckInDate());
            map.put("check_out_date", b.getCheckOutDate());
            map.put("total_amount", b.getTotalAmount());
            map.put("status", b.getStatus());
            map.put("guest_count", b.getGuestCount());
            responseData.add(map);
        }
        return ResponseEntity.ok(new ApiResponse(true, "All bookings loaded", responseData));
    }

    // Create a new room (Manager/Admin only)
    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody Dto.RoomCreationRequest request) {
        Hotel hotel = hotelRepository.findById(request.hotel_id)
                .orElseThrow(() -> new RuntimeException("Hotel not found"));
        RoomCategory category = roomCategoryRepository.findById(request.category_id)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        Room room = new Room();
        room.setHotel(hotel);
        room.setCategory(category);
        room.setRoomNumber(request.room_number);
        room.setStatus("available");

        Room saved = roomRepository.save(room);
        return ResponseEntity.status(201)
                .body(new ApiResponse(true, "Room created successfully", saved));
    }
}
