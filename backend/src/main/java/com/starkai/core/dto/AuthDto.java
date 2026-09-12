package com.starkai.core.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

public class AuthDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Email or username is required")
        private String identifier;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30)
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private String tokenType;
        private String userId;
        private String username;
        private String email;
        private String role;
        private String plan;
        private long expiresInMs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetRequest {
        @NotBlank
        @Email
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileDto {
        private String id;
        private String username;
        private String email;
        private String role;
        private String plan;
        private int totalMessages;
        private long totalTokens;
        private String createdAt;
    }
}
