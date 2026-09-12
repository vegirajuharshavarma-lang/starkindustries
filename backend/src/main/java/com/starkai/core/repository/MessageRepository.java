package com.starkai.core.repository;

import com.starkai.core.model.Conversation;
import com.starkai.core.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {
    List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);
}
