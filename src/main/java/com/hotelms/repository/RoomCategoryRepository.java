package com.hotelms.repository;

import com.hotelms.model.RoomCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomCategoryRepository extends JpaRepository<RoomCategory, Integer> {
    List<RoomCategory> findByHotelId(Integer hotelId);
}
