package com.hotelms.controller;

import com.hotelms.dto.Dto.ApiResponse;
import com.hotelms.model.Customer;
import com.hotelms.model.User;
import com.hotelms.repository.CustomerRepository;
import com.hotelms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/customer")
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Customer profile not found"));

        Map<String, Object> data = new HashMap<>();
        data.put("first_name", user.getFirstName());
        data.put("last_name", user.getLastName());
        data.put("email", user.getEmail());
        data.put("phone", user.getPhone());
        data.put("date_of_birth", customer.getDateOfBirth() != null ? customer.getDateOfBirth().toString() : "");
        data.put("nationality", customer.getNationality() != null ? customer.getNationality() : "");
        data.put("id_type", customer.getIdType() != null ? customer.getIdType() : "");
        data.put("id_number", customer.getIdNumber() != null ? customer.getIdNumber() : "");
        data.put("address", customer.getAddress() != null ? customer.getAddress() : "");
        data.put("city", customer.getCity() != null ? customer.getCity() : "");
        data.put("country", customer.getCountry() != null ? customer.getCountry() : "");
        data.put("preferred_room_type", customer.getPreferredRoomType() != null ? customer.getPreferredRoomType() : "");
        data.put("special_requests", customer.getSpecialRequests() != null ? customer.getSpecialRequests() : "");

        return ResponseEntity.ok(new ApiResponse(true, "Profile loaded", data));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Customer customer = customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Customer profile not found"));

        // Update User details
        if (request.containsKey("first_name") && request.get("first_name") != null) {
            user.setFirstName(request.get("first_name"));
        }
        if (request.containsKey("last_name") && request.get("last_name") != null) {
            user.setLastName(request.get("last_name"));
        }
        if (request.containsKey("phone")) {
            user.setPhone(request.get("phone"));
        }
        userRepository.save(user);

        // Update Customer details
        if (request.containsKey("date_of_birth") && request.get("date_of_birth") != null && !request.get("date_of_birth").isEmpty()) {
            customer.setDateOfBirth(LocalDate.parse(request.get("date_of_birth")));
        } else {
            customer.setDateOfBirth(null);
        }
        customer.setNationality(request.get("nationality"));
        customer.setIdType(request.get("id_type"));
        customer.setIdNumber(request.get("id_number"));
        customer.setAddress(request.get("address"));
        customer.setCity(request.get("city"));
        customer.setCountry(request.get("country"));
        customer.setPreferredRoomType(request.get("preferred_room_type"));
        customer.setSpecialRequests(request.get("special_requests"));

        customerRepository.save(customer);

        return ResponseEntity.ok(new ApiResponse(true, "Profile updated successfully"));
    }
}
