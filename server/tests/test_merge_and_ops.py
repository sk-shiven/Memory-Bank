import sys
from pathlib import Path
from datetime import datetime, time, timezone, timedelta
from sqlalchemy import text, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import joinedload

# Ensure server root is in sys.path
server_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(server_root))

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.models.notification_log import NotificationLog
from app.utils.timezone import to_user_tz, get_user_today, get_user_now
from app.cache import get_daily_question, set_daily_question, clear_cache
from app.routers.questions import _get_or_create_group_question, _get_active_interest_group


def run_tests():
    print("=" * 70)
    print("  365 MEMORY BANK — POSTGRESQL ORM, MERGE OPS & READ/UPDATE SUITE")
    print("=" * 70)

    db = SessionLocal()

    # -------------------------------------------------------------------------
    # TEST 1: Multi-Table Joined Read (User + Questions + Answers)
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Multi-Table Joined Read (Timeline & Memories)")
    user = db.query(User).filter(User.email == "maya.lin@example.com").first()
    assert user is not None, "Maya Lin must exist in database"

    # Query with joinedload (single SQL JOIN)
    timeline_query = (
        db.query(Question)
        .options(joinedload(Question.answer))
        .filter(Question.user_id == user.id)
        .order_by(Question.day_number.asc())
        .all()
    )

    answered_count = 0
    print(f"  User: {user.name} ({user.email}) | Timezone: {user.timezone}")
    for q in timeline_query:
        ans = q.answer
        status_str = f"Answered ({ans.text[:30]}...)" if ans and ans.text else ("Has Media" if ans else "Unanswered")
        if ans and (ans.text or ans.photo_url or ans.audio_url):
            answered_count += 1
        print(f"    Day {q.day_number:2d}: [{q.theme_tags:25s}] -> {status_str}")

    assert len(timeline_query) >= 7, f"Expected at least 7 questions for Maya, found {len(timeline_query)}"
    assert answered_count >= 6, f"Expected at least 6 answered questions, found {answered_count}"
    print(f"  ✅ Multi-Table Joined Read PASSED ({len(timeline_query)} questions, {answered_count} answered)")

    # -------------------------------------------------------------------------
    # TEST 2: Aggregated Stats & Streak Query
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Aggregated Merge Query (User Stats, Memories & Days Remaining)")
    stats_sql = text("""
        SELECT 
            u.id,
            u.name,
            u.email,
            u.timezone,
            COUNT(a.id) AS total_memories,
            MAX(q.day_number) AS max_day,
            365 - MAX(q.day_number) AS days_remaining,
            ROUND((COUNT(a.id)::decimal / 365) * 100, 2) AS completion_pct
        FROM users u
        LEFT JOIN questions q ON u.id = q.user_id
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE u.email = :email
        GROUP BY u.id, u.name, u.email, u.timezone;
    """)
    res = db.execute(stats_sql, {"email": "maya.lin@example.com"}).fetchone()
    print(f"  Summary for {res.name}:")
    print(f"    Total memories saved : {res.total_memories}")
    print(f"    Current Day Number   : {res.max_day}")
    print(f"    Days Remaining       : {res.days_remaining}")
    print(f"    365 Progress         : {res.completion_pct}%")
    assert res.total_memories >= 6
    print("  ✅ Aggregated Merge Stats PASSED")

    # -------------------------------------------------------------------------
    # TEST 3: PostgreSQL Native Upsert (ON CONFLICT DO UPDATE) on Answer
    # -------------------------------------------------------------------------
    print("\n[TEST 3] PostgreSQL Native Upsert (ON CONFLICT DO UPDATE) on Answers")
    day7_q = db.query(Question).filter(Question.user_id == user.id, Question.day_number == 7).first()
    assert day7_q is not None

    upsert_stmt = (
        pg_insert(Answer)
        .values(
            question_id=day7_q.id,
            user_id=user.id,
            text="Initial answer for Day 7: I promise to breathe deeply before reacting.",
            photo_url=None,
            audio_url=None,
            created_at=datetime.now(timezone.utc)
        )
        .on_conflict_do_update(
            index_elements=["question_id"],
            set_={
                "text": "Updated answer for Day 7: I promise to breathe deeply and choose grace.",
                "photo_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
            }
        )
    )

    db.execute(upsert_stmt)
    db.commit()

    ans_check = db.query(Answer).filter(Answer.question_id == day7_q.id).first()
    assert ans_check is not None
    assert "choose grace" in ans_check.text
    print(f"  Upsert update verified: ID={ans_check.id}, Text='{ans_check.text[:40]}...'")
    print("  ✅ PostgreSQL Native Upsert on Answer PASSED")

    # -------------------------------------------------------------------------
    # TEST 4: PostgreSQL Native Upsert on Question (uq_user_day_number)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] PostgreSQL Native Upsert on Question (user_id, day_number)")
    q_upsert = (
        pg_insert(Question)
        .values(
            user_id=user.id,
            day_number=8,
            question_text="Draft question for Day 8: What made you smile today?",
            theme_tags="daily,smile",
            generated_at=datetime.now(timezone.utc),
            is_served=True
        )
        .on_conflict_do_update(
            constraint="uq_user_day_number",
            set_={
                "question_text": "Polished question for Day 8: What brought a genuine smile to your lips today?",
                "theme_tags": "joy,serenity"
            }
        )
    )
    db.execute(q_upsert)
    db.commit()
    q8 = db.query(Question).filter(Question.user_id == user.id, Question.day_number == 8).first()
    assert q8 is not None
    assert "Polished question" in q8.question_text
    print("  ✅ PostgreSQL Native Upsert on Question PASSED")

    # -------------------------------------------------------------------------
    # TEST 5: Full-Text and Trigram Search Index Queries
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Full-Text (GIN tsvector) and Trigram (pg_trgm) Search Queries")
    search_term = "breathe"
    fts_sql = text("""
        SELECT a.id, a.text, q.day_number, q.question_text
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE to_tsvector('english', COALESCE(a.text, '')) @@ plainto_tsquery('english', :query);
    """)
    fts_results = db.execute(fts_sql, {"query": search_term}).fetchall()
    print(f"  Full-Text Search for '{search_term}': {len(fts_results)} matches found")
    assert len(fts_results) > 0

    trgm_sql = text("""
        SELECT id, day_number, theme_tags, question_text
        FROM questions
        WHERE theme_tags ILIKE :tag_pattern;
    """)
    trgm_results = db.execute(trgm_sql, {"tag_pattern": "%nostalgia%"}).fetchall()
    print(f"  Trigram Tag Search for '%nostalgia%': {len(trgm_results)} matches found")
    assert len(trgm_results) > 0
    print("  ✅ Full-Text & Trigram Search PASSED")

    # -------------------------------------------------------------------------
    # TEST 6: Timezone Support & Local Day Conversions
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Timezone Awareness & Preference Updates")
    lucas = db.query(User).filter(User.email == "lucas.dubois@example.com").first()
    assert lucas is not None
    paris_now = get_user_now(lucas.timezone)
    print(f"  Lucas Current Timezone : {lucas.timezone} (Local: {paris_now.strftime('%Y-%m-%d %H:%M:%S')})")
    assert lucas.timezone == "Europe/Paris"
    print("  ✅ Timezone Awareness PASSED")

    # -------------------------------------------------------------------------
    # TEST 7: Preferred Journaling Time (TIME Column) & Partial Index Query
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Native TIME Column (preferred_journaling_time) & Partial Index")
    # Verify preferred_journaling_time is time type
    assert isinstance(user.preferred_journaling_time, time)
    print(f"  Maya's Preferred Journaling Time: {user.preferred_journaling_time}")

    # Update preferred journaling time to 21:45:00
    user.preferred_journaling_time = time(21, 45)
    db.commit()
    db.refresh(user)
    assert user.preferred_journaling_time == time(21, 45)
    print(f"  Updated Preferred Time: {user.preferred_journaling_time}")

    # Reset back to 21:00:00
    user.preferred_journaling_time = time(21, 0)
    db.commit()

    # Query partial index on (timezone, preferred_journaling_time) WHERE push_token IS NOT NULL
    dispatch_sql = text("""
        SELECT id, email, timezone, preferred_journaling_time
        FROM users
        WHERE push_token IS NOT NULL
        ORDER BY timezone, preferred_journaling_time;
    """)
    dispatch_users = db.execute(dispatch_sql).fetchall()
    print(f"  Users matching push dispatch partial index: {len(dispatch_users)}")
    for du in dispatch_users:
        print(f"    - {du.email:25s} | TZ: {du.timezone:18s} | Preferred Time: {du.preferred_journaling_time}")
    assert len(dispatch_users) >= 2
    print("  ✅ Native TIME Column & Partial Index PASSED")

    # -------------------------------------------------------------------------
    # TEST 8: User Interests & Single Shared Daily Question with Caching
    # -------------------------------------------------------------------------
    print("\n[TEST 8] User Interests (Max 5) & Shared Daily Question Per Interest Group")
    shiven = db.query(User).filter((User.email == "demo@example.com") | (User.email == "shiven@example.com")).first()
    assert shiven is not None
    print(f"  Demo/Shiven Interests : {shiven.interests}")
    print(f"  Maya Interests        : {user.interests}")

    # Both users have "mindfulness" in their interests
    shiven_active = _get_active_interest_group(shiven, day_number=1)
    maya_active = _get_active_interest_group(user, day_number=1)
    assert shiven_active == "mindfulness"
    assert maya_active == "mindfulness"
    print(f"  Both users active interest on Day 1: '{shiven_active}'")

    # Clear cache to simulate fresh daily state
    clear_cache()
    today_str = "2026-10-27"

    # 8a. User A (Maya) triggers question retrieval for today
    maya_q = _get_or_create_group_question(db, user, target_day=1, user_today_str=today_str)
    print(f"  Maya Question Generated/Retrieved: \"{maya_q['text'][:50]}...\"")
    assert maya_q is not None

    # 8b. Verify question is now in cache for that day only
    cached = get_daily_question("mindfulness", today_str)
    assert cached is not None, "Question MUST be cached for that day's interest group"
    assert cached["text"] == maya_q["text"]

    # 8c. User B (Shiven) requests question on the same day with same interest
    shiven_q = _get_or_create_group_question(db, shiven, target_day=1, user_today_str=today_str)
    print(f"  Shiven Question via Cache Hit   : \"{shiven_q['text'][:50]}...\"")

    # Both must match 100%!
    assert shiven_q["text"] == maya_q["text"], "All users with same active interest must receive the identical daily question!"
    assert shiven_q["tags"] == maya_q["tags"]
    print("  ✅ Single Daily Question Per Interest Group & Daily Cache PASSED (100% Identical Shared Prompt)")

    db.close()
    print("\n" + "=" * 70)
    print("  🎉 ALL 8 TESTS COMPLETED WITH 100% SUCCESS!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
