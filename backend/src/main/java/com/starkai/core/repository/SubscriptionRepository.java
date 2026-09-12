package com.starkai.core.repository;

import com.starkai.core.model.Subscription;
import com.starkai.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, String> {
    List<Subscription> findByUserOrderByStartDateDesc(User user);
    Optional<Subscription> findFirstByUserAndStatusOrderByStartDateDesc(User user, Subscription.Status status);

    @Query("SELECT SUM(s.priceCents) FROM Subscription s WHERE s.status = 'ACTIVE'")
    Long sumActiveRevenueCents();
}
