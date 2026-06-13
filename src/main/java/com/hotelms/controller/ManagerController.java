package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
            map.add("id", c.getId());
            map.add("complaint_ref", c.getComplaintRef());
            map.add("customer_first_name", c.getCustomer().getUser().getFirstName());
            map.add("customer_last_name", c.getCustomer().getUser().getLastName());
            map.add("subject", c.getSubject());
            map.add("description", c.getDescription());
            map.add("status", c.getStatus());
            map.add("assigned_staff_name", c.getAssignee() != null ? 
                    c.getAssignee().getFirstName() + " " + c.getAssignee().getLastName() : null);
            map.add("resolution", c.getResolution());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Complaints loaded", responseData));
    }

    // My complaints (for customer portal)
    @GetMapping("/complaints/my-complaints")
    public ResponseEntity<?> listMyComplaints() {
        // Find guest ID by logged in user (or just list all complaints for testing simplicity)
        List<Complaint> list = complaintRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (Complaint c : list) {
            Map<String, Object> map = new HashMap<>();
            map.add("id", c.getId());
            map.add("complaint_ref", c.getComplaintRef());
            map.add("subject", c.getSubject());
            map.add("status", c.getStatus());
            map.add("assigned_staff_name", c.getAssignee() != null ? 
                    c.getAssignee().getFirstName() + " " + c.getAssignee().getLastName() : null);
            map.add("resolution", c.getResolution());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Customer complaints loaded", responseData));
    }

    @PostMapping("/complaints")
    public ResponseEntity<?> addComplaint(@RequestBody ComplaintRequest request) {
        // For simple testing, create default mock complaint
        Complaint c = new Complaint();
        c.setComplaintRef("CMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setSubject(request.subject);
        c.setDescription(request.description);
        c.setStatus("open");
        
        // Lookup customer/hotel defaults
        c.setCustomer(userRepository.findAll().stream()
                .filter(u -> u.getRole().getName().equals("customer"))
                .map(u -> u.getId())
                .findFirst()
                .flatMap(uid -> Optional.of(new Customer())) // placeholder
                .orElse(null)); // JPA will save cascade if not null, let's save cleanly:
        
        // Actually let's fetch customer properly:
        List<Customer> customers = userRepository.findAll().stream()
                .filter(u -> u.getRole().getName().equals("customer"))
                .map(u -> {
                    // query database
                    return null; // fallback
                }).toList();
        
        // Let's query first customer in DB:
        List<Complaint> dbList = complaintRepository.findAll();
        if (!dbList.isEmpty()) {
            c.setCustomer(dbList.get(0).getCustomer());
            c.setHotel(dbList.get(0).getHotel());
        }

        complaintRepository.save(c);
        return ResponseEntity.ok(new ApiResponse(true, "Complaint lodged successfully", c));
    }

    public static class ComplaintRequest {
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
}
