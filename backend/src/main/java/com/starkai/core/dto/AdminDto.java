package com.starkai.core.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

public class AdminDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardMetricsDto {
        private long totalUsers;
        private long activeSubscribers;
        private double monthlyRecurringRevenue;
        private long totalTransmissions;
        private Map<String, Long> userCountByPlan;
        private List<UserOverviewDto> recentUsers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserOverviewDto {
        private String id;
        private String username;
        private String email;
        private String role;
        private String plan;
        private boolean enabled;
        private int totalMessages;
        private String joinedDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserStatusUpdateRequest {
        private boolean enabled;
        private String newPlan;
    }
}
