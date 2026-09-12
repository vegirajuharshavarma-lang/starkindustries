package com.starkai.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 120;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = getClientIp(request);
        long currentMinute = System.currentTimeMillis() / 60000;

        RequestCounter counter = requestCounts.compute(clientIp, (k, v) -> {
            if (v == null || v.minuteWindow != currentMinute) {
                return new RequestCounter(currentMinute, new AtomicInteger(1));
            }
            v.count.incrementAndGet();
            return v;
        });

        if (counter.count.get() > MAX_REQUESTS_PER_MINUTE) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"STARK Rate Limit Exceeded. Maximum " + MAX_REQUESTS_PER_MINUTE + " req/min per IP.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class RequestCounter {
        final long minuteWindow;
        final AtomicInteger count;

        RequestCounter(long minuteWindow, AtomicInteger count) {
            this.minuteWindow = minuteWindow;
            this.count = count;
        }
    }
}
