-- =========================================================
-- STARK-AI CORE — Relational Database Schema (PostgreSQL / MySQL / H2)
-- =========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    plan VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'gemini-3.5-flash',
    is_collaborative BOOLEAN NOT NULL DEFAULT FALSE,
    invite_code VARCHAR(20) UNIQUE,
    allow_editor_ai BOOLEAN NOT NULL DEFAULT TRUE,
    allow_member_invites BOOLEAN NOT NULL DEFAULT TRUE,
    default_role VARCHAR(20) NOT NULL DEFAULT 'EDITOR',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_convo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2.1 Conversation Participants Table
CREATE TABLE IF NOT EXISTS conversation_participants (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    username VARCHAR(60) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'EDITOR',
    status VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_part_convo FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sender_name VARCHAR(60),
    sender_role VARCHAR(20),
    sender_user_id VARCHAR(36),
    sequence_number BIGINT,
    tokens_estimated INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_convo FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 4. Subscriptions & Payments Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    plan VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    price_cents INT NOT NULL,
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    transaction_ref VARCHAR(100),
    CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Monthly Usage Telemetry Table
CREATE TABLE IF NOT EXISTS usage_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    period_year_month VARCHAR(7) NOT NULL,
    messages_count INT NOT NULL DEFAULT 0,
    tokens_used BIGINT NOT NULL DEFAULT 0,
    files_uploaded INT NOT NULL DEFAULT 0,
    voice_seconds INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_user_period UNIQUE (user_id, period_year_month),
    CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. File Vault Table
CREATE TABLE IF NOT EXISTS vault_files (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    tokens_estimated INT DEFAULT 0,
    checksum VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vault_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_convo_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_msg_convo ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_records(user_id);
