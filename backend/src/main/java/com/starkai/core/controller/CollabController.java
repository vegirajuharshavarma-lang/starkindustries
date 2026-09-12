package com.starkai.core.controller;

import com.starkai.core.dto.CollabDto.*;
import com.starkai.core.model.User;
import com.starkai.core.service.CollabService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class CollabController {

    private final CollabService collabService;

    @GetMapping("/conversations/{id}/collab")
    public ResponseEntity<CollabSessionDto> getCollabSession(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        return ResponseEntity.ok(collabService.getCollabSession(user.getId(), id));
    }

    @PostMapping("/conversations/{id}/collab/toggle")
    public ResponseEntity<CollabSessionDto> toggleCollaboration(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        return ResponseEntity.ok(collabService.toggleCollaboration(user.getId(), id));
    }

    @PostMapping("/conversations/{id}/invite")
    public ResponseEntity<ParticipantDto> inviteCollaborator(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody InviteCollaboratorRequest request) {
        return ResponseEntity.ok(collabService.inviteCollaborator(user.getId(), id, request));
    }

    @PostMapping("/collaborate/join")
    public ResponseEntity<CollabSessionDto> joinSession(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody JoinSessionRequest request) {
        String userId = user != null ? user.getId() : null;
        String username = user != null ? user.getUsername() : null;
        return ResponseEntity.ok(collabService.joinSession(userId, username, request));
    }

    @PutMapping("/conversations/{id}/participants/{participantId}/role")
    public ResponseEntity<ParticipantDto> updateRole(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @PathVariable String participantId,
            @Valid @RequestBody UpdateParticipantRoleRequest request) {
        return ResponseEntity.ok(collabService.updateParticipantRole(user.getId(), id, participantId, request));
    }

    @DeleteMapping("/conversations/{id}/participants/{participantId}")
    public ResponseEntity<Map<String, String>> removeParticipant(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @PathVariable String participantId) {
        collabService.removeParticipant(user.getId(), id, participantId);
        return ResponseEntity.ok(Map.of("message", "Participant disconnected from session"));
    }

    @PatchMapping("/conversations/{id}/settings")
    public ResponseEntity<CollabSessionDto> updateSettings(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @RequestBody UpdateSessionSettingsRequest request) {
        return ResponseEntity.ok(collabService.updateSettings(user.getId(), id, request));
    }

    @GetMapping("/conversations/{id}/sync")
    public ResponseEntity<SyncSessionResponse> syncSession(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "0") Long sinceSequence) {
        return ResponseEntity.ok(collabService.syncSession(user.getId(), id, sinceSequence));
    }
}
