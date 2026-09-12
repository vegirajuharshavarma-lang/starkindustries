package com.starkai.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "conversations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String model = "gemini-3.5-flash";

    @Column(nullable = false)
    @Builder.Default
    private boolean isCollaborative = false;

    @Column(length = 20, unique = true)
    private String inviteCode;

    @Column(nullable = false)
    @Builder.Default
    private boolean allowEditorAi = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean allowMemberInvites = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ConversationParticipant.ParticipantRole defaultRole = ConversationParticipant.ParticipantRole.EDITOR;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @OrderBy("createdAt ASC")
    private List<Message> messages = new ArrayList<>();

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ConversationParticipant> participants = new ArrayList<>();

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "conv_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        if (inviteCode == null) inviteCode = "STRK-" + java.util.UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
