package com.starkai.core.repository;

import com.starkai.core.model.UsageRecord;
import com.starkai.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsageRecordRepository extends JpaRepository<UsageRecord, String> {
    Optional<UsageRecord> findByUserAndPeriodYearMonth(User user, String periodYearMonth);
}
