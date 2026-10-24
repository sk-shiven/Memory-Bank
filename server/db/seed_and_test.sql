-- ==============================================================================
-- 365 Daily Journaling App — Fully Idempotent Seed Data & Verification Queries
-- ==============================================================================

-- 1. Insert or Update Sample User (Conflicts on unique email)
INSERT INTO users (google_id, email, name, avatar_url, notification_time_preference, push_token)
VALUES (
    'google-oauth-1092837465',
    'shiven@example.com',
    'Shiven Kathuria',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    '20:00',
    'fcm_token_sample_abc123xyz'
)
ON CONFLICT (email) DO UPDATE 
SET 
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    google_id = EXCLUDED.google_id;


-- 2. Insert or Update Questions (Conflicts on unique user_id + day_number)
INSERT INTO questions (user_id, day_number, question_text, theme_tags, generated_at)
VALUES 
(
    (SELECT id FROM users WHERE email = 'shiven@example.com'),
    1,
    'What is one small thing that brought you genuine joy or calm today?',
    'joy,mindfulness',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
),
(
    (SELECT id FROM users WHERE email = 'shiven@example.com'),
    2,
    'Who is someone you are deeply grateful for right now, and why?',
    'gratitude,relationships',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    (SELECT id FROM users WHERE email = 'shiven@example.com'),
    3,
    'If you could capture one sound from today to remember forever, what would it be?',
    'senses,memory',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    (SELECT id FROM users WHERE email = 'shiven@example.com'),
    4,
    'What is a decision you made recently that you felt proud of?',
    'growth,decisions',
    CURRENT_TIMESTAMP
)
ON CONFLICT (user_id, day_number) DO UPDATE
SET 
    question_text = EXCLUDED.question_text,
    theme_tags = EXCLUDED.theme_tags;


-- 3. Insert or Update Answers (Conflicts on unique question_id)
INSERT INTO answers (question_id, user_id, text, photo_url, audio_url, created_at)
VALUES 
(
    (SELECT q.id FROM questions q JOIN users u ON q.user_id = u.id WHERE u.email = 'shiven@example.com' AND q.day_number = 1),
    (SELECT id FROM users WHERE email = 'shiven@example.com'),
    'Woke up early before anyone else, made pour-over coffee, and read 20 pages while listening to the rain outside.',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '12 hours'
),
(
    (SELECT q.id FROM questions q JOIN users u ON q.user_id = u.id WHERE u.email = 'shiven@example.com' AND q.day_number = 2),
    (SELECT id FROM users WHERE email = 'shiven@example.com'),
    'Deeply grateful for my childhood friend who called out of nowhere just to ask how my week was going.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '14 hours'
),
(
    (SELECT q.id FROM questions q JOIN users u ON q.user_id = u.id WHERE u.email = 'shiven@example.com' AND q.day_number = 3),
    (SELECT id FROM users WHERE email = 'shiven@example.com'),
    'The sound of wind blowing through the pine trees during my evening run.',
    NULL,
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '18 hours'
)
ON CONFLICT (question_id) DO UPDATE
SET 
    text = EXCLUDED.text,
    photo_url = EXCLUDED.photo_url,
    audio_url = EXCLUDED.audio_url;


-- ==============================================================================
-- Verification Queries (Run these to test your database)
-- ==============================================================================

-- TEST QUERY 1: Full 365 Timeline View (Used by the Timeline API)
SELECT 
    q.day_number,
    q.question_text,
    q.theme_tags,
    CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_answered,
    a.text AS answer_text,
    a.photo_url,
    a.audio_url,
    q.generated_at::date AS question_date,
    a.created_at AS answered_at
FROM questions q
LEFT JOIN answers a ON q.id = a.question_id
JOIN users u ON q.user_id = u.id
WHERE u.email = 'shiven@example.com'
ORDER BY q.day_number ASC;


-- TEST QUERY 2: User Stats Summary (Total Memories, Days Active, % of 365)
SELECT 
    u.name,
    u.email,
    COUNT(a.id) AS total_memories_saved,
    MAX(q.day_number) AS current_day_number,
    365 - MAX(q.day_number) AS days_remaining,
    ROUND((COUNT(a.id)::decimal / 365) * 100, 2) AS completion_percentage
FROM users u
LEFT JOIN questions q ON u.id = q.user_id
LEFT JOIN answers a ON q.id = a.question_id
WHERE u.email = 'shiven@example.com'
GROUP BY u.id, u.name, u.email;


-- TEST QUERY 3: Today's Active / Unanswered Prompt
SELECT 
    q.id AS question_id,
    q.day_number,
    q.question_text,
    q.theme_tags
FROM questions q
LEFT JOIN answers a ON q.id = a.question_id
JOIN users u ON q.user_id = u.id
WHERE u.email = 'shiven@example.com' AND a.id IS NULL
ORDER BY q.day_number ASC
LIMIT 1;
