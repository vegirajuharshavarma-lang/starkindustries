package com.starkai.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_participants")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationParticipant {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(length = 36)
    private String userId;

    @Column(nullable = false, length = 60)
    private String username;

    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ParticipantRole role = ParticipantRole.EDITOR;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ONLINE"; // ONLINE, AWAY, OFFLINE

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    @Column(nullable = false)
    private LocalDateTime lastActiveAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "part_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        if (joinedAt == null) joinedAt = LocalDateTime.now();
        if (lastActiveAt == null) lastActiveAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastActiveAt = LocalDateTime.now();
    }

    public enum ParticipantRole {
        OWNER, EDITOR, VIEWER
    }
}
