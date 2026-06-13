package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private HotelStaffRepository hotelStaffRepository;

    @GetMapping
    public ResponseEntity<?> listUsers() {
        List<User> list = userRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (User u : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("first_name", u.getFirstName());
            map.put("last_name", u.getLastName());
            map.put("email", u.getEmail());
            map.put("phone", u.getPhone());
            map.put("role_name", u.getRole().getName());
            map.put("is_active", u.getIsActive());
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Users list loaded", responseData));
    }

    @PostMapping("/staff")
    public ResponseEntity<?> createStaff(@RequestBody StaffCreationRequest request) {
        if (userRepository.findByEmail(request.email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, "Email already registered"));
        }

        Role role = roleRepository.findByName(request.role)
                .orElseThrow(() -> new RuntimeException("Specified role not found"));

        User user = new User();
        user.setRole(role);
        user.setFirstName(request.first_name);
        user.setLastName(request.last_name);
        user.setEmail(request.email);
        user.setPasswordHash(passwordEncoder.encode(request.password));
        user.setPhone(request.phone);
        user.setIsActive(true);
        user.setEmailVerified(true);

        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse(true, "Staff account created successfully"));
    }

    public static class StaffCreationRequest {
        public String email;
        public String first_name;
        public String last_name;
        public String password;
        public String phone;
        public String role;
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable("id") Integer id, @RequestBody StatusRequest request) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (u.getRole().getName().equals("admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "Cannot suspend an admin account"));
        }

        u.setIsActive(request.is_active);
        userRepository.save(u);

        return ResponseEntity.ok(new ApiResponse(true, "User status updated successfully"));
    }

    @GetMapping("/activity/logs")
    public ResponseEntity<?> getActivityLogs() {
        List<ActivityLog> list = activityLogRepository.findAllByOrderByCreatedAtDesc();
        List<Map<String, Object>> responseData = new ArrayList<>();

        for (ActivityLog log : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("created_at", log.getCreatedAt());
            map.put("action", log.getAction());
            map.put("entity_type", log.getEntityType());
            map.put("entity_id", log.getEntityId());
            map.put("ip_address", log.getIpAddress() != null ? log.getIpAddress() : "127.0.0.1");
            responseData.add(map);
        }

        return ResponseEntity.ok(new ApiResponse(true, "Activity logs loaded", responseData));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats() {
        long totalHotels = hotelRepository.count();
        long totalUsers = userRepository.count();
        long totalBookings = bookingRepository.count();
        List<Payment> payments = paymentRepository.findAll();
        BigDecimal totalRevenue = payments.stream()
                .filter(p -> p.getStatus().equals("completed"))
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHotels", totalHotels);
        stats.put("totalUsers", totalUsers);
        stats.put("totalBookings", totalBookings);
        stats.put("totalRevenue", totalRevenue);

        return ResponseEntity.ok(new ApiResponse(true, "Admin stats loaded", stats));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable("id") Integer id, @RequestBody Map<String, String> request) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (u.getRole().getName().equals("admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "Cannot modify an admin account's role"));
        }

        String roleName = request.get("role");
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        u.setRole(role);
        userRepository.save(u);

        return ResponseEntity.ok(new ApiResponse(true, "User role updated successfully"));
    }

    @GetMapping("/staff/assignments")
    public ResponseEntity<?> getStaffAssignments() {
        List<HotelStaff> assignments = hotelStaffRepository.findAll();
        List<Map<String, Object>> responseData = new ArrayList<>();
        for (HotelStaff hs : assignments) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", hs.getId());
            map.put("user_id", hs.getUser().getId());
            map.put("staff_name", hs.getUser().getFirstName() + " " + hs.getUser().getLastName());
            map.put("staff_email", hs.getUser().getEmail());
            map.put("staff_role", hs.getUser().getRole().getName());
            map.put("hotel_id", hs.getHotel().getId());
            map.put("hotel_name", hs.getHotel().getName());
            map.put("is_primary", hs.getIsPrimary());
            responseData.add(map);
        }
        return ResponseEntity.ok(new ApiResponse(true, "Staff assignments loaded", responseData));
    }

    @PostMapping("/staff/assign")
    public ResponseEntity<?> assignStaff(@RequestBody Map<String, Object> request) {
        Integer userId = (Integer) request.get("user_id");
        Integer hotelId = (Integer) request.get("hotel_id");
        Boolean isPrimary = request.get("is_primary") != null ? (Boolean) request.get("is_primary") : true;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new RuntimeException("Hotel not found"));

        // Check if already assigned
        List<HotelStaff> existing = hotelStaffRepository.findByUserId(userId);
        boolean alreadyAssigned = existing.stream().anyMatch(hs -> hs.getHotel().getId().equals(hotelId));
        if (alreadyAssigned) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Staff member is already assigned to this hotel"));
        }

        HotelStaff hs = new HotelStaff();
        hs.setUser(user);
        hs.setHotel(hotel);
        hs.setIsPrimary(isPrimary);
        hotelStaffRepository.save(hs);

        return ResponseEntity.ok(new ApiResponse(true, "Staff assigned to hotel successfully"));
    }

    @DeleteMapping("/staff/assign/{id}")
    public ResponseEntity<?> removeStaffAssignment(@PathVariable("id") Integer id) {
        if (!hotelStaffRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse(false, "Assignment not found"));
        }
        hotelStaffRepository.deleteById(id);
        return ResponseEntity.ok(new ApiResponse(true, "Staff assignment removed successfully"));
    }
}
