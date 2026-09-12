package com.starkai.core.service;

import com.starkai.core.dto.SubscriptionDto.*;
import com.starkai.core.model.Subscription;
import com.starkai.core.model.User;
import com.starkai.core.repository.SubscriptionRepository;
import com.starkai.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;

    public List<PlanDetailsDto> getAllPlans() {
        return List.of(
                PlanDetailsDto.builder()
                        .tier("STANDARD")
                        .priceMonthly(10)
                        .messageCap(50)
                        .maxFileSizeMb(10)
                        .advancedReasoning(false)
                        .visionSupport(true)
                        .priorityQueue(false)
                        .highlightPoints(List.of("50 Core Transmissions / month", "Standard STARK 3.5 Flash", "10 MB File Analysis", "Secure Vault Storage"))
                        .build(),
                PlanDetailsDto.builder()
                        .tier("PRO")
                        .priceMonthly(20)
                        .messageCap(250)
                        .maxFileSizeMb(50)
                        .advancedReasoning(true)
                        .visionSupport(true)
                        .priorityQueue(true)
                        .highlightPoints(List.of("250 Transmissions / month", "PRO Cortex Reasoning (3.1 Pro)", "50 MB Document Analysis", "Vision & High-Res Image Matrix", "Priority Quantum Queue"))
                        .build(),
                PlanDetailsDto.builder()
                        .tier("VIP")
                        .priceMonthly(25)
                        .messageCap(999999)
                        .maxFileSizeMb(200)
                        .advancedReasoning(true)
                        .visionSupport(true)
                        .priorityQueue(true)
                        .highlightPoints(List.of("Unlimited Transmissions", "Uncapped PRO & Vision Models", "200 MB Massive File Vault", "Zero Latency Tier-1 Processing", "Dedicated AI Security Architect"))
                        .build()
        );
    }

    @Transactional
    public Subscription upgradePlan(User user, UpgradePlanRequest req) {
        User.Plan newPlan = User.Plan.valueOf(req.getTargetPlan().toUpperCase());
        int priceCents = switch (newPlan) {
            case STANDARD -> 1000;
            case PRO -> 2000;
            case VIP -> 2500;
        };

        // Deactivate previous active subscription if any
        subscriptionRepository.findFirstByUserAndStatusOrderByStartDateDesc(user, Subscription.Status.ACTIVE)
                .ifPresent(s -> {
                    s.setStatus(Subscription.Status.CANCELLED);
                    s.setEndDate(LocalDateTime.now());
                    subscriptionRepository.save(s);
                });

        Subscription newSub = Subscription.builder()
                .user(user)
                .plan(newPlan)
                .status(Subscription.Status.ACTIVE)
                .priceCents(priceCents)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusMonths(1))
                .transactionRef("stark_tx_" + System.currentTimeMillis())
                .build();

        subscriptionRepository.save(newSub);

        user.setPlan(newPlan);
        userRepository.save(user);

        return newSub;
    }
}
