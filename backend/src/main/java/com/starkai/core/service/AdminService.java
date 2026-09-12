package com.starkai.core.service;

import com.starkai.core.dto.AdminDto.*;
import com.starkai.core.model.User;
import com.starkai.core.repository.ConversationRepository;
import com.starkai.core.repository.SubscriptionRepository;
import com.starkai.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ConversationRepository conversationRepository;

    public DashboardMetricsDto getMetrics() {
        long totalUsers = userRepository.count();
        long standard = userRepository.countByPlan(User.Plan.STANDARD);
        long pro = userRepository.countByPlan(User.Plan.PRO);
        long vip = userRepository.countByPlan(User.Plan.VIP);

        Long revenueCents = subscriptionRepository.sumActiveRevenueCents();
        double revenue = revenueCents != null ? revenueCents / 100.0 : 0.0;
        long conversations = conversationRepository.count();

        List<UserOverviewDto> recentUsers = userRepository.findAll().stream()
                .limit(10)
                .map(u -> UserOverviewDto.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .email(u.getEmail())
                        .role(u.getRole().name())
                        .plan(u.getPlan().name())
                        .enabled(u.isEnabled())
                        .joinedDate(u.getCreatedAt().toString())
                        .build())
                .collect(Collectors.toList());

        return DashboardMetricsDto.builder()
                .totalUsers(totalUsers)
                .activeSubscribers(pro + vip)
                .monthlyRecurringRevenue(revenue)
                .totalTransmissions(conversations)
                .userCountByPlan(Map.of("STANDARD", standard, "PRO", pro, "VIP", vip))
                .recentUsers(recentUsers)
                .build();
    }

    @Transactional
    public void updateUserStatus(String userId, UserStatusUpdateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setEnabled(req.isEnabled());
        if (req.getNewPlan() != null && !req.getNewPlan().isBlank()) {
            user.setPlan(User.Plan.valueOf(req.getNewPlan().toUpperCase()));
        }
        userRepository.save(user);
    }
}
