package com.starkai.core.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.util.List;

public class SubscriptionDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpgradePlanRequest {
        @NotBlank(message = "Plan tier is required")
        private String targetPlan; // STANDARD, PRO, VIP

        private String paymentToken;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanDetailsDto {
        private String tier;
        private int priceMonthly;
        private int messageCap;
        private int maxFileSizeMb;
        private boolean advancedReasoning;
        private boolean visionSupport;
        private boolean priorityQueue;
        private List<String> highlightPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionStatusResponse {
        private String currentPlan;
        private String status;
        private String renewalDate;
        private int monthlyMessagesUsed;
        private int monthlyMessagesMax;
    }
}
