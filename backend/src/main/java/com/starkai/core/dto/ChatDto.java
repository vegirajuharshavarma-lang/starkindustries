package com.starkai.core.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.util.List;

public class ChatDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatTransmissionRequest {
        private String conversationId;

        @NotBlank(message = "Prompt cannot be empty")
        private String prompt;

        private String model;
        private List<String> attachmentFileIds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatTransmissionResponse {
        private String conversationId;
        private String messageId;
        private String role;
        private String content;
        private String modelUsed;
        private int tokensUsed;
        private String timestamp;
        private UsageQuotaDto quotaStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageQuotaDto {
        private int messagesUsedThisMonth;
        private int monthlyLimit;
        private boolean limitReached;
        private String planName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationSummaryDto {
        private String id;
        private String title;
        private String model;
        private int messageCount;
        private boolean isCollaborative;
        private String inviteCode;
        private int participantCount;
        private String userRole;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationDetailDto {
        private String id;
        private String title;
        private String model;
        private boolean isCollaborative;
        private String inviteCode;
        private String userRole;
        private boolean allowEditorAi;
        private boolean allowMemberInvites;
        private List<MessageDetailDto> messages;
        private String createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageDetailDto {
        private String id;
        private String role;
        private String content;
        private String senderName;
        private String senderRole;
        private Long sequenceNumber;
        private int tokens;
        private String timestamp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RenameConversationRequest {
        @NotBlank
        private String newTitle;
    }
}
