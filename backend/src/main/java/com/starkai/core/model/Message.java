package com.starkai.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageRole role;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(length = 60)
    private String senderName;

    @Column(length = 20)
    private String senderRole; // OWNER, EDITOR, VIEWER, AI

    @Column(length = 36)
    private String senderUserId;

    @Column
    private Long sequenceNumber;

    @Column
    @Builder.Default
    private Integer tokensEstimated = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "msg_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        createdAt = LocalDateTime.now();
        if (sequenceNumber == null) sequenceNumber = System.currentTimeMillis();
    }

    public enum MessageRole {
        USER, ASSISTANT, SYSTEM
    }
}
