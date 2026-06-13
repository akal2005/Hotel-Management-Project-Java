package com.hotelms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class Dto {

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class RegisterRequest {
        public String first_name;
        public String last_name;
        public String email;
        public String password;
        public String phone;
    }

    public static class ApiResponse {
        public boolean success;
        public String message;
        public Object data;

        public ApiResponse() {}

        public ApiResponse(boolean success, String message) {
            this.success = success;
            this.message = message;
        }

        public ApiResponse(boolean success, String message, Object data) {
            this.success = success;
            this.message = message;
            this.data = data;
        }
    }

    public static class TokenResponse {
        public String accessToken;
        public String refreshToken;
        public UserSummary user;

        public TokenResponse(String accessToken, String refreshToken, UserSummary user) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.user = user;
        }
    }

    public static class UserSummary {
        public int id;
        public String first_name;
        public String last_name;
        public String email;
        public String phone;
        public String role_name;
        public Integer customer_id;
        public List<HotelAssignmentSummary> hotels;
    }

    public static class HotelAssignmentSummary {
        public int id;
        public String name;
        public boolean is_primary;

        public HotelAssignmentSummary(int id, String name, boolean is_primary) {
            this.id = id;
            this.name = name;
            this.is_primary = is_primary;
        }
    }

    public static class WalkInRequest {
        public String email;
        public String first_name;
        public String last_name;
        public String phone;
        public int hotel_id;
        public int room_id;
        public String check_in_date;
        public String check_out_date;
        public BigDecimal total_amount;
        public Integer guest_count;
    }

    public static class BookingRequest {
        public int hotel_id;
        public int room_id;
        public String check_in_date;
        public String check_out_date;
        public BigDecimal total_amount;
        public Integer guest_count;
    }

    public static class StatusRequest {
        public String status;
        public Boolean is_active;
    }

    public static class AssignRequest {
        public int assigned_to;
    }

    public static class ResolveRequest {
        public String resolution;
    }

    public static class ReviewRequest {
        public int booking_id;
        public int rating;
        public String comment;
    }

    public static class PaymentCaptureRequest {
        public int booking_id;
        public BigDecimal amount;
        public String payment_method;
        public String transaction_ref;
    }
}
