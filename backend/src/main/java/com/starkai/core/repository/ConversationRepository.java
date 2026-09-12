package com.starkai.core.repository;

import com.starkai.core.model.Conversation;
import com.starkai.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findByUserOrderByUpdatedAtDesc(User user);
    Optional<Conversation> findByInviteCode(String inviteCode);
    long countByUser(User user);
}
