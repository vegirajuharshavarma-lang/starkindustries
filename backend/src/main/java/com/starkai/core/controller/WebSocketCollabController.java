package com.starkai.core.controller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * STARK-AI CORE — WebSocket Real-Time STOMP Controller
 * Handles incoming real-time collaborative transmissions, sequence assignment,
 * presence heartbeats, and AI synthesis status broadcasts.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketCollabController {

    private final SimpMessagingTemplate messagingTemplate;
    private final AtomicLong globalSequenceCounter = new AtomicLong(2000L);

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WsMessagePayload {
        private String type; // MESSAGE_TRANSMITTED, LIVE_TYPING, AI_SYNTHESIS_STATE, PRESENCE_UPDATE
        private String conversationId;
        private String senderUserId;
        private String senderName;
        private String senderRole;
        private String content;
        private Long sequenceNumber;
        private Boolean isTyping;
        private Boolean isSynthesizing;
        private String timestamp;
        private Map<String, Object> metadata;
    }

    /**
     * Handles real-time client message transmission and broadcasts with monotonic sequence number.
     */
    @MessageMapping("/collab/{conversationId}/transmit")
    @SendTo("/topic/convo/{conversationId}/messages")
    public WsMessagePayload handleTransmission(
            @DestinationVariable String conversationId,
            @Payload WsMessagePayload payload) {

        payload.setConversationId(conversationId);
        payload.setSequenceNumber(globalSequenceCounter.incrementAndGet());
        payload.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
        
        log.info("STOMP Transmission: seq={} convo={} sender={} role={}",
                payload.getSequenceNumber(), conversationId, payload.getSenderName(), payload.getSenderRole());

        return payload;
    }

    /**
     * Broadcasts live typing pulse to all operatives viewing the conversation.
     */
    @MessageMapping("/collab/{conversationId}/typing")
    @SendTo("/topic/convo/{conversationId}/typing")
    public WsMessagePayload handleTyping(
            @DestinationVariable String conversationId,
            @Payload WsMessagePayload payload) {

        payload.setConversationId(conversationId);
        payload.setType("LIVE_TYPING");
        return payload;
    }

    /**
     * Broadcasts operative presence status updates (ONLINE, AWAY, JOINED).
     */
    @MessageMapping("/collab/{conversationId}/presence")
    @SendTo("/topic/convo/{conversationId}/presence")
    public WsMessagePayload handlePresence(
            @DestinationVariable String conversationId,
            @Payload WsMessagePayload payload) {

        payload.setConversationId(conversationId);
        payload.setType("PRESENCE_UPDATE");
        return payload;
    }

    /**
     * Programmatic broadcast utility method for other services to send messages.
     */
    public void broadcastToConversation(String conversationId, String subtopic, Object data) {
        String destination = "/topic/convo/" + conversationId + "/" + subtopic;
        messagingTemplate.convertAndSend(destination, data);
    }
}
