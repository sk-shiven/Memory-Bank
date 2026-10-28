import sys
from pathlib import Path
from datetime import datetime, time, timedelta, timezone

# Ensure server root is in sys.path
server_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(server_root))

from app.database import SessionLocal
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.models.notification_log import NotificationLog


def seed():
    db = SessionLocal()
    print("🌱 Seeding 365 Memory Bank dummy dataset...")

    now_utc = datetime.now(timezone.utc)

    # 1. Users across different timezones
    users_data = [
        {
            "google_id": "google-oauth-1092837465",
            "email": "demo@example.com",
            "name": "Demo User",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            "timezone": "UTC",
            "notification_time_preference": "20:00",
            "preferred_journaling_time": time(20, 0),
            "interests": ["mindfulness", "gratitude", "creativity"],
            "push_token": "fcm_token_sample_demo",
            "streak_count": 0,
            "max_streak": 0,
        },
        {
            "google_id": "google-oauth-2083948172",
            "email": "maya.lin@example.com",
            "name": "Maya Lin",
            "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
            "timezone": "America/New_York",
            "notification_time_preference": "21:00",
            "preferred_journaling_time": time(21, 0),
            "interests": ["mindfulness", "gratitude", "growth", "memories"],
            "push_token": "fcm_token_sample_maya_nyc",
            "streak_count": 7,
            "max_streak": 14,
        },
        {
            "google_id": "google-oauth-3091827364",
            "email": "lucas.dubois@example.com",
            "name": "Lucas Dubois",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            "timezone": "Europe/Paris",
            "notification_time_preference": "08:30",
            "preferred_journaling_time": time(8, 30),
            "interests": ["philosophy", "adventure", "creativity"],
            "push_token": "fcm_token_sample_lucas_paris",
            "streak_count": 3,
            "max_streak": 5,
        },
        {
            "google_id": "google-oauth-4019283746",
            "email": "elena.rostova@example.com",
            "name": "Elena Rostova",
            "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
            "timezone": "Asia/Tokyo",
            "notification_time_preference": "19:00",
            "preferred_journaling_time": time(19, 0),
            "interests": ["health", "mindfulness", "career"],
            "push_token": None,
            "streak_count": 0,
            "max_streak": 1,
        },
    ]

    user_objs = {}
    for udata in users_data:
        user = db.query(User).filter(User.email == udata["email"]).first()
        if not user:
            user = User(**udata)
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"  + Created User: {user.name} ({user.email}) [{user.timezone}]")
        else:
            # Update fields
            for k, v in udata.items():
                setattr(user, k, v)
            db.commit()
            db.refresh(user)
            print(f"  ~ Updated User: {user.name} ({user.email}) [{user.timezone}]")
        user_objs[udata["email"]] = user

    # 2. Daily Prompts & Reflections for Maya Lin (7 days of memories)
    maya = user_objs["maya.lin@example.com"]
    maya_journey = [
        (
            1,
            "What is a scent or smell that instantly transports you back to childhood?",
            "senses,nostalgia",
            "The scent of cinnamon apple pie baking in my grandmother's kitchen on rainy October Sunday afternoons.",
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
            None,
            now_utc - timedelta(days=6)
        ),
        (
            2,
            "Who was the last person who made you laugh until your stomach hurt?",
            "friendship,laughter",
            "Had coffee with Sarah and she told me the story of how she accidentally gave a PowerPoint presentation to the wrong Zoom room.",
            None,
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            now_utc - timedelta(days=5)
        ),
        (
            3,
            "What is something you forgive your younger self for?",
            "healing,self-compassion",
            "For staying in that unfulfilling job two years too long out of fear of failure. I did the best I could with what I knew then.",
            None,
            None,
            now_utc - timedelta(days=4)
        ),
        (
            4,
            "What was the most beautiful view you saw with your own eyes this week?",
            "nature,wonder",
            "Sunset over Central Park reservoir. The sky turned burnt orange and lavender reflecting off the glass towers.",
            "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800",
            None,
            now_utc - timedelta(days=3)
        ),
        (
            5,
            "What is a belief you used to hold strongly that you have now changed your mind on?",
            "growth,philosophy",
            "I used to believe multitasking was a superpower. Now I understand deep, mono-focused presence is the rarest luxury.",
            None,
            None,
            now_utc - timedelta(days=2)
        ),
        (
            6,
            "If your day had a musical soundtrack today, what genre would it be?",
            "music,mood",
            "A warm acoustic folk guitar playing softly in a sunlit wooden room.",
            None,
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            now_utc - timedelta(days=1)
        ),
        (
            7,
            "What is one gentle promise you want to make to yourself for tomorrow?",
            "intentions,calm",
            None,  # Unanswered prompt for today!
            None,
            None,
            now_utc
        ),
    ]

    for day_num, q_text, tags, ans_text, photo_url, audio_url, gen_time in maya_journey:
        q = (
            db.query(Question)
            .filter(Question.user_id == maya.id, Question.day_number == day_num)
            .first()
        )
        if not q:
            q = Question(
                user_id=maya.id,
                day_number=day_num,
                question_text=q_text,
                theme_tags=tags,
                generated_at=gen_time,
                is_served=True
            )
            db.add(q)
            db.commit()
            db.refresh(q)
        else:
            q.question_text = q_text
            q.theme_tags = tags
            q.generated_at = gen_time
            db.commit()
            db.refresh(q)

        # Answer
        if ans_text or photo_url or audio_url:
            ans = db.query(Answer).filter(Answer.question_id == q.id).first()
            if not ans:
                ans = Answer(
                    question_id=q.id,
                    user_id=maya.id,
                    text=ans_text,
                    photo_url=photo_url,
                    audio_url=audio_url,
                    created_at=gen_time + timedelta(hours=8)
                )
                db.add(ans)
                db.commit()
            else:
                ans.text = ans_text
                ans.photo_url = photo_url
                ans.audio_url = audio_url
                ans.created_at = gen_time + timedelta(hours=8)
                db.commit()

    # 3. Questions & Reflections for Lucas Dubois (Paris)
    lucas = user_objs["lucas.dubois@example.com"]
    lucas_journey = [
        (
            1,
            "What morning ritual grounds you before the world demands your attention?",
            "rituals,mindfulness",
            "Espresso on the balcony watching the Rue Montmartre wake up with delivery carts and freshly baked baguettes.",
            "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
            None,
            now_utc - timedelta(days=2)
        ),
        (
            2,
            "What is an unexpected kindness a stranger offered you?",
            "kindness,community",
            "An elderly bookstore owner handed me an antique postcard of Paris from 1920 when I was browsing yesterday.",
            None,
            None,
            now_utc - timedelta(days=1)
        ),
        (
            3,
            "What project or dream is quietly whispering to you right now?",
            "dreams,creativity",
            None,  # Unanswered
            None,
            None,
            now_utc
        )
    ]

    for day_num, q_text, tags, ans_text, photo_url, audio_url, gen_time in lucas_journey:
        q = (
            db.query(Question)
            .filter(Question.user_id == lucas.id, Question.day_number == day_num)
            .first()
        )
        if not q:
            q = Question(
                user_id=lucas.id,
                day_number=day_num,
                question_text=q_text,
                theme_tags=tags,
                generated_at=gen_time,
                is_served=True
            )
            db.add(q)
            db.commit()
            db.refresh(q)
        else:
            q.question_text = q_text
            q.theme_tags = tags
            q.generated_at = gen_time
            db.commit()
            db.refresh(q)

        if ans_text or photo_url or audio_url:
            ans = db.query(Answer).filter(Answer.question_id == q.id).first()
            if not ans:
                ans = Answer(
                    question_id=q.id,
                    user_id=lucas.id,
                    text=ans_text,
                    photo_url=photo_url,
                    audio_url=audio_url,
                    created_at=gen_time + timedelta(hours=5)
                )
                db.add(ans)
                db.commit()
            else:
                ans.text = ans_text
                ans.photo_url = photo_url
                ans.audio_url = audio_url
                ans.created_at = gen_time + timedelta(hours=5)
                db.commit()

    # 4. Add Notification Logs for sent questions
    for u in [maya, lucas]:
        recent_q = db.query(Question).filter(Question.user_id == u.id).order_by(Question.day_number.asc()).first()
        if recent_q:
            log_exists = db.query(NotificationLog).filter(NotificationLog.user_id == u.id, NotificationLog.question_id == recent_q.id).first()
            if not log_exists:
                log = NotificationLog(
                    user_id=u.id,
                    question_id=recent_q.id,
                    status="sent",
                    channel="fcm",
                    sent_at=now_utc - timedelta(days=1)
                )
                db.add(log)
                db.commit()

    print("✨ Dummy data seeded successfully across multiple users, timezones, prompts, and media types!")
    db.close()


if __name__ == "__main__":
    seed()
