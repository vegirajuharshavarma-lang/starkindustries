package com.starkai.core.controller;

import com.starkai.core.dto.ChatDto.*;
import com.starkai.core.model.User;
import com.starkai.core.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/transmissions")
    public ResponseEntity<ChatTransmissionResponse> transmit(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ChatTransmissionRequest request) {
        return ResponseEntity.ok(chatService.processTransmission(user, request));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationSummaryDto>> listConversations(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getUserConversations(user));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<ConversationDetailDto> getConversation(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        return ResponseEntity.ok(chatService.getConversationDetail(user, id));
    }

    @PatchMapping("/conversations/{id}/rename")
    public ResponseEntity<Map<String, String>> rename(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody RenameConversationRequest request) {
        chatService.renameConversation(user, id, request.getNewTitle());
        return ResponseEntity.ok(Map.of("message", "Conversation renamed successfully"));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        chatService.deleteConversation(user, id);
        return ResponseEntity.ok(Map.of("message", "Conversation erased"));
    }
}
