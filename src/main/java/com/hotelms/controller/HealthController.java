package com.hotelms.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> map = new HashMap<>();
        map.put("success", true);
        map.put("message", "Hotel Management System API is running (Java Spring Boot)");
        map.put("version", "1.0.0");
        map.put("status", "UP");
        return map;
    }
}
