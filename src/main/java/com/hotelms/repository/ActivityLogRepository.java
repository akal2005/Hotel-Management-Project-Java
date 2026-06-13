package com.hotelms.repository;

import com.hotelms.model.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Integer> {
    List<ActivityLog> findAllByOrderByCreatedAtDesc();
}
