package com.starkai.core.repository;

import com.starkai.core.model.User;
import com.starkai.core.model.VaultFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VaultFileRepository extends JpaRepository<VaultFile, String> {
    List<VaultFile> findByUserOrderByCreatedAtDesc(User user);
    long countByUser(User user);
}
