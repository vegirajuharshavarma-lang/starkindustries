package com.starkai.core.controller;

import com.starkai.core.dto.AdminDto.*;
import com.starkai.core.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/metrics")
    public ResponseEntity<DashboardMetricsDto> getMetrics() {
        return ResponseEntity.ok(adminService.getMetrics());
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Map<String, String>> updateUserStatus(
            @PathVariable String id,
            @Valid @RequestBody UserStatusUpdateRequest request) {
        adminService.updateUserStatus(id, request);
        return ResponseEntity.ok(Map.of("message", "User status and permissions updated"));
    }
}
