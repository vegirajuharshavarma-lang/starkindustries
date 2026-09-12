package com.starkai.core.service;

import com.starkai.core.dto.ChatDto;
import com.starkai.core.dto.CollabDto;
import com.starkai.core.model.Conversation;
import com.starkai.core.model.ConversationParticipant;
import com.starkai.core.model.ConversationParticipant.ParticipantRole;
import com.starkai.core.model.Message;
import com.starkai.core.model.User;
import com.starkai.core.repository.ConversationParticipantRepository;
import com.starkai.core.repository.ConversationRepository;
import com.starkai.core.repository.MessageRepository;
import com.starkai.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollabService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    // Concurrency / AI Lock & State tracking per conversation
    private final Map<String, String> activeAiSynthesisByConvo = new ConcurrentHashMap<>();
    private final Map<String, Queue<String>> convoMessageQueue = new ConcurrentHashMap<>();

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public CollabDto.CollabSessionDto getCollabSession(String userId, String conversationId) {
        Conversation conversation = getConversationOrThrow(conversationId);
        ensureOwnerParticipant(conversation);

        Optional<ConversationParticipant> userPartOpt = participantRepository.findByConversationAndUserId(conversation, userId);
        ParticipantRole currentRole = ParticipantRole.VIEWER;

        if (conversation.getUser().getId().equals(userId)) {
            currentRole = ParticipantRole.OWNER;
        } else if (userPartOpt.isPresent()) {
            currentRole = userPartOpt.get().getRole();
            // Update last active
            userPartOpt.get().setLastActiveAt(LocalDateTime.now());
            userPartOpt.get().setStatus("ONLINE");
            participantRepository.save(userPartOpt.get());
        }

        return buildCollabSessionDto(conversation, currentRole, userId);
    }

    @Transactional
    public CollabDto.CollabSessionDto toggleCollaboration(String userId, String conversationId) {
        Conversation conversation = getConversationOrThrow(conversationId);
        verifyOwnership(conversation, userId);

        boolean newCollabState = !conversation.isCollaborative();
        conversation.setCollaborative(newCollabState);
        if (newCollabState && (conversation.getInviteCode() == null || conversation.getInviteCode().isBlank())) {
            conversation.setInviteCode("STRK-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        }
        conversation = conversationRepository.save(conversation);

        ensureOwnerParticipant(conversation);
        return buildCollabSessionDto(conversation, ParticipantRole.OWNER, userId);
    }

    @Transactional
    public CollabDto.ParticipantDto inviteCollaborator(String userId, String conversationId, CollabDto.InviteCollaboratorRequest request) {
        Conversation conversation = getConversationOrThrow(conversationId);
        ConversationParticipant caller = getParticipantOrOwner(conversation, userId);

        if (caller.getRole() == ParticipantRole.VIEWER) {
            throw new IllegalArgumentException("Viewers do not have permission to invite collaborators.");
        }
        if (caller.getRole() == ParticipantRole.EDITOR && !conversation.isAllowMemberInvites()) {
            throw new IllegalArgumentException("Host has disabled member invitations for editors.");
        }

        // Check if user exists by username or email
        String identifier = request.getIdentifier().trim();
        Optional<User> targetUser = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier));

        String inviteeUsername = targetUser.map(User::getUsername).orElse(identifier.contains("@") ? identifier.split("@")[0] : identifier);
        String inviteeEmail = targetUser.map(User::getEmail).orElse(identifier.contains("@") ? identifier : identifier + "@stark.team");
        String inviteeUserId = targetUser.map(User::getId).orElse("usr_collab_" + UUID.randomUUID().toString().substring(0, 8));

        ParticipantRole roleToAssign = ParticipantRole.EDITOR;
        if (request.getRole() != null) {
            try {
                roleToAssign = ParticipantRole.valueOf(request.getRole().toUpperCase());
            } catch (Exception ignored) {}
        }

        // Check if already in conversation
        Optional<ConversationParticipant> existing = participantRepository.findByConversationAndUserId(conversation, inviteeUserId)
                .or(() -> participantRepository.findByConversationAndUsername(conversation, inviteeUsername));

        ConversationParticipant participant;
        if (existing.isPresent()) {
            participant = existing.get();
            participant.setRole(roleToAssign);
            participant.setStatus("ONLINE");
            participant.setLastActiveAt(LocalDateTime.now());
        } else {
            participant = ConversationParticipant.builder()
                    .conversation(conversation)
                    .userId(inviteeUserId)
                    .username(inviteeUsername)
                    .email(inviteeEmail)
                    .role(roleToAssign)
                    .status("ONLINE")
                    .joinedAt(LocalDateTime.now())
                    .lastActiveAt(LocalDateTime.now())
                    .build();
        }

        participant = participantRepository.save(participant);

        // System message broadcast
        createSystemMessage(conversation, String.format("%s was invited as %s by %s", participant.getUsername(), participant.getRole(), caller.getUsername()));

        return mapToParticipantDto(participant, userId);
    }

    @Transactional
    public CollabDto.CollabSessionDto joinSession(String userId, String username, CollabDto.JoinSessionRequest request) {
        String code = request.getInviteCode().trim().toUpperCase();
        Conversation conversation = conversationRepository.findByInviteCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired STARK Invite Code: " + code));

        ensureOwnerParticipant(conversation);

        // Determine effective user
        User user = null;
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
        }

        String effectiveUsername = user != null ? user.getUsername() : (request.getGuestName() != null && !request.getGuestName().isBlank() ? request.getGuestName().trim() : "Agent " + code.substring(Math.max(0, code.length() - 3)));
        String effectiveUserId = user != null ? user.getId() : (userId != null ? userId : "guest_" + UUID.randomUUID().toString().substring(0, 8));
        String effectiveEmail = user != null ? user.getEmail() : effectiveUsername.toLowerCase().replace(" ", ".") + "@collab.stark";

        ParticipantRole role = conversation.getUser().getId().equals(effectiveUserId)
                ? ParticipantRole.OWNER
                : conversation.getDefaultRole();

        Optional<ConversationParticipant> existing = participantRepository.findByConversationAndUserId(conversation, effectiveUserId);
        ConversationParticipant participant;
        if (existing.isPresent()) {
            participant = existing.get();
            participant.setStatus("ONLINE");
            participant.setLastActiveAt(LocalDateTime.now());
            role = participant.getRole();
        } else {
            participant = ConversationParticipant.builder()
                    .conversation(conversation)
                    .userId(effectiveUserId)
                    .username(effectiveUsername)
                    .email(effectiveEmail)
                    .role(role)
                    .status("ONLINE")
                    .joinedAt(LocalDateTime.now())
                    .lastActiveAt(LocalDateTime.now())
                    .build();
            participant = participantRepository.save(participant);

            createSystemMessage(conversation, String.format("%s joined the neural transmission stream as %s", effectiveUsername, role));
        }

        return buildCollabSessionDto(conversation, role, effectiveUserId);
    }

    @Transactional
    public CollabDto.ParticipantDto updateParticipantRole(String userId, String conversationId, String participantId, CollabDto.UpdateParticipantRoleRequest request) {
        Conversation conversation = getConversationOrThrow(conversationId);
        verifyOwnership(conversation, userId);

        ConversationParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Participant not found"));

        if (!participant.getConversation().getId().equals(conversation.getId())) {
            throw new IllegalArgumentException("Participant belongs to another session");
        }

        ParticipantRole newRole = ParticipantRole.valueOf(request.getRole().toUpperCase());
        ParticipantRole oldRole = participant.getRole();
        participant.setRole(newRole);
        participantRepository.save(participant);

        createSystemMessage(conversation, String.format("%s's role was changed from %s to %s by Session Host", participant.getUsername(), oldRole, newRole));

        return mapToParticipantDto(participant, userId);
    }

    @Transactional
    public void removeParticipant(String userId, String conversationId, String participantId) {
        Conversation conversation = getConversationOrThrow(conversationId);
        ConversationParticipant caller = getParticipantOrOwner(conversation, userId);

        ConversationParticipant target = participantRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Participant not found"));

        boolean isSelf = target.getUserId() != null && target.getUserId().equals(userId);
        boolean isOwner = caller.getRole() == ParticipantRole.OWNER;

        if (!isSelf && !isOwner) {
            throw new IllegalArgumentException("Only the session owner can remove other participants.");
        }

        if (target.getRole() == ParticipantRole.OWNER && !isSelf) {
            throw new IllegalArgumentException("Cannot remove the session owner.");
        }

        participantRepository.delete(target);
        String actionMsg = isSelf ? String.format("%s disconnected from the session", target.getUsername()) : String.format("%s was removed from the session by Host", target.getUsername());
        createSystemMessage(conversation, actionMsg);
    }

    @Transactional
    public CollabDto.CollabSessionDto updateSettings(String userId, String conversationId, CollabDto.UpdateSessionSettingsRequest request) {
        Conversation conversation = getConversationOrThrow(conversationId);
        verifyOwnership(conversation, userId);

        if (request.getAllowEditorAi() != null) {
            conversation.setAllowEditorAi(request.getAllowEditorAi());
        }
        if (request.getAllowMemberInvites() != null) {
            conversation.setAllowMemberInvites(request.getAllowMemberInvites());
        }
        if (request.getDefaultRole() != null) {
            try {
                conversation.setDefaultRole(ParticipantRole.valueOf(request.getDefaultRole().toUpperCase()));
            } catch (Exception ignored) {}
        }
        conversationRepository.save(conversation);
        return buildCollabSessionDto(conversation, ParticipantRole.OWNER, userId);
    }

    @Transactional(readOnly = true)
    public CollabDto.SyncSessionResponse syncSession(String userId, String conversationId, Long sinceSequence) {
        Conversation conversation = getConversationOrThrow(conversationId);
        List<Message> newMessages = messageRepository.findByConversationOrderByCreatedAtAsc(conversation);

        if (sinceSequence != null && sinceSequence > 0) {
            newMessages = newMessages.stream()
                    .filter(m -> m.getSequenceNumber() != null && m.getSequenceNumber() > sinceSequence)
                    .collect(Collectors.toList());
        }

        long latestSeq = newMessages.stream()
                .mapToLong(m -> m.getSequenceNumber() != null ? m.getSequenceNumber() : 0L)
                .max().orElse(sinceSequence != null ? sinceSequence : 0L);

        List<ConversationParticipant> participants = participantRepository.findByConversationOrderByJoinedAtAsc(conversation);
        List<CollabDto.ParticipantDto> participantDtos = participants.stream()
                .map(p -> mapToParticipantDto(p, userId))
                .collect(Collectors.toList());

        String aiStatus = activeAiSynthesisByConvo.getOrDefault(conversationId, "IDLE");
        String currentTriggerUser = activeAiSynthesisByConvo.get(conversationId + "_user");

        String role = "VIEWER";
        if (conversation.getUser().getId().equals(userId)) {
            role = "OWNER";
        } else {
            Optional<ConversationParticipant> p = participantRepository.findByConversationAndUserId(conversation, userId);
            if (p.isPresent()) role = p.get().getRole().name();
        }

        List<ChatDto.MessageDetailDto> messageDtos = newMessages.stream()
                .map(this::mapToMessageDetailDto)
                .collect(Collectors.toList());

        return CollabDto.SyncSessionResponse.builder()
                .conversationId(conversationId)
                .latestSequence(latestSeq)
                .newMessages(messageDtos)
                .activeParticipants(participantDtos)
                .aiStatus(aiStatus)
                .currentPromptTriggerUser(currentTriggerUser)
                .userRole(role)
                .build();
    }

    public boolean canSendMessages(Conversation conversation, String userId) {
        if (conversation.getUser().getId().equals(userId)) return true;
        return participantRepository.findByConversationAndUserId(conversation, userId)
                .map(p -> p.getRole() == ParticipantRole.OWNER || p.getRole() == ParticipantRole.EDITOR)
                .orElse(false);
    }

    public boolean canTriggerAi(Conversation conversation, String userId) {
        if (conversation.getUser().getId().equals(userId)) return true;
        return participantRepository.findByConversationAndUserId(conversation, userId)
                .map(p -> {
                    if (p.getRole() == ParticipantRole.OWNER) return true;
                    if (p.getRole() == ParticipantRole.EDITOR) return conversation.isAllowEditorAi();
                    return false;
                })
                .orElse(false);
    }

    public void setAiSynthesisStatus(String conversationId, boolean active, String username) {
        if (active) {
            activeAiSynthesisByConvo.put(conversationId, "SYNTHESIZING");
            if (username != null) activeAiSynthesisByConvo.put(conversationId + "_user", username);
        } else {
            activeAiSynthesisByConvo.remove(conversationId);
            activeAiSynthesisByConvo.remove(conversationId + "_user");
        }
    }

    // --- Helpers ---
    private Conversation getConversationOrThrow(String id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + id));
    }

    private void verifyOwnership(Conversation conv, String userId) {
        if (!conv.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Only the conversation owner has administrative authority.");
        }
    }

    private void ensureOwnerParticipant(Conversation conversation) {
        Optional<ConversationParticipant> ownerOpt = participantRepository.findByConversationAndUserId(conversation, conversation.getUser().getId());
        if (ownerOpt.isEmpty()) {
            ConversationParticipant owner = ConversationParticipant.builder()
                    .conversation(conversation)
                    .userId(conversation.getUser().getId())
                    .username(conversation.getUser().getUsername())
                    .email(conversation.getUser().getEmail())
                    .role(ParticipantRole.OWNER)
                    .status("ONLINE")
                    .joinedAt(conversation.getCreatedAt())
                    .lastActiveAt(LocalDateTime.now())
                    .build();
            participantRepository.save(owner);
        }
    }

    private ConversationParticipant getParticipantOrOwner(Conversation conversation, String userId) {
        ensureOwnerParticipant(conversation);
        return participantRepository.findByConversationAndUserId(conversation, userId)
                .orElseGet(() -> {
                    if (conversation.getUser().getId().equals(userId)) {
                        return ConversationParticipant.builder()
                                .conversation(conversation)
                                .userId(userId)
                                .username(conversation.getUser().getUsername())
                                .email(conversation.getUser().getEmail())
                                .role(ParticipantRole.OWNER)
                                .status("ONLINE")
                                .joinedAt(LocalDateTime.now())
                                .lastActiveAt(LocalDateTime.now())
                                .build();
                    }
                    throw new IllegalArgumentException("You are not a participant in this conversation.");
                });
    }

    private void createSystemMessage(Conversation conversation, String text) {
        Message msg = Message.builder()
                .conversation(conversation)
                .role(Message.MessageRole.SYSTEM)
                .content("⚡ " + text)
                .senderName("STARK Neural Collab")
                .senderRole("SYSTEM")
                .sequenceNumber(System.currentTimeMillis())
                .tokensEstimated(0)
                .build();
        messageRepository.save(msg);
    }

    private CollabDto.CollabSessionDto buildCollabSessionDto(Conversation conv, ParticipantRole userRole, String currentUserId) {
        List<ConversationParticipant> participants = participantRepository.findByConversationOrderByJoinedAtAsc(conv);
        List<CollabDto.ParticipantDto> participantDtos = participants.stream()
                .map(p -> mapToParticipantDto(p, currentUserId))
                .collect(Collectors.toList());

        boolean canSend = userRole == ParticipantRole.OWNER || userRole == ParticipantRole.EDITOR;
        boolean canAi = userRole == ParticipantRole.OWNER || (userRole == ParticipantRole.EDITOR && conv.isAllowEditorAi());
        boolean canManage = userRole == ParticipantRole.OWNER;

        return CollabDto.CollabSessionDto.builder()
                .conversationId(conv.getId())
                .title(conv.getTitle())
                .isCollaborative(conv.isCollaborative())
                .inviteCode(conv.getInviteCode())
                .inviteLink("stark-ai://session/join?code=" + conv.getInviteCode())
                .userRole(userRole.name())
                .canSendMessages(canSend)
                .canTriggerAi(canAi)
                .canManageParticipants(canManage)
                .allowEditorAi(conv.isAllowEditorAi())
                .allowMemberInvites(conv.isAllowMemberInvites())
                .participants(participantDtos)
                .build();
    }

    private CollabDto.ParticipantDto mapToParticipantDto(ConversationParticipant p, String currentUserId) {
        return CollabDto.ParticipantDto.builder()
                .id(p.getId())
                .userId(p.getUserId())
                .username(p.getUsername())
                .email(p.getEmail())
                .role(p.getRole().name())
                .status(p.getStatus())
                .joinedAt(p.getJoinedAt() != null ? p.getJoinedAt().format(ISO_FORMATTER) : "")
                .isCurrentUser(currentUserId != null && currentUserId.equals(p.getUserId()))
                .build();
    }

    private ChatDto.MessageDetailDto mapToMessageDetailDto(Message m) {
        return ChatDto.MessageDetailDto.builder()
                .id(m.getId())
                .role(m.getRole().name().toLowerCase())
                .content(m.getContent())
                .senderName(m.getSenderName() != null ? m.getSenderName() : (m.getRole() == Message.MessageRole.USER ? "Operative" : "STARK AI"))
                .senderRole(m.getSenderRole() != null ? m.getSenderRole() : (m.getRole() == Message.MessageRole.USER ? "EDITOR" : "AI"))
                .sequenceNumber(m.getSequenceNumber() != null ? m.getSequenceNumber() : 0L)
                .tokens(m.getTokensEstimated() != null ? m.getTokensEstimated() : 0)
                .timestamp(m.getCreatedAt() != null ? m.getCreatedAt().format(DateTimeFormatter.ofPattern("HH:mm")) : "")
                .build();
    }
}
