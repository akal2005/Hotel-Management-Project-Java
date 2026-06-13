package com.hotelms.repository;

import com.hotelms.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Integer> {
    List<Review> findByHotelId(Integer hotelId);
}
