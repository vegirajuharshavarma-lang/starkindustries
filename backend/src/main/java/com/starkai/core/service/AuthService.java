package com.starkai.core.service;

import com.starkai.core.dto.AuthDto.*;
import com.starkai.core.model.User;
import com.starkai.core.repository.UserRepository;
import com.starkai.core.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email is already registered in STARK Core");
        }
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("Codename / Username is already taken");
        }

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(req.getEmail().contains("admin") ? User.Role.ADMIN : User.Role.USER)
                .plan(User.Plan.STANDARD)
                .enabled(true)
                .build();

        userRepository.save(user);

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .plan(user.getPlan().name())
                .expiresInMs(86400000)
                .build();
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getIdentifier())
                .or(() -> userRepository.findByUsername(req.getIdentifier()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials for STARK Core access"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials for STARK Core access");
        }

        if (!user.isEnabled()) {
            throw new IllegalStateException("Your STARK Core terminal access has been suspended");
        }

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .plan(user.getPlan().name())
                .expiresInMs(86400000)
                .build();
    }

    public UserProfileDto getProfile(User user) {
        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .plan(user.getPlan().name())
                .createdAt(user.getCreatedAt().toString())
                .build();
    }
}
