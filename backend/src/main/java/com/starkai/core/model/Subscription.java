package com.starkai.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private User.Plan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.ACTIVE;

    @Column(nullable = false)
    private Integer priceCents;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column
    private LocalDateTime endDate;

    @Column(length = 100)
    private String transactionRef;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "sub_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        if (startDate == null) startDate = LocalDateTime.now();
    }

    public enum Status {
        ACTIVE, CANCELLED, PAST_DUE
    }
}
