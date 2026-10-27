-- ==============================================================================
-- 365 Daily Journaling App — PostgreSQL Schema Definition
-- Matches SQLAlchemy models: User, Question, Answer, NotificationLog
-- Versioned via Alembic (Revisions: 03504816da5a, 3f6ffaf49888, 898f53a25e20)
-- ==============================================================================

-- Enable PostgreSQL Trigram Extension for fuzzy text/tag searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    avatar_url VARCHAR(1024),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    notification_time_preference VARCHAR(10) NOT NULL DEFAULT '20:00',
    preferred_journaling_time TIME NOT NULL DEFAULT '20:00:00',
    interests JSON NOT NULL DEFAULT '["mindfulness", "gratitude"]',
    push_token VARCHAR(1024),
    streak_count INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    last_answered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Users
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_google_id ON users(google_id);
-- Partial index for high-throughput hourly notification dispatch
CREATE INDEX IF NOT EXISTS idx_users_notification_dispatch 
    ON users(timezone, preferred_journaling_time) 
    WHERE push_token IS NOT NULL;


-- 2. Create Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 365),
    question_text TEXT NOT NULL,
    theme_tags VARCHAR(512) DEFAULT 'reflection,life',
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_served BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_user_day_number UNIQUE (user_id, day_number)
);

-- Indexes for Questions
CREATE INDEX IF NOT EXISTS ix_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS ix_questions_day_number ON questions(day_number);
CREATE INDEX IF NOT EXISTS idx_questions_user_day_desc ON questions(user_id, day_number);
-- GIN Trigram index for tag filtering and search
CREATE INDEX IF NOT EXISTS idx_questions_theme_tags_trgm ON questions USING gin (theme_tags gin_trgm_ops);


-- 3. Create Answers Table (1:1 with Question, 1:N with User)
CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT,
    photo_url VARCHAR(1024),
    audio_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Answers
CREATE INDEX IF NOT EXISTS ix_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS ix_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_created_at ON answers(user_id, created_at);
-- GIN Full-Text Search index on journal reflection text
CREATE INDEX IF NOT EXISTS idx_answers_text_tsv ON answers USING gin (to_tsvector('english', COALESCE(text, '')));


-- 4. Create Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    channel VARCHAR(50) NOT NULL DEFAULT 'fcm',
    scheduled_time TIME,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Notification Logs
CREATE INDEX IF NOT EXISTS ix_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_notification_logs_question_id ON notification_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_sent ON notification_logs(user_id, sent_at);
