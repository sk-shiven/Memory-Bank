from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.schemas.schemas import QuestionResponse
from app.routers.auth import get_current_user
from app.services.ai_generator import generate_daily_question

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.get("/today", response_model=QuestionResponse)
def get_today_question(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches today's question for the user.

    If the user has never received a question, generates Day 1 immediately.
    If the user answered their last question, automatically advances to next day.
    """
    last_question = (
        db.query(Question)
        .filter(Question.user_id == current_user.id)
        .order_by(Question.day_number.desc())
        .first()
    )

    if not last_question:
        # First day ever!
        q_data = generate_daily_question(day_number=1)
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
    has_answered = db.query(Answer).filter(Answer.question_id == last_question.id).first()
    if has_answered and last_question.day_number < 365:
        # Check if tomorrow's question has already been generated
        next_day = last_question.day_number + 1
        next_q = (
            db.query(Question)
            .filter(Question.user_id == current_user.id, Question.day_number == next_day)
            .first()
        )
        if not next_q:
            past_qs = [
                q.question_text for q in db.query(Question.question_text)
                .filter(Question.user_id == current_user.id)
                .order_by(Question.day_number.desc())
                .limit(10).all()
            ]
            q_data = generate_daily_question(day_number=next_day, past_questions=past_qs)
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
        .filter(Question.user_id == current_user.id, Question.day_number == day_number)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question for Day {day_number} not found"
        )
    return question
