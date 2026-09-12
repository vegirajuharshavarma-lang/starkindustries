package com.starkai.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vault_files")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VaultFile {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(nullable = false)
    private Long fileSizeBytes;

    @Column(length = 100)
    private String mimeType;

    @Column
    @Builder.Default
    private Integer tokensEstimated = 0;

    @Column(length = 64)
    private String checksum;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "fil_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        createdAt = LocalDateTime.now();
    }
}
