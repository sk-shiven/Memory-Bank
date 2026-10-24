import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.question import Question
from app.services.ai_generator import generate_daily_question
from app.services.push import send_push_notification

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def batch_generate_questions_job():
    """Nightly cron job that generates tomorrow's questions for all registered users."""
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            last_q = db.query(Question).filter(Question.user_id == user.id).order_by(Question.day_number.desc()).first()
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

            q_data = generate_daily_question(
                day_number=next_day,
                past_questions=past_questions
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
    """Runs periodically to check which users have preferred notification times now and sends alerts."""
    db: Session = SessionLocal()
    try:
        users = db.query(User).filter(User.push_token.isnot(None)).all()
        for user in users:
            today_q = db.query(Question).filter(Question.user_id == user.id).order_by(Question.day_number.desc()).first()
            if today_q:
                send_push_notification(
                    token=user.push_token,
                    title=f"365 — Day {today_q.day_number}",
                    body=today_q.question_text,
                    data={"question_id": str(today_q.id), "day_number": str(today_q.day_number)}
                )
    except Exception as e:
        logger.error("Error in daily_notification_dispatcher: %s", e)
    finally:
        db.close()


def start_scheduler():
    # Schedule question batch at 03:00 AM every night
    scheduler.add_job(
        batch_generate_questions_job,
        trigger=CronTrigger(hour=3, minute=0),
        id="nightly_question_generator",
        replace_existing=True
    )
    # Check notifications hourly
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
