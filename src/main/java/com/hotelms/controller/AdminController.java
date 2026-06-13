package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.ActivityLogRepository;
import com.hotelms.repository.RoleRepository;
import com.hotelms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

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
}
