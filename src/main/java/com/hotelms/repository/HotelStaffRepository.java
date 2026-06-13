package com.hotelms.repository;

import com.hotelms.model.HotelStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HotelStaffRepository extends JpaRepository<HotelStaff, Integer> {
    List<HotelStaff> findByUserId(Integer userId);
    List<HotelStaff> findByHotelId(Integer hotelId);
}
