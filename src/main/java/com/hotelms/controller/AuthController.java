package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.*;
import com.hotelms.security.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private HotelStaffRepository hotelStaffRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, "Email already registered"));
        }

        Role role = roleRepository.findByName("customer")
                .orElseThrow(() -> new RuntimeException("Default role 'customer' not found"));

        User user = new User();
        user.setRole(role);
        user.setFirstName(request.first_name);
        user.setLastName(request.last_name);
        user.setEmail(request.email);
        user.setPasswordHash(passwordEncoder.encode(request.password));
        user.setPhone(request.phone);
        user.setIsActive(true);
        user.setEmailVerified(true); // Auto-verify for dev ease

        userRepository.save(user);

        Customer customer = new Customer();
        customer.setUser(user);
        customerRepository.save(customer);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse(true, "Registration successful. You can now log in."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> optionalUser = userRepository.findByEmail(request.email);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid credentials"));
        }

        User user = optionalUser.get();
        if (!user.getIsActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "Account deactivated"));
        }

        if (!passwordEncoder.matches(request.password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid credentials"));
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String access = jwtUtil.generateToken(user.getId(), user.getEmail());
        String refresh = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());

        UserSummary summary = buildUserSummary(user);

        return ResponseEntity.ok(new ApiResponse(true, "Login successful", new TokenResponse(access, refresh, summary)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody TokenResponse request) {
        String refreshToken = request.refreshToken;
        try {
            if (jwtUtil.isRefreshTokenExpired(refreshToken)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Token expired"));
            }

            String email = jwtUtil.extractRefreshEmail(refreshToken);
            Integer userId = jwtUtil.extractRefreshUserId(refreshToken);

            Optional<User> optionalUser = userRepository.findById(userId);
            if (optionalUser.isEmpty() || !optionalUser.get().getIsActive()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Invalid user status"));
            }

            User user = optionalUser.get();
            String newAccess = jwtUtil.generateToken(user.getId(), user.getEmail());
            String newRefresh = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());

            UserSummary summary = buildUserSummary(user);

            return ResponseEntity.ok(new ApiResponse(true, "Token refreshed", new TokenResponse(newAccess, newRefresh, summary)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid token"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Unauthorized"));
        }
        UserSummary summary = buildUserSummary(user);
        return ResponseEntity.ok(new ApiResponse(true, "Profile loaded", summary));
    }

    private UserSummary buildUserSummary(User user) {
        UserSummary summary = new UserSummary();
        summary.id = user.getId();
        summary.first_name = user.getFirstName();
        summary.last_name = user.getLastName();
        summary.email = user.getEmail();
        summary.phone = user.getPhone();
        summary.role_name = user.getRole().getName();

        if (summary.role_name.equals("customer")) {
            customerRepository.findByUserId(user.getId())
                    .ifPresent(c -> summary.customer_id = c.getId());
        } else {
            List<HotelStaff> staffList = hotelStaffRepository.findByUserId(user.getId());
            List<HotelAssignmentSummary> assignments = new ArrayList<>();
            for (HotelStaff hs : staffList) {
                assignments.add(new HotelAssignmentSummary(hs.getHotel().getId(), hs.getHotel().getName(), hs.getIsPrimary()));
            }
            summary.hotels = assignments;
        }
        return summary;
    }
}
