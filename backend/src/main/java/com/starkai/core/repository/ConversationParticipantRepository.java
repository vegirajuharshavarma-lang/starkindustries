package com.starkai.core.repository;

import com.starkai.core.model.Conversation;
import com.starkai.core.model.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, String> {
    List<ConversationParticipant> findByConversationOrderByJoinedAtAsc(Conversation conversation);
    Optional<ConversationParticipant> findByConversationAndUserId(Conversation conversation, String userId);
    Optional<ConversationParticipant> findByConversationAndUsername(Conversation conversation, String username);
    void deleteByConversationAndId(Conversation conversation, String id);
}
