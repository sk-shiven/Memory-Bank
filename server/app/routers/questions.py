from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.schemas.schemas import QuestionResponse
from app.routers.auth import get_current_user
from app.services.ai_generator import generate_daily_question
from app.utils.timezone import get_user_today, to_user_tz
from app.cache import get_daily_question as get_cached_question, set_daily_question as set_cached_question

router = APIRouter(prefix="/questions", tags=["Questions"])


def _get_active_interest_group(user: User, day_number: int) -> str:
    """Determines the active interest group for the user on a specific day number.

    Rotates evenly across the user's selected interests (up to 5) so the user
    experiences balanced variety across their chosen themes over the 365 days.
    """
    interests = user.interests if user.interests and isinstance(user.interests, list) else ["mindfulness"]
    idx = (day_number - 1) % len(interests)
    return interests[idx].strip().lower()


def _get_or_create_group_question(
    db: Session,
    user: User,
    target_day: int,
    user_today_str: str
) -> dict:
    """Retrieves or generates that day's question for the user's active interest group.

    POLICY:
    All users in the same interest group on this calendar date receive the exact same
    daily prompt. The prompt is cached for that day only.
    """
    active_interest = _get_active_interest_group(user, target_day)

    # 1. Check Daily Question Cache (keyed by interest_group and date)
    cached_q = get_cached_question(active_interest, user_today_str)
    if cached_q:
        return cached_q

    # 2. Check if another user with the same interest group already triggered generation today
    # (Optional fallback check in DB for multi-instance consistency)
    existing_q = (
        db.query(Question)
        .filter(
            Question.theme_tags.ilike(f"%{active_interest}%"),
            Question.generated_at >= f"{user_today_str} 00:00:00"
        )
        .first()
    )
    if existing_q:
        q_data = {
            "text": existing_q.question_text,
            "tags": existing_q.theme_tags
        }
        set_cached_question(active_interest, user_today_str, q_data)
        return q_data

    # 3. Cache Miss: Generate once for this interest group on this day
    past_qs = [
        q.question_text for q in db.query(Question.question_text)
        .filter(Question.user_id == user.id)
        .order_by(Question.day_number.desc())
        .limit(10).all()
    ]
    gen_data = generate_daily_question(
        day_number=target_day,
        past_questions=past_qs,
        interest_group=active_interest
    )

    q_data = {
        "text": gen_data["text"],
        "tags": gen_data["tags"]
    }

    # Store in cache: We cache that day's questions only (TTL until midnight)
    set_cached_question(active_interest, user_today_str, q_data)
    return q_data


@router.get("/today", response_model=QuestionResponse)
def get_today_question(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches today's question for the user.

    - Serves the same shared question to all users with similar active interests that day.
    - Uses the daily question cache (that day's questions only).
    - Advances to next day only when a new calendar day has arrived in the user's local timezone.
    """
    last_question = (
        db.query(Question)
        .options(joinedload(Question.answer))
        .filter(Question.user_id == current_user.id)
        .order_by(Question.day_number.desc())
        .first()
    )

    user_today = get_user_today(current_user.timezone)
    user_today_str = str(user_today)

    if not last_question:
        # First day ever!
        q_data = _get_or_create_group_question(db, current_user, target_day=1, user_today_str=user_today_str)
        today_q = Question(
            user_id=current_user.id,
            day_number=1,
            question_text=q_data["text"],
            theme_tags=q_data["tags"],
            is_served=True
        )
        db.add(today_q)
        db.commit()
        db.refresh(today_q)
        return today_q

    # Check if last question was answered
    has_answered = last_question.answer
    if has_answered and last_question.day_number < 365:
        # User local calendar awareness
        ans_local_date = to_user_tz(has_answered.created_at, current_user.timezone).date()

        # If answered today in user's local timezone, do not advance prematurely
        if ans_local_date >= user_today:
            return last_question

        # New local day has begun! Check if next question has already been generated
        next_day = last_question.day_number + 1
        next_q = (
            db.query(Question)
            .options(joinedload(Question.answer))
            .filter(Question.user_id == current_user.id, Question.day_number == next_day)
            .first()
        )
        if not next_q:
            q_data = _get_or_create_group_question(db, current_user, target_day=next_day, user_today_str=user_today_str)
            next_q = Question(
                user_id=current_user.id,
                day_number=next_day,
                question_text=q_data["text"],
                theme_tags=q_data["tags"],
                is_served=True
            )
            db.add(next_q)
            db.commit()
            db.refresh(next_q)
        return next_q

    return last_question


@router.get("/{day_number}", response_model=QuestionResponse)
def get_question_by_day(
    day_number: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = (
        db.query(Question)
        .options(joinedload(Question.answer))
        .filter(Question.user_id == current_user.id, Question.day_number == day_number)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question for Day {day_number} not found"
        )
    return question
