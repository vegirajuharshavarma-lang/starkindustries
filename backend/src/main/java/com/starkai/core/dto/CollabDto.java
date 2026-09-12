package com.starkai.core.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

public class CollabDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantDto {
        private String id;
        private String userId;
        private String username;
        private String email;
        private String role; // OWNER, EDITOR, VIEWER
        private String status; // ONLINE, AWAY, OFFLINE
        private String joinedAt;
        private boolean isCurrentUser;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CollabSessionDto {
        private String conversationId;
        private String title;
        private boolean isCollaborative;
        private String inviteCode;
        private String inviteLink;
        private String userRole; // OWNER, EDITOR, VIEWER
        private boolean canSendMessages;
        private boolean canTriggerAi;
        private boolean canManageParticipants;
        private boolean allowEditorAi;
        private boolean allowMemberInvites;
        private List<ParticipantDto> participants;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InviteCollaboratorRequest {
        @NotBlank(message = "Username or email is required")
        private String identifier;

        private String role; // EDITOR or VIEWER (default EDITOR)
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JoinSessionRequest {
        @NotBlank(message = "Invite code is required")
        private String inviteCode;

        private String guestName; // Optional fallback display name
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateParticipantRoleRequest {
        @NotBlank(message = "New role is required")
        private String role; // OWNER, EDITOR, VIEWER
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateSessionSettingsRequest {
        private Boolean allowEditorAi;
        private Boolean allowMemberInvites;
        private String defaultRole;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncSessionResponse {
        private String conversationId;
        private long latestSequence;
        private List<ChatDto.MessageDetailDto> newMessages;
        private List<ParticipantDto> activeParticipants;
        private String aiStatus; // IDLE, SYNTHESIZING
        private String currentPromptTriggerUser;
        private String userRole;
    }
}
