package com.hotelms.controller;

import com.hotelms.dto.Dto.*;
import com.hotelms.model.*;
import com.hotelms.repository.BookingRepository;
import com.hotelms.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @GetMapping("/invoice/{bookingId}")
    public ResponseEntity<?> getInvoice(@PathVariable("bookingId") Integer bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());
        if (nights <= 0) nights = 1; // Minimum 1 night charge

        BigDecimal roomCharges = booking.getRoom() != null ? 
                booking.getRoom().getCategory().getBasePrice().multiply(BigDecimal.valueOf(nights)) : 
                booking.getTotalAmount();

        BigDecimal cgstRate = BigDecimal.valueOf(0.09); // 9% CGST
        BigDecimal sgstRate = BigDecimal.valueOf(0.09); // 9% SGST
        
        BigDecimal cgst = roomCharges.multiply(cgstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = roomCharges.multiply(sgstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal netTotal = roomCharges.add(cgst).add(sgst).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> billing = new HashMap<>();
        billing.put("nights", nights);
        billing.put("roomCharges", roomCharges);
        billing.put("cgst", cgst);
        billing.put("sgst", sgst);
        billing.put("netTotal", netTotal);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("booking", Map.of("id", booking.getId(), "booking_ref", booking.getBookingRef()));
        responseData.put("customer", Map.of("first_name", booking.getCustomer().getUser().getFirstName(), 
                "last_name", booking.getCustomer().getUser().getLastName(), "email", booking.getCustomer().getUser().getEmail()));
        responseData.put("room", Map.of("room_number", booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "TBD"));
        responseData.put("hotel", Map.of("name", booking.getHotel().getName(), "city", booking.getHotel().getCity(), "country", booking.getHotel().getCountry()));
        responseData.put("billing", billing);

        Optional<Payment> optionalPayment = paymentRepository.findByBookingId(booking.getId());
        if (optionalPayment.isPresent()) {
            Payment payment = optionalPayment.get();
            responseData.put("payment", Map.of("payment_method", payment.getPaymentMethod(), "status", payment.getStatus()));
        }

        return ResponseEntity.ok(new ApiResponse(true, "Invoice loaded", responseData));
    }

    @PostMapping("/capture")
    public ResponseEntity<?> capturePayment(@RequestBody PaymentCaptureRequest request) {
        Booking booking = bookingRepository.findById(request.booking_id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        Payment payment = paymentRepository.findByBookingId(booking.getId()).orElse(new Payment());
        payment.setBooking(booking);
        payment.setAmount(request.amount);
        payment.setPaymentMethod(request.payment_method);
        payment.setStatus("completed");
        payment.setTransactionRef(request.transaction_ref);

        paymentRepository.save(payment);

        return ResponseEntity.ok(new ApiResponse(true, "Payment captured successfully"));
    }
}
