package com.starkai.core.controller;

import com.starkai.core.dto.SubscriptionDto.*;
import com.starkai.core.model.Subscription;
import com.starkai.core.model.User;
import com.starkai.core.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/plans")
    public ResponseEntity<List<PlanDetailsDto>> getPlans() {
        return ResponseEntity.ok(subscriptionService.getAllPlans());
    }

    @PostMapping("/upgrade")
    public ResponseEntity<Subscription> upgrade(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpgradePlanRequest request) {
        return ResponseEntity.ok(subscriptionService.upgradePlan(user, request));
    }
}
