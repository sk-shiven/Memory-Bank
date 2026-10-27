import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.models.notification_log import NotificationLog
from app.services.ai_generator import generate_daily_question
from app.services.push import send_push_notification
from app.utils.timezone import get_user_now

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def batch_generate_questions_job():
    """Nightly cron job that generates tomorrow's questions for all registered users."""
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            last_q = (
                db.query(Question)
                .filter(Question.user_id == user.id)
                .order_by(Question.day_number.desc())
                .first()
            )
            next_day = (last_q.day_number + 1) if last_q else 1

            if next_day > 365:
                continue

            # Fetch recent questions to avoid repeats
            past_questions = [
                q.question_text for q in db.query(Question.question_text)
                .filter(Question.user_id == user.id)
                .order_by(Question.day_number.desc())
                .limit(10).all()
            ]

            # Use active interest for this day
            interests = user.interests if user.interests and isinstance(user.interests, list) else ["mindfulness"]
            active_interest = interests[(next_day - 1) % len(interests)]

            q_data = generate_daily_question(
                day_number=next_day,
                past_questions=past_questions,
                interest_group=active_interest
            )

            new_q = Question(
                user_id=user.id,
                day_number=next_day,
                question_text=q_data["text"],
                theme_tags=q_data["tags"],
                is_served=True
            )
            db.add(new_q)
            db.commit()
            logger.info("Generated Day %d question for User %s", next_day, user.email)
    except Exception as e:
        logger.error("Error running batch_generate_questions_job: %s", e)
    finally:
        db.close()


def daily_notification_dispatcher():
    """Runs hourly to dispatch reminders strictly to users whose local preferred hour matches now."""
    db: Session = SessionLocal()
    try:
        users = db.query(User).filter(User.push_token.isnot(None)).all()
        for user in users:
            # Check user local time
            user_now = get_user_now(user.timezone)
            if user.preferred_journaling_time is not None:
                pref_hour = user.preferred_journaling_time.hour
            else:
                try:
                    pref_hour = int(user.notification_time_preference.split(":")[0])
                except (ValueError, AttributeError):
                    pref_hour = 20

            if user_now.hour != pref_hour:
                continue

            # Get user's current question
            today_q = (
                db.query(Question)
                .filter(Question.user_id == user.id)
                .order_by(Question.day_number.desc())
                .first()
            )
            if not today_q:
                continue

            # Skip if user has already answered this question
            has_answered = db.query(Answer).filter(Answer.question_id == today_q.id).first()
            if has_answered:
                continue

            # Skip if already notified for this question
            already_notified = (
                db.query(NotificationLog)
                .filter(
                    NotificationLog.user_id == user.id,
                    NotificationLog.question_id == today_q.id
                )
                .first()
            )
            if already_notified:
                continue

            # Send notification
            success = send_push_notification(
                token=user.push_token,
                title=f"365 — Day {today_q.day_number}",
                body=today_q.question_text,
                data={"question_id": str(today_q.id), "day_number": str(today_q.day_number)}
            )

            # Record in notification_logs with scheduled_time
            log_entry = NotificationLog(
                user_id=user.id,
                question_id=today_q.id,
                status="sent" if success else "failed",
                channel="fcm",
                scheduled_time=user.preferred_journaling_time
            )
            db.add(log_entry)
            db.commit()
            logger.info("Dispatched notification for Day %d to user %s (Preferred: %s)", today_q.day_number, user.email, user.preferred_journaling_time)
    except Exception as e:
        logger.error("Error in daily_notification_dispatcher: %s", e)
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        batch_generate_questions_job,
        trigger=CronTrigger(hour=3, minute=0),
        id="nightly_question_generator",
        replace_existing=True
    )
    scheduler.add_job(
        daily_notification_dispatcher,
        trigger=CronTrigger(minute=0),
        id="hourly_notification_dispatcher",
        replace_existing=True
    )
    scheduler.start()
    logger.info("APScheduler background jobs initialized.")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler safely stopped.")
