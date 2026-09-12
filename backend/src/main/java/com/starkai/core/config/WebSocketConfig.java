package com.starkai.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STARK-AI CORE — Spring WebSocket & STOMP Message Broker Configuration
 * Enables real-time pub/sub synchronization across multi-user sessions,
 * ordered sequence delivery, live presence, and AI concurrency state.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable in-memory message broker with prefixes for conversation topics and private user queues
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages destined for @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Primary STOMP WebSocket endpoint with SockJS fallback support
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Native WebSocket endpoint without SockJS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
}
