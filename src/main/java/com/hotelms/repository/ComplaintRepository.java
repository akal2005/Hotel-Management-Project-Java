package com.hotelms.repository;

import com.hotelms.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Integer> {
    List<Complaint> findByCustomerId(Integer customerId);
    List<Complaint> findByHotelId(Integer hotelId);
    List<Complaint> findByAssigneeId(Integer assigneeId);
}
