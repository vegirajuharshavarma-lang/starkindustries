package com.starkai.core.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "usage_records", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "period_year_month"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsageRecord {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "period_year_month", length = 7, nullable = false)
    private String periodYearMonth; // e.g. '2026-09'

    @Column(nullable = false)
    @Builder.Default
    private Integer messagesCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Long tokensUsed = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Integer filesUploaded = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer voiceSeconds = 0;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "usg_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
